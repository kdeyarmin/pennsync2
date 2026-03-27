import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Brain,
  Sparkles,
  ChevronRight,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LearningDashboard({ 
  nurseEmail,
  complianceHistory = [],
  onStartTraining,
  compact = false
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  // Fetch learning progress
  const { data: learningProgress = [] } = useQuery({
    queryKey: ['learningProgress', nurseEmail],
    queryFn: () => base44.entities.MicroLearningProgress.filter({ nurse_email: nurseEmail }),
    enabled: !!nurseEmail,
  });

  // Fetch compliance audits
  const { data: audits = [] } = useQuery({
    queryKey: ['nurseAudits', nurseEmail],
    queryFn: () => base44.entities.ComplianceAudit.filter({ nurse_email: nurseEmail }, '-audit_date', 50),
    enabled: !!nurseEmail,
  });

  // Fetch note conversions
  const { data: noteConversions = [] } = useQuery({
    queryKey: ['noteConversions', nurseEmail],
    queryFn: () => base44.entities.NoteConversion.filter({ nurse_email: nurseEmail }, '-created_date', 50),
    enabled: !!nurseEmail,
  });

  // Calculate skill areas and weaknesses
  const skillAnalysis = React.useMemo(() => {
    const skills = {
      'Homebound Status': { score: 0, count: 0, trend: 0 },
      'Skilled Need': { score: 0, count: 0, trend: 0 },
      'Patient Response': { score: 0, count: 0, trend: 0 },
      'Vital Signs': { score: 0, count: 0, trend: 0 },
      'Assessment': { score: 0, count: 0, trend: 0 },
      'Interventions': { score: 0, count: 0, trend: 0 },
      'Plan/Goals': { score: 0, count: 0, trend: 0 }
    };

    // Analyze audits
    audits.forEach((audit, idx) => {
      const isRecent = idx < 10;
      audit.issues?.forEach(issue => {
        const element = issue.element?.toUpperCase() || '';
        Object.keys(skills).forEach(skill => {
          if (element.includes(skill.toUpperCase()) || skill.toUpperCase().includes(element.split(' ')[0])) {
            skills[skill].count++;
            // Lower score for issues
            skills[skill].score -= issue.severity === 'high' ? 15 : issue.severity === 'medium' ? 10 : 5;
            if (isRecent) skills[skill].trend--;
          }
        });
      });

      audit.compliant_elements?.forEach(element => {
        Object.keys(skills).forEach(skill => {
          if (element.toUpperCase().includes(skill.toUpperCase())) {
            skills[skill].score += 10;
            if (isRecent) skills[skill].trend++;
          }
        });
      });
    });

    // Normalize scores
    Object.keys(skills).forEach(skill => {
      if (skills[skill].count > 0) {
        skills[skill].score = Math.max(0, Math.min(100, 70 + skills[skill].score / skills[skill].count));
      } else {
        skills[skill].score = 75; // Default score
      }
    });

    return skills;
  }, [audits]);

  // Get weak areas sorted by score
  const weakAreas = Object.entries(skillAnalysis)
    .map(([area, data]) => ({ area, ...data }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  // Get strong areas
  const strongAreas = Object.entries(skillAnalysis)
    .map(([area, data]) => ({ area, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Calculate overall stats
  const avgQualityScore = noteConversions.length > 0
    ? Math.round(noteConversions.reduce((sum, n) => sum + (n.quality_score || 0), 0) / noteConversions.length)
    : 0;

  const avgComplianceScore = audits.length > 0
    ? Math.round(audits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / audits.length)
    : 0;

  const practiceCompleted = learningProgress.filter(p => p.status === 'completed').length;

  // Radar chart data
  const radarData = Object.entries(skillAnalysis).map(([area, data]) => ({
    area: area.split(' ')[0],
    score: Math.round(data.score),
    fullMark: 100
  }));

  // Trend data for bar chart
  const trendData = weakAreas.map(area => ({
    name: area.area.split(' ')[0],
    score: Math.round(area.score),
    trend: area.trend
  }));

  // Generate AI insights
  const generateInsights = async () => {
    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this nurse's documentation learning progress and provide personalized insights.

SKILL SCORES:
${Object.entries(skillAnalysis).map(([skill, data]) => `- ${skill}: ${Math.round(data.score)}% (${data.trend > 0 ? 'improving' : data.trend < 0 ? 'declining' : 'stable'})`).join('\n')}

RECENT PERFORMANCE:
- Average Quality Score: ${avgQualityScore}%
- Average Compliance Score: ${avgComplianceScore}%
- Practice Exercises Completed: ${practiceCompleted}

Provide:
1. Overall assessment (2 sentences)
2. Top 3 specific recommendations
3. Suggested focus area for this week
4. Encouragement message`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
            weekly_focus: { type: "string" },
            encouragement: { type: "string" }
          }
        }
      });
      setInsights(result);
    } catch (error) {
      console.error("Error generating insights:", error);
    }
    setIsAnalyzing(false);
  };

  if (compact) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50 to-white">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Learning Progress
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-emerald-600">
                  View All →
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    Your Learning Dashboard
                  </DialogTitle>
                </DialogHeader>
                <LearningDashboard nurseEmail={nurseEmail} onStartTraining={onStartTraining} />
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-white rounded border">
              <p className="text-lg font-bold text-emerald-600">{avgQualityScore}%</p>
              <p className="text-xs text-gray-500">Quality</p>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <p className="text-lg font-bold text-blue-600">{avgComplianceScore}%</p>
              <p className="text-xs text-gray-500">Compliance</p>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <p className="text-lg font-bold text-purple-600">{practiceCompleted}</p>
              <p className="text-xs text-gray-500">Practices</p>
            </div>
          </div>

          {/* Top Weak Area */}
          {weakAreas[0] && weakAreas[0].score < 70 && (
            <div className="bg-orange-50 p-2 rounded border border-orange-200">
              <p className="text-xs font-medium text-orange-800 flex items-center gap-1">
                <Target className="w-3 h-3" /> Focus Area: {weakAreas[0].area}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={weakAreas[0].score} className="h-1.5 flex-1" />
                <span className="text-xs text-orange-700">{Math.round(weakAreas[0].score)}%</span>
              </div>
            </div>
          )}

          {/* Quick Action */}
          <Button
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs"
            onClick={() => onStartTraining?.(weakAreas[0]?.area)}
          >
            <GraduationCap className="w-3 h-3 mr-1" /> Practice {weakAreas[0]?.area || 'Documentation'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
          <CardContent className="p-4">
            <p className="text-emerald-100 text-xs">Avg Quality</p>
            <p className="text-2xl font-bold">{avgQualityScore}%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="p-4">
            <p className="text-blue-100 text-xs">Compliance</p>
            <p className="text-2xl font-bold">{avgComplianceScore}%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
          <CardContent className="p-4">
            <p className="text-purple-100 text-xs">Notes Created</p>
            <p className="text-2xl font-bold">{noteConversions.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
          <CardContent className="p-4">
            <p className="text-orange-100 text-xs">Practice Done</p>
            <p className="text-2xl font-bold">{practiceCompleted}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Skill Radar */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Skill Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weak Areas Bar Chart */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Areas to Improve</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                <Tooltip />
                <Bar dataKey="score" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weak Areas & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weak Areas */}
        <Card className="border-orange-200">
          <CardHeader className="py-3 bg-orange-50">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {weakAreas.map((area, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{area.area}</span>
                  {area.trend < 0 && <TrendingDown className="w-3 h-3 text-red-500" />}
                  {area.trend > 0 && <TrendingUp className="w-3 h-3 text-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={area.score} className="w-16 h-2" />
                  <span className="text-xs text-gray-600">{Math.round(area.score)}%</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => onStartTraining?.(area.area)}
                  >
                    Practice
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Strong Areas */}
        <Card className="border-green-200">
          <CardHeader className="py-3 bg-green-50">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {strongAreas.map((area, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{area.area}</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {Math.round(area.score)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="border-indigo-200">
        <CardHeader className="py-3 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-600" />
              AI Insights
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={generateInsights}
              disabled={isAnalyzing}
              className="h-7 text-xs"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <><Sparkles className="w-3 h-3 mr-1" /> Analyze</>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {!insights && !isAnalyzing && (
            <p className="text-sm text-gray-500 text-center py-4">
              Click "Analyze" to get personalized AI insights based on your documentation patterns
            </p>
          )}
          {isAnalyzing && (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Analyzing your learning patterns...</p>
            </div>
          )}
          {insights && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">{insights.overall_assessment}</p>
              
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs font-semibold text-blue-800 mb-2">Recommendations:</p>
                <ul className="space-y-1">
                  {insights.recommendations?.map((rec, idx) => (
                    <li key={idx} className="text-xs text-blue-700 flex items-start gap-1">
                      <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-50 p-3 rounded">
                <p className="text-xs font-semibold text-purple-800">This Week's Focus:</p>
                <p className="text-sm text-purple-700">{insights.weekly_focus}</p>
              </div>

              <div className="text-center p-2 bg-green-50 rounded">
                <p className="text-xs text-green-700 italic">"{insights.encouragement}"</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Link */}
      <div className="text-center">
        <Link to={createPageUrl("MyLearning")}>
          <Button variant="outline" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Go to Full Training Hub
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}