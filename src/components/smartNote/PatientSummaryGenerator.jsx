import { useState } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Copy, CheckCircle2, ChevronDown, ChevronUp, User } from "lucide-react";

export default function PatientSummaryGenerator({ patient, visitTranscript, visitType }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  if (!patient || !visitTranscript || visitTranscript.trim().length < 30) return null;

  const generateSummary = async () => {
    setLoading(true);
    try {
      const meds = patient.current_medications?.map(m => `${m.name} ${m.dosage}`).join(", ") || "none";
      const result = await invokeLLM({
        prompt: `You are a home health clinical documentation expert. Generate a concise, structured patient summary from this visit transcript/note.

PATIENT: ${patient.first_name} ${patient.last_name}
DIAGNOSIS: ${patient.primary_diagnosis || "unknown"}
MEDICATIONS: ${meds}
VISIT TYPE: ${visitType}

VISIT TRANSCRIPT/NOTES:
${visitTranscript}

Create a structured patient summary with:
1. Chief concern / reason for visit
2. Key clinical findings from this visit
3. Patient response to interventions
4. Functional status update
5. Education provided
6. Plan / next steps

Keep each section to 1-2 sentences. Use professional medical language. Return JSON:
{
  "chief_concern": "<string>",
  "clinical_findings": "<string>",
  "patient_response": "<string>",
  "functional_status": "<string>",
  "education": "<string>",
  "plan": "<string>",
  "overall_condition": "<stable|improving|declining|unchanged>"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            chief_concern: { type: "string" },
            clinical_findings: { type: "string" },
            patient_response: { type: "string" },
            functional_status: { type: "string" },
            education: { type: "string" },
            plan: { type: "string" },
            overall_condition: { type: "string" },
          }
        }
      });
      setSummary(result);
    } catch (err) {
      console.error("Summary generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const summaryText = summary ? `PATIENT VISIT SUMMARY
Patient: ${patient.first_name} ${patient.last_name} | ${visitType.replace(/_/g, " ").toUpperCase()}

Chief Concern: ${summary.chief_concern}
Clinical Findings: ${summary.clinical_findings}
Patient Response: ${summary.patient_response}
Functional Status: ${summary.functional_status}
Education Provided: ${summary.education}
Plan: ${summary.plan}` : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const conditionColors = {
    stable: "bg-blue-100 text-blue-800",
    improving: "bg-green-100 text-green-800",
    declining: "bg-red-100 text-red-800",
    unchanged: "bg-slate-100 text-slate-700",
  };

  return (
    <Card className="border border-violet-200 bg-violet-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-800">AI Patient Summary</span>
            {summary?.overall_condition && (
              <Badge className={`text-xs ${conditionColors[summary.overall_condition] || conditionColors.unchanged}`}>
                {summary.overall_condition}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!summary && !loading && (
              <Button size="sm" onClick={generateSummary} className="h-7 text-xs bg-violet-600 hover:bg-violet-700">
                <FileText className="w-3 h-3 mr-1" /> Generate Summary
              </Button>
            )}
            {summary && (
              <>
                <Button size="sm" variant="ghost" onClick={generateSummary} className="h-7 text-xs text-violet-600">Regenerate</Button>
                <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 text-xs gap-1 text-violet-600">
                  {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </>
            )}
            {summary && (
              <button onClick={() => setExpanded(!expanded)} className="text-violet-400 hover:text-violet-700">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-violet-600 py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Generating patient summary from your notes...
          </div>
        )}

        {summary && expanded && (
          <div className="space-y-2">
            {[
              { label: "Chief Concern", value: summary.chief_concern },
              { label: "Clinical Findings", value: summary.clinical_findings },
              { label: "Patient Response", value: summary.patient_response },
              { label: "Functional Status", value: summary.functional_status },
              { label: "Education Provided", value: summary.education },
              { label: "Plan", value: summary.plan },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}