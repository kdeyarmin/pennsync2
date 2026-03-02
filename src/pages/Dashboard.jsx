import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import InteractiveChart from "../components/charts/InteractiveChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ActionableInsightsWidget from "../components/dashboard/ActionableInsightsWidget";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Clock, MapPin, User, Plus, CheckCircle2, AlertCircle, FileText, Clock as ClockIcon, Mic, Send } from "lucide-react";
import { formatEastern, todayEastern } from "../components/utils/timezone";
import { isValid } from "date-fns";


// Critical above-the-fold components — eager loaded
import ComplianceAlertNotifications from "../components/alerts/ComplianceAlertNotifications";
import SmartRouteOptimizer from "../components/scheduling/SmartRouteOptimizer";
import ProactiveClinicalSupport from "../components/clinical/ProactiveClinicalSupport";
import NewFeaturesBanner from "../components/dashboard/NewFeaturesBanner";
import AnnouncementsWidget from "../components/dashboard/AnnouncementsWidget";
import DashboardSkeleton from "../components/loading/DashboardSkeleton";
import { logActivity, ActivityActions } from "@/components/utils/activityLogger";
import { calculateNurseStats } from "@/components/utils/statsCalculator";

// Non-critical below-the-fold components — lazy loaded
const HighRiskPatientsWidget    = lazy(() => import("../components/dashboard/HighRiskPatientsWidget"));
const PendingReferralsWidget    = lazy(() => import("../components/referral/PendingReferralsWidget"));
const RealTimePatientAlerts     = lazy(() => import("../components/dashboard/RealTimePatientAlerts"));
const TopTemplatesWidget        = lazy(() => import("../components/clinical/TopTemplatesWidget"));
const NurseRegulatoryAlerts     = lazy(() => import("../components/compliance/NurseRegulatoryAlerts"));
const ComplianceDashboardWidget = lazy(() => import("../components/compliance/ComplianceDashboardWidget"));
const OfflineDataManager        = lazy(() => import("../components/mobile/OfflineDataManager"));


