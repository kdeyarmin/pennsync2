import React, { useState } from "react";
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
    });

  const { data: patients, error: patientsError } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['allCarePlans'],
    queryFn: () => base44.entities.CarePlan.list(),
    initialData: [],
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['recentIncidents'],
    queryFn: () => base44.entities.Incident.filter({}, '-incident_date', 50),
    initialData: [],
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

  const completedVisits = visits.filter(v => v.status === 'completed').length;
  const pendingVisits = visits.filter(v => v.status === 'scheduled').length;

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Visits</p>
                <p className="text-4xl font-bold">{visits.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Completed</p>
                <p className="text-4xl font-bold">{completedVisits}</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Pending</p>
                <p className="text-4xl font-bold">{pendingVisits}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>
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



      {/* Add Compliance Widget before Visit Schedule */}
      <ComplianceDashboardWidget />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Visit Schedule</h2>
        <div className="flex gap-2">
          <Link to={createPageUrl("OASISReview")}>
            <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
              <FileText className="w-4 h-4 mr-2" />
              OASIS Review
            </Button>
          </Link>
          <Link to={createPageUrl("Patients")}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Visit
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Loading visits...
              </CardContent>
            </Card>
          ) : !visits || visits.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No visits scheduled</h3>
              <p className="text-gray-500 mb-6">You don't have any visits scheduled for today.</p>
              <Link to={createPageUrl("Patients")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule a Visit
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          (visits || []).map((visit) => {
            const patient = getPatient(visit.patient_id);
            return (
              <Card key={visit.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 truncate">
                            {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{visit.visit_time || 'Time TBD'}</span>
                            </div>
                            {patient?.address && (
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate max-w-[150px] sm:max-w-xs">{patient.address}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 sm:mt-3">
                            <Badge className={getStatusColor(visit.status)}>
                              {visit.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="border-blue-200 text-blue-700 text-xs">
                              {getVisitTypeLabel(visit.visit_type)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <Link to={`${createPageUrl("DocumentVisit")}?visitId=${visit.id}`} className="flex-1 md:flex-initial">
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 w-full text-sm sm:text-base"
                          disabled={visit.status === 'completed'}
                        >
                          {visit.status === 'completed' ? 'View' : 'Document'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Voice Commands */}
      <VoiceCommandListener
        onCommand={handleVoiceCommand}
        commands={getCommandsForContext('dashboard')}
        context="dashboard"
      />
    </div>
  );
}