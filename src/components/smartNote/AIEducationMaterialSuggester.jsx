import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, CheckCircle2, Plus, Download } from "lucide-react";
import { logActivity, ActivityActions } from "../utils/activityLogger";

export default function AIEducationMaterialSuggester({
  noteContent,
  diagnosis,
  patientData,
  visitType,
  patientId,
  onAssignEducation,
  autoAnalyze = true
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [assignedTopics, setAssignedTopics] = useState(new Set());
  const [generatingHandout, setGeneratingHandout] = useState(null);

  useEffect(() => {
    if (autoAnalyze && noteContent?.length >= 100 && diagnosis) {
      const timer = setTimeout(() => analyzEducationNeeds(), 2000);
      return () => clearTimeout(timer);
    }
  }, [noteContent, diagnosis, autoAnalyze]);

  const analyzEducationNeeds = async () => {
    if (!noteContent || !diagnosis) return;

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this clinical note to identify patient education needs.

CLINICAL NOTE:
${noteContent}

PATIENT: ${patientData?.first_name} ${patientData?.last_name}
DIAGNOSIS: ${diagnosis}
VISIT TYPE: ${visitType}

PATIENT CONTEXT:
- Cognitive Status: ${patientData?.mental_health?.cognitive_functioning || 'Unknown'}
- Language: ${patientData?.social_history?.primary_language || 'English'}
- Living Situation: ${patientData?.social_history?.living_situation || 'Unknown'}
- Caregiver Present: ${patientData?.caregiver_name ? 'Yes' : 'No'}

Identify specific, Medicare-compliant patient education materials needed based on:
1. Disease management and self-care
2. Medication safety and administration
3. Safety concerns (falls, infection prevention)
4. Symptom recognition and when to call nurse/MD
5. Activity/diet restrictions
6. Equipment use and care
7. Caregiver education needs

For each topic, provide:
- Specific learning objectives
- Key teaching points
- Teach-back verification questions
- Format recommendations (verbal, demonstration, handout)
- Priority level
- Rationale from note content`,
        response_json_schema: {
          type: "object",
          properties: {
            education_topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  learning_objectives: { type: "array", items: { type: "string" } },
                  key_points: { type: "array", items: { type: "string" } },
                  teach_back_questions: { type: "array", items: { type: "string" } },
                  recommended_format: { type: "string" },
                  target_audience: { type: "string" },
                  evidence_from_note: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result);

      logActivity(ActivityActions.AI_FEATURE_USED, {
        feature: 'education_material_analysis',
        patient_id: patientId,
        topics_identified: result.education_topics?.length || 0,
        page: 'SmartNoteAssistant'
      });

    } catch (error) {
      console.error('Education analysis error:', error);
    }
    setAnalyzing(false);
  };

  const handleAssignTopic = async (topic) => {
    try {
      await onAssignEducation({
        patient_id: patientId,
        topic: topic.topic,
        content: `LEARNING OBJECTIVES:\n${topic.learning_objectives.join('\n')}\n\nKEY TEACHING POINTS:\n${topic.key_points.join('\n')}\n\nTEACH-BACK QUESTIONS:\n${topic.teach_back_questions.join('\n')}`,
        format: topic.recommended_format?.toLowerCase() || 'handout',
        status: 'assigned',
        assigned_date: new Date().toISOString().split('T')[0],
        priority: topic.priority?.toLowerCase() || 'medium'
      });

      setAssignedTopics(prev => new Set([...prev, topic.topic]));

      logActivity(ActivityActions.CREATE, {
        entity_type: 'PatientEducationAssignment',
        patient_id: patientId,
        topic: topic.topic,
        source: 'ai_suggestion',
        page: 'SmartNoteAssistant'
      });
    } catch (error) {
      console.error('Error assigning education:', error);
    }
  };

  const handleGenerateHandout = async (topic) => {
    setGeneratingHandout(topic.topic);
    try {
      const handout = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a Medicare-compliant, patient-friendly education handout.

TOPIC: ${topic.topic}
PATIENT: ${patientData?.first_name} ${patientData?.last_name}
DIAGNOSIS: ${diagnosis}
COGNITIVE LEVEL: ${patientData?.mental_health?.cognitive_functioning || 'Average'}
LANGUAGE: ${patientData?.social_history?.primary_language || 'English'}

LEARNING OBJECTIVES:
${topic.learning_objectives.join('\n')}

KEY TEACHING POINTS:
${topic.key_points.join('\n')}

Create a 1-page handout with:
- Clear, simple language (5th-6th grade reading level)
- Bullet points and short paragraphs
- Important warnings highlighted
- When to call nurse/doctor section
- Space for questions

Format as plain text, ready to print.`,
        response_json_schema: {
          type: "object",
          properties: {
            handout_content: { type: "string" }
          }
        }
      });

      // Create blob and download
      const blob = new Blob([handout.handout_content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.topic.replace(/\s+/g, '_')}_Education.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      logActivity(ActivityActions.GENERATE, {
        type: 'education_handout',
        topic: topic.topic,
        patient_id: patientId,
        page: 'SmartNoteAssistant'
      });
    } catch (error) {
      console.error('Error generating handout:', error);
    }
    setGeneratingHandout(null);
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="bg-purple-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          AI Patient Education Recommendations
          {suggestions?.education_topics?.length > 0 && (
            <Badge className="ml-auto bg-white text-purple-700">
              {suggestions.education_topics.length} Topics
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {analyzing && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Analyzing education needs...</p>
          </div>
        )}

        {suggestions?.education_topics?.length > 0 ? (
          <div className="space-y-3">
            {suggestions.education_topics.map((topic, idx) => {
              const isAssigned = assignedTopics.has(topic.topic);
              return (
                <Card key={idx} className={`border-l-4 ${
                  isAssigned ? 'border-l-green-500 bg-green-50 opacity-60' :
                  topic.priority === 'high' ? 'border-l-red-500' :
                  topic.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">{topic.topic}</h4>
                          <Badge className={`text-xs ${
                            topic.priority === 'high' ? 'bg-red-600' :
                            topic.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}>
                            {topic.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{topic.category}</Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">
                          Target: {topic.target_audience}
                        </p>
                      </div>
                      {!isAssigned ? (
                        <Button
                          size="sm"
                          onClick={() => handleAssignTopic(topic)}
                          className="h-7 flex-shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="font-semibold text-blue-900 mb-1">Learning Objectives:</p>
                        {topic.learning_objectives.slice(0, 3).map((obj, i) => (
                          <p key={i} className="text-blue-800">• {obj}</p>
                        ))}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded p-2">
                        <p className="font-semibold text-slate-900 mb-1">Evidence from Note:</p>
                        <p className="text-slate-700 italic">"{topic.evidence_from_note}"</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateHandout(topic)}
                          disabled={generatingHandout === topic.topic}
                          className="text-xs h-7"
                        >
                          {generatingHandout === topic.topic ? (
                            <>Generating...</>
                          ) : (
                            <>
                              <Download className="w-3 h-3 mr-1" />
                              Generate Handout
                            </>
                          )}
                        </Button>
                        <Badge variant="outline" className="text-xs px-2">
                          Format: {topic.recommended_format}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : !analyzing && (
          <Alert className="bg-purple-50 border-purple-200">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-sm text-purple-900">
              Write more clinical details to get AI-powered education material recommendations.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}