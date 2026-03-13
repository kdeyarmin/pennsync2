import { useMemo, lazy, Suspense, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, User, CheckCircle2, FileText, Mic, Send, Home, Heart, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEastern, todayEastern } from "@/components/utils/timezone";
import CareScopeSelector from "@/components/profile/CareScopeSelector";
import PullToRefresh from "@/components/mobile/PullToRefresh";


// Critical above-the-fold — eager loaded
import SmartRouteOptimizer from "@/components/scheduling/SmartRouteOptimizer";
import ProactiveClinicalSupport from "@/components/clinical/ProactiveClinicalSupport";
import NewFeaturesBanner from "@/components/dashboard/NewFeaturesBanner";
import AnnouncementsWidget from "@/components/dashboard/AnnouncementsWidget";
import DashboardSkeleton from "@/components/loading/DashboardSkeleton";
import { logActivity, ActivityActions } from "@/components/utils/activityLogger";
import { calculateNurseStats } from "@/components/utils/statsCalculator";
import ProfileCompletenessAlert from "@/components/profile/ProfileCompletenessAlert";

// Non-critical below-the-fold — lazy loaded
const HighRiskPatientsWidget    = lazy(() => import("@/components/dashboard/HighRiskPatientsWidget"));
const PendingReferralsWidget    = lazy(() => import("@/components/referral/PendingReferralsWidget"));
const RealTimePatientAlerts     = lazy(() => import("@/components/dashboard/RealTimePatientAlerts"));
const TopTemplatesWidget        = lazy(() => import("@/components/clinical/TopTemplatesWidget"));
const HospitalizationRiskWidget = lazy(() => import("@/components/dashboard/HospitalizationRiskWidget"));
const CarePlanProposalReviewer = lazy(() => import("@/components/carePlan/CarePlanProposalReviewer"));


