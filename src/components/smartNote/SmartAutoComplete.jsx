import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";


import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Plus } from "lucide-react";

// Common medical phrases organized by category
const medicalPhrases = {
  assessment: [
    { trigger: "lungs", text: "Lung sounds clear bilateral, no wheezes, rhonchi, or crackles noted." },
    { trigger: "heart", text: "Heart sounds regular rate and rhythm, no murmurs, gallops, or rubs." },
    { trigger: "edema", text: "No peripheral edema noted bilateral lower extremities." },
    { trigger: "skin", text: "Skin warm, dry, intact with good turgor. No lesions or breakdown noted." },
    { trigger: "neuro", text: "Alert and oriented x4. PERRLA. Motor strength 5/5 all extremities." },
    { trigger: "abd", text: "Abdomen soft, non-tender, non-distended. Bowel sounds active all quadrants." },
    { trigger: "wound", text: "Wound assessed: [location], measuring [L]cm x [W]cm x [D]cm. Wound bed: " },
    { trigger: "pain", text: "Pain assessed using 0-10 scale. Patient reports pain level of " },
  ],
  interventions: [
    { trigger: "med", text: "Medication reconciliation completed. All medications reviewed with patient." },
    { trigger: "teach", text: "Patient education provided on " },
    { trigger: "vitals", text: "Vital signs obtained and documented." },
    { trigger: "dress", text: "Dressing changed per physician orders. Old dressing removed, wound cleansed with " },
    { trigger: "falls", text: "Fall risk assessment completed. Fall prevention education provided." },
    { trigger: "dm", text: "Blood glucose checked: [value] mg/dL. Diabetic foot exam performed." },
  ],
  response: [
    { trigger: "verbal", text: "Patient verbalized understanding of teaching provided." },
    { trigger: "demo", text: "Patient demonstrated correct technique for " },
    { trigger: "tolerate", text: "Patient tolerated procedure well without complications." },
    { trigger: "comply", text: "Patient compliant with plan of care and medication regimen." },
    { trigger: "agree", text: "Patient agrees to follow recommendations and will contact nurse if concerns arise." },
  ],
  status: [
    { trigger: "stable", text: "Patient condition stable. No acute distress noted." },
    { trigger: "improve", text: "Patient condition improved since last visit." },
    { trigger: "decline", text: "Patient condition declined since last visit. " },
    { trigger: "home", text: "Patient homebound due to " },
    { trigger: "skilled", text: "Skilled nursing visit required for " },
  ]
};

// Diagnosis-specific phrases
const diagnosisPhrases = {
  CHF: [
    { trigger: "chf", text: "Weight obtained: [X] lbs. Compared to baseline: [change]. Bilateral lower extremity edema: [grade]+. JVD assessed. Lung sounds auscultated for crackles." },
    { trigger: "fluid", text: "Fluid status assessed. Patient educated on daily weights and sodium restriction." },
  ],
  COPD: [
    { trigger: "copd", text: "Respiratory assessment: RR [X], O2 sat [X]% on [room air/O2]. Lung sounds: [findings]. Work of breathing: [description]." },
    { trigger: "inhaler", text: "Inhaler technique reviewed and reinforced. Patient demonstrates correct technique." },
  ],
  Diabetes: [
    { trigger: "dm", text: "Blood glucose: [X] mg/dL. Diabetic foot exam performed: pedal pulses [X], sensation [X], skin integrity [X]." },
    { trigger: "hypo", text: "Signs/symptoms of hypoglycemia reviewed. Patient verbalizes understanding of when to check blood sugar." },
  ],
  Wound: [
    { trigger: "wound", text: "Wound assessment: Location [X], Size [L]x[W]x[D]cm, Wound bed [X]% granulation, Exudate [type/amount], Periwound [condition]." },
    { trigger: "heal", text: "Wound healing progress noted. Wound edges approximating. No signs of infection." },
  ],
  HTN: [
    { trigger: "htn", text: "Blood pressure management reviewed. Patient educated on medication compliance and low-sodium diet." },
    { trigger: "bp", text: "BP checked in [position]: [value]. Orthostatic measurements obtained if indicated." },
  ]
};

