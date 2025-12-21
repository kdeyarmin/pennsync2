import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Clock, MapPin, User, Plus, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { formatEastern, todayEastern } from "../components/utils/timezone";
import { isValid } from "date-fns";
import VoiceCommandListener from "../components/voice/VoiceCommandListener";
import { getCommandsForContext } from "../components/voice/voiceCommands";
import ComplianceDashboardWidget from "../components/compliance/ComplianceDashboardWidget";

import RealTimePatientAlerts from "../components/dashboard/RealTimePatientAlerts";

import SmartRouteOptimizer from "../components/scheduling/SmartRouteOptimizer";
import IntelligentTaskPrioritization from "../components/tasks/IntelligentTaskPrioritization";
import NurseRegulatoryAlerts from "../components/compliance/NurseRegulatoryAlerts";
import PDGMPredictiveAnalytics from "../components/pdgm/PDGMPredictiveAnalytics";
import { logActivity, ActivityActions } from "@/components/utils/activityLogger";
import AITrainingRecommendations from "../components/training/AITrainingRecommendations";
import ComplianceAlertNotifications from "../components/alerts/ComplianceAlertNotifications";
import ProactiveClinicalSupport from "../components/clinical/ProactiveClinicalSupport";

export default function Dashboard() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Log page visit once on mount
    React.useEffect(() => {
      logActivity(ActivityActions.PAGE_VISIT, { page: 'Dashboard' });
    }, []);

    const { data: currentUser } = useQuery({
      queryKey: ['currentUser'],
      queryFn: () => base44.auth.me(),
    });

    const { data: visits, isLoading, error: visitsError } = useQuery({
      queryKey: ['todayVisits'],
      queryFn: async () => {
        const today = todayEastern();
        return base44.entities.Visit.filter({ visit_date: today }, '-visit_time');
      },
      initialData: [],
      staleTime: 60000,
    });

  const { data: patients, error: patientsError } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 500),
    initialData: [],
    staleTime: 300000,
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['allCarePlans'],
    queryFn: () => base44.entities.CarePlan.list('-updated_date', 200),
    initialData: [],
    staleTime: 300000,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['recentIncidents'],
    queryFn: () => base44.entities.Incident.filter({}, '-incident_date', 50),
    initialData: [],
    staleTime: 180000,
  });

  // Handle errors gracefully
  if (visitsError || patientsError) {
    console.error('Dashboard data loading error:', visitsError || patientsError);
  }

  const getPatient = (patientId) => {
    return patients.find(p => p.id === patientId);
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800 border-blue-200",
      in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return colors[status] || colors.scheduled;
  };

  const getVisitTypeLabel = (type) => {
    const labels = {
      skilled_nursing: "Skilled Nursing",
      admission: "Admission",
      recertification: "Recertification",
      discharge: "Discharge",
      routine_visit: "Routine Visit",
      prn: "PRN Visit"
    };
    return labels[type] || type;
  };

  // Voice command handler
  const handleVoiceCommand = (action, spokenText) => {
    switch (action) {
      case 'navigate_patients':
        navigate(createPageUrl("Patients"));
        break;
      case 'refresh_data':
        queryClient.invalidateQueries({ queryKey: ['todayVisits'] });
        break;
      case 'search':
        // Extract search term from spoken text
        const searchTerm = spokenText.replace(/search for|find patient|look for/gi, '').trim();
        if (searchTerm) {
          navigate(`${createPageUrl("Patients")}?search=${encodeURIComponent(searchTerm)}`);
        }
        break;
      case 'navigate_dashboard':
        window.location.reload();
        break;
      default:
        console.log('Unhandled voice command:', action);
    }
  };

  const { completedVisits, pendingVisits } = useMemo(() => ({
    completedVisits: visits.filter(v => v.status === 'completed').length,
    pendingVisits: visits.filter(v => v.status === 'scheduled').length
  }), [visits]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const fullName = currentUser?.full_name || 'there';

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen">
      {/* Welcome Banner */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white border-none shadow-xl overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8 relative">
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
              {getGreeting()}, {fullName}! 👋
            </h1>
            <p className="text-white/80 text-xs sm:text-sm md:text-base">
              {isValid(new Date()) ? formatEastern(new Date(), 'EEEE, MMMM d, yyyy').replace(' ET', '') : new Date().toLocaleDateString()} • You have {pendingVisits} visit{pendingVisits !== 1 ? 's' : ''} scheduled today
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Today's Visits</h2>
      </div>



      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <ComplianceAlertNotifications 
          nurseEmail={currentUser?.email}
          showAll={false}
          maxAlerts={5}
          compact={true}
        />
        <SmartRouteOptimizer
          visits={visits.filter(v => v.status === 'scheduled')}
          patients={patients}
          onOptimizedSchedule={(order) => console.log('Optimized:', order)}
        />
        <IntelligentTaskPrioritization
          nurseEmail={currentUser?.email}
          patients={patients}
          onTaskCompleted={() => queryClient.invalidateQueries({ queryKey: ['nurseTasks'] })}
        />
        <AITrainingRecommendations userId={currentUser?.id} userEmail={currentUser?.email} />
      </div>

      {/* Proactive Clinical Support - Show for first scheduled patient */}
      {visits.length > 0 && visits[0]?.patient_id && (
        <div className="mb-6">
          <ProactiveClinicalSupport 
            patientId={visits[0].patient_id}
            compact={true}
          />
        </div>
      )}



      {/* Real-time Patient Alerts */}
      <div className="mb-6">
        <RealTimePatientAlerts
          patients={patients}
          visits={visits}
          carePlans={carePlans}
          incidents={incidents}
        />
      </div>

      {/* Regulatory Alerts for Nurses */}
      <div className="mb-6">
        <NurseRegulatoryAlerts nurseEmail={currentUser?.email} compact={true} />
      </div>



      {/* Add Compliance Widget */}
      <ComplianceDashboardWidget />

      {/* Voice Commands */}
      <VoiceCommandListener
        onCommand={handleVoiceCommand}
        commands={getCommandsForContext('dashboard')}
        context="dashboard"
      />
    </div>
  );
}