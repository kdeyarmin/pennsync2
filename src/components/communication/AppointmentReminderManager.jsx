import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { format, addDays, isAfter } from "date-fns";

export default function AppointmentReminderManager() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoReminders, setAutoReminders] = useState(true);
  const queryClient = useQueryClient();

  const { data: upcomingVisits = [] } = useQuery({
    queryKey: ['upcomingVisits'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      const visits = await base44.entities.Visit.filter({ status: 'scheduled' });
      return visits.filter(v => v.visit_date >= today && v.visit_date <= nextWeek);
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['appointmentReminders'],
    queryFn: () => base44.entities.AppointmentReminder.filter({}, '-scheduled_date', 50)
  });

  const createReminderMutation = useMutation({
    mutationFn: (data) => base44.entities.AppointmentReminder.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointmentReminders'] })
  });

  const getPatient = (patientId) => patients.find(p => p.id === patientId);

  const generatePersonalizedReminder = async (visit, patient) => {
    const prompt = `Generate a warm, personalized appointment reminder for a home health visit.

Patient Name: ${patient.first_name} ${patient.last_name}
Visit Date: ${format(new Date(visit.visit_date), 'EEEE, MMMM d, yyyy')}
Visit Time: ${visit.visit_time || 'To be confirmed'}
Visit Type: ${visit.visit_type.replace(/_/g, ' ')}
Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}

Requirements:
- Be warm and caring
- Include the date and time clearly
- Mention what they might need to prepare (medications list, questions)
- Keep it concise (2-3 paragraphs)
- Include a friendly sign-off

Generate the reminder message:`;

    const message = await base44.integrations.Core.InvokeLLM({ prompt });
    return message;
  };

  const handleGenerateReminders = async () => {
    setIsGenerating(true);
    try {
      for (const visit of upcomingVisits) {
        const patient = getPatient(visit.patient_id);
        if (!patient || !patient.email) continue;

        // Check if reminder already exists
        const existingReminder = reminders.find(r => r.visit_id === visit.id);
        if (existingReminder) continue;

        const message = await generatePersonalizedReminder(visit, patient);

        await createReminderMutation.mutateAsync({
          patient_id: visit.patient_id,
          visit_id: visit.id,
          reminder_type: 'email',
          scheduled_date: new Date().toISOString(),
          visit_date: visit.visit_date,
          visit_time: visit.visit_time,
          message_content: message,
          status: 'pending'
        });
      }
      alert('Reminders generated successfully!');
    } catch (error) {
      console.error('Error generating reminders:', error);
      alert('Error generating reminders');
    }
    setIsGenerating(false);
  };

  const handleSendReminder = async (reminder) => {
    try {
      const patient = getPatient(reminder.patient_id);
      if (!patient?.email) {
        alert('Patient email not found');
        return;
      }

      await base44.integrations.Core.SendEmail({
        to: patient.email,
        subject: `Appointment Reminder - ${format(new Date(reminder.visit_date), 'MMMM d, yyyy')}`,
        body: reminder.message_content,
        from_name: 'Penn Sync Home Health'
      });

      await base44.entities.AppointmentReminder.update(reminder.id, {
        status: 'sent',
        sent_date: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['appointmentReminders'] });
      alert('Reminder sent successfully!');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Error sending reminder');
    }
  };

  const pendingReminders = reminders.filter(r => r.status === 'pending');
  const sentReminders = reminders.filter(r => r.status === 'sent');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              AI Appointment Reminders
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch 
                  id="auto-reminders" 
                  checked={autoReminders}
                  onCheckedChange={setAutoReminders}
                />
                <Label htmlFor="auto-reminders" className="text-sm">Auto-send</Label>
              </div>
              <Button 
                onClick={handleGenerateReminders}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Reminders</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">{upcomingVisits.length}</p>
                <p className="text-sm text-blue-700">Upcoming Visits</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-900">{pendingReminders.length}</p>
                <p className="text-sm text-orange-700">Pending Reminders</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{sentReminders.length}</p>
                <p className="text-sm text-green-700">Sent This Week</p>
              </CardContent>
            </Card>
          </div>

          {pendingReminders.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Pending Reminders</h3>
              {pendingReminders.map(reminder => {
                const patient = getPatient(reminder.patient_id);
                return (
                  <Card key={reminder.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold">
                              {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'}
                            </span>
                            <Badge variant="outline">
                              {format(new Date(reminder.visit_date), 'MMM d')} {reminder.visit_time}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {reminder.message_content?.substring(0, 150)}...
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleSendReminder(reminder)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4 mr-1" /> Send
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {pendingReminders.length === 0 && upcomingVisits.length > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                Click "Generate Reminders" to create personalized AI reminders for {upcomingVisits.length} upcoming visits.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}