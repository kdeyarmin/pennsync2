import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Send, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProactiveEducationSuggester({ 
  diagnosis, 
  roughNote,
  enhancedNote,
  patientId,
  patientEmail,
  caregiverEmail
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);

  useEffect(() => {
    if ((roughNote?.length > 50 || enhancedNote) && diagnosis) {
      analyzeSuggestions();
    }
  }, [roughNote, enhancedNote, diagnosis]);

  const analyzeSuggestions = async () => {
    setAnalyzing(true);
    try {
      const noteContent = enhancedNote || roughNote;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this clinical documentation and suggest relevant patient education materials.

DIAGNOSIS: ${diagnosis}

CLINICAL NOTE:
${noteContent}

Based on documented interventions, teaching moments, and patient needs, identify:
1. Top 3 educational topics the patient/caregiver should understand
2. For each topic, specify why it's relevant based on the note
3. Priority level (high/medium/low)
4. Key teaching points to include

Return JSON with array of education suggestions.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" },
                  key_points: { type: "array", items: { type: "string" } },
                  content_type: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Error analyzing education needs:', error);
    }
    setAnalyzing(false);
  };

  const generateAndSend = async (suggestion, recipientEmail, recipientType) => {
    setSendingTo(suggestion.topic);
    try {
      const handout = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a patient-friendly educational handout about: ${suggestion.topic}

Context: ${suggestion.rationale}

Key teaching points to cover:
${suggestion.key_points.map(p => `- ${p}`).join('\n')}

Create a clear, simple handout with:
- Plain language explanation (8th grade reading level)
- Bulleted key points
- Warning signs to watch for
- When to call the nurse/doctor
- Practical tips

Return markdown formatted content.`,
        response_json_schema: {
          type: "object",
          properties: {
            content: { type: "string" },
            title: { type: "string" }
          }
        }
      });

      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `Patient Education: ${handout.title}`,
        body: `
<h2>${handout.title}</h2>
<p><em>Educational material generated based on your recent visit</em></p>

${handout.content.replace(/\n/g, '<br>')}

<hr>
<p style="color: #666; font-size: 12px;">
This educational material was generated for you based on your care needs. 
If you have any questions, please contact your nurse.
</p>
        `
      });

      // Log to patient record
      if (patientId) {
        await base44.entities.PatientEducationAssignment.create({
          patient_id: patientId,
          topic: suggestion.topic,
          content: handout.content,
          sent_to: recipientEmail,
          sent_to_type: recipientType,
          generated_by_ai: true,
          source: 'proactive_suggestion'
        });
      }

      setSendingTo(null);
      alert(`Education material sent to ${recipientType}!`);
    } catch (error) {
      console.error('Error generating/sending education:', error);
      setSendingTo(null);
      alert('Failed to send education material. Please try again.');
    }
  };

  if (!suggestions.length && !analyzing) return null;

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-blue-100 text-blue-800 border-blue-300"
  };

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Suggested Patient Education
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analyzing ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="ml-2 text-sm text-gray-600">Analyzing education needs...</span>
          </div>
        ) : (
          <>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-900">
                Based on this visit, the following topics may benefit the patient/caregiver
              </AlertDescription>
            </Alert>

            {suggestions.map((suggestion, idx) => (
              <div 
                key={idx} 
                className={`bg-white rounded-lg border-2 p-4 space-y-3 ${priorityColors[suggestion.priority]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{suggestion.topic}</h4>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.priority} priority
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">{suggestion.rationale}</p>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <p className="font-medium">Key Points:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {suggestion.key_points.slice(0, 3).map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  {patientEmail && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateAndSend(suggestion, patientEmail, 'patient')}
                      disabled={sendingTo === suggestion.topic}
                      className="flex-1"
                    >
                      {sendingTo === suggestion.topic ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3 mr-1" />
                      )}
                      Send to Patient
                    </Button>
                  )}
                  {caregiverEmail && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateAndSend(suggestion, caregiverEmail, 'caregiver')}
                      disabled={sendingTo === suggestion.topic}
                      className="flex-1"
                    >
                      {sendingTo === suggestion.topic ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3 mr-1" />
                      )}
                      Send to Caregiver
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}