// REMOVED PAGES (2026-03-23): 92 orphaned page files deleted — not in any route or import.
// If you need any of these back, check git history for the commit that removed them.
// Removed: AIComplianceInServices, AITrainingGenerator, About, AdminDashboard, AdminTrainingAnalytics,
// AdminUserSetup, AgencyAnalytics, AgencySettings, AnalyticsDashboard, AnnualEducationTranscript,
// AnnualMandatoryEducation, AutomaticCarePlans, CarePlanBuilder, ClinicalInsightsDashboard,
// ClinicalLibrary, ComplianceDashboard, ComplianceMonitoringDashboard, ComplianceRegulatory,
// CustomizableDashboard, DataQualityMonitor, DischargeSummaries, DocumentIngestion, DocumentManagement,
// DocumentSignatures, DocumentVisit, DocumentationTraining, DuplicatePatients, EducationLibrary,
// EmployeeTranscript, FaxAddressBook, FaxContacts, FaxDashboard, FaxLogsDashboard, Features, Home,
// IncidentReportingModule, JoinTelehealth, LearningReports, ManageNewFeatures, ManagerSkillGapDashboard,
// MedicalScribe, MedicareComplianceDashboard, MedicareGuidelinesLibrary, MedicationReconciliation,
// MyAnnualEducation, MyTraining, NotificationSettings, NurseEducationVideos, NursePerformanceDashboard,
// NurseTraining, NurseTrainingHub, OASISAnalyticsDashboard, OASISAnalyzer, OASISAuditDashboard,
// OASISClinicalReview, OASISComplianceReview, OASISDocumentationReview, OASISRevenueAnalysis, OASISReview,
// OfflineDocumentation, OfflineVisitDocumentation, PDFSearch, PDFTemplateLibrary, PDFTools, PatientAlerts,
// PatientEducation, PatientEducationPortal, PatientRecordDashboard, PatientTriage, PersonnelFile,
// PopulationHealthAnalytics, PredictiveAnalytics, ProductivityDashboard, QualityDashboard,
// RealTimeComplianceDashboard, ReferralAdmissionNote, ReferralProcessor, ReferralTriage, Reports,
// ScheduleOptimizer, SecurityPolicy, SignDocument, Support, SurveyPreparation, SystemHealthMonitor,
// SystemJobMonitor, SystemMonitoring, TemplateLibrary, TrainingManagement, UserActivityLog,
// UserActivityReport, UserGuides

import './App.css'
import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import { ROUTES, REDIRECTS, MAIN_PAGE } from '@/routes';

// Public (no-login) patient telehealth join page.
const JoinTelehealth = lazy(() => import('@/pages/JoinTelehealth'));

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Public patient join route renders WITHOUT authentication — it is gated by
  // the per-session capability token in the link, not by an app login. This is
  // checked before the auth gate below so patients are never bounced to login.
  if (location.pathname.toLowerCase().startsWith('/join')) {
    return (
      <Suspense fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/join" element={<JoinTelehealth />} />
        </Routes>
      </Suspense>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Gate the whole app on authentication. The no-token path does NOT set an
  // authError, so without this an unauthenticated user would render every
  // route and fire PHI queries. Never rely on authError alone here.
  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  // Render the main app
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Navigate to={`/${MAIN_PAGE}`} replace />} />
        {ROUTES.map(({ name, Component }) => (
          <Route
            key={name}
            path={`/${name}`}
            element={<LayoutWrapper currentPageName={name}><Component /></LayoutWrapper>}
          />
        ))}
        {REDIRECTS.map(({ from, to }) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App