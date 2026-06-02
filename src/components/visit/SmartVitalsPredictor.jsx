import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Activity, TrendingUp, CheckCircle2 } from "lucide-react";

export default function SmartVitalsPredictor({ 
  patient, 
  vitalSigns, 
  previousVisit,
  onAutoFill 
}) {
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    generatePredictions();
  }, [vitalSigns, previousVisit]);

  const generatePredictions = () => {
    const newPredictions = [];

    // If temperature is missing and patient doesn't have infection-related diagnosis
    if (!vitalSigns.temperature && previousVisit?.vital_signs?.temperature) {
      const lastTemp = previousVisit.vital_signs.temperature;
      if (lastTemp >= 97 && lastTemp <= 99) {
        newPredictions.push({
          field: 'temperature',
          value: lastTemp,
          label: 'Temperature',
          reasoning: `Last visit: ${lastTemp}°F (within normal range). Likely similar if patient appears well.`,
          confidence: 'high'
        });
      }
    }

    // If pain level is missing and patient had no/low pain before
    if (vitalSigns.pain_level === undefined && previousVisit?.vital_signs?.pain_level !== undefined) {
      const lastPain = previousVisit.vital_signs.pain_level;
      if (lastPain <= 3) {
        newPredictions.push({
          field: 'pain_level',
          value: lastPain,
          label: 'Pain Level',
          reasoning: `Last visit: ${lastPain}/10. If patient reports similar comfort, consider using same value.`,
          confidence: 'medium'
        });
      }
    }

    // If O2 sat is entered but respiratory rate is missing
    if (vitalSigns.oxygen_saturation && !vitalSigns.respiratory_rate) {
      const o2Sat = vitalSigns.oxygen_saturation;
      if (o2Sat >= 95) {
        newPredictions.push({
          field: 'respiratory_rate',
          value: previousVisit?.vital_signs?.respiratory_rate || 16,
          label: 'Respiratory Rate',
          reasoning: `O2 sat is ${o2Sat}% (normal). Respiratory rate likely normal range (12-20).`,
          confidence: 'medium'
        });
      }
    }

    // If BP and HR are missing but were stable last visit
    if (!vitalSigns.blood_pressure_systolic && previousVisit?.vital_signs?.blood_pressure_systolic) {
      const lastSystolic = previousVisit.vital_signs.blood_pressure_systolic;
      const lastDiastolic = previousVisit.vital_signs.blood_pressure_diastolic;
      
      // Only suggest if it was within normal range
      if (lastSystolic && lastDiastolic && lastSystolic >= 110 && lastSystolic <= 140 && lastDiastolic >= 60 && lastDiastolic <= 90) {
        newPredictions.push({
          field: 'blood_pressure',
          value: `${lastSystolic}/${lastDiastolic}`,
          label: 'Blood Pressure',
          reasoning: `Last visit: ${lastSystolic}/${lastDiastolic} (normal range). If patient is stable and on same medications, may be similar.`,
          confidence: 'low'
        });
      }
    }

    // For CHF patients, suggest weight if missing
    if (!vitalSigns.weight && 
        (patient.primary_diagnosis?.toLowerCase().includes('chf') || 
         patient.primary_diagnosis?.toLowerCase().includes('heart failure')) &&
        previousVisit?.vital_signs?.weight) {
      
      newPredictions.push({
        field: 'weight',
        value: previousVisit.vital_signs.weight,
        label: 'Weight',
        reasoning: `CRITICAL for CHF: Last weight was ${previousVisit.vital_signs.weight} lbs. Document current weight to track fluid status.`,
        confidence: 'critical'
      });
    }

    setPredictions(newPredictions);
  };

  const handleAcceptPrediction = (prediction) => {
    let updateValue = {};
    
    if (prediction.field === 'blood_pressure') {
      const [systolic, diastolic] = prediction.value.split('/');
      updateValue = {
        blood_pressure_systolic: parseInt(systolic),
        blood_pressure_diastolic: parseInt(diastolic)
      };
    } else {
      updateValue = {
        [prediction.field]: prediction.value
      };
    }
    
    onAutoFill(updateValue);
    setPredictions(prev => prev.filter(p => p.field !== prediction.field));
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'critical': return 'border-red-300 bg-red-50';
      case 'high': return 'border-green-300 bg-green-50';
      case 'medium': return 'border-blue-300 bg-blue-50';
      case 'low': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-slate-300 bg-slate-50';
    }
  };

  const getConfidenceBadge = (confidence) => {
    switch (confidence) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-green-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-yellow-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  if (predictions.length === 0) {
    return null;
  }

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          Smart Vitals Predictions ({predictions.length})
        </CardTitle>
        <p className="text-sm text-slate-600">
          Based on previous visit and current context
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {predictions.map((prediction, index) => (
          <Alert key={index} className={getConfidenceColor(prediction.confidence)}>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900">{prediction.label}</p>
                  <Badge className={`${getConfidenceBadge(prediction.confidence)} text-xs`}>
                    {prediction.confidence} confidence
                  </Badge>
                </div>
                <p className="text-lg font-bold text-slate-900 mb-2">
                  Suggested: {prediction.value}
                </p>
                <p className="text-xs text-slate-600 mb-3">
                  {prediction.reasoning}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptPrediction(prediction)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Use This Value
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPredictions(prev => prev.filter(p => p.field !== prediction.field))}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}