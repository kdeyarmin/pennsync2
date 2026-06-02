import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp,
  Activity,
  Heart,
  Wind,
  Droplet
} from "lucide-react";

export default function PredictiveMonitoring({ patient, currentVitals, allVisits }) {
  const [predictions, setPredictions] = useState([]);
  const [hospitalizationRisk, setHospitalizationRisk] = useState(null);

  useEffect(() => {
    if (allVisits && allVisits.length >= 2) {
      analyzeTrends();
      calculateHospitalizationRisk();
    }
  }, [allVisits, currentVitals]);

  const analyzeTrends = () => {
    const recentVisits = allVisits.slice(0, 5).reverse(); // Last 5 visits chronologically
    const alerts = [];

    // Blood Pressure Trend
    const bpReadings = recentVisits
      .filter(v => v.vital_signs?.blood_pressure_systolic)
      .map(v => v.vital_signs.blood_pressure_systolic);
    
    if (bpReadings.length >= 3) {
      const _avgBP = bpReadings.reduce((sum, bp) => sum + bp, 0) / bpReadings.length;
      const trend = bpReadings[bpReadings.length - 1] - bpReadings[0];
      
      if (trend > 20) {
        alerts.push({
          type: 'warning',
          icon: Heart,
          title: 'Rising Blood Pressure Trend',
          message: `BP increased by ${trend} points over last ${bpReadings.length} visits. Current: ${currentVitals.blood_pressure_systolic || bpReadings[bpReadings.length-1]}`,
          suggestion: 'Consider: MD notification, medication review, dietary counseling',
          severity: trend > 30 ? 'high' : 'medium'
        });
      }
    }

    // Weight Trend (for CHF patients)
    if (patient.primary_diagnosis?.toLowerCase().includes('chf') || 
        patient.primary_diagnosis?.toLowerCase().includes('heart failure')) {
      const weightReadings = recentVisits
        .filter(v => v.vital_signs?.weight)
        .map(v => v.vital_signs.weight);
      
      if (weightReadings.length >= 2) {
        const weightChange = weightReadings[weightReadings.length - 1] - weightReadings[0];
        
        if (weightChange > 3) {
          alerts.push({
            type: 'critical',
            icon: Droplet,
            title: 'Rapid Weight Gain Detected',
            message: `${weightChange.toFixed(1)} lbs gain in ${weightReadings.length} visits. Possible fluid overload.`,
            suggestion: 'URGENT: Assess for edema, lung sounds, dyspnea. Notify MD immediately.',
            severity: 'high'
          });
        }
      }
    }

    // O2 Saturation Trend
    const o2Readings = recentVisits
      .filter(v => v.vital_signs?.oxygen_saturation)
      .map(v => v.vital_signs.oxygen_saturation);
    
    if (o2Readings.length >= 3) {
      const trend = o2Readings[o2Readings.length - 1] - o2Readings[0];
      
      if (trend < -3) {
        alerts.push({
          type: 'warning',
          icon: Wind,
          title: 'Declining Oxygen Saturation',
          message: `O2 sat decreased by ${Math.abs(trend)}% over recent visits. Current: ${currentVitals.oxygen_saturation || o2Readings[o2Readings.length-1]}%`,
          suggestion: 'Assess respiratory status, consider pulmonary assessment, MD notification',
          severity: o2Readings[o2Readings.length - 1] < 92 ? 'high' : 'medium'
        });
      }
    }

    // Pain Level Trend
    const painReadings = recentVisits
      .filter(v => v.vital_signs?.pain_level !== undefined)
      .map(v => v.vital_signs.pain_level);
    
    if (painReadings.length >= 3) {
      const avgPain = painReadings.reduce((sum, p) => sum + p, 0) / painReadings.length;
      
      if (avgPain > 5) {
        alerts.push({
          type: 'warning',
          icon: Activity,
          title: 'Persistent Elevated Pain',
          message: `Pain averaging ${avgPain.toFixed(1)}/10 over recent visits.`,
          suggestion: 'Reassess pain management plan, consider MD consult for pain control',
          severity: 'medium'
        });
      }
    }

    setPredictions(alerts);
  };

  const calculateHospitalizationRisk = async () => {
    try {
      const recentVisits = allVisits.slice(0, 5);
      
      const prompt = `You are a predictive analytics AI for home health. Analyze this patient's data and estimate their 30-day hospitalization risk.

PATIENT:
- Diagnosis: ${patient.primary_diagnosis}
- Care Type: ${patient.care_type}

RECENT VISITS (last 5):
${recentVisits.map(v => `
Date: ${v.visit_date}
Vitals: ${v.vital_signs ? JSON.stringify(v.vital_signs) : 'None'}
Notes excerpt: ${v.nurse_notes?.substring(0, 200) || 'None'}
`).join('\n')}

Based on clinical trends, diagnosis, and recent assessments, provide:
1. Risk level: "Low" (0-20%), "Moderate" (21-50%), "High" (51-75%), or "Very High" (76-100%)
2. Risk percentage
3. Top 3 risk factors contributing to this score
4. Top 3 preventive interventions to reduce risk

Return JSON:
{
  "risk_level": "string",
  "risk_percentage": number,
  "risk_factors": ["string"],
  "interventions": ["string"]
}`;

      const risk = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string" },
            risk_percentage: { type: "number" },
            risk_factors: { type: "array", items: { type: "string" } },
            interventions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setHospitalizationRisk(risk);
      
    } catch (error) {
      console.error("Error calculating hospitalization risk:", error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-blue-300 bg-blue-50';
    }
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'very high': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  if (predictions.length === 0 && !hospitalizationRisk) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          AI Predictive Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hospitalization Risk */}
        {hospitalizationRisk && (
          <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <AlertDescription>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900 mb-1">30-Day Hospitalization Risk</p>
                  <p className="text-2xl font-bold text-indigo-600">{hospitalizationRisk.risk_percentage}%</p>
                </div>
                <Badge className={getRiskColor(hospitalizationRisk.risk_level)}>
                  {hospitalizationRisk.risk_level}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Risk Factors:</p>
                  <ul className="list-disc ml-5 text-sm text-slate-600 space-y-1">
                    {hospitalizationRisk.risk_factors.map((factor, i) => (
                      <li key={i}>{factor}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Preventive Actions:</p>
                  <ul className="list-disc ml-5 text-sm text-slate-600 space-y-1">
                    {hospitalizationRisk.interventions.map((intervention, i) => (
                      <li key={i}>{intervention}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Trend Alerts */}
        {predictions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900">Clinical Trend Alerts</h4>
            {predictions.map((alert, index) => {
              const Icon = alert.icon;
              return (
                <Alert key={index} className={getSeverityColor(alert.severity)}>
                  <Icon className="w-4 h-4" />
                  <AlertDescription>
                    <p className="font-medium text-slate-900 mb-1">
                      {alert.severity === 'high' && '🚨 '}
                      {alert.title}
                    </p>
                    <p className="text-sm text-slate-700 mb-2">{alert.message}</p>
                    <p className="text-sm font-medium text-slate-900">
                      💡 {alert.suggestion}
                    </p>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}