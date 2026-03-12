import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, FileText, TrendingUp, Clock } from "lucide-react";

export default function PatientHistoryAutoPopulator({ 
  patient, 
  recentVisits, 
  carePlans, 
  diagnosis,
  visitType,
  onPopulate 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHistory, setGeneratedHistory] = useState(null);

  const generateHistorySummary = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Based on this patient's history, generate a concise clinical narrative suitable for inclusion in today's visit note.

PATIENT: ${patient.first_name} ${patient.last_name}
PRIMARY DIAGNOSIS: ${diagnosis || patient.primary_diagnosis}
VISIT TYPE: ${visitType}

PREVIOUS VISITS (Last 3):
${recentVisits.slice(0, 3).map((v, i) => `
Visit ${i + 1} (${v.visit_date}):
${v.nurse_notes?.substring(0, 300)}...
`).join('\n')}

ACTIVE CARE PLANS:
${carePlans.filter(cp => cp.status === 'active').map(cp => `
- Problem: ${cp.problem}
- Goal: ${cp.goal}
- Status: ${cp.status}
`).join('\n')}

PATIENT BASELINE:
- Medications: ${patient.current_medications?.length || 0} medications
- Allergies: ${patient.allergies || 'NKDA'}
- Functional Status: ${patient.functional_status ? JSON.stringify(patient.functional_status) : 'Not documented'}

TASK:
Generate a brief clinical history paragraph (2-4 sentences) that:
1. Summarizes the patient's diagnosis and reason for home health
2. Notes any significant recent changes or trends from previous visits
3. References current care plan focus areas
4. Is ready to paste directly into today's note

Return JSON with:
{
  "history_narrative": "The clinical narrative paragraph",
  "key_trends": ["trend1", "trend2", "trend3"],
  "recent_changes": ["change1", "change2"],
  "care_plan_focus": ["focus1", "focus2"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            history_narrative: { type: "string" },
            key_trends: { type: "array", items: { type: "string" } },
            recent_changes: { type: "array", items: { type: "string" } },
            care_plan_focus: { type: "array", items: { type: "string" } }
          }
        }
      });

      setGeneratedHistory(result);
    } catch (error) {
      console.error('Error generating history:', error);
      alert('Failed to generate history summary');
    }
    setIsGenerating(false);
  };

  if (!patient || !recentVisits || recentVisits.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-green-600" />
          AI Patient History Auto-Populate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!generatedHistory ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-600 mb-3">
              AI will analyze {recentVisits.length} previous visit{recentVisits.length !== 1 ? 's' : ''} and generate relevant history
            </p>
            <Button
              size="sm"
              onClick={generateHistorySummary}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate History
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Generated Narrative */}
            <div className="bg-white rounded-lg border border-green-200 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">Clinical History:</p>
              <p className="text-sm text-gray-900 leading-relaxed">{generatedHistory.history_narrative}</p>
            </div>

            {/* Key Trends */}
            {generatedHistory.key_trends?.length > 0 && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Key Trends:
                </p>
                <ul className="space-y-1">
                  {generatedHistory.key_trends.map((trend, idx) => (
                    <li key={idx} className="text-xs text-blue-800">• {trend}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Changes */}
            {generatedHistory.recent_changes?.length > 0 && (
              <div className="bg-orange-50 rounded-lg border border-orange-200 p-3">
                <p className="text-xs font-semibold text-orange-900 mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Recent Changes:
                </p>
                <ul className="space-y-1">
                  {generatedHistory.recent_changes.map((change, idx) => (
                    <li key={idx} className="text-xs text-orange-800">• {change}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onPopulate(generatedHistory.history_narrative)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Insert into Note
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGeneratedHistory(null)}
              >
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}