export default function SmartAutoComplete({
  value,
  onChange,
  placeholder,
  diagnosis,
  className
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  // Get diagnosis-specific phrases
  const getDiagnosisPhrases = () => {
    if (!diagnosis) return [];
    const upperDx = diagnosis.toUpperCase();
    if (upperDx.includes('CHF') || upperDx.includes('HEART FAILURE')) return diagnosisPhrases.CHF || [];
    if (upperDx.includes('COPD')) return diagnosisPhrases.COPD || [];
    if (upperDx.includes('DIABETES') || upperDx.includes('DM')) return diagnosisPhrases.Diabetes || [];
    if (upperDx.includes('WOUND') || upperDx.includes('ULCER')) return diagnosisPhrases.Wound || [];
    if (upperDx.includes('HYPERTENSION') || upperDx.includes('HTN')) return diagnosisPhrases.HTN || [];
    return [];
  };

  // Check for trigger words as user types
  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      return;
    }

    // Get the last word being typed
    const textBeforeCursor = value.substring(0, cursorPosition);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase() || '';

    if (lastWord.length < 2) {
      setSuggestions([]);
      return;
    }

    // Find matching phrases
    const allPhrases = [
      ...Object.values(medicalPhrases).flat(),
      ...getDiagnosisPhrases()
    ];

    const matches = allPhrases.filter(p => 
      p.trigger.toLowerCase().startsWith(lastWord) ||
      p.text.toLowerCase().includes(lastWord)
    ).slice(0, 5);

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [value, cursorPosition, diagnosis]);

  const insertSuggestion = (text) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Remove the trigger word
    const words = textBeforeCursor.split(/\s+/);
    words.pop();
    const newTextBefore = words.join(' ') + (words.length > 0 ? ' ' : '');
    
    const newValue = newTextBefore + text + ' ' + textAfterCursor.trimStart();
    onChange(newValue);
    setShowSuggestions(false);
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (suggestions.length === 1) {
          e.preventDefault();
          insertSuggestion(suggestions[0].text);
        }
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursorPosition(e.target.selectionStart);
        }}
        onSelect={(e) => setCursorPosition(e.target.selectionStart)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`font-mono text-sm ${className}`}
        rows={6}
      />
      
      {/* Suggestions popup */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b bg-slate-50">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Smart suggestions (Tab to insert)
            </p>
          </div>
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
              onClick={() => insertSuggestion(suggestion.text)}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {suggestion.trigger}
                </Badge>
                <span className="text-xs text-slate-600 truncate flex-1">
                  {suggestion.text.substring(0, 60)}...
                </span>
                <Plus className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick phrase categories */}
      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(medicalPhrases).map(([category, phrases]) => (
          <Popover key={category}>
            <PopoverTrigger asChild>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-50 text-xs capitalize"
              >
                {category}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start">
              <p className="text-xs font-semibold text-slate-500 mb-2 capitalize">{category} Phrases</p>
              <div className="space-y-1 max-h-48 overflow-auto">
                {phrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-2 hover:bg-blue-50 rounded cursor-pointer text-xs"
                    onClick={() => {
                      onChange(value ? value + ' ' + phrase.text : phrase.text);
                      textareaRef.current?.focus();
                    }}
                  >
                    <Badge variant="secondary" className="text-[10px] mr-2">
                      {phrase.trigger}
                    </Badge>
                    <span className="text-slate-600">{phrase.text.substring(0, 40)}...</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ))}
        
        {/* Diagnosis-specific phrases */}
        {getDiagnosisPhrases().length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Badge className="cursor-pointer bg-purple-100 text-purple-800 hover:bg-purple-200 text-xs">
                {diagnosis?.split(' ')[0]} Specific
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start">
              <p className="text-xs font-semibold text-purple-600 mb-2">Diagnosis-Specific Phrases</p>
              <div className="space-y-1">
                {getDiagnosisPhrases().map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-2 hover:bg-purple-50 rounded cursor-pointer text-xs"
                    onClick={() => {
                      onChange(value ? value + ' ' + phrase.text : phrase.text);
                      textareaRef.current?.focus();
                    }}
                  >
                    <span className="text-slate-600">{phrase.text}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}