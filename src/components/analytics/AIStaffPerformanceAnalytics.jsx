import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeLLM } from "@/lib/invokeLLM";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Target,
  Clock,
  CheckCircle2,
  Users,
  Sparkles
} from "lucide-react";
import {
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { subDays } from "date-fns";
import { toast } from 'sonner';

export default function AIStaffPerformanceAnalytics({ timeRange: initialTimeRange = 30, autoAnalyze = false }) {
  // Local state so the Time Range selector actually changes the range — the prop
  // can't be mutated, so the control previously just window.location.reload()'d
  // and discarded the choice. The query keys, cutoffDate, and prompt all key off
  // this; the Analyze / Refresh buttons re-run the analysis with the new value.
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState("all");
  const [performanceData, setPerformanceData] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['complianceAuditsForAnalytics', timeRange],
    queryFn: () => base44.entities.ComplianceAudit.list('-audit_date', 1000),
    initialData: [],
  });

  const { data: trainingCompletions = [] } = useQuery({
    queryKey: ['trainingCompletionsForAnalytics', timeRange],
    queryFn: () => base44.entities.TrainingCompletion.list('-completion_date', 1000),
    initialData: [],
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visitsForAnalytics', timeRange],
    queryFn: () => base44.entities.Visit.list('-visit_date', 1000),
    initialData: [],
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendationsForAnalytics', timeRange],
    queryFn: () => base44.entities.TrainingRecommendation.list('-created_date', 1000),
    initialData: [],
  });

  const { data: _carePlans = [] } = useQuery({
    queryKey: ['carePlansForAnalytics'],
    queryFn: () => base44.entities.CarePlan.list('-created_date', 500),
    initialData: [],
  });

  const analyzePerformance = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const cutoffDate = subDays(new Date(), timeRange);
      
      // Filter data by time range and selected nurse
      const filteredAudits = audits.filter(a => {
        const auditDate = new Date(a.audit_date || a.created_date);
        const matchesTime = auditDate >= cutoffDate;
        const matchesNurse = selectedNurse === "all" || a.nurse_email === selectedNurse;
        return matchesTime && matchesNurse;
      });

      const filteredTraining = trainingCompletions.filter(t => {
        const compDate = new Date(t.completion_date || t.created_date);
        const matchesTime = compDate >= cutoffDate;
        const matchesNurse = selectedNurse === "all" || t.nurse_email === selectedNurse;
        return matchesTime && matchesNurse;
      });

      const filteredVisits = visits.filter(v => {
        const visitDate = new Date(v.visit_date);
        const matchesTime = visitDate >= cutoffDate;
        const matchesNurse = selectedNurse === "all" || v.created_by === selectedNurse;
        return matchesTime && matchesNurse;
      });

      const filteredRecs = recommendations.filter(r => {
        const recDate = new Date(r.created_date);
        const matchesTime = recDate >= cutoffDate;
        const matchesNurse = selectedNurse === "all" || r.nurse_email === selectedNurse;
        return matchesTime && matchesNurse;
      });

      // Aggregate metrics by nurse
      const nurseMetrics = {};
      
      // Process audits
      filteredAudits.forEach(audit => {
        const nurse = audit.nurse_email;
        if (!nurseMetrics[nurse]) {
          nurseMetrics[nurse] = {
            email: nurse,
            audits: [],
            trainings: [],
            visits: [],
            recommendations: [],
            carePlans: []
          };
        }
        nurseMetrics[nurse].audits.push(audit);
      });

      // Process training
      filteredTraining.forEach(training => {
        const nurse = training.nurse_email;
        if (!nurseMetrics[nurse]) {
          nurseMetrics[nurse] = {
            email: nurse,
            audits: [],
            trainings: [],
            visits: [],
            recommendations: [],
            carePlans: []
          };
        }
        nurseMetrics[nurse].trainings.push(training);
      });

      // Process visits
      filteredVisits.forEach(visit => {
        const nurse = visit.created_by;
        if (!nurseMetrics[nurse]) {
          nurseMetrics[nurse] = {
            email: nurse,
            audits: [],
            trainings: [],
            visits: [],
            recommendations: [],
            carePlans: []
          };
        }
        nurseMetrics[nurse].visits.push(visit);
      });

      // Process recommendations
      filteredRecs.forEach(rec => {
        const nurse = rec.nurse_email;
        if (nurseMetrics[nurse]) {
          nurseMetrics[nurse].recommendations.push(rec);
        }
      });

      const result = await invokeLLM({
        prompt: `You are an AI workforce analytics specialist for home health nursing. Analyze comprehensive staff performance data to provide actionable insights.

TIME RANGE: Last ${timeRange} days
STAFF SCOPE: ${selectedNurse === "all" ? "All Staff" : selectedNurse}

PERFORMANCE DATA SUMMARY:
- Total Audits: ${filteredAudits.length}
- Average Compliance Score: ${filteredAudits.length > 0 ? (filteredAudits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / filteredAudits.length).toFixed(1) : 0}%
- Total Training Completions: ${filteredTraining.length}
- Average Training Score: ${filteredTraining.length > 0 ? (filteredTraining.filter(t => t.score).reduce((sum, t) => sum + t.score, 0) / filteredTraining.filter(t => t.score).length).toFixed(1) : 0}%
- Total Visits Documented: ${filteredVisits.length}
- Training Recommendations: ${filteredRecs.length} (${filteredRecs.filter(r => !r.addressed).length} unaddressed)

INDIVIDUAL NURSE BREAKDOWN:
${Object.entries(nurseMetrics).slice(0, 10).map(([email, data]) => `
Nurse: ${email}
- Audits: ${data.audits.length}, Avg Score: ${data.audits.length > 0 ? (data.audits.reduce((s, a) => s + (a.compliance_score || 0), 0) / data.audits.length).toFixed(1) : 0}%
- Training: ${data.trainings.length} completed, Avg Score: ${data.trainings.filter(t => t.score).length > 0 ? (data.trainings.filter(t => t.score).reduce((s, t) => s + t.score, 0) / data.trainings.filter(t => t.score).length).toFixed(1) : 0}%
- Visits: ${data.visits.length}
- Issues: ${data.recommendations.filter(r => r.severity === 'critical' || r.severity === 'high').length} critical/high
`).join('\n')}

Perform comprehensive performance analysis:

1. KEY PERFORMANCE INDICATORS (KPIs):
   - Documentation Quality Score (0-100)
   - Compliance Adherence Rate (0-100)
   - Training Engagement Score (0-100)
   - Documentation Timeliness Score (0-100)
   - Patient Outcome Impact Score (0-100)
   - Professional Development Score (0-100)

2. INDIVIDUAL STAFF PROFILES:
   For each nurse (or overall if all selected):
   - Strengths (specific areas of excellence)
   - Weaknesses (areas needing improvement)
   - Performance Trajectory (improving/stable/declining)
   - Risk Level (low/medium/high for performance issues)

3. PREDICTIVE INSIGHTS:
   - Early warning signs of burnout or disengagement
   - Likelihood of compliance violations
   - Training gaps that may lead to issues
   - Areas requiring immediate intervention

4. PERSONALIZED RECOMMENDATIONS:
   - Specific coaching topics needed
   - Training modules to assign
   - Mentorship pairings (high performers with struggling staff)
   - Process improvements

5. TREND ANALYSIS:
   - How KPIs have changed over time
   - Patterns in documentation quality
   - Training effectiveness correlation
   - Seasonal or workload-related patterns

6. BENCHMARKING:
   - Compare individual performance to team average
   - Identify top performers and struggling staff
   - Best practices from high performers

Return detailed analysis suitable for management dashboard.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_summary: { type: "string" },
            kpis: {
              type: "object",
              properties: {
                documentation_quality: { type: "number" },
                compliance_adherence: { type: "number" },
                training_engagement: { type: "number" },
                documentation_timeliness: { type: "number" },
                patient_outcome_impact: { type: "number" },
                professional_development: { type: "number" }
              }
            },
            staff_profiles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nurse_email: { type: "string" },
                  overall_score: { type: "number" },
                  performance_level: { type: "string", enum: ["excellent", "good", "needs_improvement", "critical"] },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  trajectory: { type: "string", enum: ["improving", "stable", "declining"] },
                  risk_level: { type: "string", enum: ["low", "medium", "high"] },
                  kpi_breakdown: {
                    type: "object",
                    properties: {
                      documentation_quality: { type: "number" },
                      compliance_adherence: { type: "number" },
                      training_engagement: { type: "number" }
                    }
                  }
                }
              }
            },
            predictive_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  insight: { type: "string" },
                  severity: { type: "string" },
                  affected_staff: { type: "array", items: { type: "string" } },
                  likelihood: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            personalized_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nurse_email: { type: "string" },
                  priority: { type: "string" },
                  coaching_topics: { type: "array", items: { type: "string" } },
                  training_modules: { type: "array", items: { type: "string" } },
                  mentorship_pairing: { type: "string" },
                  timeline: { type: "string" }
                }
              }
            },
            trend_data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  period: { type: "string" },
                  documentation_quality: { type: "number" },
                  compliance_adherence: { type: "number" },
                  training_engagement: { type: "number" }
                }
              }
            },
            benchmarking: {
              type: "object",
              properties: {
                team_average: { type: "number" },
                top_performers: { type: "array", items: { type: "string" } },
                needs_support: { type: "array", items: { type: "string" } },
                best_practices: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setPerformanceData(result);
    } catch (error) {
      console.error('Error analyzing performance:', error);
      toast.error('Failed to analyze performance. Please try again.');
    }
    setIsAnalyzing(false);
  }, [audits, recommendations, selectedNurse, timeRange, trainingCompletions, visits]);

  useEffect(() => {
    if (autoAnalyze && audits.length > 0 && !performanceData) {
      analyzePerformance();
    }
  }, [autoAnalyze, audits, performanceData, analyzePerformance]);

  const _getPerformanceColor = (score) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskBadge = (level) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-slate-100 text-slate-800';
  };

  const nurses = users.filter(u => u.role === 'user');

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-navy-300">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-navy-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-900 mb-2">AI Performance Analysis in Progress</p>
          <p className="text-sm text-slate-600">
            Analyzing {audits.length} audits, {visits.length} visits, {trainingCompletions.length} training records...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData) {
    return (
      <Card className="border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Staff Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Time Range</Label>
              <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Staff Member</Label>
              <Select value={selectedNurse} onValueChange={setSelectedNurse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {nurses.map(n => (
                    <SelectItem key={n.email} value={n.email}>{n.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={analyzePerformance} className="w-full bg-blue-600 hover:bg-blue-700">
            <Brain className="w-4 h-4 mr-2" />
            Analyze Performance with AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={selectedNurse} onValueChange={setSelectedNurse}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {nurses.map(n => (
                    <SelectItem key={n.email} value={n.email}>{n.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">{timeRange} days</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setPerformanceData(null); analyzePerformance(); }}>
              Refresh Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Alert className="bg-blue-50 border-blue-300">
        <Brain className="w-4 h-4 text-blue-600" />
        <AlertDescription>
          <p className="font-bold mb-1">Executive Summary</p>
          <p className="text-sm">{performanceData.overall_summary}</p>
        </AlertDescription>
      </Alert>

      {/* KPI Dashboard */}
      <Card className="border-2 border-indigo-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Key Performance Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(performanceData.kpis || {}).map(([key, value]) => (
              <div key={key} className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-lg border-2">
                <p className="text-xs text-slate-600 mb-2 capitalize">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className={`text-3xl font-bold mb-2 ${value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {value}
                </p>
                <Progress value={value} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trend Charts */}
      {performanceData.trend_data?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData.trend_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="documentation_quality" stroke="#8B5CF6" name="Doc Quality" />
                <Line type="monotone" dataKey="compliance_adherence" stroke="#10B981" name="Compliance" />
                <Line type="monotone" dataKey="training_engagement" stroke="#3557b0" name="Training" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Staff Profiles */}
      <Card className="border-2 border-navy-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-navy-600" />
            Individual Staff Profiles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {performanceData.staff_profiles?.map((profile, idx) => {
            const user = users.find(u => u.email === profile.nurse_email);
            return (
              <Card key={idx} className="border-l-4 border-l-navy-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{user?.full_name || profile.nurse_email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className={
                          profile.performance_level === 'excellent' ? 'bg-green-600' :
                          profile.performance_level === 'good' ? 'bg-blue-600' :
                          profile.performance_level === 'needs_improvement' ? 'bg-yellow-600' : 'bg-red-600'
                        }>
                          {profile.performance_level.replace('_', ' ')}
                        </Badge>
                        <Badge className={getRiskBadge(profile.risk_level)}>
                          {profile.risk_level} risk
                        </Badge>
                        {profile.trajectory === 'improving' && <TrendingUp className="w-4 h-4 text-green-600" />}
                        {profile.trajectory === 'declining' && <TrendingDown className="w-4 h-4 text-red-600" />}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-navy-600">{profile.overall_score}</p>
                      <p className="text-xs text-slate-500">Overall Score</p>
                    </div>
                  </div>

                  {/* Radar Chart for KPI Breakdown */}
                  {profile.kpi_breakdown && (
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={[
                        { metric: 'Doc Quality', value: profile.kpi_breakdown.documentation_quality },
                        { metric: 'Compliance', value: profile.kpi_breakdown.compliance_adherence },
                        { metric: 'Training', value: profile.kpi_breakdown.training_engagement }
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}

                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <p className="font-semibold text-green-900 text-sm mb-1 flex items-center gap-1">
                        <Award className="w-3 h-3" /> Strengths
                      </p>
                      <ul className="space-y-0.5">
                        {profile.strengths?.map((s, i) => (
                          <li key={i} className="text-xs text-green-800">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-orange-50 p-3 rounded border border-orange-200">
                      <p className="font-semibold text-orange-900 text-sm mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Areas for Growth
                      </p>
                      <ul className="space-y-0.5">
                        {profile.weaknesses?.map((w, i) => (
                          <li key={i} className="text-xs text-orange-800">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Predictive Insights */}
      {performanceData.predictive_insights?.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Predictive Insights & Early Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {performanceData.predictive_insights.map((insight, idx) => (
              <div key={idx} className="bg-white p-3 rounded border-l-4 border-l-red-500">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-slate-900">{insight.insight}</p>
                  <Badge className={
                    insight.severity === 'high' ? 'bg-red-600' :
                    insight.severity === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                  }>
                    {insight.severity}
                  </Badge>
                </div>
                <div className="grid md:grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="font-semibold">Affected:</span> {insight.affected_staff?.join(', ') || 'Multiple staff'}
                  </div>
                  <div>
                    <span className="font-semibold">Likelihood:</span> {insight.likelihood}
                  </div>
                </div>
                <p className="text-sm text-green-800 bg-green-50 p-2 rounded">
                  <strong>Recommendation:</strong> {insight.recommendation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Personalized Recommendations */}
      {performanceData.personalized_recommendations?.length > 0 && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Personalized Coaching & Training Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {performanceData.personalized_recommendations.map((rec, idx) => {
              const user = users.find(u => u.email === rec.nurse_email);
              return (
                <div key={idx} className="bg-white p-4 rounded border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-slate-900">{user?.full_name || rec.nurse_email}</p>
                    <Badge className={
                      rec.priority === 'urgent' ? 'bg-red-600' :
                      rec.priority === 'high' ? 'bg-orange-600' : 'bg-blue-600'
                    }>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-navy-50 p-3 rounded">
                      <p className="font-semibold text-navy-900 text-sm mb-1">📚 Training Modules</p>
                      <ul className="space-y-0.5">
                        {rec.training_modules?.map((mod, i) => (
                          <li key={i} className="text-xs text-navy-800">• {mod}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="font-semibold text-blue-900 text-sm mb-1">🎯 Coaching Topics</p>
                      <ul className="space-y-0.5">
                        {rec.coaching_topics?.map((topic, i) => (
                          <li key={i} className="text-xs text-blue-800">• {topic}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {rec.mentorship_pairing && (
                    <p className="text-xs text-slate-600 mt-2">
                      <strong>Mentorship:</strong> {rec.mentorship_pairing}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {rec.timeline}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Benchmarking */}
      {performanceData.benchmarking && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Team Benchmarking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <p className="text-sm text-slate-600 mb-2">Team Average Performance</p>
              <p className="text-4xl font-bold text-green-600">{performanceData.benchmarking.team_average}</p>
              <Progress value={performanceData.benchmarking.team_average} className="h-3 mt-2" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border">
                <p className="font-semibold text-green-900 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Top Performers
                </p>
                <ul className="space-y-1">
                  {performanceData.benchmarking.top_performers?.map((email, i) => {
                    const user = users.find(u => u.email === email);
                    return (
                      <li key={i} className="text-sm text-slate-700">
                        🏆 {user?.full_name || email}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="font-semibold text-orange-900 mb-2">Needs Additional Support</p>
                <ul className="space-y-1">
                  {performanceData.benchmarking.needs_support?.map((email, i) => {
                    const user = users.find(u => u.email === email);
                    return (
                      <li key={i} className="text-sm text-slate-700">
                        🤝 {user?.full_name || email}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="font-semibold text-slate-900 mb-2">Best Practices from Top Performers</p>
              <ul className="space-y-1">
                {performanceData.benchmarking.best_practices?.map((practice, i) => (
                  <li key={i} className="text-sm text-slate-700">✓ {practice}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}