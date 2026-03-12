import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  FileText,
  CheckCircle2,
  Activity,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Zap
} from "lucide-react";

export default function OASISDataSync({ 
  patientId,
  onSyncData,
  currentDiagnosis,
  currentVitalSigns
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOASIS, setSelectedOASIS] = useState(null);
  const [syncedData, setSyncedData] = useState(null);

  // Fetch patient's saved OASIS uploads
  const { data: patientOASIS = [] } = useQuery({
    queryKey: ['patientOASIS', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const allOASIS = await base44.entities.OASISUpload.filter({ patient_id: patientId }, '-created_date', 10);
      return allOASIS;
    },
    enabled: !!patientId
  });

  // Auto-select most recent OASIS
  useEffect(() => {
    if (patientOASIS.length > 0 && !selectedOASIS) {
      setSelectedOASIS(patientOASIS[0]);
    }
  }, [patientOASIS]);

  const handleSyncFromOASIS = () => {
    if (!selectedOASIS?.pdgm_data) return;

    const pdgm = selectedOASIS.pdgm_data;
    const syncData = {
      diagnosis: pdgm.primary_diagnosis || '',
      diagnosisCode: pdgm.primary_diagnosis_code || '',
      comorbidities: pdgm.comorbidities || [],
      functionalScores: pdgm.functional_scores || {},
      admissionSource: pdgm.admission_source || '',
      episodeTiming: pdgm.episode_timing || '',
      assessmentDate: selectedOASIS.assessment_date,
      assessmentType: selectedOASIS.assessment_type
    };

    setSyncedData(syncData);
    onSyncData?.(syncData);
  };

  // Build suggested narrative from OASIS data
  const buildSuggestedNarrative = () => {
    if (!selectedOASIS?.pdgm_data) return '';

    const pdgm = selectedOASIS.pdgm_data;
    const fs = pdgm.functional_scores || {};
    
    const functionalDescriptions = [];
    
    if (fs.m1830_bathing >= 3) {
      functionalDescriptions.push('requires assistance with bathing');
    }
    if (fs.m1860_ambulation >= 3) {
      functionalDescriptions.push('limited ambulation ability');
    }
    if (fs.m1850_transferring >= 2) {
      functionalDescriptions.push('needs help with transfers');
    }
    if (fs.m1840_toilet_transfer >= 2) {
      functionalDescriptions.push('requires assistance for toilet transfer');
    }

    const narrative = [
      `Patient with ${pdgm.primary_diagnosis || 'primary diagnosis'}`,
      pdgm.comorbidities?.length > 0 ? `and ${pdgm.comorbidities.slice(0, 3).join(', ')}` : '',
      functionalDescriptions.length > 0 ? `Functionally, patient ${functionalDescriptions.join(', ')}.` : '',
      pdgm.admission_source === 'institutional' ? 'Recently discharged from facility.' : ''
    ].filter(Boolean).join('. ');

    return narrative;
  };

  if (!patientId || patientOASIS.length === 0) {
    return null;
  }

  const getFunctionalLabel = (score, max) => {
    const ratio = score / max;
    if (ratio <= 0.25) return { label: 'Independent', color: 'text-green-600' };
    if (ratio <= 0.5) return { label: 'Minimal assist', color: 'text-blue-600' };
    if (ratio <= 0.75) return { label: 'Moderate assist', color: 'text-yellow-600' };
    return { label: 'Dependent', color: 'text-red-600' };
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader 
        className="pb-2 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            OASIS Data Sync
            <Badge variant="outline" className="text-xs">{patientOASIS.length} available</Badge>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-3 pt-3">
          {/* OASIS Selection */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Select OASIS Assessment</label>
            <Select 
              value={selectedOASIS?.id || ''} 
              onValueChange={(id) => setSelectedOASIS(patientOASIS.find(o => o.id === id))}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select OASIS..." />
              </SelectTrigger>
              <SelectContent>
                {patientOASIS.map((oasis) => (
                  <SelectItem key={oasis.id} value={oasis.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      <span>{oasis.assessment_type} - {oasis.assessment_date || 'No date'}</span>
                      {oasis.scores?.overall && (
                        <Badge variant="outline" className="text-xs ml-2">
                          {oasis.scores.overall}%
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOASIS?.pdgm_data && (
            <>
              {/* Preview Data */}
              <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium">Primary Diagnosis:</span>
                  <span className="text-xs text-gray-700">
                    {selectedOASIS.pdgm_data.primary_diagnosis || 'Not specified'}
                    {selectedOASIS.pdgm_data.primary_diagnosis_code && (
                      <span className="ml-1 text-gray-500">({selectedOASIS.pdgm_data.primary_diagnosis_code})</span>
                    )}
                  </span>
                </div>

                {selectedOASIS.pdgm_data.comorbidities?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-600">Comorbidities:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedOASIS.pdgm_data.comorbidities.slice(0, 4).map((c, i) => (
                        <Badge key={i} variant="outline" className="text-xs py-0">{c}</Badge>
                      ))}
                      {selectedOASIS.pdgm_data.comorbidities.length > 4 && (
                        <Badge variant="outline" className="text-xs py-0">
                          +{selectedOASIS.pdgm_data.comorbidities.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Functional Scores Summary */}
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-purple-600" />
                  <span className="text-xs font-medium">Key Functional Scores:</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(selectedOASIS.pdgm_data.functional_scores || {}).slice(0, 4).map(([key, val]) => {
                    const maxScores = { m1830_bathing: 6, m1860_ambulation: 6, m1850_transferring: 5, m1840_toilet_transfer: 4 };
                    const max = maxScores[key] || 3;
                    const { label, color } = getFunctionalLabel(val, max);
                    return (
                      <div key={key} className="flex items-center justify-between bg-white p-1 rounded">
                        <span className="text-gray-600">{key.replace('m18', 'M18').replace(/_/g, ' ')}</span>
                        <span className={`font-medium ${color}`}>{val} ({label})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Suggested Narrative */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-800 mb-1">Suggested Opening Narrative:</p>
                <p className="text-xs text-blue-700 italic">"{buildSuggestedNarrative()}"</p>
              </div>

              {/* Sync Button */}
              <Button
                onClick={handleSyncFromOASIS}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Sync OASIS Data to Note
              </Button>

              {syncedData && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-xs">
                    OASIS data synced! Diagnosis and functional context applied.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}