export default function Dashboard() {
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        if (error.status === 403) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch all dashboard queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['todayVisits'] }),
        queryClient.refetchQueries({ queryKey: ['patients'] }),
        queryClient.refetchQueries({ queryKey: ['activeCarePlans'] }),
        queryClient.refetchQueries({ queryKey: ['recentIncidents'] }),
        queryClient.refetchQueries({ queryKey: ['myNoteConversions'] }),
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

    // Log page visit with user context
    useEffect(() => {
      if (currentUser?.email) {
        logActivity(ActivityActions.PAGE_VISIT, {
          page: 'Dashboard',
          page_title: 'Dashboard',
          user_role: currentUser.role
        });
      }
    }, [currentUser?.email]);

    const { data: visits = [], isLoading, error: visitsError } = useQuery({
      queryKey: ['todayVisits'],
      queryFn: async () => {
        const today = todayEastern();
        return base44.entities.Visit.filter({ visit_date: today }, '-visit_time');
      },
      initialData: [],
      staleTime: 120000,      // 2 min — visits change occasionally
      gcTime: 300000,
    });

  const { data: patients = [], error: patientsError } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'active' }, '-updated_date', 100), // reduced from 200
    initialData: [],
    staleTime: 600000,        // 10 min — patient list rarely changes mid-session
    gcTime: 900000,
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['activeCarePlans'],
    queryFn: () => base44.entities.CarePlan.filter({ status: 'active' }, '-updated_date', 50),  // reduced from 100
    initialData: [],
    staleTime: 600000,
    gcTime: 900000,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['recentIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 20),  // reduced from 30
    initialData: [],
    staleTime: 600000,
    gcTime: 900000,
  });

  const { data: noteConversions = [] } = useQuery({
    queryKey: ['myNoteConversions', currentUser?.email],
    queryFn: () => base44.entities.NoteConversion.filter({ nurse_email: currentUser.email }, '-created_date', 100), // reduced from 200
    initialData: [],
    staleTime: 600000,
    gcTime: 900000,
    enabled: !!currentUser?.email,
  });



  // Handle errors gracefully with user feedback
  if (visitsError || patientsError) {
    console.error('Dashboard data loading error:', visitsError || patientsError);
  }

  const hasDataError = visitsError || patientsError;

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

  const getGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const fullName = currentUser?.full_name || 'there';
  const careScope = currentUser?.care_scope;

  // Banner gradient based on care scope
  const bannerGradient = careScope === "hospice"
    ? "from-purple-500 via-purple-600 to-purple-700"
    : careScope === "both"
    ? "from-indigo-500 via-blue-600 to-purple-600"
    : "from-blue-500 via-blue-600 to-blue-700";

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // If user hasn't set their care scope yet, prompt them
  if (currentUser && !careScope) {
    return (
      <div className="max-w-lg mx-auto pt-8 px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Penn Sync!</h1>
          <p className="text-gray-500 mt-1">Let's set up your profile before we get started.</p>
        </div>
        <CareScopeSelector currentUser={currentUser} onSaved={() => {}} />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} containerRef={containerRef}>
    <div ref={containerRef} className="max-w-7xl mx-auto min-h-screen">
      {hasDataError && (
        <Card className="mb-4 border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Unable to load dashboard data</p>
                <p className="text-sm text-red-700">Please check your connection and try again.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Profile Completeness Alert */}
      <ProfileCompletenessAlert user={currentUser} />

      {/* Welcome Banner */}
      <Card className={`mb-4 sm:mb-6 bg-gradient-to-r ${bannerGradient} text-white border-none shadow-lg overflow-hidden`}>
        <CardContent className="p-4 sm:p-6 md:p-8 relative">
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              {careScope === "hospice" ? <Heart className="w-5 h-5 text-white/80" /> : <Home className="w-5 h-5 text-white/80" />}
              <span className="text-white/80 text-xs font-medium uppercase tracking-wide">
                {careScope === "hospice" ? "Hospice" : careScope === "both" ? "Home Health & Hospice" : "Home Health"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-white drop-shadow-lg">
              {getGreeting}, {fullName}! 👋
            </h1>
            <p className="text-white text-xs sm:text-sm md:text-base drop-shadow-md">
              {formatEastern(new Date(), 'EEEE, MMMM d, yyyy') || new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>



      {/* New Features Banner */}
      <NewFeaturesBanner />

      {/* Admin Announcements */}
      <AnnouncementsWidget />

      {/* Nurse Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-md">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-blue-700 font-semibold mb-2 uppercase tracking-wide">Note Enhancements</p>
                <p className="text-3xl sm:text-4xl font-bold text-blue-900">
                  {noteConversions.length}
                </p>
              </div>
              <FileText className="w-12 h-12 sm:w-14 sm:h-14 text-blue-400 flex-shrink-0 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300 shadow-md">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-emerald-700 font-semibold mb-2 uppercase tracking-wide">Time Saved</p>
                <p className="text-3xl sm:text-4xl font-bold text-emerald-900">{stats.timeSavedDisplay}</p>
              </div>
              <Clock className="w-12 h-12 sm:w-14 sm:h-14 text-emerald-400 flex-shrink-0 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { page: "SmartNoteAssistant", label: "Smart Notes",       Icon: FileText,      bg: "bg-blue-50",   border: "border-blue-200 hover:border-blue-400",   icon: "text-blue-600"   },
          { page: "SendFax",            label: "Send Fax",          Icon: Send,          bg: "bg-indigo-50", border: "border-indigo-200 hover:border-indigo-400", icon: "text-indigo-600" },
          { page: "CarePlanManagement", label: "Care Plans",        Icon: CheckCircle2,  bg: "bg-green-50",  border: "border-green-200 hover:border-green-400",  icon: "text-green-600"  },
          { page: "PatientEducationHub",label: "Pt. Education",     Icon: User,          bg: "bg-purple-50", border: "border-purple-200 hover:border-purple-400", icon: "text-purple-600" },
          { page: "VisitScribe",        label: "Visit Scribe",      Icon: Mic,           bg: "bg-orange-50", border: "border-orange-200 hover:border-orange-400", icon: "text-orange-600" },
          { page: "IncidentReporting",  label: "Incidents",         Icon: AlertTriangle, bg: "bg-red-50",    border: "border-red-200 hover:border-red-400",      icon: "text-red-600"    },
        ].map((item) => {
          const ItemIcon = item.Icon;
          return (
            <Link key={item.page} to={`/${item.page}`}>
              <Card className={`hover:shadow-md transition-all cursor-pointer border-2 ${item.border} ${item.bg} active:scale-95 h-full`}>
                <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-1.5 min-h-[80px] sm:min-h-[90px]">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                    <ItemIcon className={`w-5 h-5 ${item.icon}`} />
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-800 leading-tight">{item.label}</h3>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Route Optimizer */}
      {visits.length > 0 && (
        <div className="mb-6">
          <SmartRouteOptimizer
            visits={visits.filter(v => v.status === 'scheduled')}
            patients={patients}
            onOptimizedSchedule={(order) => console.log('Optimized:', order)}
          />
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



      <Suspense fallback={null}>
        {/* AI Care Plan Proposals - Nurse Review */}
        <div className="mb-6">
          <CarePlanProposalReviewer compact={true} />
        </div>

        {/* Hospitalization Risk Monitor */}
        <div className="mb-6">
          <HospitalizationRiskWidget autoAnalyze={false} />
        </div>

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
        </Suspense>

    </div>
    </PullToRefresh>
  );
}