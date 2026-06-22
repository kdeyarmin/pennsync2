import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { invokeLLM } from "@/lib/invokeLLM";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Brain, AlertTriangle, Target, Loader2 } from "lucide-react";
import { toast } from 'sonner';

export default function AITrainingRecommendationEngine({ nurseEmail, onAssignTraining }) {
  const [recommendations, setRecommendations] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: trainingCompletions = [] } = useQuery({
    queryKey: ['nurseCompletions', nurseEmail],
    queryFn: () => base44.entities.TrainingCompletion.filter({ nurse_email: nurseEmail }),
    initialData: [],
  });

  const { data: trainingRecommendations = [] } = useQuery({
    queryKey: ['trainingRecommendations', nurseEmail],
    queryFn: () => base44.entities.TrainingRecommendation.filter({ nurse_email: nurseEmail, addressed: false }),
    initialData: [],
  });

  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['nurseAudits', nurseEmail],
    queryFn: () => base44.entities.ComplianceAudit.filter({ nurse_email: nurseEmail }, '-audit_date', 10),
    initialData: [],
  });

  const { data: patientAlerts = [] } = useQuery({
    queryKey: ['nurseAlerts', nurseEmail],
    queryFn: async () => {
      const visits = await base44.entities.Visit.filter({ created_by: nurseEmail }, '-visit_date', 20);
      const patientIds = [...new Set(visits.map(v => v.patient_id))];
      const alerts = await Promise.all(
        patientIds.map(pid => base44.entities.PatientAlert.filter({ patient_id: pid, status: 'active' }))
      );
      return alerts.flat();
    },
    initialData: [],
  });

  const analyzeTrainingNeeds = async () => {
    setIsAnalyzing(true);
    try {
      // Aggregate data for analysis
      const completedModules = trainingCompletions.filter(t => t.status === 'completed');
      const failedModules = trainingCompletions.filter(t => t.status === 'completed' && t.score < 80);
      const auditIssues = complianceAudits.flatMap(a => a.issues || []);
      const criticalAlerts = patientAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');

      const prompt = `Analyze this nurse's performance and recommend targeted training.

NURSE PROFILE:
- Email: ${nurseEmail}
- Completed Training: ${completedModules.length} modules
- Failed Modules: ${failedModules.length}
- Recent Audit Issues: ${auditIssues.length}
- Active Critical Alerts: ${criticalAlerts.length}

AUDIT FINDINGS:
${auditIssues.slice(0, 5).map(i => `- ${i.element}: ${i.problem}`).join('\n')}

COMPLIANCE RECOMMENDATIONS:
${trainingRecommendations.slice(0, 5).map(r => `- [${r.severity}] ${r.recommendation_text} (Source: ${r.source})`).join('\n')}

PATIENT ALERTS:
${criticalAlerts.slice(0, 3).map(a => `- ${a.alert_type}: ${a.title}`).join('\n')}

ANALYSIS REQUIRED:
1. Identify specific knowledge gaps based on audit findings and alerts
2. Recommend 3-5 targeted training modules covering:
   - Clinical documentation gaps
   - Compliance issues
   - Patient safety concerns
   - Disease-specific knowledge (if applicable)
3. Prioritize recommendations by urgency and impact
4. Suggest realistic timelines for completion

Return JSON:
{
  "overall_assessment": "string - 2-3 sentence assessment",
  "priority_gaps": ["string"],
  "recommended_training": [
    {
      "title": "string - training module name",
      "category": "clinical|documentation|compliance|safety",
      "priority": "high|medium|low",
      "rationale": "string - why this training is needed",
      "expected_impact": "string - what improvement to expect",
      "estimated_duration_minutes": number,
      "due_in_days": number
    }
  ],
  "skill_development_path": "string - suggested learning progression"
}`;

      const result = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            priority_gaps: { type: "array", items: { type: "string" } },
            recommended_training: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  rationale: { type: "string" },
                  expected_impact: { type: "string" },
                  estimated_duration_minutes: { type: "number" },
                  due_in_days: { type: "number" }
                }
              }
            },
            skill_development_path: { type: "string" }
          }
        }
      });

      setRecommendations(result);
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast.error('Failed to generate training recommendations');
    }
    setIsAnalyzing(false);
  };

  const getPriorityColor = (priority) => {
    return {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-blue-100 text-blue-800 border-blue-300"
    }[priority] || "bg-slate-100 text-slate-800";
  };

  return (
    <Card className="border-2 border-navy-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-navy-600" />
          AI Training Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recommendations ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-navy-400 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">
              AI will analyze performance data, audit findings, and alerts to recommend targeted training
            </p>
            <Button
              onClick={analyzeTrainingNeeds}
              disabled={isAnalyzing}
              className="bg-navy-600 hover:bg-navy-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Assessment */}
            <Alert className="bg-navy-50 border-navy-200">
              <AlertTriangle className="w-4 h-4 text-navy-600" />
              <AlertDescription>
                <p className="font-semibold mb-1">Performance Assessment</p>
                <p className="text-sm">{recommendations.overall_assessment}</p>
              </AlertDescription>
            </Alert>

            {/* Priority Gaps */}
            {recommendations.priority_gaps?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Priority Knowledge Gaps
                </p>
                <ul className="space-y-1">
                  {recommendations.priority_gaps.map((gap, idx) => (
                    <li key={idx} className="text-sm text-red-800">• {gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Training */}
            <div>
              <p className="font-semibold text-slate-900 mb-3">Recommended Training Modules</p>
              <div className="space-y-3">
                {recommendations.recommended_training?.map((training, idx) => (
                  <Card key={idx} className={`border-2 ${getPriorityColor(training.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{training.title}</h4>
                            <Badge className={getPriorityColor(training.priority)}>
                              {training.priority} priority
                            </Badge>
                            <Badge variant="outline">{training.category}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{training.rationale}</p>
                          <div className="bg-white/60 rounded p-2 mb-2">
                            <p className="text-xs text-slate-700">
                              <strong>Expected Impact:</strong> {training.expected_impact}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>⏱️ {training.estimated_duration_minutes} min</span>
                            <span>📅 Due in {training.due_in_days} days</span>
                          </div>
                        </div>
                        {onAssignTraining && (
                          <Button
                            size="sm"
                            onClick={() => onAssignTraining(training)}
                            className="bg-navy-600 hover:bg-navy-700"
                          >
                            Assign
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Learning Path */}
            {recommendations.skill_development_path && (
              <Alert className="bg-blue-50 border-blue-200">
                <Target className="w-4 h-4 text-blue-600" />
                <AlertDescription>
                  <p className="font-semibold mb-1">Skill Development Path</p>
                  <p className="text-sm">{recommendations.skill_development_path}</p>
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              onClick={() => setRecommendations(null)}
              className="w-full"
            >
              Generate New Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}