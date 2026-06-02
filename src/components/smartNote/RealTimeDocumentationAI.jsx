import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Copy,
  X,
  Sparkles,
  Target,
  BookOpen,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RealTimeDocumentationAI({
  noteContent,
  visitType,
  diagnosis,
  patientData,
  oasisData,
  careType = "home_health",
  onSuggestionApply,
  minimized = false
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const lastAnalyzedContent = useRef("");
  const analysisTimeout = useRef(null);

  // Debounced analysis - triggers 2 seconds after user stops typing
  useEffect(() => {
    if (!noteContent || noteContent.length < 50) {
      setSuggestions([]);
      return;
    }

    // Only analyze if content changed significantly
    const contentDiff = Math.abs(noteContent.length - lastAnalyzedContent.current.length);
    if (contentDiff < 20 && lastAnalyzedContent.current.length > 0) {
      return;
    }

    // Clear existing timeout
    if (analysisTimeout.current) {
      clearTimeout(analysisTimeout.current);
    }

    // Set new timeout
    analysisTimeout.current = setTimeout(() => {
      analyzeDocumentation();
    }, 2000);

    return () => {
      if (analysisTimeout.current) {
        clearTimeout(analysisTimeout.current);
      }
    };
  }, [noteContent, visitType, diagnosis]);

  const analyzeDocumentation = async () => {
    if (!noteContent || noteContent === lastAnalyzedContent.current) return;

    setIsAnalyzing(true);
    try {
      const prompt = `You are a Medicare documentation expert for home health. Analyze this in-progress clinical note and provide real-time suggestions for improvement.

VISIT TYPE: ${visitType || 'Unknown'}
DIAGNOSIS: ${diagnosis || 'Not specified'}
CARE TYPE: ${careType}

CURRENT NOTE CONTENT:
${noteContent}

${patientData ? `PATIENT CONTEXT:
- Primary Diagnosis: ${patientData.primary_diagnosis || 'N/A'}
- Care Type: ${patientData.care_type || 'home_health'}
- Functional Status: ${patientData.functional_status?.ambulation || 'Unknown'}
- Cognitive Status: ${patientData.social_history?.cognitive_status || 'Unknown'}
` : ''}

${oasisData ? `OASIS CONTEXT:
- Assessment Type: ${oasisData.assessment_type || 'Unknown'}
- Clinical Group: ${oasisData.pdgm_data?.clinical_group || 'Unknown'}
- Functional Level: ${oasisData.pdgm_data?.functional_level || 'Unknown'}
` : ''}

ANALYZE FOR:
1. **Documentation Gaps** - What critical Medicare elements are missing?
2. **CMS Compliance Issues** - What violates CMS documentation requirements?
3. **Care Plan Alignment** - Does documentation support care plan goals?
4. **Patient Education Opportunities** - What teaching should be documented?
5. **Quality Improvement** - How can narrative be more specific and measurable?

For each suggestion:
- Be SPECIFIC about what's missing or needs improvement
- Provide EXACT TEXT the clinician can add
- Reference CMS regulations when applicable
- Prioritize by compliance risk (critical, high, medium, low)

Only suggest improvements that are ACTIONABLE and RELEVANT to this specific visit type and diagnosis.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_quality_score: { type: "number" },
            documentation_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { 
                    type: "string",
                    enum: ["skilled_need", "homebound_status", "patient_response", "functional_status", "vital_signs", "assessment", "plan_of_care", "patient_education", "safety"]
                  },
                  gap: { type: "string" },
                  severity: {
                    type: "string",
                    enum: ["critical", "high", "medium", "low"]
                  },
                  suggested_text: { type: "string" },
                  cms_reference: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            quality_improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  current_issue: { type: "string" },
                  improved_text: { type: "string" },
                  benefit: { type: "string" }
                }
              }
            },
            patient_education_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  suggested_documentation: { type: "string" },
                  teach_back_prompt: { type: "string" }
                }
              }
            },
            care_plan_alignment: {
              type: "object",
              properties: {
                goals_addressed: { type: "array", items: { type: "string" } },
                missing_goals: { type: "array", items: { type: "string" } },
                suggested_progress_note: { type: "string" }
              }
            },
            compliance_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  regulation: { type: "string" },
                  fix: { type: "string" },
                  severity: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Transform results into actionable suggestions
      const newSuggestions = [];

      // Documentation gaps (highest priority)
      result.documentation_gaps?.forEach((gap, idx) => {
        newSuggestions.push({
          id: `gap-${idx}`,
          type: 'gap',
          category: gap.category,
          severity: gap.severity,
          title: gap.gap,
          suggestedText: gap.suggested_text,
          rationale: gap.rationale,
          cmsReference: gap.cms_reference,
          icon: AlertTriangle
        });
      });

      // Compliance alerts
      result.compliance_alerts?.forEach((alert, idx) => {
        newSuggestions.push({
          id: `compliance-${idx}`,
          type: 'compliance',
          severity: alert.severity || 'high',
          title: alert.issue,
          suggestedText: alert.fix,
          rationale: `CMS Regulation: ${alert.regulation}`,
          icon: AlertTriangle
        });
      });

      // Quality improvements
      result.quality_improvements?.forEach((improvement, idx) => {
        newSuggestions.push({
          id: `quality-${idx}`,
          type: 'quality',
          severity: 'medium',
          title: improvement.current_issue,
          suggestedText: improvement.improved_text,
          rationale: improvement.benefit,
          icon: Sparkles
        });
      });

      // Patient education
      result.patient_education_opportunities?.forEach((edu, idx) => {
        newSuggestions.push({
          id: `education-${idx}`,
          type: 'education',
          severity: 'medium',
          title: `Patient Education: ${edu.topic}`,
          suggestedText: edu.suggested_documentation,
          rationale: `Teach-back prompt: ${edu.teach_back_prompt}`,
          icon: BookOpen
        });
      });

      // Care plan alignment
      if (result.care_plan_alignment?.missing_goals?.length > 0) {
        newSuggestions.push({
          id: 'careplan-missing',
          type: 'careplan',
          severity: 'high',
          title: `Missing Care Plan Goals: ${result.care_plan_alignment.missing_goals.join(', ')}`,
          suggestedText: result.care_plan_alignment.suggested_progress_note,
          rationale: 'Document progress toward all active care plan goals',
          icon: Target
        });
      }

      // Filter out dismissed suggestions
      const activeSuggestions = newSuggestions.filter(s => !dismissedSuggestions.has(s.id));
      
      // Sort by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      activeSuggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setSuggestions(activeSuggestions);
      lastAnalyzedContent.current = noteContent;
    } catch (error) {
      console.error("Real-time analysis error:", error);
    }
    setIsAnalyzing(false);
  };

  const applySuggestion = (suggestion) => {
    if (onSuggestionApply) {
      onSuggestionApply(suggestion.suggestedText);
    }
    dismissSuggestion(suggestion.id);
  };

  const copySuggestion = (text) => {
    navigator.clipboard.writeText(text);
  };

  const dismissSuggestion = (id) => {
    setDismissedSuggestions(prev => new Set([...prev, id]));
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-slate-300 bg-slate-50';
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-600 text-white',
      medium: 'bg-yellow-600 text-white',
      low: 'bg-blue-600 text-white'
    };
    return colors[severity] || 'bg-slate-600 text-white';
  };

  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        {suggestions.length > 0 && (
          <Button
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
            size="lg"
          >
            <Lightbulb className="w-5 h-5 mr-2" />
            {suggestions.length} Suggestion{suggestions.length !== 1 ? 's' : ''}
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-600" />
            AI Documentation Assistant
            {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
          </CardTitle>
          {suggestions.length > 0 && (
            <Badge className="bg-purple-600 text-white">
              {suggestions.length} Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isAnalyzing && suggestions.length === 0 && (
          <div className="flex items-center justify-center py-6 text-sm text-purple-700">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Analyzing documentation quality...
          </div>
        )}

        {!isAnalyzing && suggestions.length === 0 && noteContent.length > 50 && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900 text-sm">
              Documentation looks good! Keep writing and I'll monitor for improvements.
            </AlertDescription>
          </Alert>
        )}

        {!isAnalyzing && noteContent.length < 50 && (
          <div className="text-center py-6 text-sm text-slate-600">
            Start writing your note to receive real-time suggestions...
          </div>
        )}

        <AnimatePresence>
          {suggestions.length > 0 && (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className={`border-2 rounded-lg p-3 ${getSeverityColor(suggestion.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <suggestion.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          suggestion.severity === 'critical' || suggestion.severity === 'high' 
                            ? 'text-red-600' 
                            : suggestion.severity === 'medium'
                              ? 'text-yellow-600'
                              : 'text-blue-600'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-slate-900">{suggestion.title}</p>
                            <Badge className={getSeverityBadge(suggestion.severity)} size="sm">
                              {suggestion.severity}
                            </Badge>
                          </div>
                          {suggestion.category && (
                            <Badge variant="outline" className="text-xs mb-2">
                              {suggestion.category.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => dismissSuggestion(suggestion.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="bg-white/80 rounded p-2 mb-2 text-sm text-slate-700">
                      <p className="font-medium text-xs text-slate-600 mb-1">Rationale:</p>
                      <p>{suggestion.rationale}</p>
                    </div>

                    {suggestion.suggestedText && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                        <p className="font-medium text-xs text-green-800 mb-1">Suggested Text:</p>
                        <p className="text-sm text-green-900 italic">{suggestion.suggestedText}</p>
                      </div>
                    )}

                    {suggestion.cmsReference && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2 text-xs text-blue-900">
                        <strong>CMS Reference:</strong> {suggestion.cmsReference}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => applySuggestion(suggestion)}
                        className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copySuggestion(suggestion.suggestedText)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}