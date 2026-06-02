import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Heart,
  AlertTriangle,
  Activity,
  Clock,
  FileText,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
  History,
  Target,
  Loader2,
  Copy
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function IntelligentPatientContext({ 
  patient, 
  carePlans = [], 
  previousVisits = [],
  _currentNoteText = "",
  visitType,
  onInsertContext,
  onPrefillSuggestion
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [_copiedItem, setCopiedItem] = useState(null);

  // Auto-generate suggestions when patient is selected
  useEffect(() => {
    if (patient && previousVisits.length > 0) {
      generateContextualSuggestions();
    }
  }, [patient?.id, previousVisits.length]);

  const generateContextualSuggestions = async () => {
    if (!patient) return;

    setIsLoadingSuggestions(true);
    try {
      const lastVisit = previousVisits[0];
      const activeCarePlans = carePlans.filter(cp => cp.status === 'active');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are assisting a home health nurse with documentation. Based on this patient's history, generate smart pre-fill suggestions.

PATIENT: ${patient.first_name} ${patient.last_name}
PRIMARY DIAGNOSIS: ${patient.primary_diagnosis || 'Not specified'}
SECONDARY DIAGNOSES: ${patient.secondary_diagnoses?.join(', ') || 'None'}
ALLERGIES: ${patient.allergies || 'NKDA'}
CARE TYPE: ${patient.care_type}

LAST VISIT (${lastVisit ? format(new Date(lastVisit.visit_date), 'MM/dd/yyyy') : 'N/A'}):
${lastVisit?.nurse_notes || 'No previous notes'}

VITAL SIGNS FROM LAST VISIT:
${lastVisit?.vital_signs ? JSON.stringify(lastVisit.vital_signs) : 'None recorded'}

ACTIVE CARE PLAN GOALS:
${activeCarePlans.map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || 'None'}

VISIT TYPE TODAY: ${visitType || 'routine_visit'}

Generate:
1. A subjective pre-fill based on what the patient likely reported (based on diagnosis and history)
2. Key items to assess today based on care plan goals
3. Changes to look for compared to last visit
4. Recommended documentation phrases specific to this patient
5. Care plan goals that need progress documentation today

Return JSON:
{
  "subjective_prefill": "Suggested opening for subjective section based on diagnosis",
  "key_assessments": ["assessment item 1", "assessment item 2"],
  "changes_to_monitor": [
    {"item": "what to compare", "last_value": "previous value if known", "trend_concern": "what to watch for"}
  ],
  "recommended_phrases": [
    {"category": "homebound" | "skilled_need" | "patient_response" | "safety", "phrase": "documentation phrase"}
  ],
  "care_plan_updates_needed": [
    {"goal": "care plan goal", "suggested_update": "how to document progress"}
  ],
  "vitals_baseline": {
    "bp": "last BP if known",
    "hr": "last HR if known", 
    "weight": "last weight if known"
  },
  "clinical_alerts": ["any important clinical considerations"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            subjective_prefill: { type: "string" },
            key_assessments: { type: "array", items: { type: "string" } },
            changes_to_monitor: { type: "array", items: { type: "object" } },
            recommended_phrases: { type: "array", items: { type: "object" } },
            care_plan_updates_needed: { type: "array", items: { type: "object" } },
            vitals_baseline: { type: "object" },
            clinical_alerts: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiSuggestions(result);
    } catch (error) {
      console.error("Error generating suggestions:", error);
    }
    setIsLoadingSuggestions(false);
  };

  const _handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleInsert = (text) => {
    if (onInsertContext) {
      onInsertContext(text);
    }
  };

  const handleUsePrefill = () => {
    if (aiSuggestions?.subjective_prefill && onPrefillSuggestion) {
      onPrefillSuggestion('subjective', aiSuggestions.subjective_prefill);
    }
  };

  if (!patient) {
    return (
      <Card className="bg-slate-50 border-dashed border-2">
        <CardContent className="p-4 text-center">
          <User className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-slate-500 font-medium">Select a patient to see smart context</p>
          <p className="text-xs text-slate-400 mt-1">AI will suggest documentation based on their history</p>
        </CardContent>
      </Card>
    );
  }

  const activeCarePlans = carePlans.filter(cp => cp.status === 'active');
  const lastVisit = previousVisits[0];
  const daysSinceLastVisit = lastVisit ? differenceInDays(new Date(), new Date(lastVisit.visit_date)) : null;

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader 
        className="py-3 cursor-pointer hover:bg-blue-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Smart Patient Context</span>
            {isLoadingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white text-xs">
              {patient.first_name} {patient.last_name}
            </Badge>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-3">
          {/* Quick Patient Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" />
              <span className="font-medium truncate">{patient.primary_diagnosis || 'No diagnosis'}</span>
            </div>
            {patient.allergies && patient.allergies !== 'NKDA' && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-medium">{patient.allergies}</span>
              </div>
            )}
            {lastVisit && (
              <div className="flex items-center gap-1 text-slate-600">
                <Clock className="w-3 h-3" />
                <span>Last visit: {daysSinceLastVisit} days ago</span>
              </div>
            )}
            {activeCarePlans.length > 0 && (
              <div className="flex items-center gap-1 text-purple-600">
                <Target className="w-3 h-3" />
                <span>{activeCarePlans.length} active goal{activeCarePlans.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Clinical Alerts */}
          {aiSuggestions?.clinical_alerts?.length > 0 && (
            <Alert className="bg-red-50 border-red-200 py-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-xs text-red-800">
                {aiSuggestions.clinical_alerts.map((alert, idx) => (
                  <div key={idx}>• {alert}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Subjective Pre-fill Suggestion */}
          {aiSuggestions?.subjective_prefill && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-green-800 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Suggested Subjective Opening
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-green-700 hover:bg-green-100"
                  onClick={handleUsePrefill}
                >
                  Use This
                </Button>
              </div>
              <p className="text-xs text-green-700 italic">"{aiSuggestions.subjective_prefill}"</p>
            </div>
          )}

          {/* Key Assessments for Today */}
          {aiSuggestions?.key_assessments?.length > 0 && (
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-600" />
                Key Assessments for Today
              </p>
              <div className="flex flex-wrap gap-1">
                {aiSuggestions.key_assessments.map((item, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-blue-50"
                    onClick={() => handleInsert(`Assessed: ${item}. `)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Vitals Baseline */}
          {aiSuggestions?.vitals_baseline && (
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <History className="w-3 h-3 text-purple-600" />
                Last Visit Baselines
              </p>
              <div className="flex gap-3 text-xs">
                {aiSuggestions.vitals_baseline.bp && (
                  <span>BP: <strong>{aiSuggestions.vitals_baseline.bp}</strong></span>
                )}
                {aiSuggestions.vitals_baseline.hr && (
                  <span>HR: <strong>{aiSuggestions.vitals_baseline.hr}</strong></span>
                )}
                {aiSuggestions.vitals_baseline.weight && (
                  <span>Wt: <strong>{aiSuggestions.vitals_baseline.weight}</strong></span>
                )}
              </div>
            </div>
          )}

          {/* Changes to Monitor */}
          {aiSuggestions?.changes_to_monitor?.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Compare to Last Visit</p>
              <div className="space-y-1">
                {aiSuggestions.changes_to_monitor.slice(0, 3).map((change, idx) => (
                  <div key={idx} className="text-xs text-yellow-700">
                    • <strong>{change.item}</strong>: {change.trend_concern}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Phrases */}
          {aiSuggestions?.recommended_phrases?.length > 0 && (
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-indigo-600" />
                Quick Insert Phrases
              </p>
              <div className="space-y-1">
                {aiSuggestions.recommended_phrases.slice(0, 4).map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between text-xs bg-slate-50 p-1 rounded hover:bg-indigo-50 cursor-pointer"
                    onClick={() => handleInsert(item.phrase + ' ')}
                  >
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs capitalize">{item.category}</Badge>
                      <span className="text-slate-600 truncate max-w-[200px]">{item.phrase}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Care Plan Progress Needed */}
          {aiSuggestions?.care_plan_updates_needed?.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
              <p className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Document Progress On:
              </p>
              <div className="space-y-1">
                {aiSuggestions.care_plan_updates_needed.slice(0, 2).map((cp, idx) => (
                  <div 
                    key={idx} 
                    className="text-xs bg-white p-1 rounded border cursor-pointer hover:bg-purple-100"
                    onClick={() => handleInsert(`${cp.goal}: ${cp.suggested_update} `)}
                  >
                    <strong className="text-purple-700">{cp.goal}</strong>
                    <p className="text-slate-600">{cp.suggested_update}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={generateContextualSuggestions}
            disabled={isLoadingSuggestions}
          >
            {isLoadingSuggestions ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-3 h-3 mr-1" /> Refresh AI Suggestions</>
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}