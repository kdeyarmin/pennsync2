import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp, TrendingDown, AlertTriangle, Activity,
  RefreshCw, MapPin, Brain, ChevronRight, CheckCircle2
} from "lucide-react";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function PopulationHealthAnalytics() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30days');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 500),
    initialData: [],
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['allVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 1000),
    initialData: [],
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['allIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 500),
    initialData: [],
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['allMedications'],
    queryFn: () => base44.entities.Medication.list('-updated_date', 1000),
    initialData: [],
  });

  const { data: clinicalEvents = [] } = useQuery({
    queryKey: ['clinicalEvents'],
    queryFn: () => base44.entities.ClinicalEvent.list('-event_date', 1000),
    initialData: [],
  });

  const runPopulationAnalysis = async () => {
    setAnalyzing(true);
    try {
      const daysBack = selectedTimeframe === '7days' ? 7 : selectedTimeframe === '30days' ? 30 : 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Filter data to timeframe
      const recentVisits = visits.filter(v => new Date(v.visit_date) >= cutoffDate);
      const recentIncidents = incidents.filter(i => new Date(i.incident_date) >= cutoffDate);
      const recentEvents = clinicalEvents.filter(e => new Date(e.event_date) >= cutoffDate);

      // Compile comprehensive data for AI analysis
      const analysisPrompt = `You are a population health analytics AI analyzing clinical data across a home health and hospice patient population.

TIMEFRAME: Last ${daysBack} days
TOTAL ACTIVE PATIENTS: ${patients.filter(p => p.status === 'active').length}
TOTAL VISITS: ${recentVisits.length}
TOTAL CLINICAL INCIDENTS: ${recentIncidents.length}
TOTAL CLINICAL EVENTS: ${recentEvents.length}

PATIENT DEMOGRAPHICS:
${generateDemographicsSummary(patients)}

DIAGNOSIS DISTRIBUTION (Top 20):
${generateDiagnosisDistribution(patients)}

VISIT PATTERNS BY NURSE:
${generateNurseVisitPatterns(recentVisits)}

INCIDENT ANALYSIS:
Type Distribution: ${generateIncidentTypes(recentIncidents)}
Severity Distribution: ${generateIncidentSeverity(recentIncidents)}

CLINICAL EVENTS BY TYPE:
${generateEventTypes(recentEvents)}

MEDICATION TRENDS:
High-Risk Medications: ${identifyHighRiskMeds(medications)}
Polypharmacy Cases: ${identifyPolypharmacy(medications, patients)}

VITAL SIGNS TRENDS:
${generateVitalsAnalysis(recentVisits)}

HOSPITALIZATION DATA:
${generateHospitalizationData(recentEvents, patients)}

GEOGRAPHIC DISTRIBUTION:
${generateGeographicData(patients)}

Perform comprehensive machine learning-style analysis to identify:
1. INFECTION CLUSTERS: Any emerging patterns of infections (UTI, pneumonia, wound infections, etc.)
2. READMISSION PATTERNS: Patients with multiple hospitalizations, common factors
3. CLINICAL DETERIORATION TRENDS: Early warning signs across population
4. NURSE-SPECIFIC PATTERNS: Any variations in outcomes by care provider
5. GEOGRAPHIC HOTSPOTS: Areas with higher incident rates
6. DIAGNOSIS-SPECIFIC RISKS: Conditions showing complications
7. MEDICATION-RELATED TRENDS: Adverse events, interactions
8. SEASONAL/TEMPORAL PATTERNS: Time-based trends
9. CARE QUALITY INDICATORS: Gaps or excellence areas
10. PREDICTIVE RISK FACTORS: What predicts poor outcomes

Provide actionable intelligence for clinical leadership.`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: {
              type: "object",
              properties: {
                overall_risk_level: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                key_findings_count: { type: "number" },
                urgent_actions_needed: { type: "number" },
                trend_direction: { type: "string", enum: ["improving", "stable", "declining"] }
              }
            },
            infection_clusters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  infection_type: { type: "string" },
                  case_count: { type: "number" },
                  percent_increase: { type: "number" },
                  geographic_cluster: { type: "string" },
                  common_risk_factors: { type: "array", items: { type: "string" } },
                  affected_nurses: { type: "array", items: { type: "string" } },
                  severity: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                  recommended_actions: { type: "array", items: { type: "string" } }
                }
              }
            },
            readmission_patterns: {
              type: "object",
              properties: {
                total_readmissions: { type: "number" },
                readmission_rate: { type: "number" },
                avg_days_to_readmission: { type: "number" },
                top_readmission_diagnoses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      diagnosis: { type: "string" },
                      count: { type: "number" },
                      avg_days: { type: "number" }
                    }
                  }
                },
                common_factors: { type: "array", items: { type: "string" } },
                prevention_strategies: { type: "array", items: { type: "string" } }
              }
            },
            nurse_performance_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nurse_name: { type: "string" },
                  patient_count: { type: "number" },
                  incident_rate: { type: "number" },
                  avg_visit_quality: { type: "string" },
                  areas_of_excellence: { type: "array", items: { type: "string" } },
                  areas_for_improvement: { type: "array", items: { type: "string" } },
                  training_recommendations: { type: "array", items: { type: "string" } }
                }
              }
            },
            clinical_deterioration_trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  trend_name: { type: "string" },
                  affected_patients: { type: "number" },
                  severity: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                  early_warning_signs: { type: "array", items: { type: "string" } },
                  intervention_needed: { type: "array", items: { type: "string" } }
                }
              }
            },
            geographic_hotspots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  risk_level: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                  primary_concerns: { type: "array", items: { type: "string" } },
                  patient_count: { type: "number" },
                  incident_rate: { type: "number" }
                }
              }
            },
            medication_safety_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  alert_type: { type: "string" },
                  medication_class: { type: "string" },
                  patient_count: { type: "number" },
                  risk_description: { type: "string" },
                  recommended_review: { type: "string" }
                }
              }
            },
            quality_indicators: {
              type: "object",
              properties: {
                documentation_quality_score: { type: "number" },
                visit_compliance_rate: { type: "number" },
                medication_reconciliation_rate: { type: "number" },
                patient_education_completion: { type: "number" },
                care_plan_adherence: { type: "number" },
                areas_exceeding_benchmarks: { type: "array", items: { type: "string" } },
                areas_below_benchmarks: { type: "array", items: { type: "string" } }
              }
            },
            predictive_risk_factors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk_factor: { type: "string" },
                  correlation_strength: { type: "string", enum: ["weak", "moderate", "strong", "very_strong"] },
                  outcome_predicted: { type: "string" },
                  affected_population_percent: { type: "number" },
                  mitigation_strategies: { type: "array", items: { type: "string" } }
                }
              }
            },
            urgent_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["immediate", "high", "moderate"] },
                  action_needed: { type: "string" },
                  affected_area: { type: "string" },
                  estimated_impact: { type: "string" },
                  responsible_party: { type: "string" }
                }
              }
            },
            temporal_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern_name: { type: "string" },
                  description: { type: "string" },
                  peak_times: { type: "array", items: { type: "string" } },
                  actionable_insights: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalyticsData(analysis);

    } catch (error) {
      console.error('Population analysis error:', error);
      alert('Failed to run population health analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper functions for data aggregation
  const generateDemographicsSummary = (patients) => {
    const ages = patients.filter(p => p.date_of_birth).map(p => 
      Math.floor((new Date() - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    );
    return `Age Range: ${Math.min(...ages)}-${Math.max(...ages)}, Average: ${Math.round(ages.reduce((a,b)=>a+b,0)/ages.length)}`;
  };

  const generateDiagnosisDistribution = (patients) => {
    const diagnosisCounts = {};
    patients.forEach(p => {
      if (p.primary_diagnosis) {
        diagnosisCounts[p.primary_diagnosis] = (diagnosisCounts[p.primary_diagnosis] || 0) + 1;
      }
    });
    return Object.entries(diagnosisCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([diag, count]) => `${diag}: ${count}`)
      .join(', ');
  };

  const generateNurseVisitPatterns = (visits) => {
    const nurseCounts = {};
    visits.forEach(v => {
      if (v.created_by) {
        nurseCounts[v.created_by] = (nurseCounts[v.created_by] || 0) + 1;
      }
    });
    return Object.entries(nurseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nurse, count]) => `${nurse}: ${count} visits`)
      .join(', ');
  };

  const generateIncidentTypes = (incidents) => {
    const types = {};
    incidents.forEach(i => {
      types[i.incident_type] = (types[i.incident_type] || 0) + 1;
    });
    return Object.entries(types).map(([type, count]) => `${type}: ${count}`).join(', ');
  };

  const generateIncidentSeverity = (incidents) => {
    const severity = {};
    incidents.forEach(i => {
      severity[i.severity] = (severity[i.severity] || 0) + 1;
    });
    return Object.entries(severity).map(([sev, count]) => `${sev}: ${count}`).join(', ');
  };

  const generateEventTypes = (events) => {
    const types = {};
    events.forEach(e => {
      types[e.event_type] = (types[e.event_type] || 0) + 1;
    });
    return Object.entries(types).map(([type, count]) => `${type}: ${count}`).join(', ');
  };

  const identifyHighRiskMeds = (meds) => {
    const highRisk = ['warfarin', 'insulin', 'heparin', 'opioid', 'anticoagulant'];
    return meds.filter(m => 
      highRisk.some(hr => m.name?.toLowerCase().includes(hr))
    ).length;
  };

  const identifyPolypharmacy = (meds, patients) => {
    const patientMedCounts = {};
    meds.filter(m => m.status === 'active').forEach(m => {
      patientMedCounts[m.patient_id] = (patientMedCounts[m.patient_id] || 0) + 1;
    });
    return Object.values(patientMedCounts).filter(count => count >= 10).length;
  };

  const generateVitalsAnalysis = (visits) => {
    const vitalsData = visits.filter(v => v.vital_signs).map(v => v.vital_signs);
    if (vitalsData.length === 0) return "Insufficient vitals data";
    
    const avgBP = vitalsData.filter(v => v.blood_pressure_systolic).reduce((a, b) => 
      a + b.blood_pressure_systolic, 0) / vitalsData.filter(v => v.blood_pressure_systolic).length;
    
    return `Average BP: ${Math.round(avgBP)}, ${vitalsData.length} readings analyzed`;
  };

  const generateHospitalizationData = (events, patients) => {
    const hospitalizations = events.filter(e => 
      e.event_type === 'hospitalization' || e.event_type === 'emergency_visit'
    );
    return `Total: ${hospitalizations.length}, Rate: ${(hospitalizations.length / patients.length * 100).toFixed(1)}%`;
  };

  const generateGeographicData = (patients) => {
    const cities = {};
    patients.forEach(p => {
      if (p.city) cities[p.city] = (cities[p.city] || 0) + 1;
    });
    return Object.entries(cities).map(([city, count]) => `${city}: ${count}`).join(', ');
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-300';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-300';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-300';
      default: return 'text-green-600 bg-green-50 border-green-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Population Health Analytics</h1>
          <p className="text-gray-600 mt-1">AI-powered clinical intelligence across patient population</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
          <Button
            onClick={runPopulationAnalysis}
            disabled={analyzing}
            className="min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>
      </div>

      {!analyticsData && !analyzing && (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Population Health Intelligence</h3>
            <p className="text-gray-600 mb-6">
              Advanced ML-powered analytics to identify infection clusters, readmission patterns,<br/>
              nurse performance insights, and emerging clinical trends across your entire patient population.
            </p>
            <Button onClick={runPopulationAnalysis} size="lg">
              <Brain className="w-5 h-5 mr-2" />
              Start Population Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {analyzing && (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Population Data...</h3>
            <p className="text-gray-600">
              Processing {patients.length} patients, {visits.length} visits, {incidents.length} incidents<br/>
              Detecting patterns, clusters, and emerging trends
            </p>
          </CardContent>
        </Card>
      )}

      {analyticsData && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <Card className={`border-2 ${
            analyticsData.executive_summary?.overall_risk_level === 'critical' ? 'border-red-300 bg-red-50' :
            analyticsData.executive_summary?.overall_risk_level === 'high' ? 'border-orange-300 bg-orange-50' :
            'border-blue-300 bg-blue-50'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Overall Risk</p>
                  <Badge className={`${getSeverityColor(analyticsData.executive_summary?.overall_risk_level)} text-lg px-3 py-1`}>
                    {analyticsData.executive_summary?.overall_risk_level?.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Key Findings</p>
                  <p className="text-3xl font-bold text-gray-900">{analyticsData.executive_summary?.key_findings_count}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Urgent Actions</p>
                  <p className="text-3xl font-bold text-red-600">{analyticsData.executive_summary?.urgent_actions_needed}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Trend</p>
                  <Badge className={`text-lg px-3 py-1 ${
                    analyticsData.executive_summary?.trend_direction === 'improving' ? 'bg-green-100 text-green-700' :
                    analyticsData.executive_summary?.trend_direction === 'declining' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {analyticsData.executive_summary?.trend_direction}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Urgent Actions */}
          {analyticsData.urgent_actions && analyticsData.urgent_actions.length > 0 && (
            <Card className="border-red-300 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertTriangle className="w-6 h-6" />
                  Urgent Actions Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.urgent_actions.map((action, idx) => (
                    <Alert key={idx} className="bg-white border-red-300">
                      <AlertDescription>
                        <div className="flex items-start gap-3">
                          <Badge className={`${
                            action.priority === 'immediate' ? 'bg-red-600' : 
                            action.priority === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
                          } text-white`}>
                            {action.priority}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">{action.action_needed}</p>
                            <p className="text-sm text-gray-600 mb-1">Area: {action.affected_area}</p>
                            <p className="text-sm text-gray-600">Impact: {action.estimated_impact}</p>
                            <p className="text-sm text-blue-600 font-medium mt-1">→ {action.responsible_party}</p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="infections" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="infections">Infection Clusters</TabsTrigger>
              <TabsTrigger value="readmissions">Readmissions</TabsTrigger>
              <TabsTrigger value="nurses">Nurse Insights</TabsTrigger>
              <TabsTrigger value="geographic">Geographic</TabsTrigger>
              <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
            </TabsList>

            {/* Infection Clusters */}
            <TabsContent value="infections" className="space-y-4">
              {analyticsData.infection_clusters && analyticsData.infection_clusters.length > 0 ? (
                analyticsData.infection_clusters.map((cluster, idx) => (
                  <Card key={idx} className={`border-2 ${getSeverityColor(cluster.severity)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{cluster.infection_type}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gray-900 text-white">{cluster.case_count} cases</Badge>
                            {cluster.percent_increase > 0 && (
                              <Badge className="bg-red-600 text-white">
                                ↑ {cluster.percent_increase}% increase
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={`${getSeverityColor(cluster.severity)} text-lg px-3 py-1`}>
                          {cluster.severity}
                        </Badge>
                      </div>

                      {cluster.geographic_cluster && (
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Geographic Cluster:</p>
                          <p className="text-gray-900">{cluster.geographic_cluster}</p>
                        </div>
                      )}

                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Common Risk Factors:</p>
                        <div className="flex flex-wrap gap-2">
                          {cluster.common_risk_factors?.map((factor, i) => (
                            <Badge key={i} variant="outline">{factor}</Badge>
                          ))}
                        </div>
                      </div>

                      {cluster.affected_nurses && cluster.affected_nurses.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Affected Care Teams:</p>
                          <p className="text-sm text-gray-600">{cluster.affected_nurses.join(', ')}</p>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                        <p className="text-sm font-semibold text-blue-900 mb-2">Recommended Actions:</p>
                        <ul className="space-y-1">
                          {cluster.recommended_actions?.map((action, i) => (
                            <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-600">No infection clusters detected</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Readmission Patterns */}
            <TabsContent value="readmissions" className="space-y-4">
              {analyticsData.readmission_patterns && (
                <Card>
                  <CardHeader>
                    <CardTitle>Readmission Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Readmissions</p>
                        <p className="text-3xl font-bold text-red-600">
                          {analyticsData.readmission_patterns.total_readmissions}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Readmission Rate</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {analyticsData.readmission_patterns.readmission_rate?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Avg Days to Readmit</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {analyticsData.readmission_patterns.avg_days_to_readmission?.toFixed(0)}
                        </p>
                      </div>
                    </div>

                    {analyticsData.readmission_patterns.top_readmission_diagnoses && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Top Readmission Diagnoses</h4>
                        <div className="space-y-2">
                          {analyticsData.readmission_patterns.top_readmission_diagnoses.map((diag, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-900">{diag.diagnosis}</span>
                              <div className="flex items-center gap-3">
                                <Badge>{diag.count} cases</Badge>
                                <span className="text-sm text-gray-600">{diag.avg_days} days avg</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">Prevention Strategies:</p>
                      <ul className="space-y-1">
                        {analyticsData.readmission_patterns.prevention_strategies?.map((strategy, i) => (
                          <li key={i} className="text-sm text-yellow-800 flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            {strategy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Nurse Performance Insights */}
            <TabsContent value="nurses" className="space-y-4">
              {analyticsData.nurse_performance_insights && analyticsData.nurse_performance_insights.length > 0 ? (
                <div className="grid gap-4">
                  {analyticsData.nurse_performance_insights.map((nurse, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{nurse.nurse_name}</h3>
                            <p className="text-sm text-gray-600">{nurse.patient_count} patients • Quality: {nurse.avg_visit_quality}</p>
                          </div>
                          <Badge className={`${
                            nurse.incident_rate < 5 ? 'bg-green-100 text-green-700' :
                            nurse.incident_rate < 10 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {nurse.incident_rate?.toFixed(1)}% incident rate
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {nurse.areas_of_excellence && nurse.areas_of_excellence.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-green-700 mb-2">Excellence:</p>
                              <ul className="space-y-1">
                                {nurse.areas_of_excellence.map((area, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    {area}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {nurse.training_recommendations && nurse.training_recommendations.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-blue-700 mb-2">Training Recommended:</p>
                              <ul className="space-y-1">
                                {nurse.training_recommendations.map((rec, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1">
                                    <Brain className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-600">No nurse performance data available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Geographic Hotspots */}
            <TabsContent value="geographic" className="space-y-4">
              {analyticsData.geographic_hotspots && analyticsData.geographic_hotspots.length > 0 ? (
                <div className="grid gap-4">
                  {analyticsData.geographic_hotspots.map((area, idx) => (
                    <Card key={idx} className={`border-2 ${getSeverityColor(area.risk_level)}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              <MapPin className="w-5 h-5" />
                              {area.area}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {area.patient_count} patients • {area.incident_rate?.toFixed(1)}% incident rate
                            </p>
                          </div>
                          <Badge className={`${getSeverityColor(area.risk_level)} text-lg px-3 py-1`}>
                            {area.risk_level}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Primary Concerns:</p>
                          <div className="flex flex-wrap gap-2">
                            {area.primary_concerns?.map((concern, i) => (
                              <Badge key={i} variant="outline">{concern}</Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-600">No geographic hotspots identified</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Quality Indicators */}
            <TabsContent value="quality" className="space-y-4">
              {analyticsData.quality_indicators && (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quality Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: 'Documentation Quality', value: analyticsData.quality_indicators.documentation_quality_score },
                          { label: 'Visit Compliance', value: analyticsData.quality_indicators.visit_compliance_rate },
                          { label: 'Med Reconciliation', value: analyticsData.quality_indicators.medication_reconciliation_rate },
                          { label: 'Patient Education', value: analyticsData.quality_indicators.patient_education_completion },
                          { label: 'Care Plan Adherence', value: analyticsData.quality_indicators.care_plan_adherence },
                        ].map((metric, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                              <span className="text-sm font-bold text-gray-900">{metric.value}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  metric.value >= 90 ? 'bg-green-600' :
                                  metric.value >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                                }`}
                                style={{ width: `${metric.value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Benchmark Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyticsData.quality_indicators.areas_exceeding_benchmarks && (
                          <div>
                            <p className="text-sm font-semibold text-green-700 mb-2">Exceeding Benchmarks:</p>
                            <ul className="space-y-1">
                              {analyticsData.quality_indicators.areas_exceeding_benchmarks.map((area, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                  <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                  {area}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analyticsData.quality_indicators.areas_below_benchmarks && (
                          <div>
                            <p className="text-sm font-semibold text-red-700 mb-2">Below Benchmarks:</p>
                            <ul className="space-y-1">
                              {analyticsData.quality_indicators.areas_below_benchmarks.map((area, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                  <TrendingDown className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                  {area}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Predictive Risk Factors */}
          {analyticsData.predictive_risk_factors && analyticsData.predictive_risk_factors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-6 h-6" />
                  Predictive Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.predictive_risk_factors.map((factor, idx) => (
                    <div key={idx} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{factor.risk_factor}</h4>
                        <Badge className={`${
                          factor.correlation_strength === 'very_strong' ? 'bg-red-600' :
                          factor.correlation_strength === 'strong' ? 'bg-orange-600' :
                          factor.correlation_strength === 'moderate' ? 'bg-yellow-600' : 'bg-gray-600'
                        } text-white`}>
                          {factor.correlation_strength} correlation
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        Predicts: {factor.outcome_predicted} ({factor.affected_population_percent}% of population)
                      </p>
                      <div className="bg-white border border-purple-200 rounded p-2">
                        <p className="text-xs font-semibold text-purple-900 mb-1">Mitigation:</p>
                        <p className="text-xs text-gray-700">{factor.mitigation_strategies?.join('; ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}