export default function Dashboard() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
      queryKey: ['currentUser'],
      queryFn: () => base44.auth.me(),
    });

    // Log page visit with user context
    React.useEffect(() => {
      if (currentUser?.email) {
        logActivity(ActivityActions.PAGE_VISIT, {
          page: 'Dashboard',
          page_title: 'Dashboard',
          user_role: currentUser.role
        });
      }
    }, [currentUser?.email]);

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
    queryFn: () => base44.entities.Patient.filter({ status: 'active' }, '-updated_date', 200),
    initialData: [],
    staleTime: 300000,
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['activeCarePlans'],
    queryFn: () => base44.entities.CarePlan.filter({ status: 'active' }, '-updated_date', 100),
    initialData: [],
    staleTime: 300000,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['recentIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 30),
    initialData: [],
    staleTime: 300000,
  });

  const { data: noteConversions = [] } = useQuery({
    queryKey: ['myNoteConversions', currentUser?.email],
    queryFn: () => base44.entities.NoteConversion.filter({ nurse_email: currentUser.email }, '-created_date', 200),
    initialData: [],
    staleTime: 300000,
    enabled: !!currentUser?.email,
  });

  // Handle errors gracefully
  if (visitsError || patientsError) {
    console.error('Dashboard data loading error:', visitsError || patientsError);
  }

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



  const stats = useMemo(() => {
    if (!currentUser?.email) {
      return { noteConversions: 0, timeSavedDisplay: '0 hrs', noteEnhancements: { total: 0 } };
    }
    
    // Filter for current user's enhancements
    return calculateNurseStats(currentUser.email, {
      visits,
      noteConversions,
      dateRange: 30
    });
  }, [visits, noteConversions, currentUser]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const fullName = currentUser?.full_name || 'there';

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      {/* Welcome Banner */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white border-none shadow-xl overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8 relative">
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-white drop-shadow-lg">
              {getGreeting()}, {fullName}! 👋
            </h1>
            <p className="text-white text-xs sm:text-sm md:text-base drop-shadow-md">
              {isValid(new Date()) ? formatEastern(new Date(), 'EEEE, MMMM d, yyyy').replace(' ET', '') : new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>



      {/* New Features Banner */}
      <NewFeaturesBanner />

      {/* Admin Announcements */}
      <AnnouncementsWidget />

      {/* Nurse Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Note Enhancements</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900">
                  {noteConversions.length}
                </p>
              </div>
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-green-600 font-medium mb-1">Time Saved</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900">{stats.timeSavedDisplay}</p>
              </div>
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-green-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { page: "SmartNoteAssistant", label: "Smart Notes",       Icon: FileText,    bg: "bg-blue-50",   border: "border-blue-200 hover:border-blue-400",   icon: "text-blue-600"   },
          { page: "SendFax",            label: "Send Fax",          Icon: Send,        bg: "bg-indigo-50", border: "border-indigo-200 hover:border-indigo-400", icon: "text-indigo-600" },
          { page: "CarePlanManagement", label: "Care Plans",        Icon: CheckCircle2,bg: "bg-green-50",  border: "border-green-200 hover:border-green-400",  icon: "text-green-600"  },
          { page: "PatientEducationHub",label: "Pt. Education",     Icon: User,        bg: "bg-purple-50", border: "border-purple-200 hover:border-purple-400", icon: "text-purple-600" },
          { page: "VisitScribe",        label: "Visit Scribe",      Icon: Mic,         bg: "bg-orange-50", border: "border-orange-200 hover:border-orange-400", icon: "text-orange-600" },
        ].map(({ page, label, Icon, bg, border, icon }) => (
          <Link key={page} to={createPageUrl(page)}>
            <Card className={`hover:shadow-md transition-all cursor-pointer border-2 ${border} ${bg} active:scale-95 h-full`}>
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-1.5 min-h-[80px] sm:min-h-[90px]">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                  <Icon className={`w-5 h-5 sm:w-5 sm:h-5 ${icon}`} />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm text-gray-800 leading-tight">{label}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Dashboard Widgets */}
      {currentUser?.email && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
          <ComplianceAlertNotifications 
            nurseEmail={currentUser?.email}
            showAll={false}
            maxAlerts={5}
            compact={true}
          />
          {visits.length > 0 && (
            <SmartRouteOptimizer
              visits={visits.filter(v => v.status === 'scheduled')}
              patients={patients}
              onOptimizedSchedule={(order) => console.log('Optimized:', order)}
            />
          )}
        </div>
      )}

      {/* Proactive Clinical Support - Show for first scheduled patient */}
      {visits.length > 0 && visits[0]?.patient_id && (
        <div className="mb-6">
          <ProactiveClinicalSupport 
            patientId={visits[0].patient_id}
            compact={true}
          />
        </div>
      )}



      {/* High-Risk Patients Alert */}
      <div className="mb-6">
        <HighRiskPatientsWidget />
      </div>

      {/* Pending Referrals */}
      <div className="mb-6">
        <PendingReferralsWidget />
      </div>

      {/* Real-time Patient Alerts */}
      <div className="mb-6">
        <RealTimePatientAlerts
          patients={patients}
          visits={visits}
          carePlans={carePlans}
          incidents={incidents}
          currentUser={currentUser}
        />
      </div>

      {/* Top Clinical Templates */}
      <div className="mb-6">
        <TopTemplatesWidget />
      </div>

      {/* Regulatory Alerts for Nurses */}
      <div className="mb-6">
        <NurseRegulatoryAlerts nurseEmail={currentUser?.email} compact={true} />
      </div>



      {/* Add Compliance Widget */}
      <ComplianceDashboardWidget />

      {/* Offline Data Manager */}
      <div className="mb-6">
        <OfflineDataManager />
      </div>

    </div>
  );
}