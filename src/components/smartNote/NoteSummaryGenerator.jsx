import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Loader2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Stethoscope,
  Heart,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function NoteSummaryGenerator({ noteText, patientName, diagnosis }) {
  const [summary, setSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const generateSummary = async () => {
    if (!noteText || noteText.length < 50) {
      alert("Please enter more note content to generate a summary.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation specialist. Analyze this nursing note and create a concise summary for quick chart review.

PATIENT: ${patientName || 'Unknown'}
DIAGNOSIS: ${diagnosis || 'Not specified'}

NURSING NOTE:
${noteText}

Generate a structured summary that highlights:
1. KEY FINDINGS: Most important clinical observations (vitals, symptoms, assessments)
2. INTERVENTIONS: What was done during the visit
3. PATIENT STATUS: Overall condition and any changes from baseline
4. ALERTS: Any concerning findings requiring attention
5. FOLLOW-UP: Items needing attention at next visit

Keep each section brief (1-2 sentences max). Focus on clinically significant information only.

Return JSON:
{
  "one_liner": "Single sentence summary of the visit (max 20 words)",
  "key_findings": [
    {
      "finding": "Brief finding",
      "category": "vitals" | "respiratory" | "cardiac" | "neuro" | "wound" | "pain" | "other",
      "significance": "normal" | "improved" | "stable" | "concerning" | "critical"
    }
  ],
  "interventions": ["Intervention 1", "Intervention 2"],
  "patient_status": {
    "overall": "stable" | "improving" | "declining" | "unchanged",
    "summary": "Brief status description"
  },
  "alerts": [
    {
      "alert": "Alert text",
      "priority": "high" | "medium" | "low"
    }
  ],
  "follow_up_items": ["Item 1", "Item 2"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            one_liner: { type: "string" },
            key_findings: { type: "array", items: { type: "object" } },
            interventions: { type: "array", items: { type: "string" } },
            patient_status: { type: "object" },
            alerts: { type: "array", items: { type: "object" } },
            follow_up_items: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSummary(result);
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Error generating summary. Please try again.");
    }
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    if (!summary) return;
    
    const text = `VISIT SUMMARY: ${summary.one_liner}

KEY FINDINGS:
${summary.key_findings?.map(f => `• ${f.finding} (${f.significance})`).join('\n') || 'None noted'}

INTERVENTIONS:
${summary.interventions?.map(i => `• ${i}`).join('\n') || 'None documented'}

STATUS: ${summary.patient_status?.overall?.toUpperCase()} - ${summary.patient_status?.summary}

${summary.alerts?.length > 0 ? `ALERTS:\n${summary.alerts.map(a => `⚠️ ${a.alert}`).join('\n')}` : ''}

FOLLOW-UP:
${summary.follow_up_items?.map(f => `• ${f}`).join('\n') || 'None'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': 
      case 'unchanged': return <Minus className="w-4 h-4 text-blue-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'improving': return 'bg-green-100 text-green-800 border-green-300';
      case 'declining': return 'bg-red-100 text-red-800 border-red-300';
      case 'stable': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSignificanceColor = (sig) => {
    switch (sig) {
      case 'critical': return 'bg-red-600 text-white';
      case 'concerning': return 'bg-orange-100 text-orange-800';
      case 'improved': return 'bg-green-100 text-green-800';
      case 'normal': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'cardiac': return <Heart className="w-3 h-3" />;
      case 'vitals': return <Stethoscope className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  return (
    <Card className="border-teal-200">
      <CardHeader 
        className="py-3 bg-gradient-to-r from-teal-50 to-cyan-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            AI Note Summary
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3">
          {!summary ? (
            <Button
              onClick={generateSummary}
              disabled={isGenerating || !noteText || noteText.length < 50}
              className="w-full bg-teal-600 hover:bg-teal-700"
              size="sm"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Summary...</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" /> Generate Quick Summary</>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* One-liner summary */}
              <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-sm font-medium text-teal-900">{summary.one_liner}</p>
              </div>

              {/* Patient Status */}
              <div className="flex items-center gap-2">
                {getStatusIcon(summary.patient_status?.overall)}
                <Badge className={getStatusColor(summary.patient_status?.overall)}>
                  {summary.patient_status?.overall?.toUpperCase()}
                </Badge>
                <span className="text-xs text-gray-600">{summary.patient_status?.summary}</span>
              </div>

              {/* Alerts */}
              {summary.alerts?.length > 0 && (
                <div className="space-y-1">
                  {summary.alerts.map((alert, idx) => (
                    <Alert key={idx} className={`py-2 ${alert.priority === 'high' ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
                      <AlertTriangle className={`w-4 h-4 ${alert.priority === 'high' ? 'text-red-600' : 'text-yellow-600'}`} />
                      <AlertDescription className="text-xs">{alert.alert}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Key Findings */}
              {summary.key_findings?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Key Findings</p>
                  <div className="flex flex-wrap gap-1">
                    {summary.key_findings.map((f, idx) => (
                      <Badge key={idx} variant="outline" className={`text-xs ${getSignificanceColor(f.significance)}`}>
                        {getCategoryIcon(f.category)} {f.finding}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Interventions */}
              {summary.interventions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Interventions</p>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    {summary.interventions.map((i, idx) => (
                      <li key={idx}>• {i}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up */}
              {summary.follow_up_items?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Follow-up Items</p>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    {summary.follow_up_items.map((f, idx) => (
                      <li key={idx}>→ {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1 text-green-600" /> Copied!</>
                  ) : (
                    <><Copy className="w-3 h-3 mr-1" /> Copy Summary</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSummary(null)}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}