import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, AlertCircle } from "lucide-react";

// Medical terminology mappings and validations
const MEDICAL_TERMINOLOGY = {
  // Common abbreviations to full terms
  abbreviations: {
    'BP': 'Blood Pressure',
    'HR': 'Heart Rate',
    'RR': 'Respiratory Rate',
    'O2': 'Oxygen Saturation',
    'SOB': 'Shortness of Breath',
    'DOE': 'Dyspnea on Exertion',
    'CP': 'Chest Pain',
    'N/V': 'Nausea and Vomiting',
    'CHF': 'Congestive Heart Failure',
    'COPD': 'Chronic Obstructive Pulmonary Disease',
    'DM': 'Diabetes Mellitus',
    'HTN': 'Hypertension',
    'A&O': 'Alert and Oriented',
    'WNL': 'Within Normal Limits',
    'c/o': 'Complains of',
    's/p': 'Status Post',
    'w/': 'with',
    'w/o': 'without'
  },
  
  // SNOMED CT common concepts
  snomedConcepts: [
    { code: '267036007', term: 'Dyspnea', synonyms: ['shortness of breath', 'breathlessness', 'SOB'] },
    { code: '29857009', term: 'Chest pain', synonyms: ['CP', 'thoracic pain'] },
    { code: '271594007', term: 'Syncope', synonyms: ['fainting', 'passing out'] },
    { code: '422587007', term: 'Nausea', synonyms: ['feeling sick', 'queasy'] },
    { code: '422400008', term: 'Vomiting', synonyms: ['emesis', 'throwing up'] },
    { code: '386661006', term: 'Fever', synonyms: ['pyrexia', 'elevated temperature'] },
    { code: '13791008', term: 'Asthenia', synonyms: ['weakness', 'fatigue'] }
  ],

  // ICD-10 common codes
  icd10Codes: [
    { code: 'I50.9', term: 'Heart failure, unspecified', keywords: ['CHF', 'heart failure', 'cardiac failure'] },
    { code: 'J44.9', term: 'COPD, unspecified', keywords: ['COPD', 'chronic obstructive'] },
    { code: 'E11.9', term: 'Type 2 diabetes mellitus without complications', keywords: ['diabetes', 'DM', 'T2DM'] },
    { code: 'I10', term: 'Essential (primary) hypertension', keywords: ['hypertension', 'HTN', 'high blood pressure'] },
    { code: 'N18.9', term: 'CKD, unspecified', keywords: ['chronic kidney disease', 'CKD', 'renal disease'] },
    { code: 'L89.90', term: 'Pressure ulcer', keywords: ['pressure ulcer', 'bedsore', 'decubitus'] }
  ]
};

export function expandAbbreviations(text) {
  let expandedText = text;
  const expansions = [];
  
  Object.entries(MEDICAL_TERMINOLOGY.abbreviations).forEach(([abbrev, full]) => {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    if (regex.test(expandedText)) {
      expansions.push({ abbrev, full });
    }
  });
  
  return { expandedText, expansions };
}

export function detectMedicalTerms(text) {
  const detectedTerms = [];
  const lowerText = text.toLowerCase();
  
  // Detect SNOMED concepts
  MEDICAL_TERMINOLOGY.snomedConcepts.forEach(concept => {
    const found = concept.synonyms.some(syn => lowerText.includes(syn.toLowerCase()));
    if (found) {
      detectedTerms.push({
        type: 'SNOMED CT',
        code: concept.code,
        term: concept.term
      });
    }
  });
  
  // Detect ICD-10 codes
  MEDICAL_TERMINOLOGY.icd10Codes.forEach(diagnosis => {
    const found = diagnosis.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    if (found) {
      detectedTerms.push({
        type: 'ICD-10',
        code: diagnosis.code,
        term: diagnosis.term
      });
    }
  });
  
  return detectedTerms;
}

export function standardizeTerminology(text) {
  let standardized = text;
  
  // Replace common colloquialisms with medical terms
  const replacements = {
    'passing out': 'syncope',
    'throwing up': 'vomiting',
    'feeling sick': 'nausea',
    'can\'t breathe': 'dyspnea',
    'short of breath': 'dyspnea',
    'chest hurts': 'chest pain',
    'dizzy': 'dizziness/vertigo',
    'tired': 'fatigue',
    'weak': 'asthenia'
  };
  
  Object.entries(replacements).forEach(([colloquial, medical]) => {
    const regex = new RegExp(colloquial, 'gi');
    standardized = standardized.replace(regex, medical);
  });
  
  return standardized;
}

export default function MedicalTerminologyProcessor({ text, _onSuggestion }) {
  const [analysis, setAnalysis] = React.useState(null);

  React.useEffect(() => {
    if (text && text.length > 10) {
      const { _expandedText, expansions } = expandAbbreviations(text);
      const detectedTerms = detectMedicalTerms(text);
      const standardized = standardizeTerminology(text);
      
      setAnalysis({
        expansions,
        detectedTerms,
        standardized,
        hasChanges: standardized !== text || expansions.length > 0
      });
    }
  }, [text]);

  if (!analysis || !analysis.hasChanges) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-blue-900">Medical Terminology Analysis</span>
        </div>

        {analysis.expansions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-800 mb-2">Abbreviations Detected:</p>
            <div className="flex flex-wrap gap-2">
              {analysis.expansions.map((exp, idx) => (
                <Badge key={idx} variant="outline" className="bg-white">
                  {exp.abbrev} → {exp.full}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.detectedTerms.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-800 mb-2">Standardized Codes Detected:</p>
            <div className="space-y-1">
              {analysis.detectedTerms.map((term, idx) => (
                <div key={idx} className="text-xs bg-white p-2 rounded border border-blue-200">
                  <Badge className="bg-blue-100 text-blue-800 text-xs mr-2">
                    {term.type}: {term.code}
                  </Badge>
                  <span>{term.term}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.standardized !== text && (
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Colloquial terms detected. Consider using standardized medical terminology for professional documentation.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}