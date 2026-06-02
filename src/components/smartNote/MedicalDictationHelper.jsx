import { useState, useEffect } from "react";
import { suggestMedicalCorrections } from "../utils/medicalDictionary";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function MedicalDictationHelper({ noteText, onApplySuggestion }) {
  const [uncertainTerms, setUncertainTerms] = useState([]);

  useEffect(() => {
    if (!noteText) {
      setUncertainTerms([]);
      return;
    }

    // Find potential medical terms that may have been misheard
    // Look for patterns like unusual capitalizations or common mishears
    const words = noteText.split(/\s+/);
    const uncertain = [];

    words.forEach((word) => {
      const cleaned = word.replace(/[,.\-]/g, "");
      
      // Check if word looks unusual (too short medical term, unusual casing, etc)
      if (cleaned.length >= 3 && cleaned.length <= 15) {
        const suggestions = suggestMedicalCorrections(cleaned);
        if (suggestions.length > 0 && suggestions[0].toLowerCase() !== cleaned.toLowerCase()) {
          // Only flag if we have a clear suggestion that differs
          uncertain.push({
            original: cleaned,
            suggestions: suggestions.slice(0, 3),
            fullWord: word
          });
        }
      }
    });

    // Limit to first 5 uncertain terms to avoid overwhelming
    setUncertainTerms(uncertain.slice(0, 5));
  }, [noteText]);

  if (uncertainTerms.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
        <AlertCircle className="w-4 h-4" />
        <span>Possible medical term corrections</span>
      </div>
      <div className="space-y-1.5">
        {uncertainTerms.map((term, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs bg-white rounded-lg p-2">
            <span className="text-slate-600">"{term.original}" →</span>
            {term.suggestions.map((suggestion, sugIdx) => (
              <Button
                key={sugIdx}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => {
                  const regex = new RegExp(`\\b${term.fullWord}\\b`, "g");
                  onApplySuggestion((prev) => prev.replace(regex, suggestion));
                  setUncertainTerms((prev) => prev.filter((_, i) => i !== idx));
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                {suggestion}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}