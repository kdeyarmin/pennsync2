import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Plus } from "lucide-react";

const CATEGORY_COLORS = {
  assessment: "bg-blue-100 text-blue-800",
  intervention: "bg-purple-100 text-purple-800",
  education: "bg-green-100 text-green-800",
  homebound: "bg-orange-100 text-orange-800",
  skilled_need: "bg-red-100 text-red-800",
};

export default function SmartSuggestionsPanel({ patient, visitType, onInsert }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const patientCtx = patient
        ? `Patient: ${patient.first_name} ${patient.last_name}, Diagnosis: ${patient.primary_diagnosis || "unknown"}, Meds: ${patient.current_medications?.map(m => m.name).join(", ") || "none"}, Fall Risk: ${patient.functional_status?.fall_risk || "unknown"}`
        : "No patient selected";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a home health nursing documentation expert. Generate smart note snippet suggestions for a ${visitType} visit.

PATIENT CONTEXT: ${patientCtx}

Generate 8-10 specific, ready-to-use clinical phrases that a nurse can click to insert into their note. Each should be a complete, compliant sentence covering different documentation areas.

Return JSON:
{
  "suggestions": [
    {
      "category": "<assessment|intervention|education|homebound|skilled_need>",
      "label": "<2-4 word label>",
      "text": "<complete clinical sentence ready to insert>"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  label: { type: "string" },
                  text: { type: "string" },
                }
              }
            }
          }
        }
      });

      setSuggestions(result?.suggestions || []);
      setGenerated(true);
    } catch (err) {
      console.error("Suggestions failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-sm font-semibold text-indigo-800 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Smart Suggestions
        </span>
        <div className="flex items-center gap-2">
          {!generated && !loading && (
            <Button size="sm" variant="ghost" onClick={generateSuggestions} className="h-7 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100">
              Generate
            </Button>
          )}
          {generated && (
            <Button size="sm" variant="ghost" onClick={generateSuggestions} className="h-7 text-xs text-indigo-600 hover:bg-indigo-100">
              Refresh
            </Button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-indigo-400 hover:text-indigo-700">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3">
          {loading && (
            <div className="flex items-center gap-2 py-3 text-sm text-indigo-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating smart suggestions...
            </div>
          )}
          {!loading && !generated && (
            <p className="text-xs text-indigo-600 pb-2">
              Click "Generate" to get AI-powered note snippets based on your patient and visit type.
            </p>
          )}
          {!loading && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onInsert(s.text)}
                  className="group flex items-center gap-1.5 text-xs bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700 rounded-lg px-2.5 py-1.5 transition-all text-left"
                  title={s.text}
                >
                  <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${CATEGORY_COLORS[s.category] || "bg-gray-100 text-gray-700"}`}>
                    {s.label}
                  </Badge>
                  <span className="truncate max-w-[200px]">{s.text}</span>
                  <Plus className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}