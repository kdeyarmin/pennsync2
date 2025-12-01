import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardList, 
  Send, 
  RefreshCw, 
  Star,
  ThumbsUp,
  ThumbsDown,
  User,
  Calendar,
  Sparkles,
  Mail,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { format, subDays } from "date-fns";

export default function PatientSurveyManager() {
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: completedVisits = [] } = useQuery({
    queryKey: ['recentCompletedVisits'],
    queryFn: async () => {
      const visits = await base44.entities.Visit.filter({ status: 'completed' }, '-visit_date', 50);
      const weekAgo = subDays(new Date(), 7);
      return visits.filter(v => new Date(v.visit_date) >= weekAgo);
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['patientSurveys'],
    queryFn: () => base44.entities.PatientSurvey.filter({}, '-sent_date', 100)
  });

  const createSurveyMutation = useMutation({
    mutationFn: (data) => base44.entities.PatientSurvey.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patientSurveys'] })
  });

  const getPatient = (patientId) => patients.find(p => p.id === patientId);

  const generateSurveyEmail = async (visit, patient) => {
    const prompt = `Generate a friendly email inviting a patient to complete a satisfaction survey after their home health visit.

Patient Name: ${patient.first_name}
Visit Date: ${format(new Date(visit.visit_date), 'MMMM d, yyyy')}
Visit Type: ${visit.visit_type.replace(/_/g, ' ')}

Requirements:
- Be warm and appreciative
- Explain the survey is brief (2 minutes)
- Emphasize their feedback helps improve care
- Include a call to action
- Keep it short and friendly

Generate the email body:`;

    return await base44.integrations.Core.InvokeLLM({ prompt });
  };

  const handleSendSurveys = async () => {
    setIsSending(true);
    try {
      for (const visit of completedVisits) {
        const patient = getPatient(visit.patient_id);
        if (!patient?.email) continue;

        // Check if survey already sent for this visit
        const existingSurvey = surveys.find(s => s.visit_id === visit.id);
        if (existingSurvey) continue;

        const emailContent = await generateSurveyEmail(visit, patient);

        // Create survey record
        await createSurveyMutation.mutateAsync({
          patient_id: visit.patient_id,
          visit_id: visit.id,
          survey_type: 'post_visit',
          sent_date: new Date().toISOString(),
          status: 'sent'
        });

        // Send email
        await base44.integrations.Core.SendEmail({
          to: patient.email,
          subject: 'We Value Your Feedback - Quick Survey',
          body: emailContent,
          from_name: 'Penn Sync Home Health'
        });
      }
      alert('Surveys sent successfully!');
    } catch (error) {
      console.error('Error sending surveys:', error);
      alert('Error sending surveys');
    }
    setIsSending(false);
  };

  const completedSurveys = surveys.filter(s => s.status === 'completed');
  const sentSurveys = surveys.filter(s => s.status === 'sent');
  const responseRate = surveys.length > 0 
    ? Math.round((completedSurveys.length / surveys.length) * 100) 
    : 0;
  const avgRating = completedSurveys.length > 0
    ? (completedSurveys.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / completedSurveys.length).toFixed(1)
    : 'N/A';

  const visitsNeedingSurvey = completedVisits.filter(
    v => !surveys.find(s => s.visit_id === v.id)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              Patient Satisfaction Surveys
            </CardTitle>
            <Button 
              onClick={handleSendSurveys}
              disabled={isSending || visitsNeedingSurvey.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Surveys ({visitsNeedingSurvey.length})</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <Mail className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-900">{sentSurveys.length}</p>
                <p className="text-sm text-purple-700">Surveys Sent</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{completedSurveys.length}</p>
                <p className="text-sm text-green-700">Completed</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star 
                      key={i} 
                      className={`w-5 h-5 ${i <= Math.round(avgRating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
                <p className="text-2xl font-bold text-blue-900">{avgRating}</p>
                <p className="text-sm text-blue-700">Avg Rating</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 text-center">
                <ThumbsUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-900">{responseRate}%</p>
                <p className="text-sm text-orange-700">Response Rate</p>
              </CardContent>
            </Card>
          </div>

          {completedSurveys.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Recent Responses</h3>
              {completedSurveys.slice(0, 5).map(survey => {
                const patient = getPatient(survey.patient_id);
                return (
                  <Card 
                    key={survey.id} 
                    className={`border-l-4 ${
                      survey.ai_sentiment === 'negative' ? 'border-l-red-500' :
                      survey.ai_sentiment === 'positive' ? 'border-l-green-500' :
                      'border-l-blue-500'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold">
                              {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'}
                            </span>
                            <div className="flex">
                              {[1,2,3,4,5].map(i => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i <= survey.overall_rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            {survey.escalated && (
                              <Badge className="bg-red-500 text-white">Escalated</Badge>
                            )}
                          </div>
                          {survey.feedback_text && (
                            <p className="text-sm text-gray-600 italic">"{survey.feedback_text}"</p>
                          )}
                          {survey.ai_themes?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {survey.ai_themes.map((theme, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{theme}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge className={
                          survey.ai_sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                          survey.ai_sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {survey.ai_sentiment || 'pending'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}