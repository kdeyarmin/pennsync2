import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bell, ClipboardList, Brain, MessageSquare } from "lucide-react";

import AppointmentReminderManager from "../components/communication/AppointmentReminderManager";
import PatientSurveyManager from "../components/communication/PatientSurveyManager";
import SurveyFeedbackAnalyzer from "../components/communication/SurveyFeedbackAnalyzer";

export default function PatientCommunication() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Communication Hub</h1>
            <p className="text-gray-600">AI-powered reminders, surveys, and feedback analysis</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="reminders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reminders" className="gap-2">
            <Bell className="w-4 h-4" />
            Appointment Reminders
          </TabsTrigger>
          <TabsTrigger value="surveys" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Patient Surveys
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <Brain className="w-4 h-4" />
            Feedback Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reminders">
          <AppointmentReminderManager />
        </TabsContent>

        <TabsContent value="surveys">
          <PatientSurveyManager />
        </TabsContent>

        <TabsContent value="analysis">
          <SurveyFeedbackAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}