import { useState, useEffect } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  ShieldAlert,
  Activity,
  Pill,
  Home,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";

const riskCategories = {
  readmission: { label: "Hospital Readmission", icon: Home, color: "red" },
  fall: { label: "Fall Risk", icon: Activity, color: "orange" },
  medication: { label: "Medication Non-Adherence", icon: Pill, color: "yellow" },
  decline: { label: "Clinical Decline", icon: TrendingUp, color: "red" },
  infection: { label: "Infection Risk", icon: ShieldAlert, color: "orange" }
};

export default function ProactiveRiskIdentifier({
  patient,
  recentVisits = [],
  carePlans = [],
  vitalSigns,
  incidents = [],
  compact = false,
  onAlertCreated
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  // Auto-analyze on mount and when key data changes
  useEffect(() => {
    if (patient?.id) {
      const timer = setTimeout(() => {
        analyzeRisks();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [patient?.id, recentVisits?.length, vitalSigns]);

  const analyzeRisks = async () => {
    if (!patient) return;
    
    setIsAnalyzing(true);
    try {
      // Compile comprehensive patient data for analysis
      const patientData = {
        demographics: {
          name: `${patient.first_name} ${patient.last_name}`,
          age: patient.date_of_birth ? calculateAge(patient.date_of_birth) : null,
          primaryDiagnosis: patient.primary_diagnosis,
          secondaryDiagnoses: patient.secondary_diagnoses || [],
          allergies: patient.allergies,
          status: patient.status
        },
        recentVisits: recentVisits.slice(0, 5).map(v => ({
          date: v.visit_date,
          type: v.visit_type,
          vitals: v.vital_signs,
          noteExcerpt: v.nurse_notes?.substring(0, 500)
        })),
        currentVitals: vitalSigns,
        carePlans: carePlans.map(cp => ({
          problem: cp.problem,
          goal: cp.goal,
          status: cp.status
        })),
        incidents: incidents.slice(0, 5).map(i => ({
          type: i.incident_type,
          date: i.incident_date,
          severity: i.severity
        })),
        vitalTrends: calculateVitalTrends(recentVisits)
      };

      const result = await invokeLLM({
        prompt: `Analyze this home health patient's data to proactively identify risks for adverse events.

PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

Identify risks in these categories:
1. **HOSPITAL READMISSION** - Signs patient may need hospitalization (worsening symptoms, vital instability, care plan failures)
2. **FALL RISK** - Indicators of fall risk (mobility issues, medication side effects, environmental factors, history)
3. **MEDICATION NON-ADHERENCE** - Signs of non-compliance (missed doses mentioned, symptom patterns, knowledge gaps)
4. **CLINICAL DECLINE** - Deteriorating condition (vital trends, functional decline, symptom escalation)
5. **INFECTION RISK** - Infection indicators (wound issues, fever patterns, UTI symptoms, respiratory changes)

For each identified risk, provide:
- Risk category
- Risk level (critical/high/medium/low)
- Specific concern (what triggered this alert)
- Contributing factors (list of factors)
- Recommended interventions (specific actions)
- Urgency timeframe (immediate/24h/48h/this_week)
- Clinical rationale

Only flag genuine risks supported by the data. Don't create alerts without evidence.`,
        response_json_schema: {
          type: "object",
          properties: {
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  risk_level: { type: "string" },
                  concern: { type: "string" },
                  contributing_factors: { type: "array", items: { type: "string" } },
                  interventions: { type: "array", items: { type: "string" } },
                  urgency: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            overall_risk_score: { type: "number" },
            summary: { type: "string" }
          }
        }
      });

      setRiskAlerts(result.alerts || []);
      setLastAnalyzed(new Date());
      
      // Optionally create PatientAlert records for critical/high risks
      if (onAlertCreated && result.alerts?.length > 0) {
        const criticalAlerts = result.alerts.filter(a => 
          a.risk_level === 'critical' || a.risk_level === 'high'
        );
        for (const alert of criticalAlerts) {
          onAlertCreated({
            patient_id: patient.id,
            alert_type: mapCategoryToAlertType(alert.category),
            severity: alert.risk_level,
            title: `${riskCategories[alert.category]?.label || alert.category} Alert`,
            message: alert.concern,
            contributing_factors: alert.contributing_factors,
            recommended_actions: alert.interventions,
            risk_score: result.overall_risk_score,
            status: 'active'
          });
        }
      }
    } catch (error) {
      console.error("Error analyzing risks:", error);
    }
    setIsAnalyzing(false);
  };

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateVitalTrends = (visits) => {
    if (!visits || visits.length < 2) return null;
    const trends = {};
    const vitalsWithData = visits.filter(v => v.vital_signs).slice(0, 5);
    
    if (vitalsWithData.length >= 2) {
      const latest = vitalsWithData[0]?.vital_signs;
      const previous = vitalsWithData[1]?.vital_signs;
      
      if (latest?.blood_pressure_systolic && previous?.blood_pressure_systolic) {
        trends.bp_change = latest.blood_pressure_systolic - previous.blood_pressure_systolic;
      }
      if (latest?.weight && previous?.weight) {
        trends.weight_change = latest.weight - previous.weight;
      }
      if (latest?.oxygen_saturation && previous?.oxygen_saturation) {
        trends.o2_change = latest.oxygen_saturation - previous.oxygen_saturation;
      }
    }
    return trends;
  };

  const mapCategoryToAlertType = (category) => {
    const mapping = {
      readmission: 'readmission_risk',
      fall: 'fall_risk',
      medication: 'medication_risk',
      decline: 'vital_deterioration',
      infection: 'infection_risk'
    };
    return mapping[category] || 'urgent_intervention';
  };

  const getRiskLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getUrgencyBadge = (urgency) => {
    const colors = {
      immediate: 'bg-red-600 text-white animate-pulse',
      '24h': 'bg-orange-500 text-white',
      '48h': 'bg-yellow-500 text-white',
      this_week: 'bg-blue-500 text-white'
    };
    const labels = {
      immediate: 'Act Now',
      '24h': 'Within 24h',
      '48h': 'Within 48h',
      this_week: 'This Week'
    };
    return (
      <Badge className={`text-[10px] ${colors[urgency] || 'bg-slate-500 text-white'}`}>
        <Clock className="w-2.5 h-2.5 mr-1" />
        {labels[urgency] || urgency}
      </Badge>
    );
  };

  const toggleExpanded = (idx) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const dismissAlert = (idx) => {
    setDismissedAlerts(prev => new Set([...prev, idx]));
  };

  const activeAlerts = riskAlerts.filter((_, idx) => !dismissedAlerts.has(idx));
  const criticalCount = activeAlerts.filter(a => a.risk_level === 'critical' || a.risk_level === 'high').length;

  if (!patient) return null;

  // Compact view for dashboards
  if (compact) {
    return (
      <Card className={`border-2 ${criticalCount > 0 ? 'border-red-300 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${criticalCount > 0 ? 'text-red-600' : 'text-orange-600'}`} />
              Risk Alerts
            </div>
            {isAnalyzing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : activeAlerts.length > 0 ? (
              <Badge className={criticalCount > 0 ? 'bg-red-600' : 'bg-orange-500'}>
                {activeAlerts.length}
              </Badge>
            ) : (
              <Badge className="bg-green-500">Clear</Badge>
            )}
          </CardTitle>
        </CardHeader>
        {activeAlerts.length > 0 && (
          <CardContent className="p-2 pt-0">
            <div className="space-y-1">
              {activeAlerts.slice(0, 3).map((alert, idx) => {
                const category = riskCategories[alert.category];
                const Icon = category?.icon || AlertTriangle;
                return (
                  <div key={idx} className="flex items-center gap-2 p-1.5 bg-white rounded text-xs">
                    <Icon className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <span className="flex-1 truncate">{alert.concern}</span>
                    <Badge className={`text-[9px] ${getRiskLevelColor(alert.risk_level)}`}>
                      {alert.risk_level}
                    </Badge>
                  </div>
                );
              })}
              {activeAlerts.length > 3 && (
                <p className="text-[10px] text-slate-500 text-center">
                  +{activeAlerts.length - 3} more alerts
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Full view
  return (
    <Card className={`border-2 ${criticalCount > 0 ? 'border-red-300' : 'border-orange-200'}`}>
      <CardHeader className="py-3 bg-gradient-to-r from-orange-50 to-red-50">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${criticalCount > 0 ? 'text-red-600' : 'text-orange-600'}`} />
            Proactive Risk Identification
            {criticalCount > 0 && (
              <Badge className="bg-red-600 text-white animate-pulse">
                {criticalCount} Critical
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastAnalyzed && (
              <span className="text-[10px] text-slate-500">
                Updated {lastAnalyzed.toLocaleTimeString()}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={analyzeRisks}
              disabled={isAnalyzing}
              className="h-7 text-xs"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</>
              ) : (
                <><RefreshCw className="w-3 h-3 mr-1" /> Refresh</>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {isAnalyzing && activeAlerts.length === 0 ? (
          <div className="flex items-center justify-center py-6 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
            <span className="text-sm text-slate-600">Analyzing patient data for risks...</span>
          </div>
        ) : activeAlerts.length === 0 ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              No significant risk factors identified at this time. Continue monitoring per care plan.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {activeAlerts.map((alert, idx) => {
              const category = riskCategories[alert.category];
              const Icon = category?.icon || AlertTriangle;
              const isExpanded = expandedAlerts.has(idx);

              return (
                <Collapsible key={idx} open={isExpanded} onOpenChange={() => toggleExpanded(idx)}>
                  <div className={`rounded-lg border ${
                    alert.risk_level === 'critical' ? 'border-red-400 bg-red-50' :
                    alert.risk_level === 'high' ? 'border-orange-300 bg-orange-50' :
                    'border-yellow-300 bg-yellow-50'
                  }`}>
                    <CollapsibleTrigger asChild>
                      <div className="p-3 cursor-pointer hover:bg-white/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                              alert.risk_level === 'critical' ? 'text-red-600' :
                              alert.risk_level === 'high' ? 'text-orange-600' :
                              'text-yellow-600'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-900">
                                  {category?.label || alert.category}
                                </span>
                                <Badge className={`text-[10px] ${getRiskLevelColor(alert.risk_level)}`}>
                                  {alert.risk_level}
                                </Badge>
                                {getUrgencyBadge(alert.urgency)}
                              </div>
                              <p className="text-sm text-slate-700 mt-1">{alert.concern}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissAlert(idx);
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                        {/* Contributing Factors */}
                        {alert.contributing_factors?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Contributing Factors:</p>
                            <ul className="space-y-1">
                              {alert.contributing_factors.map((factor, fidx) => (
                                <li key={fidx} className="text-xs text-slate-700 flex items-start gap-1">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  {factor}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Interventions */}
                        {alert.interventions?.length > 0 && (
                          <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                            <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" />
                              Recommended Interventions:
                            </p>
                            <ul className="space-y-1">
                              {alert.interventions.map((intervention, iidx) => (
                                <li key={iidx} className="text-xs text-green-900 flex items-start gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  {intervention}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Clinical Rationale */}
                        {alert.rationale && (
                          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                            <p className="text-xs font-semibold text-blue-800 mb-1">Clinical Rationale:</p>
                            <p className="text-xs text-blue-900">{alert.rationale}</p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}

        {dismissedAlerts.size > 0 && (
          <div className="text-center pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500"
              onClick={() => setDismissedAlerts(new Set())}
            >
              Show {dismissedAlerts.size} dismissed alert{dismissedAlerts.size > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}