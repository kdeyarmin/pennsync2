import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ClinicalPhraseExpander({ 
  value, 
  onChange, 
  patientId = null,
  placeholder = "Type a clinical phrase or start typing...",
  className = ""
}) {
  const [isExpanding, setIsExpanding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['clinical-templates-active'],
    queryFn: () => base44.entities.ClinicalLibraryTemplate.filter({ is_active: true }),
    initialData: []
  });

  // Detect phrases as user types
  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      return;
    }

    const lastLine = value.split('\n').pop()?.toLowerCase().trim();
    if (!lastLine) {
      setSuggestions([]);
      return;
    }

    // Find matching templates
    const matches = templates.filter(t => 
      t.phrase.toLowerCase().includes(lastLine) || 
      lastLine.includes(t.phrase.toLowerCase())
    );

    if (matches.length > 0) {
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
    }
  }, [value, templates]);

  const expandPhrase = async (phrase, template = null) => {
    setIsExpanding(true);
    setShowSuggestions(false);

    try {
      const response = await base44.functions.invoke('expandClinicalPhrase', {
        phrase,
        patientId,
        contextData: { currentNote: value }
      });

      if (response.data.expandedText) {
        // Replace the phrase with expanded text
        const lines = value.split('\n');
        const lastLineIndex = lines.length - 1;
        const lastLine = lines[lastLineIndex];
        
        // Replace the phrase in the last line
        const phraseIndex = lastLine.toLowerCase().indexOf(phrase.toLowerCase());
        if (phraseIndex !== -1) {
          const before = lastLine.substring(0, phraseIndex);
          const after = lastLine.substring(phraseIndex + phrase.length);
          lines[lastLineIndex] = before + response.data.expandedText + after;
        } else {
          // Append if not found
          lines.push('\n' + response.data.expandedText);
        }

        onChange(lines.join('\n'));
        toast.success('Phrase expanded successfully');
      }
    } catch (error) {
      console.error('Error expanding phrase:', error);
      toast.error('Failed to expand phrase');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleSuggestionClick = (template) => {
    expandPhrase(template.phrase, template);
  };

  return (
    <div className="relative">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${className} w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
          disabled={isExpanding}
        />
        {isExpanding && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Expanding phrase...</p>
            </div>
          </div>
        )}
      </div>

      {/* Phrase Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-2 shadow-lg border-2 border-indigo-200">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 px-2 py-1 border-b mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-medium text-gray-700">Quick Phrase Suggestions</span>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {suggestions.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSuggestionClick(template)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {template.phrase}
                        </code>
                        {template.template_type === 'patient_specific' && (
                          <span className="text-xs text-purple-600">Patient-Specific</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                        {template.expanded_text || template.ai_prompt_instructions}
                      </p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}