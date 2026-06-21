import { useState, useEffect, useCallback } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bot,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Stethoscope,
  Heart,
  Pill,
  Shield
} from "lucide-react";

export default function AIDocumentationAssistant({ 
  patient, 
  visit, 
  vitalSigns, 
  narrativeText, 
  onInsertText,
  carePlans 
}) {
  const [suggestions, setSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [_lastAnalyzedLength, setLastAnalyzedLength] = useState(0);
  const [insertedItems, setInsertedItems] = useState([]);

  const analyzeDocs = useCallback(async () => {
    if (!patient || !visit) return;
    
    setIsAnalyzing(true);
    try {
      const prompt = `You are an expert home health/hospice documentation assistant. Analyze this patient context and provide proactive, relevant documentation suggestions.

PATIENT CONTEXT:
- Name: ${patient.first_name} ${patient.last_name}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
- Allergies: ${patient.allergies || 'NKDA'}

VISIT CONTEXT:
- Visit Type: ${visit.visit_type?.replace(/_/g, ' ')}
- Date: ${visit.visit_date}

CURRENT VITAL SIGNS:
${vitalSigns ? Object.entries(vitalSigns).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`).join('\n') : 'Not yet entered'}

CURRENT DOCUMENTATION (excerpt):
${(narrativeText || '').substring(0, 500) || 'Not yet started'}

ACTIVE CARE PLANS:
${(carePlans || []).filter(cp => cp.status === 'active').map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || 'None'}

Based on this context, provide intelligent documentation assistance:

1. Identify what sections are MISSING from the documentation that are required for Medicare compliance
2. Suggest condition-specific assessments based on the diagnosis
3. Provide ready-to-insert documentation snippets tailored to this patient
4. Alert to any clinical concerns based on vitals or diagnosis
5. Suggest patient education topics relevant to the diagnosis

Return JSON:
{
  "priority_alerts": [
    {
      "type": "missing_section|clinical_concern|compliance_gap",
      "title": "Alert title",
      "message": "Detailed message",
      "severity": "high|medium|low"
    }
  ],
  "suggested_sections": [
    {
      "section_name": "Section title",
      "reason": "Why this is relevant",
      "content": "Ready-to-insert documentation text with [placeholders] for specific observations",
      "category": "assessment|intervention|education|compliance"
    }
  ],
  "diagnosis_specific_prompts": [
    {
      "diagnosis": "The relevant diagnosis",
      "assessment_points": ["Point 1", "Point 2"],
      "documentation_snippet": "Ready text to insert"
    }
  ],
  "best_practices": [
    {
      "title": "Best practice title",
      "tip": "Specific actionable tip"
    }
  ],
  "education_topics": ["Topic 1", "Topic 2"]
}`;

      const result = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            priority_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  message: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            suggested_sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_name: { type: "string" },
                  reason: { type: "string" },
                  content: { type: "string" },
                  category: { type: "string" }
                }
              }
            },
            diagnosis_specific_prompts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  diagnosis: { type: "string" },
                  assessment_points: { type: "array", items: { type: "string" } },
                  documentation_snippet: { type: "string" }
                }
              }
            },
            best_practices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  tip: { type: "string" }
                }
              }
            },
            education_topics: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSuggestions(result);
      setLastAnalyzedLength((narrativeText || '').length);
    } catch (error) {
      console.error('Error analyzing documentation:', error);
    }
    setIsAnalyzing(false);
  }, [patient, visit, vitalSigns, narrativeText, carePlans]);

  // Auto-analyze when significant content changes
  useEffect(() => {
    const currentLength = (narrativeText || '').length;
    const shouldAutoAnalyze = !suggestions && patient && visit && currentLength < 100;
    
    if (shouldAutoAnalyze) {
      analyzeDocs();
    }
  }, [patient?.id, visit?.id, analyzeDocs, narrativeText, patient, suggestions, visit]);

  const handleInsert = (content, id) => {
    onInsertText(content);
    setInsertedItems([...insertedItems, id]);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'assessment': return <Stethoscope className="w-4 h-4" />;
      case 'intervention': return <Heart className="w-4 h-4" />;
      case 'education': return <MessageSquare className="w-4 h-4" />;
      case 'compliance': return <Shield className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'assessment': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'intervention': return 'bg-green-100 text-green-800 border-green-200';
      case 'education': return 'bg-navy-100 text-navy-800 border-navy-200';
      case 'compliance': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-300';
      case 'medium': return 'bg-yellow-50 border-yellow-300';
      case 'low': return 'bg-blue-50 border-blue-300';
      default: return 'bg-slate-50 border-slate-300';
    }
  };

  if (!patient || !visit) return null;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-navy-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Bot className="w-5 h-5 text-indigo-600" />
            AI Documentation Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={analyzeDocs}
              disabled={isAnalyzing}
              className="text-indigo-600 hover:text-indigo-700"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-indigo-600">
          Context-aware suggestions for {patient.primary_diagnosis || 'this patient'}
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2 space-y-4">
          {isAnalyzing && (
            <div className="flex items-center justify-center py-4 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-sm text-indigo-700">Analyzing patient context...</span>
            </div>
          )}

          {!isAnalyzing && !suggestions && (
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
              <p className="text-sm text-indigo-600">Click refresh to get AI-powered suggestions</p>
            </div>
          )}

          {suggestions && (
            <>
              {/* Priority Alerts */}
              {suggestions.priority_alerts?.length > 0 && (
                <div className="space-y-2">
                  {suggestions.priority_alerts.map((alert, idx) => (
                    <Alert key={idx} className={getSeverityColor(alert.severity)}>
                      <AlertTriangle className={`w-4 h-4 ${
                        alert.severity === 'high' ? 'text-red-600' : 
                        alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                      <AlertDescription>
                        <p className="font-semibold text-sm">{alert.title}</p>
                        <p className="text-xs mt-1">{alert.message}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Suggested Sections */}
              {suggestions.suggested_sections?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">
                    Suggested Documentation
                  </p>
                  {suggestions.suggested_sections.slice(0, 4).map((section, idx) => {
                    const itemId = `section-${idx}`;
                    const isInserted = insertedItems.includes(itemId);
                    
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(section.category)}
                            <span className="font-medium text-sm text-slate-900">{section.section_name}</span>
                          </div>
                          <Badge className={`text-xs ${getCategoryColor(section.category)}`}>
                            {section.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{section.reason}</p>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant={isInserted ? "outline" : "default"}
                            className={isInserted ? "text-green-600" : "bg-indigo-600 hover:bg-indigo-700"}
                            onClick={() => handleInsert(section.content, itemId)}
                            disabled={isInserted}
                          >
                            {isInserted ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 mr-1" />
                                Insert
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Diagnosis-Specific Prompts */}
              {suggestions.diagnosis_specific_prompts?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">
                    Diagnosis-Specific Assessment
                  </p>
                  {suggestions.diagnosis_specific_prompts.slice(0, 2).map((prompt, idx) => {
                    const itemId = `diagnosis-${idx}`;
                    const isInserted = insertedItems.includes(itemId);
                    
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Pill className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-sm">{prompt.diagnosis}</span>
                        </div>
                        <div className="mb-2">
                          <p className="text-xs text-slate-600 mb-1">Key assessment points:</p>
                          <div className="flex flex-wrap gap-1">
                            {prompt.assessment_points?.slice(0, 4).map((point, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {point}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isInserted ? "outline" : "default"}
                          className={`w-full ${isInserted ? "text-green-600" : "bg-indigo-600 hover:bg-indigo-700"}`}
                          onClick={() => handleInsert(prompt.documentation_snippet, itemId)}
                          disabled={isInserted}
                        >
                          {isInserted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Added to Notes
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Insert Assessment Template
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Best Practices */}
              {suggestions.best_practices?.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    Documentation Tips
                  </p>
                  <ul className="space-y-1">
                    {suggestions.best_practices.slice(0, 3).map((bp, idx) => (
                      <li key={idx} className="text-xs text-green-800">
                        <strong>{bp.title}:</strong> {bp.tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Education Topics */}
              {suggestions.education_topics?.length > 0 && (
                <div className="p-3 bg-navy-50 rounded-lg border border-navy-200">
                  <p className="text-xs font-semibold text-navy-800 mb-2">
                    📚 Relevant Patient Education Topics
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.education_topics.map((topic, idx) => (
                      <Badge key={idx} className="bg-navy-100 text-navy-800 border-navy-200 text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}