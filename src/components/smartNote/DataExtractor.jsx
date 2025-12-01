import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Database, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Target,
  Pill,
  Activity
} from "lucide-react";

export default function DataExtractor({ 
  narrativeText, 
  onExtractedData,
  onCreateCarePlan,
  onCreateTask
}) {
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});

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
    return colors[severity] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800"
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
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
                <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Vital Signs Detected
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(extractedData.vital_signs).map(([key, value]) => 
                    value && (
                      <div key={key} className="bg-gray-50 p-1 rounded">
                        <span className="text-gray-500">{key.replace(/_/g, ' ')}:</span> {value}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Symptoms */}
            {extractedData.symptoms?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Symptoms</p>
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
                <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Pill className="w-3 h-3" /> Medications
                </p>
                <div className="space-y-1">
                  {extractedData.medications.map((m, idx) => (
                    <div key={idx} className="text-xs bg-purple-50 p-1 rounded">
                      <strong>{m.name}</strong> - {m.action}
                      {m.notes && <span className="text-gray-500"> ({m.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Care Plans */}
            {extractedData.suggested_care_plans?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Suggested Care Plans
                </p>
                <div className="space-y-2">
                  {extractedData.suggested_care_plans.map((cp, idx) => (
                    <div key={idx} className="bg-green-50 p-2 rounded border border-green-200">
                      <p className="text-xs font-medium">{cp.problem}</p>
                      <p className="text-xs text-gray-600">Goal: {cp.goal}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 h-6 text-xs"
                        onClick={() => onCreateCarePlan && onCreateCarePlan(cp)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Add Care Plan
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Tasks */}
            {extractedData.follow_up_tasks?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
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