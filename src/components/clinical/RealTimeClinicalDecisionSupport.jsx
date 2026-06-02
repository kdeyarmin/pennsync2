import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Stethoscope,
  Pill,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Shield,
  Heart,
  FileText,
  Plus,
  XCircle
} from "lucide-react";

export default function RealTimeClinicalDecisionSupport({
  patient,
  _visit,
  vitalSigns,
  narrativeText,
  carePlans,
  _medications,
  onInsertText
}) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("diagnoses");
  const [addedItems, setAddedItems] = useState([]);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState("");

  // Create a hash of current data to detect changes
  const currentDataHash = JSON.stringify({
    vitals: vitalSigns,
    notes: (narrativeText || '').substring(0, 200),
    diagnosis: patient?.primary_diagnosis
  });

  // Auto-analyze when significant data changes
  useEffect(() => {
    if (patient && currentDataHash !== lastAnalyzedHash && !isAnalyzing) {
      const timer = setTimeout(() => {
        if (Object.keys(vitalSigns || {}).length > 0 || (narrativeText || '').length > 50) {
          runAnalysis();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentDataHash]);

  const runAnalysis = async () => {
    if (!patient) return;
    
    setIsAnalyzing(true);
    try {
      const activeCarePlans = (carePlans || [])
        .filter(cp => cp.status === 'active')
        .map(cp => `${cp.problem}: ${cp.goal}`)
        .join('\n');

      const prompt = `You are an advanced clinical decision support AI for home health/hospice. Analyze this patient's current data and provide real-time clinical insights.

PATIENT PROFILE:
- Name: ${patient.first_name} ${patient.last_name}
- Age: ${patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'Unknown'}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
- Allergies: ${patient.allergies || 'NKDA'}

CURRENT VITAL SIGNS:
${vitalSigns ? Object.entries(vitalSigns).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`).join('\n') : 'Not recorded'}

CURRENT VISIT NOTES:
${(narrativeText || '').substring(0, 800) || 'No notes yet'}

ACTIVE CARE PLANS:
${activeCarePlans || 'None'}

KNOWN MEDICATIONS (if documented in notes):
${extractMedicationsFromText(narrativeText || '')}

Provide comprehensive clinical decision support:

1. DIFFERENTIAL DIAGNOSES: Based on symptoms, vitals, and notes, suggest conditions that may need investigation
2. DRUG INTERACTIONS: Flag any potential interactions or contraindications based on medications mentioned
3. TREATMENT RECOMMENDATIONS: Evidence-based interventions appropriate for this patient's condition and care stage
4. PATIENT EDUCATION: Relevant education materials based on conditions and risks

Return JSON:
{
  "differential_diagnoses": [
    {
      "condition": "Condition name",
      "likelihood": "high|moderate|low",
      "supporting_evidence": ["Evidence 1", "Evidence 2"],
      "recommended_workup": ["Test/assessment 1"],
      "red_flags": ["Warning sign to watch"],
      "urgency": "immediate|soon|routine"
    }
  ],
  "drug_interactions": [
    {
      "interaction_type": "drug-drug|drug-condition|drug-allergy|contraindication",
      "severity": "critical|major|moderate|minor",
      "medications_involved": ["Med 1", "Med 2"],
      "description": "Description of interaction",
      "recommendation": "What to do",
      "monitoring": "What to monitor"
    }
  ],
  "treatment_recommendations": [
    {
      "category": "medication|intervention|monitoring|referral",
      "recommendation": "Specific recommendation",
      "rationale": "Evidence-based rationale",
      "priority": "high|medium|low",
      "guideline_source": "Source guideline if applicable",
      "documentation_text": "Text to add to notes"
    }
  ],
  "patient_education": [
    {
      "topic": "Education topic",
      "relevance": "Why this is important for this patient",
      "key_points": ["Point 1", "Point 2", "Point 3"],
      "teach_back_questions": ["Question to verify understanding"],
      "documentation_text": "Documentation of education provided"
    }
  ],
  "clinical_alerts": [
    {
      "alert_type": "critical|warning|info",
      "message": "Alert message",
      "action_required": "What action to take"
    }
  ],
  "quality_measure_opportunities": ["Opportunity 1"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            differential_diagnoses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  condition: { type: "string" },
                  likelihood: { type: "string" },
                  supporting_evidence: { type: "array", items: { type: "string" } },
                  recommended_workup: { type: "array", items: { type: "string" } },
                  red_flags: { type: "array", items: { type: "string" } },
                  urgency: { type: "string" }
                }
              }
            },
            drug_interactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  interaction_type: { type: "string" },
                  severity: { type: "string" },
                  medications_involved: { type: "array", items: { type: "string" } },
                  description: { type: "string" },
                  recommendation: { type: "string" },
                  monitoring: { type: "string" }
                }
              }
            },
            treatment_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  recommendation: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" },
                  guideline_source: { type: "string" },
                  documentation_text: { type: "string" }
                }
              }
            },
            patient_education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  relevance: { type: "string" },
                  key_points: { type: "array", items: { type: "string" } },
                  teach_back_questions: { type: "array", items: { type: "string" } },
                  documentation_text: { type: "string" }
                }
              }
            },
            clinical_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  alert_type: { type: "string" },
                  message: { type: "string" },
                  action_required: { type: "string" }
                }
              }
            },
            quality_measure_opportunities: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis(result);
      setLastAnalyzedHash(currentDataHash);
    } catch (error) {
      console.error('Error running clinical analysis:', error);
    }
    setIsAnalyzing(false);
  };

  const handleInsert = (text, id) => {
    onInsertText("\n\n" + text);
    setAddedItems([...addedItems, id]);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'major': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-black';
      case 'minor': return 'bg-blue-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getLikelihoodColor = (likelihood) => {
    switch (likelihood) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const criticalAlerts = analysis?.clinical_alerts?.filter(a => a.alert_type === 'critical') || [];
  const criticalInteractions = analysis?.drug_interactions?.filter(i => i.severity === 'critical') || [];

  if (!patient) return null;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Brain className="w-5 h-5 text-blue-600" />
            Real-Time Clinical Decision Support
          </CardTitle>
          <div className="flex items-center gap-2">
            {(criticalAlerts.length > 0 || criticalInteractions.length > 0) && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {criticalAlerts.length + criticalInteractions.length} Critical
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={runAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          {/* Critical Alerts Banner */}
          {criticalAlerts.length > 0 && (
            <Alert className="mb-4 bg-red-100 border-red-300">
              <XCircle className="w-5 h-5 text-red-600" />
              <AlertDescription className="text-red-900">
                {criticalAlerts.map((alert, idx) => (
                  <div key={idx} className="mb-1 last:mb-0">
                    <strong>{alert.message}</strong>
                    <span className="block text-sm">{alert.action_required}</span>
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {isAnalyzing && (
            <div className="flex items-center justify-center py-6 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">Analyzing clinical data...</span>
            </div>
          )}

          {!isAnalyzing && !analysis && (
            <div className="text-center py-6">
              <Brain className="w-10 h-10 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-blue-600">Enter vitals or notes to get AI-powered clinical insights</p>
              <Button size="sm" onClick={runAnalysis} className="mt-2">
                Analyze Now
              </Button>
            </div>
          )}

          {analysis && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="diagnoses" className="text-xs">
                  <Stethoscope className="w-3 h-3 mr-1" />
                  Diagnoses
                </TabsTrigger>
                <TabsTrigger value="drugs" className="text-xs">
                  <Pill className="w-3 h-3 mr-1" />
                  Drugs
                  {criticalInteractions.length > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white text-xs px-1">!</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="treatment" className="text-xs">
                  <Heart className="w-3 h-3 mr-1" />
                  Treatment
                </TabsTrigger>
                <TabsTrigger value="education" className="text-xs">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Education
                </TabsTrigger>
              </TabsList>

              {/* Differential Diagnoses Tab */}
              <TabsContent value="diagnoses" className="space-y-3">
                {analysis.differential_diagnoses?.length > 0 ? (
                  analysis.differential_diagnoses.map((dx, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{dx.condition}</span>
                        </div>
                        <div className="flex gap-1">
                          <Badge className={getLikelihoodColor(dx.likelihood)}>
                            {dx.likelihood}
                          </Badge>
                          <Badge variant="outline" className={
                            dx.urgency === 'immediate' ? 'border-red-300 text-red-700' :
                            dx.urgency === 'soon' ? 'border-orange-300 text-orange-700' :
                            'border-slate-300 text-slate-700'
                          }>
                            {dx.urgency}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Supporting Evidence:</p>
                          <ul className="list-disc ml-4 text-slate-700">
                            {dx.supporting_evidence?.map((ev, i) => (
                              <li key={i}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {dx.recommended_workup?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Recommended Workup:</p>
                            <div className="flex flex-wrap gap-1">
                              {dx.recommended_workup.map((w, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{w}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {dx.red_flags?.length > 0 && (
                          <Alert className="bg-red-50 border-red-200 py-2">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <AlertDescription className="text-red-800 text-xs">
                              <strong>Red Flags:</strong> {dx.red_flags.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">No differential diagnoses identified</p>
                )}
              </TabsContent>

              {/* Drug Interactions Tab */}
              <TabsContent value="drugs" className="space-y-3">
                {analysis.drug_interactions?.length > 0 ? (
                  analysis.drug_interactions.map((interaction, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${
                      interaction.severity === 'critical' ? 'bg-red-50 border-red-300' :
                      interaction.severity === 'major' ? 'bg-orange-50 border-orange-300' :
                      'bg-white'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {interaction.severity === 'critical' && <XCircle className="w-4 h-4 text-red-600" />}
                          {interaction.severity === 'major' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                          {interaction.severity === 'moderate' && <Shield className="w-4 h-4 text-yellow-600" />}
                          <span className="font-medium text-sm">
                            {interaction.medications_involved?.join(' + ')}
                          </span>
                        </div>
                        <Badge className={getSeverityColor(interaction.severity)}>
                          {interaction.severity}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-slate-700 mb-2">{interaction.description}</p>
                      
                      <div className="grid gap-2 text-xs">
                        <div className="p-2 bg-blue-50 rounded">
                          <strong>Recommendation:</strong> {interaction.recommendation}
                        </div>
                        {interaction.monitoring && (
                          <div className="p-2 bg-green-50 rounded">
                            <strong>Monitor:</strong> {interaction.monitoring}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700">No drug interactions identified</p>
                  </div>
                )}
              </TabsContent>

              {/* Treatment Recommendations Tab */}
              <TabsContent value="treatment" className="space-y-3">
                {analysis.treatment_recommendations?.length > 0 ? (
                  analysis.treatment_recommendations.map((rec, idx) => {
                    const itemId = `treatment-${idx}`;
                    const isAdded = addedItems.includes(itemId);
                    
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-xs">
                              {rec.category}
                            </Badge>
                            <Badge className={
                              rec.priority === 'high' ? 'bg-red-500' :
                              rec.priority === 'medium' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }>
                              {rec.priority}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant={isAdded ? "outline" : "default"}
                            onClick={() => handleInsert(rec.documentation_text, itemId)}
                            disabled={isAdded}
                            className="h-7 text-xs"
                          >
                            {isAdded ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          </Button>
                        </div>
                        
                        <p className="font-medium text-sm mb-1">{rec.recommendation}</p>
                        <p className="text-xs text-slate-600 mb-2">{rec.rationale}</p>
                        
                        {rec.guideline_source && (
                          <p className="text-xs text-blue-600">
                            <FileText className="w-3 h-3 inline mr-1" />
                            Source: {rec.guideline_source}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 text-center py-4">No treatment recommendations</p>
                )}
              </TabsContent>

              {/* Patient Education Tab */}
              <TabsContent value="education" className="space-y-3">
                {analysis.patient_education?.length > 0 ? (
                  analysis.patient_education.map((edu, idx) => {
                    const itemId = `education-${idx}`;
                    const isAdded = addedItems.includes(itemId);
                    
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-sm">{edu.topic}</span>
                          </div>
                          <Button
                            size="sm"
                            variant={isAdded ? "outline" : "default"}
                            onClick={() => handleInsert(edu.documentation_text, itemId)}
                            disabled={isAdded}
                            className="h-7 text-xs"
                          >
                            {isAdded ? 'Added' : 'Add to Notes'}
                          </Button>
                        </div>
                        
                        <p className="text-xs text-slate-600 mb-2">{edu.relevance}</p>
                        
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-slate-500 mb-1">Key Points:</p>
                          <ul className="list-disc ml-4 text-xs text-slate-700">
                            {edu.key_points?.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>

                        {edu.teach_back_questions?.length > 0 && (
                          <div className="p-2 bg-purple-50 rounded">
                            <p className="text-xs font-semibold text-purple-700 mb-1">
                              <Lightbulb className="w-3 h-3 inline mr-1" />
                              Teach-Back Questions:
                            </p>
                            <ul className="list-disc ml-4 text-xs text-purple-800">
                              {edu.teach_back_questions.map((q, i) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 text-center py-4">No education materials suggested</p>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Quality Measure Opportunities */}
          {analysis?.quality_measure_opportunities?.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-800 mb-2">
                ⭐ Quality Measure Opportunities
              </p>
              <div className="flex flex-wrap gap-1">
                {analysis.quality_measure_opportunities.map((opp, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-green-100 border-green-300">
                    {opp}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function extractMedicationsFromText(text) {
  // Common medication patterns
  const commonMeds = [
    'metoprolol', 'lisinopril', 'amlodipine', 'metformin', 'insulin',
    'warfarin', 'coumadin', 'aspirin', 'lasix', 'furosemide',
    'hydrochlorothiazide', 'atorvastatin', 'omeprazole', 'levothyroxine',
    'gabapentin', 'prednisone', 'albuterol', 'morphine', 'oxycodone',
    'lorazepam', 'sertraline', 'duloxetine', 'carvedilol', 'digoxin'
  ];
  
  const lowerText = text.toLowerCase();
  const found = commonMeds.filter(med => lowerText.includes(med));
  
  return found.length > 0 ? found.join(', ') : 'No medications documented in notes';
}