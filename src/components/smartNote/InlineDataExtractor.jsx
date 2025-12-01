import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Thermometer, 
  Heart, 
  Loader2, 
  CheckCircle2,
  AlertTriangle,
  Pill,
  Stethoscope,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import _ from 'lodash';

export default function InlineDataExtractor({ 
  currentText, 
  onVitalsExtracted, 
  onSymptomsExtracted,
  onInterventionsExtracted 
}) {
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastExtractedText, setLastExtractedText] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [appliedItems, setAppliedItems] = useState(new Set());

  // Debounced extraction - runs as user types
  const extractData = useCallback(
    _.debounce(async (text) => {
      if (!text || text.length < 20 || text === lastExtractedText) return;

      setIsExtracting(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract structured clinical data from this nursing note text. Be thorough and extract ALL mentioned data points.

TEXT:
"${text}"

Extract:
1. VITAL SIGNS: Any BP, HR, temp, O2 sat, respirations, pain level, weight mentioned
2. SYMPTOMS: Any symptoms patient is experiencing (SOB, edema, pain, nausea, etc.)
3. ASSESSMENTS: Clinical findings (lung sounds, heart sounds, wound status, mental status, etc.)
4. INTERVENTIONS: Actions taken by nurse (medication given, wound care, education, etc.)
5. MEDICATIONS: Any medications mentioned with doses if available

Return JSON:
{
  "vital_signs": {
    "blood_pressure": "systolic/diastolic or null",
    "heart_rate": "number or null",
    "temperature": "number or null",
    "oxygen_saturation": "number or null",
    "respiratory_rate": "number or null",
    "pain_level": "number 0-10 or null",
    "weight": "number with unit or null"
  },
  "symptoms": [
    {
      "symptom": "name",
      "severity": "mild|moderate|severe",
      "details": "additional details"
    }
  ],
  "assessments": [
    {
      "system": "cardiovascular|respiratory|neuro|GI|integumentary|musculoskeletal|other",
      "finding": "the clinical finding",
      "status": "normal|abnormal|improved|worsened"
    }
  ],
  "interventions": [
    {
      "intervention": "what was done",
      "category": "medication|wound_care|education|assessment|coordination",
      "patient_response": "how patient responded if mentioned"
    }
  ],
  "medications": [
    {
      "name": "medication name",
      "dose": "dose if mentioned",
      "route": "route if mentioned",
      "action": "given|held|reviewed|taught"
    }
  ],
  "confidence": 0.0-1.0
}`,
          response_json_schema: {
            type: "object",
            properties: {
              vital_signs: { type: "object" },
              symptoms: { type: "array", items: { type: "object" } },
              assessments: { type: "array", items: { type: "object" } },
              interventions: { type: "array", items: { type: "object" } },
              medications: { type: "array", items: { type: "object" } },
              confidence: { type: "number" }
            }
          }
        });

        setExtractedData(result);
        setLastExtractedText(text);

        // Auto-notify parent of extracted vitals
        if (result.vital_signs && onVitalsExtracted) {
          const hasVitals = Object.values(result.vital_signs).some(v => v !== null);
          if (hasVitals) {
            onVitalsExtracted(result.vital_signs);
          }
        }
      } catch (error) {
        console.error("Error extracting data:", error);
      }
      setIsExtracting(false);
    }, 1500),
    [lastExtractedText, onVitalsExtracted]
  );

  useEffect(() => {
    if (currentText && currentText.length > 20) {
      extractData(currentText);
    }
    return () => extractData.cancel();
  }, [currentText, extractData]);

  const handleApplyVitals = () => {
    if (extractedData?.vital_signs && onVitalsExtracted) {
      onVitalsExtracted(extractedData.vital_signs);
      setAppliedItems(prev => new Set([...prev, 'vitals']));
    }
  };

  const handleApplySymptoms = () => {
    if (extractedData?.symptoms && onSymptomsExtracted) {
      onSymptomsExtracted(extractedData.symptoms);
      setAppliedItems(prev => new Set([...prev, 'symptoms']));
    }
  };

  const handleApplyInterventions = () => {
    if (extractedData?.interventions && onInterventionsExtracted) {
      onInterventionsExtracted(extractedData.interventions);
      setAppliedItems(prev => new Set([...prev, 'interventions']));
    }
  };

  const hasData = extractedData && (
    Object.values(extractedData.vital_signs || {}).some(v => v !== null) ||
    (extractedData.symptoms?.length > 0) ||
    (extractedData.assessments?.length > 0) ||
    (extractedData.interventions?.length > 0) ||
    (extractedData.medications?.length > 0)
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'abnormal': return 'bg-red-100 text-red-800';
      case 'improved': return 'bg-blue-100 text-blue-800';
      case 'worsened': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentText || currentText.length < 20) {
    return null;
  }

  return (
    <Card className="border-green-200">
      <CardHeader 
        className="py-2 bg-gradient-to-r from-green-50 to-emerald-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600" />
            Auto-Extracted Data
            {isExtracting && <Loader2 className="w-3 h-3 animate-spin" />}
            {hasData && !isExtracting && (
              <Badge className="bg-green-100 text-green-800 text-xs">Live</Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-3 max-h-80 overflow-y-auto">
          {!hasData ? (
            <p className="text-xs text-gray-500 text-center py-2">
              {isExtracting ? 'Extracting data...' : 'Type clinical data to see auto-extraction'}
            </p>
          ) : (
            <>
              {/* Vital Signs */}
              {Object.values(extractedData.vital_signs || {}).some(v => v !== null) && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-500" /> Vital Signs
                    </p>
                    {onVitalsExtracted && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-5 text-xs px-2"
                        onClick={handleApplyVitals}
                        disabled={appliedItems.has('vitals')}
                      >
                        {appliedItems.has('vitals') ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1 text-green-600" /> Applied</>
                        ) : 'Apply'}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {extractedData.vital_signs.blood_pressure && (
                      <div className="bg-red-50 p-1.5 rounded text-xs">
                        <span className="text-gray-600">BP:</span> {extractedData.vital_signs.blood_pressure}
                      </div>
                    )}
                    {extractedData.vital_signs.heart_rate && (
                      <div className="bg-red-50 p-1.5 rounded text-xs">
                        <span className="text-gray-600">HR:</span> {extractedData.vital_signs.heart_rate}
                      </div>
                    )}
                    {extractedData.vital_signs.temperature && (
                      <div className="bg-orange-50 p-1.5 rounded text-xs">
                        <span className="text-gray-600">Temp:</span> {extractedData.vital_signs.temperature}
                      </div>
                    )}
                    {extractedData.vital_signs.oxygen_saturation && (
                      <div className="bg-blue-50 p-1.5 rounded text-xs">
                        <span className="text-gray-600">O2:</span> {extractedData.vital_signs.oxygen_saturation}%
                      </div>
                    )}
                    {extractedData.vital_signs.pain_level && (
                      <div className="bg-purple-50 p-1.5 rounded text-xs">
                        <span className="text-gray-600">Pain:</span> {extractedData.vital_signs.pain_level}/10
                      </div>
                    )}
                    {extractedData.vital_signs.weight && (
                      <div className="bg-gray-50 p-1.5 rounded text-xs">
                        <span className="text-gray-600">Wt:</span> {extractedData.vital_signs.weight}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Symptoms */}
              {extractedData.symptoms?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" /> Symptoms ({extractedData.symptoms.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {extractedData.symptoms.map((s, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {s.symptom}
                        {s.severity && <span className="ml-1 opacity-60">({s.severity})</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Assessments */}
              {extractedData.assessments?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 text-blue-500" /> Assessments
                  </p>
                  <div className="space-y-1">
                    {extractedData.assessments.slice(0, 4).map((a, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 p-1.5 rounded">
                        <Badge className={`${getStatusColor(a.status)} text-xs py-0`}>{a.status}</Badge>
                        <span className="truncate">{a.finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interventions */}
              {extractedData.interventions?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" /> Interventions ({extractedData.interventions.length})
                  </p>
                  <div className="space-y-1">
                    {extractedData.interventions.slice(0, 3).map((i, idx) => (
                      <div key={idx} className="text-xs bg-green-50 p-1.5 rounded">
                        {i.intervention}
                        {i.patient_response && (
                          <span className="text-gray-500 ml-1">→ {i.patient_response}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {extractedData.medications?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <Pill className="w-3 h-3 text-purple-500" /> Medications
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {extractedData.medications.map((m, idx) => (
                      <Badge key={idx} className="bg-purple-100 text-purple-800 text-xs">
                        {m.name} {m.dose && `${m.dose}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {extractedData.confidence && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-xs text-gray-500">Extraction confidence:</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        extractedData.confidence > 0.8 ? 'bg-green-500' : 
                        extractedData.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${extractedData.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{Math.round(extractedData.confidence * 100)}%</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}