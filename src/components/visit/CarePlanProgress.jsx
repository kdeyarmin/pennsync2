import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function CarePlanProgress({ 
  patientId, 
  _visit,
  vitalSigns,
  previousVisit,
  onProgressGenerated 
}) {
  const [expandedGoals, setExpandedGoals] = useState([]);
  const [progressNotes, setProgressNotes] = useState({});
  const [generatingFor, setGeneratingFor] = useState(null);

  const { data: carePlans } = useQuery({
    queryKey: ['carePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ 
      patient_id: patientId,
      status: 'active'
    }),
    initialData: [],
    enabled: !!patientId,
  });

  const generateProgress = async (carePlan) => {
    setGeneratingFor(carePlan.id);
    
    try {
      let prompt = `You are an expert home health nurse. Generate a concise progress note for the following care plan goal.

CARE PLAN GOAL:
Problem: ${carePlan.problem}
Goal: ${carePlan.goal}
Baseline: ${carePlan.baseline_measurement || 'Not specified'}
Interventions Planned: ${carePlan.interventions?.join(', ') || 'None specified'}

CURRENT VISIT DATA:`;

      // Add vital signs context
      if (Object.keys(vitalSigns).length > 0) {
        prompt += `\nVital Signs Today:`;
        if (vitalSigns.blood_pressure_systolic && vitalSigns.blood_pressure_diastolic) {
          prompt += `\n- BP: ${vitalSigns.blood_pressure_systolic}/${vitalSigns.blood_pressure_diastolic}`;
        }
        if (vitalSigns.heart_rate) prompt += `\n- HR: ${vitalSigns.heart_rate}`;
        if (vitalSigns.weight) prompt += `\n- Weight: ${vitalSigns.weight} lbs`;
        if (vitalSigns.pain_level !== undefined) prompt += `\n- Pain: ${vitalSigns.pain_level}/10`;
        if (vitalSigns.oxygen_saturation) prompt += `\n- O2 Sat: ${vitalSigns.oxygen_saturation}%`;
      }

      // Add previous visit comparison if available
      if (previousVisit && previousVisit.vital_signs) {
        prompt += `\n\nPrevious Visit Data (${previousVisit.visit_date}):`;
        const prev = previousVisit.vital_signs;
        if (prev.blood_pressure_systolic) {
          prompt += `\n- BP: ${prev.blood_pressure_systolic}/${prev.blood_pressure_diastolic}`;
        }
        if (prev.heart_rate) prompt += `\n- HR: ${prev.heart_rate}`;
        if (prev.weight) prompt += `\n- Weight: ${prev.weight} lbs`;
        if (prev.pain_level !== undefined) prompt += `\n- Pain: ${prev.pain_level}/10`;
      }

      prompt += `\n\nTASK: Write a brief progress note (2-3 sentences) that:
1. States current status toward the goal (improved, stable, regressed)
2. Provides specific evidence from today's data
3. Notes any interventions performed today
4. Is Medicare-compliant and professional

Format: [Status statement]. [Evidence]. [Intervention].

Example: "Goal progress: Improved. Blood pressure decreased to 132/78 from baseline of 158/92, demonstrating positive response to medication management and dietary modifications. Reinforced low-sodium diet education and proper medication administration technique."`;

      const progress = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      setProgressNotes(prev => ({
        ...prev,
        [carePlan.id]: progress
      }));

    } catch (error) {
      console.error("Error generating progress:", error);
      toast.error("Error generating progress note. Please try again.");
    }
    
    setGeneratingFor(null);
  };

  const generateAllProgress = async () => {
    for (const plan of carePlans) {
      await generateProgress(plan);
    }
  };

  const addToNote = () => {
    let fullProgress = "\n\nCARE PLAN PROGRESS:\n\n";
    
    carePlans.forEach((plan) => {
      if (progressNotes[plan.id]) {
        fullProgress += `${plan.problem}:\n${progressNotes[plan.id]}\n\n`;
      }
    });

    onProgressGenerated(fullProgress);
  };

  const toggleGoal = (goalId) => {
    if (expandedGoals.includes(goalId)) {
      setExpandedGoals(expandedGoals.filter(id => id !== goalId));
    } else {
      setExpandedGoals([...expandedGoals, goalId]);
    }
  };

  const getProgressIcon = (progress) => {
    if (!progress) return <Minus className="w-4 h-4 text-gray-400" />;
    
    const lowerProgress = progress.toLowerCase();
    if (lowerProgress.includes('improved') || lowerProgress.includes('met')) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (lowerProgress.includes('declined') || lowerProgress.includes('regressed')) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <Minus className="w-4 h-4 text-yellow-600" />;
  };

  if (!carePlans || carePlans.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Care Plan Progress ({carePlans.length} active goals)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generateAllProgress}
              disabled={generatingFor !== null}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Auto-Generate All
            </Button>
            {Object.keys(progressNotes).length > 0 && (
              <Button
                size="sm"
                onClick={addToNote}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add to Note
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {carePlans.map((plan) => {
          const isExpanded = expandedGoals.includes(plan.id);
          const hasProgress = progressNotes[plan.id];
          
          return (
            <Card key={plan.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div 
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleGoal(plan.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getProgressIcon(progressNotes[plan.id])}
                      <h4 className="font-semibold text-gray-900">{plan.problem}</h4>
                      <Badge variant="outline" className="text-xs">
                        {plan.frequency || 'Each visit'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{plan.goal}</p>
                    {plan.baseline_measurement && (
                      <p className="text-xs text-gray-500">
                        Baseline: {plan.baseline_measurement}
                      </p>
                    )}
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {plan.interventions && plan.interventions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Interventions:</p>
                        <ul className="list-disc ml-5 text-xs text-gray-600">
                          {plan.interventions.map((intervention, index) => (
                            <li key={index}>{intervention}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hasProgress ? (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">AI-Generated Progress:</p>
                        <Textarea
                          value={progressNotes[plan.id]}
                          onChange={(e) => setProgressNotes({
                            ...progressNotes,
                            [plan.id]: e.target.value
                          })}
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateProgress(plan);
                        }}
                        disabled={generatingFor === plan.id}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        {generatingFor === plan.id ? (
                          <>Generating...</>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-1" />
                            Generate Progress for This Goal
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}