import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Mail,
  Flag
} from "lucide-react";
import { format, subDays } from "date-fns";

export default function SurveyFeedbackAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const queryClient = useQueryClient();

  const { data: surveys = [] } = useQuery({
    queryKey: ['patientSurveys'],
    queryFn: () => base44.entities.PatientSurvey.filter({}, '-sent_date', 200)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateSurveyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PatientSurvey.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patientSurveys'] })
  });

  const completedSurveys = surveys.filter(s => s.status === 'completed');
  const getPatient = (patientId) => patients.find(p => p.id === patientId);

  const analyzeSingleSurvey = async (survey) => {
    if (!survey.feedback_text) return null;

    const prompt = `Analyze this patient satisfaction survey feedback for a home health agency:

Rating: ${survey.overall_rating}/5
Care Quality: ${survey.care_quality_rating}/5
Communication: ${survey.communication_rating}/5
Timeliness: ${survey.timeliness_rating}/5
Would Recommend: ${survey.would_recommend ? 'Yes' : 'No'}

Feedback: "${survey.feedback_text}"

Provide analysis in this JSON format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "themes": ["theme1", "theme2"],
  "should_escalate": true | false,
  "escalation_reason": "reason if should escalate, null otherwise",
  "improvement_suggestions": ["suggestion1", "suggestion2"]
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          themes: { type: "array", items: { type: "string" } },
          should_escalate: { type: "boolean" },
          escalation_reason: { type: "string" },
          improvement_suggestions: { type: "array", items: { type: "string" } }
        }
      }
    });

    return result;
  };

  const handleAnalyzeAll = async () => {
    setIsAnalyzing(true);
    try {
      // Analyze individual surveys that haven't been analyzed
      const unanalyzed = completedSurveys.filter(s => !s.ai_sentiment && s.feedback_text);
      
      for (const survey of unanalyzed) {
        const analysis = await analyzeSingleSurvey(survey);
        if (analysis) {
          const updateData = {
            ai_sentiment: analysis.sentiment,
            ai_themes: analysis.themes
          };

          // Auto-escalate negative feedback
          if (analysis.should_escalate || analysis.sentiment === 'negative' || survey.overall_rating <= 2) {
            updateData.escalated = true;
            updateData.escalation_reason = analysis.escalation_reason || 'Low rating or negative sentiment detected';
            
            // Send escalation email
            if (currentUser?.email) {
              await base44.integrations.Core.SendEmail({
                to: currentUser.email,
                subject: `⚠️ Patient Feedback Escalation - Requires Attention`,
                body: `A patient survey requires your attention:

Patient: ${getPatient(survey.patient_id)?.first_name || 'Unknown'} ${getPatient(survey.patient_id)?.last_name || ''}
Rating: ${survey.overall_rating}/5
Sentiment: ${analysis.sentiment}

Feedback: "${survey.feedback_text}"

Reason for Escalation: ${analysis.escalation_reason || 'Low rating detected'}

Please review and take appropriate action.`,
                from_name: 'Penn Sync Alert System'
              });
              updateData.escalated_to = currentUser.email;
            }
          }

          await updateSurveyMutation.mutateAsync({ id: survey.id, data: updateData });
        }
      }

      // Generate trend analysis
      await generateTrendAnalysis();

    } catch (error) {
      console.error('Error analyzing feedback:', error);
      alert('Error analyzing feedback');
    }
    setIsAnalyzing(false);
  };

  const generateTrendAnalysis = async () => {
    const recentSurveys = completedSurveys.slice(0, 50);
    if (recentSurveys.length < 3) {
      setTrendAnalysis({ error: 'Not enough surveys for trend analysis' });
      return;
    }

    const surveyData = recentSurveys.map(s => ({
      rating: s.overall_rating,
      care: s.care_quality_rating,
      communication: s.communication_rating,
      timeliness: s.timeliness_rating,
      sentiment: s.ai_sentiment,
      themes: s.ai_themes,
      feedback: s.feedback_text?.substring(0, 200)
    }));

    const prompt = `Analyze these patient satisfaction survey trends for a home health agency:

Survey Data (most recent first):
${JSON.stringify(surveyData, null, 2)}

Provide comprehensive trend analysis in this JSON format:
{
  "overall_trend": "improving" | "stable" | "declining",
  "average_rating": number,
  "top_strengths": ["strength1", "strength2", "strength3"],
  "areas_for_improvement": ["area1", "area2", "area3"],
  "common_positive_themes": ["theme1", "theme2"],
  "common_negative_themes": ["theme1", "theme2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "sentiment_breakdown": {
    "positive": number (percentage),
    "neutral": number (percentage),
    "negative": number (percentage)
  }
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_trend: { type: "string" },
          average_rating: { type: "number" },
          top_strengths: { type: "array", items: { type: "string" } },
          areas_for_improvement: { type: "array", items: { type: "string" } },
          common_positive_themes: { type: "array", items: { type: "string" } },
          common_negative_themes: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          sentiment_breakdown: { 
            type: "object",
            properties: {
              positive: { type: "number" },
              neutral: { type: "number" },
              negative: { type: "number" }
            }
          }
        }
      }
    });

    setTrendAnalysis(result);
  };

  const escalatedSurveys = surveys.filter(s => s.escalated && !s.resolution_notes);
  const positiveSurveys = completedSurveys.filter(s => s.ai_sentiment === 'positive').length;
  const negativeSurveys = completedSurveys.filter(s => s.ai_sentiment === 'negative').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              AI Feedback Analysis
            </CardTitle>
            <Button 
              onClick={handleAnalyzeAll}
              disabled={isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isAnalyzing ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Analyze All Feedback</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <ThumbsUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{positiveSurveys}</p>
                <p className="text-sm text-green-700">Positive</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4 text-center">
                <Minus className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {completedSurveys.filter(s => s.ai_sentiment === 'neutral').length}
                </p>
                <p className="text-sm text-gray-700">Neutral</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <ThumbsDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-900">{negativeSurveys}</p>
                <p className="text-sm text-red-700">Negative</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 text-center">
                <Flag className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-900">{escalatedSurveys.length}</p>
                <p className="text-sm text-orange-700">Escalated</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="trends">
            <TabsList className="mb-4">
              <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
              <TabsTrigger value="escalations">Escalations ({escalatedSurveys.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="trends">
              {trendAnalysis && !trendAnalysis.error ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                    {trendAnalysis.overall_trend === 'improving' ? (
                      <TrendingUp className="w-12 h-12 text-green-600" />
                    ) : trendAnalysis.overall_trend === 'declining' ? (
                      <TrendingDown className="w-12 h-12 text-red-600" />
                    ) : (
                      <BarChart3 className="w-12 h-12 text-blue-600" />
                    )}
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        Overall Trend: <span className="capitalize">{trendAnalysis.overall_trend}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Average Rating: {trendAnalysis.average_rating?.toFixed(1)}/5
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Top Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {trendAnalysis.top_strengths?.map((strength, idx) => (
                            <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                              <span className="text-green-500">✓</span> {strength}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="bg-orange-50 border-orange-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          Areas for Improvement
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {trendAnalysis.areas_for_improvement?.map((area, idx) => (
                            <li key={idx} className="text-sm text-orange-800 flex items-start gap-2">
                              <span className="text-orange-500">!</span> {area}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        AI Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {trendAnalysis.recommendations?.map((rec, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="font-semibold text-indigo-600">{idx + 1}.</span> {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Alert className="bg-indigo-50 border-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <AlertDescription className="text-indigo-900">
                    Click "Analyze All Feedback" to generate AI-powered trend analysis and insights.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="escalations">
              {escalatedSurveys.length > 0 ? (
                <div className="space-y-3">
                  {escalatedSurveys.map(survey => {
                    const patient = getPatient(survey.patient_id);
                    return (
                      <Card key={survey.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="font-semibold">
                                  {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'}
                                </span>
                                <Badge className="bg-red-500 text-white">
                                  Rating: {survey.overall_rating}/5
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 italic mb-2">
                                "{survey.feedback_text}"
                              </p>
                              <p className="text-xs text-red-600">
                                <strong>Escalation Reason:</strong> {survey.escalation_reason}
                              </p>
                              {survey.escalated_to && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <Mail className="w-3 h-3 inline mr-1" />
                                  Sent to: {survey.escalated_to}
                                </p>
                              )}
                            </div>
                            <Button size="sm" variant="outline">
                              Resolve
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    No unresolved escalations. All feedback is in good standing!
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}