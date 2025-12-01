
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Target,
  CheckCircle2,
  Edit,
  Trash2,
  Plus,
  TrendingUp,
  AlertCircle,
  Brain,
  RefreshCw,
  Zap
} from "lucide-react";

export default function AICarePlanGenerator({ patient, visit, vitalSigns, narrativeText }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedPlans, setSuggestedPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);

  // Fetch existing care plans
  const { data: existingCarePlans = [] } = useQuery({
    queryKey: ['carePlans', patient?.id],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patient.id }),
    enabled: !!patient?.id,
    initialData: [],
  });

  // Fetch all visits for trend analysis
  const { data: allVisits = [] } = useQuery({
    queryKey: ['patientVisits', patient?.id],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patient.id, status: 'completed' }, '-visit_date'),
    enabled: !!patient?.id,
    initialData: [],
  });

  // Fetch automatic care plan triggers
  const { data: automaticTriggers = [] } = useQuery({
    queryKey: ['automaticCarePlanTriggers'],
    queryFn: () => base44.entities.AutomaticCarePlanTrigger.list(),
    initialData: [],
  });

  // Create care plan mutation
  const createCarePlanMutation = useMutation({
    mutationFn: (carePlanData) => base44.entities.CarePlan.create(carePlanData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carePlans', patient.id] });
    },
  });

  // Update care plan mutation
  const updateCarePlanMutation = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.CarePlan.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carePlans', patient.id] });
    },
  });

  // Generate AI care plans
  const generateCarePlans = async () => {
    setIsGenerating(true);
    setShowDialog(true);
    
    try {
      const careType = patient.care_type === 'hospice' ? 'HOSPICE' : 'HOME HEALTH';
      
      // Check for automatic triggers
      const matchedTriggers = automaticTriggers.filter(trigger => {
        if (!trigger.is_active) return false;
        if (trigger.care_type !== 'both' && trigger.care_type !== patient.care_type) return false;
        
        if (trigger.trigger_type === 'diagnosis') {
          const allDiagnoses = [
            patient.primary_diagnosis,
            ...(patient.secondary_diagnoses || [])
          ].filter(Boolean).map(d => d.toLowerCase());
          
          return allDiagnoses.some(d => d.includes(trigger.trigger_value.toLowerCase()));
        }
        
        // For medications, we'll check the narrative text
        if (trigger.trigger_type === 'medication' && narrativeText) {
          return narrativeText.toLowerCase().includes(trigger.trigger_value.toLowerCase());
        }
        
        return false;
      });

      // Start with automatic triggered care plans
      let initialSuggestions = matchedTriggers.map(trigger => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + trigger.days_until_target);
        
        return {
          problem: trigger.problem,
          goal: trigger.goal,
          baseline_measurement: trigger.baseline_measurement || '',
          interventions: trigger.interventions,
          frequency: trigger.frequency,
          target_date: targetDate.toISOString().split('T')[0],
          priority: trigger.priority,
          update_type: 'new',
          existing_plan_id: null,
          rationale: `Automatically triggered by ${trigger.trigger_type}: ${trigger.trigger_value}`,
          is_automatic: true
        };
      });
      
      // Build comprehensive prompt for AI to generate additional plans
      let prompt = `You are an expert ${careType} nurse care planner. Based on the patient data provided, generate a comprehensive individualized care plan with nursing diagnoses, measurable goals, and evidence-based interventions.

PATIENT INFORMATION:
- Care Type: ${careType}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Allergies: ${patient.allergies || 'NKDA'}

`;

      // Add current visit data
      if (visit) {
        prompt += `CURRENT VISIT (${visit.visit_date}):
Visit Type: ${visit.visit_type.replace(/_/g, ' ')}
`;
      }

      // Add vital signs
      if (Object.keys(vitalSigns).length > 0) {
        prompt += `\nCURRENT VITAL SIGNS:
`;
        if (vitalSigns.blood_pressure_systolic) {
          prompt += `- Blood Pressure: ${vitalSigns.blood_pressure_systolic}/${vitalSigns.blood_pressure_diastolic} mmHg\n`;
        }
        if (vitalSigns.heart_rate) prompt += `- Heart Rate: ${vitalSigns.heart_rate} bpm\n`;
        if (vitalSigns.respiratory_rate) prompt += `- Respiratory Rate: ${vitalSigns.respiratory_rate} /min\n`;
        if (vitalSigns.oxygen_saturation) prompt += `- O2 Saturation: ${vitalSigns.oxygen_saturation}%\n`;
        if (vitalSigns.temperature) prompt += `- Temperature: ${vitalSigns.temperature}°F\n`;
        if (vitalSigns.pain_level !== undefined) prompt += `- Pain Level: ${vitalSigns.pain_level}/10\n`;
        if (vitalSigns.weight) prompt += `- Weight: ${vitalSigns.weight} lbs\n`;
      }

      // Add clinical narrative
      if (narrativeText && narrativeText.length > 0) {
        prompt += `\nCLINICAL ASSESSMENT FROM CURRENT VISIT:
${narrativeText.substring(0, 1000)}${narrativeText.length > 1000 ? '...' : ''}
`;
      }

      // Add historical trends
      if (allVisits.length > 0) {
        prompt += `\nHISTORICAL TRENDS (last ${Math.min(allVisits.length, 3)} visits):
`;
        allVisits.slice(0, 3).forEach((v, idx) => {
          prompt += `\nVisit ${idx + 1} (${v.visit_date}):`;
          if (v.vital_signs) {
            if (v.vital_signs.blood_pressure_systolic) {
              prompt += ` BP: ${v.vital_signs.blood_pressure_systolic}/${v.vital_signs.blood_pressure_diastolic}`;
            }
            if (v.vital_signs.weight) prompt += ` | Weight: ${v.vital_signs.weight} lbs`;
            if (v.vital_signs.pain_level !== undefined) prompt += ` | Pain: ${v.vital_signs.pain_level}/10`;
          }
          prompt += '\n';
        });
      }

      // Add existing care plans for update suggestions
      if (existingCarePlans.length > 0) {
        prompt += `\nEXISTING CARE PLANS:
`;
        existingCarePlans.forEach((plan, idx) => {
          prompt += `${idx + 1}. ${plan.problem} - Goal: ${plan.goal} (Status: ${plan.status})
`;
        });
      }

      // Care type specific focus
      if (patient.care_type === 'hospice') {
        prompt += `\nHOSPICE CARE FOCUS:
- Prioritize comfort care and symptom management
- Focus on quality of life and dignity
- Include psychosocial and spiritual needs
- Address caregiver support and anticipatory grief
- Ensure pain and symptom control goals
`;
      } else {
        prompt += `\nHOME HEALTH CARE FOCUS:
- Focus on functional improvement and independence
- Include safety and fall prevention
- Address medication management and adherence
- Focus on disease-specific self-management
- Include patient/caregiver education needs
`;
      }

      if (matchedTriggers.length > 0) {
        prompt += `\nAUTOMATIC CARE PLANS ALREADY IDENTIFIED:
The following care plans have been automatically triggered based on diagnosis/medication:
${matchedTriggers.map(t => `- ${t.problem} (triggered by ${t.trigger_type}: ${t.trigger_value})`).join('\n')}

DO NOT duplicate these. Focus on identifying ADDITIONAL problems not covered by the automatic triggers.
`;
      }

      prompt += `\nTASK:
Generate ${existingCarePlans.length > 0 ? '2-4' : '3-5'} ADDITIONAL care plan problems (beyond any automatic triggers) with corresponding goals and interventions.

${existingCarePlans.length > 0 ? `IMPORTANT: Review existing care plans above. For any that are still relevant, suggest updates to goals or interventions based on current status. For new problems identified, create new care plans.` : ''}

For EACH care plan, provide:
1. **Problem/Nursing Diagnosis**: Use NANDA-approved nursing diagnoses when possible (e.g., "Impaired Gas Exchange", "Acute Pain", "Risk for Falls")
2. **Goal**: Specific, Measurable, Achievable, Relevant, Time-bound (SMART) goal
3. **Baseline**: Current measurement or status to track from
4. **Interventions**: 3-5 specific, evidence-based nursing interventions
5. **Frequency**: How often to assess/intervene (e.g., "Each visit", "Weekly", "PRN")
6. **Target Date**: Realistic date to achieve goal (typically 30-90 days)
7. **Priority**: high, medium, or low
8. **Update Type**: "new" for new problems, or "update" if modifying an existing care plan (include existing_plan_id if update)

Return a JSON array of care plan objects with this exact structure:
[
  {
    "problem": "string",
    "goal": "string",
    "baseline_measurement": "string",
    "interventions": ["string", "string", "string"],
    "frequency": "string",
    "target_date": "YYYY-MM-DD",
    "priority": "high" | "medium" | "low",
    "update_type": "new" | "update",
    "existing_plan_id": "string or null",
    "rationale": "brief clinical rationale for this care plan"
  }
]

Make goals SMART and interventions specific and actionable.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            care_plans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  problem: { type: "string" },
                  goal: { type: "string" },
                  baseline_measurement: { type: "string" },
                  interventions: { type: "array", items: { type: "string" } },
                  frequency: { type: "string" },
                  target_date: { type: "string" },
                  priority: { type: "string" },
                  update_type: { type: "string" },
                  existing_plan_id: { type: ["string", "null"] },
                  rationale: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Combine automatic triggers with AI-generated plans
      const allPlans = [
        ...initialSuggestions,
        ...(response.care_plans || [])
      ];

      setSuggestedPlans(allPlans);
      
    } catch (error) {
      console.error("Error generating care plans:", error);
      alert("Error generating care plans. Please try again.");
    }
    
    setIsGenerating(false);
  };

  // Accept a suggested care plan
  const acceptCarePlan = async (plan) => {
    try {
      if (plan.update_type === 'update' && plan.existing_plan_id) {
        // Update existing care plan
        await updateCarePlanMutation.mutateAsync({
          id: plan.existing_plan_id,
          updates: {
            goal: plan.goal,
            interventions: plan.interventions,
            target_date: plan.target_date,
            frequency: plan.frequency,
            baseline_measurement: plan.baseline_measurement,
          }
        });
      } else {
        // Create new care plan
        await createCarePlanMutation.mutateAsync({
          patient_id: patient.id,
          problem: plan.problem,
          goal: plan.goal,
          interventions: plan.interventions,
          target_date: plan.target_date,
          status: 'active',
          baseline_measurement: plan.baseline_measurement,
          frequency: plan.frequency,
          rationale: plan.rationale // Include rationale for new plans
        });
      }

      // Remove from suggestions
      setSuggestedPlans(prev => prev.filter(p => p !== plan));
      
    } catch (error) {
      console.error("Error accepting care plan:", error);
      alert("Error saving care plan. Please try again.");
    }
  };

  // Accept all suggested care plans
  const acceptAllCarePlans = async () => {
    for (const plan of suggestedPlans) {
      await acceptCarePlan(plan);
    }
    setShowDialog(false);
  };

  // Edit a suggested care plan before accepting
  const editSuggestedPlan = (plan) => {
    setEditingPlan({ ...plan });
  };

  // Save edited plan
  const saveEditedPlan = () => {
    if (!editingPlan) return;
    
    setSuggestedPlans(prev => 
      prev.map(p => p === suggestedPlans.find(sp => sp.problem === editingPlan.problem) ? editingPlan : p)
    );
    setEditingPlan(null);
  };

  // Remove a suggestion
  const removeSuggestion = (plan) => {
    setSuggestedPlans(prev => prev.filter(p => p !== plan));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUpdateTypeIcon = (type) => {
    return type === 'update' ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />;
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI Care Plan Generator
            </CardTitle>
            <Button
              data-care-plan-generator="true"
              onClick={generateCarePlans}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Care Plans
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <Brain className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-purple-900">
              <p className="font-semibold mb-2">Intelligent Care Planning with Automatic Triggers</p>
              <p className="text-sm mb-2">
                AI analyzes patient diagnosis, medications, vital signs, clinical narrative, and historical trends to generate evidence-based care plans.
              </p>
              <ul className="list-disc ml-5 text-sm space-y-1">
                <li><strong>Automatic triggers:</strong> Pre-configured care plans based on diagnosis/medication</li>
                <li>Identifies key problems based on current assessment</li>
                <li>Creates measurable, time-bound goals</li>
                <li>Suggests evidence-based nursing interventions</li>
                <li>Updates existing plans with progress recommendations</li>
                <li>Ensures {patient?.care_type === 'hospice' ? 'hospice' : 'home health'} compliance</li>
              </ul>
            </AlertDescription>
          </Alert>

          {existingCarePlans.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Current Care Plans ({existingCarePlans.length})
              </h4>
              <div className="grid gap-2">
                {existingCarePlans.map((plan) => (
                  <div key={plan.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{plan.problem}</p>
                        <p className="text-sm text-gray-600 mt-1">{plan.goal}</p>
                      </div>
                      <Badge className={
                        plan.status === 'active' ? 'bg-green-500' :
                        plan.status === 'met' ? 'bg-blue-500' :
                        plan.status === 'not_met' ? 'bg-red-500' : 'bg-gray-500'
                      }>
                        {plan.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              AI-Generated Care Plan Suggestions
            </DialogTitle>
            <DialogDescription>
              Review and customize these care plans before adding them to the patient's record.
              {suggestedPlans.filter(p => p.is_automatic).length > 0 && (
                <span className="block mt-2 text-blue-600 font-medium">
                  ⚡ {suggestedPlans.filter(p => p.is_automatic).length} care plan(s) automatically triggered by diagnosis/medication
                </span>
              )}
              {suggestedPlans.filter(p => p.update_type === 'update').length > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  ⚠️ {suggestedPlans.filter(p => p.update_type === 'update').length} existing care plan(s) have suggested updates
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {suggestedPlans.length === 0 && !isGenerating && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  No care plan suggestions generated. Try clicking "Generate AI Care Plans" again.
                </AlertDescription>
              </Alert>
            )}

            {suggestedPlans.map((plan, index) => (
              <Card key={index} className={`border-l-4 ${plan.is_automatic ? 'border-l-blue-500 bg-blue-50' : 'border-l-purple-500'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getUpdateTypeIcon(plan.update_type)}
                        <h3 className="font-bold text-gray-900">{plan.problem}</h3>
                        <Badge className={getPriorityColor(plan.priority)}>
                          {plan.priority} priority
                        </Badge>
                        {plan.is_automatic && (
                          <Badge className="bg-blue-500">
                            <Zap className="w-3 h-3 mr-1" />
                            Automatic Trigger
                          </Badge>
                        )}
                        {plan.update_type === 'update' && (
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            Update to Existing Plan
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold text-gray-700">Goal:</span>
                          <p className="text-gray-600 mt-1">{plan.goal}</p>
                        </div>

                        {plan.baseline_measurement && (
                          <div>
                            <span className="font-semibold text-gray-700">Baseline:</span>
                            <p className="text-gray-600 mt-1">{plan.baseline_measurement}</p>
                          </div>
                        )}

                        <div>
                          <span className="font-semibold text-gray-700">Interventions:</span>
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            {plan.interventions.map((intervention, idx) => (
                              <li key={idx} className="text-gray-600">{intervention}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex gap-4 text-xs text-gray-500">
                          <span><strong>Frequency:</strong> {plan.frequency}</span>
                          <span><strong>Target Date:</strong> {plan.target_date}</span>
                        </div>

                        {plan.rationale && (
                          <div className="mt-2 p-2 bg-purple-50 rounded border border-purple-200">
                            <p className="text-xs text-purple-900">
                              <strong>Clinical Rationale:</strong> {plan.rationale}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button
                      size="sm"
                      onClick={() => acceptCarePlan(plan)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      {plan.update_type === 'update' ? 'Apply Update' : 'Accept'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editSuggestedPlan(plan)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeSuggestion(plan)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Close
            </Button>
            {suggestedPlans.length > 0 && (
              <Button
                onClick={acceptAllCarePlans}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accept All ({suggestedPlans.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Care Plan</DialogTitle>
            <DialogDescription>
              Customize this care plan before adding it to the patient's record.
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Problem/Nursing Diagnosis</Label>
                <Input
                  value={editingPlan.problem}
                  onChange={(e) => setEditingPlan({...editingPlan, problem: e.target.value})}
                />
              </div>

              <div>
                <Label>Goal (SMART)</Label>
                <Textarea
                  value={editingPlan.goal}
                  onChange={(e) => setEditingPlan({...editingPlan, goal: e.target.value})}
                  rows={2}
                />
              </div>

              <div>
                <Label>Baseline Measurement</Label>
                <Input
                  value={editingPlan.baseline_measurement}
                  onChange={(e) => setEditingPlan({...editingPlan, baseline_measurement: e.target.value})}
                />
              </div>

              <div>
                <Label>Interventions (one per line)</Label>
                <Textarea
                  value={editingPlan.interventions.join('\n')}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    interventions: e.target.value.split('\n').filter(i => i.trim())
                  })}
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Input
                    value={editingPlan.frequency}
                    onChange={(e) => setEditingPlan({...editingPlan, frequency: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={editingPlan.target_date}
                    onChange={(e) => setEditingPlan({...editingPlan, target_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={editingPlan.priority}
                  onValueChange={(value) => setEditingPlan({...editingPlan, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              Cancel
            </Button>
            <Button onClick={saveEditedPlan} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
