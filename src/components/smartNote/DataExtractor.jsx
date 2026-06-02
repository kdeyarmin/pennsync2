import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Target,
  Pill,
  Activity,
  Sparkles
} from "lucide-react";

export default function DataExtractor({ 
  narrativeText, 
  patientId,
  onExtractedData,
  _onCreateCarePlan,
  onCreateTask,
  onCarePlansCreated
}) {
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [_selectedItems, _setSelectedItems] = useState({});
  const [isCreatingCarePlans, setIsCreatingCarePlans] = useState(false);
  const [createdCarePlans, setCreatedCarePlans] = useState([]);
  const [selectedCarePlans, setSelectedCarePlans] = useState({});

  const extractData = async () => {
    if (!narrativeText || narrativeText.length < 100) {
      alert("Please enter more text to extract data from.");
      return;
    }

    setIsExtracting(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical data extraction AI. Analyze this nursing note and extract structured data points.

NURSING NOTE:
${narrativeText}

Extract and categorize:
1. VITAL SIGNS: Any mentioned vital signs with values
2. SYMPTOMS: Reported or observed symptoms
3. INTERVENTIONS: Actions taken by the nurse
4. MEDICATIONS: Any medications mentioned
5. PATIENT RESPONSES: How patient responded to care/teaching
6. CARE PLAN ITEMS: Potential new care plan problems/goals
7. FOLLOW-UP TASKS: Items requiring follow-up

Return JSON:
{
  "vital_signs": {
    "blood_pressure": "value or null",
    "heart_rate": "value or null",
    "temperature": "value or null",
    "oxygen_saturation": "value or null",
    "pain_level": "value or null",
    "respiratory_rate": "value or null",
    "weight": "value or null"
  },
  "symptoms": [
    {
      "symptom": "Name",
      "severity": "mild" | "moderate" | "severe",
      "status": "new" | "ongoing" | "resolved"
    }
  ],
  "interventions": [
    {
      "intervention": "Description",
      "category": "assessment" | "treatment" | "education" | "coordination"
    }
  ],
  "medications": [
    {
      "name": "Medication name",
      "action": "reviewed" | "administered" | "taught" | "reconciled",
      "notes": "Any relevant notes"
    }
  ],
  "patient_responses": [
    {
      "topic": "What was taught/done",
      "response": "Patient's response",
      "understanding": "good" | "fair" | "poor"
    }
  ],
  "suggested_care_plans": [
    {
      "problem": "Problem statement",
      "goal": "Suggested goal",
      "rationale": "Why this should be added"
    }
  ],
  "follow_up_tasks": [
    {
      "task": "Task description",
      "priority": "high" | "medium" | "low",
      "due": "suggested timeframe"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            vital_signs: { type: "object" },
            symptoms: { type: "array", items: { type: "object" } },
            interventions: { type: "array", items: { type: "object" } },
            medications: { type: "array", items: { type: "object" } },
            patient_responses: { type: "array", items: { type: "object" } },
            suggested_care_plans: { type: "array", items: { type: "object" } },
            follow_up_tasks: { type: "array", items: { type: "object" } }
          }
        }
      });

      setExtractedData(result);
      if (onExtractedData) {
        onExtractedData(result);
      }
    } catch (error) {
      console.error("Error extracting data:", error);
      alert("Error extracting data. Please try again.");
    }
    setIsExtracting(false);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      mild: "bg-green-100 text-green-800",
      moderate: "bg-yellow-100 text-yellow-800",
      severe: "bg-red-100 text-red-800"
    };
    return colors[severity] || "bg-slate-100 text-slate-800";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800"
    };
    return colors[priority] || "bg-slate-100 text-slate-800";
  };

  // Toggle care plan selection
  const toggleCarePlanSelection = (idx) => {
    setSelectedCarePlans(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Select all care plans
  const selectAllCarePlans = () => {
    const allSelected = {};
    extractedData?.suggested_care_plans?.forEach((_, idx) => {
      allSelected[idx] = true;
    });
    setSelectedCarePlans(allSelected);
  };

  // Create all selected care plans with AI enhancement
  const createSelectedCarePlans = async () => {
    if (!patientId) {
      alert("Please select a patient to create care plans.");
      return;
    }

    const selectedPlans = extractedData?.suggested_care_plans?.filter((_, idx) => selectedCarePlans[idx]) || [];
    if (selectedPlans.length === 0) {
      alert("Please select at least one care plan to create.");
      return;
    }

    setIsCreatingCarePlans(true);
    try {
      // Enhance care plans with AI for compliance
      const enhancedResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation specialist. Enhance these care plan suggestions to ensure they are compliant with Medicare documentation standards and include measurable goals.

SUGGESTED CARE PLANS:
${JSON.stringify(selectedPlans, null, 2)}

For each care plan, enhance it to include:
1. A clear, specific nursing problem statement
2. A SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound)
3. Evidence-based interventions (3-5 specific interventions)
4. A baseline measurement placeholder
5. Appropriate frequency of assessment
6. Target date (calculate from today: ${new Date().toISOString().split('T')[0]})

Return JSON:
{
  "enhanced_care_plans": [
    {
      "problem": "Enhanced problem statement",
      "goal": "SMART goal with measurable outcome",
      "interventions": ["Intervention 1", "Intervention 2", "Intervention 3"],
      "baseline_measurement": "What to measure at baseline",
      "frequency": "How often to assess (e.g., 'Each visit', 'Weekly')",
      "target_date": "YYYY-MM-DD format, typically 30-60 days from today",
      "rationale": "Clinical rationale for this care plan",
      "priority": "high" | "medium" | "low"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            enhanced_care_plans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  problem: { type: "string" },
                  goal: { type: "string" },
                  interventions: { type: "array", items: { type: "string" } },
                  baseline_measurement: { type: "string" },
                  frequency: { type: "string" },
                  target_date: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Create care plans in the database
      const createdPlans = [];
      for (const plan of enhancedResult.enhanced_care_plans) {
        const carePlan = await base44.entities.CarePlan.create({
          patient_id: patientId,
          problem: plan.problem,
          goal: plan.goal,
          interventions: plan.interventions,
          baseline_measurement: plan.baseline_measurement,
          frequency: plan.frequency,
          target_date: plan.target_date,
          status: 'active'
        });
        createdPlans.push({ ...carePlan, ...plan });
      }

      setCreatedCarePlans(createdPlans);
      setSelectedCarePlans({});

      if (onCarePlansCreated) {
        onCarePlansCreated(createdPlans);
      }

    } catch (error) {
      console.error("Error creating care plans:", error);
      alert("Error creating care plans. Please try again.");
    }
    setIsCreatingCarePlans(false);
  };

  return (
    <Card className="border-cyan-200">
      <CardHeader className="py-3 bg-gradient-to-r from-cyan-50 to-teal-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-600" />
          Auto Data Extraction
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {!extractedData ? (
          <Button
            onClick={extractData}
            disabled={isExtracting || !narrativeText || narrativeText.length < 100}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
            size="sm"
          >
            {isExtracting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting Data...</>
            ) : (
              <><Database className="w-4 h-4 mr-2" /> Extract Structured Data</>
            )}
          </Button>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Vital Signs */}
            {extractedData.vital_signs && Object.values(extractedData.vital_signs).some(v => v) && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Vital Signs Detected
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(extractedData.vital_signs).map(([key, value]) => 
                    value && (
                      <div key={key} className="bg-slate-50 p-1 rounded">
                        <span className="text-slate-500">{key.replace(/_/g, ' ')}:</span> {value}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Symptoms */}
            {extractedData.symptoms?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Symptoms</p>
                <div className="space-y-1">
                  {extractedData.symptoms.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <Badge className={getSeverityColor(s.severity)}>{s.severity}</Badge>
                      <span>{s.symptom}</span>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medications */}
            {extractedData.medications?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Pill className="w-3 h-3" /> Medications
                </p>
                <div className="space-y-1">
                  {extractedData.medications.map((m, idx) => (
                    <div key={idx} className="text-xs bg-purple-50 p-1 rounded">
                      <strong>{m.name}</strong> - {m.action}
                      {m.notes && <span className="text-slate-500"> ({m.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Care Plans */}
            {extractedData.suggested_care_plans?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Suggested Care Plans ({extractedData.suggested_care_plans.length})
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 text-xs px-1"
                    onClick={selectAllCarePlans}
                  >
                    Select All
                  </Button>
                </div>
                <div className="space-y-2">
                  {extractedData.suggested_care_plans.map((cp, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        selectedCarePlans[idx] 
                          ? 'bg-green-100 border-green-400' 
                          : 'bg-green-50 border-green-200 hover:bg-green-100'
                      }`}
                      onClick={() => toggleCarePlanSelection(idx)}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox 
                          checked={selectedCarePlans[idx] || false}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-medium">{cp.problem}</p>
                          <p className="text-xs text-slate-600">Goal: {cp.goal}</p>
                          {cp.rationale && (
                            <p className="text-xs text-slate-500 italic mt-1">{cp.rationale}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bulk Create Button */}
                {Object.values(selectedCarePlans).some(v => v) && (
                  <Button
                    size="sm"
                    className="w-full mt-2 bg-green-600 hover:bg-green-700"
                    onClick={createSelectedCarePlans}
                    disabled={isCreatingCarePlans || !patientId}
                  >
                    {isCreatingCarePlans ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Creating Care Plans...</>
                    ) : (
                      <><Sparkles className="w-3 h-3 mr-1" /> AI Create {Object.values(selectedCarePlans).filter(v => v).length} Care Plan(s)</>
                    )}
                  </Button>
                )}

                {!patientId && Object.values(selectedCarePlans).some(v => v) && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Select a patient to create care plans
                  </p>
                )}
              </div>
            )}

            {/* Created Care Plans Success */}
            {createdCarePlans.length > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-xs text-green-800">
                  <strong>{createdCarePlans.length} care plan(s) created successfully!</strong>
                  <ul className="mt-1 space-y-0.5">
                    {createdCarePlans.map((cp, idx) => (
                      <li key={idx}>• {cp.problem}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Follow-up Tasks */}
            {extractedData.follow_up_tasks?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Follow-up Tasks
                </p>
                <div className="space-y-1">
                  {extractedData.follow_up_tasks.map((task, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-orange-50 p-2 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        <span>{task.task}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => onCreateTask && onCreateTask(task)}
                      >
                        Create
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => setExtractedData(null)}
            >
              Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}