import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, CheckCircle2, Tag, DollarSign, ChevronDown, ChevronUp } from "lucide-react";

function CodeCard({ code, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-indigo-300 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-indigo-700">{code.code}</span>
          <Badge className="text-xs bg-slate-100 text-slate-600">{code.confidence}%</Badge>
        </div>
        <p className="text-xs text-slate-600 mt-0.5 truncate">{code.description}</p>
        {code.rationale && (
          <p className="text-xs text-slate-400 mt-0.5 italic">{code.rationale}</p>
        )}
      </div>
      <button
        onClick={() => onCopy(code.code)}
        className="shrink-0 p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        title="Copy code"
      >
        {copied === code.code ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ClinicalCodeSuggester({ noteText, patientContext }) {
  const [codes, setCodes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showICD, setShowICD] = useState(true);
  const [showCPT, setShowCPT] = useState(true);

  const suggest = async () => {
    if (!noteText?.trim() || noteText.trim().length < 20) return;
    setLoading(true);
    setCodes(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a medical coding specialist for home health nursing documentation. Analyze this clinical note and suggest the most appropriate ICD-10 diagnosis codes and CPT procedure codes.

CLINICAL NOTE:
${noteText}

${patientContext ? `PATIENT CONTEXT:\n${patientContext}` : ""}

RULES:
1. Only suggest codes that are directly supported by content in the note. Do not suggest codes for conditions not mentioned.
2. For ICD-10: suggest the most specific code possible. Include both primary diagnosis and any secondary/comorbid conditions mentioned.
3. For CPT: focus on home health-relevant codes (99XXX E&M, wound care, infusion, etc.)
4. Provide a confidence score (0-100) based on how clearly the code is supported by the note.
5. Include a brief rationale citing the specific note text that supports each code.

Return JSON:
{
  "icd10_codes": [
    { "code": "string", "description": "string", "confidence": 0-100, "rationale": "cite note text" }
  ],
  "cpt_codes": [
    { "code": "string", "description": "string", "confidence": 0-100, "rationale": "cite note text" }
  ],
  "primary_icd10": "the single most appropriate primary diagnosis code",
  "coding_notes": "any important coding considerations or caveats"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            icd10_codes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                  rationale: { type: "string" }
                }
              }
            },
            cpt_codes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                  rationale: { type: "string" }
                }
              }
            },
            primary_icd10: { type: "string" },
            coding_notes: { type: "string" }
          }
        }
      });
      setCodes(result);
    } catch (err) {
      alert("Failed to generate code suggestions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllICD = async () => {
    if (!codes?.icd10_codes?.length) return;
    await navigator.clipboard.writeText(codes.icd10_codes.map(c => `${c.code} - ${c.description}`).join("\n"));
    setCopiedCode("all_icd");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllCPT = async () => {
    if (!codes?.cpt_codes?.length) return;
    await navigator.clipboard.writeText(codes.cpt_codes.map(c => `${c.code} - ${c.description}`).join("\n"));
    setCopiedCode("all_cpt");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const ready = noteText?.trim().length >= 20;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-800">ICD-10 & CPT Code Suggestions</span>
          <Badge className="bg-emerald-100 text-emerald-700 text-xs">AI</Badge>
        </div>
        <Button
          size="sm"
          onClick={suggest}
          disabled={!ready || loading}
          className="h-7 bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Analyzing…" : "Suggest Codes"}
        </Button>
      </div>

      {!ready && !codes && (
        <div className="px-4 py-3 text-xs text-slate-400 italic">
          Enter clinical note content above to enable code suggestions.
        </div>
      )}

      {loading && (
        <div className="px-4 py-6 text-center">
          <Loader2 className="w-6 h-6 text-emerald-500 mx-auto animate-spin mb-2" />
          <p className="text-sm text-slate-500">Analyzing note for billable codes…</p>
        </div>
      )}

      {codes && (
        <div className="p-4 space-y-4">
          {/* Primary diagnosis callout */}
          {codes.primary_icd10 && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <DollarSign className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-indigo-600 font-semibold">Primary Diagnosis Code: </span>
                <span className="text-xs font-mono font-bold text-indigo-800">{codes.primary_icd10}</span>
              </div>
              <button onClick={() => copyCode(codes.primary_icd10)} className="shrink-0 p-1 rounded hover:bg-indigo-100 text-indigo-400">
                {copiedCode === codes.primary_icd10 ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* ICD-10 Section */}
          {codes.icd10_codes?.length > 0 && (
            <div>
              <button
                className="flex items-center justify-between w-full mb-2"
                onClick={() => setShowICD(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">ICD-10 Codes</span>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">{codes.icd10_codes.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyAllICD(); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copiedCode === "all_icd" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    Copy all
                  </button>
                  {showICD ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              {showICD && (
                <div className="space-y-1.5">
                  {codes.icd10_codes
                    .sort((a, b) => b.confidence - a.confidence)
                    .map((c, i) => (
                      <CodeCard key={i} code={c} onCopy={copyCode} copied={copiedCode} />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* CPT Section */}
          {codes.cpt_codes?.length > 0 && (
            <div>
              <button
                className="flex items-center justify-between w-full mb-2"
                onClick={() => setShowCPT(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">CPT Codes</span>
                  <Badge className="bg-green-100 text-green-700 text-xs">{codes.cpt_codes.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyAllCPT(); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copiedCode === "all_cpt" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    Copy all
                  </button>
                  {showCPT ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              {showCPT && (
                <div className="space-y-1.5">
                  {codes.cpt_codes
                    .sort((a, b) => b.confidence - a.confidence)
                    .map((c, i) => (
                      <CodeCard key={i} code={c} onCopy={copyCode} copied={copiedCode} />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Coding notes */}
          {codes.coding_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-800"><strong>Coding Note:</strong> {codes.coding_notes}</p>
            </div>
          )}

          <p className="text-xs text-slate-400 italic">
            ⚠ AI-suggested codes require clinical verification before billing submission.
          </p>
        </div>
      )}
    </div>
  );
}