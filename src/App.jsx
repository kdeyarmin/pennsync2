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
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/utils/ErrorBoundary';

// Dashboard loaded eagerly (landing page), all others lazy-loaded for code splitting
import Dashboard from '@/pages/Dashboard';

const Patients = lazy(() => import('@/pages/Patients'));
const PatientDetails = lazy(() => import('@/pages/PatientDetails'));
const ClinicalDocumentation = lazy(() => import('@/pages/ClinicalDocumentation'));
const DocumentHub = lazy(() => import('@/pages/DocumentHub'));
const Messages = lazy(() => import('@/pages/Messages'));
const AdminOperations = lazy(() => import('@/pages/AdminOperations'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const AdminTraining = lazy(() => import('@/pages/AdminTraining'));
const CarePlanManagement = lazy(() => import('@/pages/CarePlanManagement'));
const SmartOASISAssessment = lazy(() => import('@/pages/SmartOASISAssessment'));
const SendFax = lazy(() => import('@/pages/SendFax'));
const PhysicianDirectory = lazy(() => import('@/pages/PhysicianDirectory'));
const Telehealth = lazy(() => import('@/pages/Telehealth'));
const ResourceLibrary = lazy(() => import('@/pages/ResourceLibrary'));
const ComplianceCenter = lazy(() => import('@/pages/ComplianceCenter'));
const Incidents = lazy(() => import('@/pages/Incidents'));
const MyLearning = lazy(() => import('@/pages/MyLearning'));
const ReferralIntake = lazy(() => import('@/pages/ReferralIntake'));
const OfflineMode = lazy(() => import('@/pages/OfflineMode'));
const Help = lazy(() => import('@/pages/Help'));
const ReportsAnalytics = lazy(() => import('@/pages/ReportsAnalytics'));
const SecurityCompliance = lazy(() => import('@/pages/SecurityCompliance'));
const PatientDataManagement = lazy(() => import('@/pages/PatientDataManagement'));
const UserSettings = lazy(() => import('@/pages/UserSettings'));
const ClinicalPathwayManager = lazy(() => import('@/pages/ClinicalPathwayManager'));
const ClinicalSkillsChecklist = lazy(() => import('@/pages/ClinicalSkillsChecklist'));
const TrainingCoursePlayer = lazy(() => import('@/pages/TrainingCoursePlayer'));
const EventReport = lazy(() => import('@/pages/EventReport'));
const SmartNoteAssistant = lazy(() => import('@/pages/SmartNoteAssistant'));
const PatientEducationHub = lazy(() => import('@/pages/PatientEducationHub'));
const VisitScribe = lazy(() => import('@/pages/VisitScribe'));
const ClinicalChart = lazy(() => import('@/pages/ClinicalChart'));
const LearningCenter = lazy(() => import('@/pages/LearningCenter'));
const RegulatoryCompliance = lazy(() => import('@/pages/RegulatoryCompliance'));

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

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

  // Render the main app
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/Dashboard" element={<LayoutWrapper currentPageName="Dashboard"><Dashboard /></LayoutWrapper>} />
        <Route path="/Patients" element={<LayoutWrapper currentPageName="Patients"><Patients /></LayoutWrapper>} />
        <Route path="/PatientDetails" element={<LayoutWrapper currentPageName="PatientDetails"><PatientDetails /></LayoutWrapper>} />
        <Route path="/ClinicalDocumentation" element={<LayoutWrapper currentPageName="ClinicalDocumentation"><ClinicalDocumentation /></LayoutWrapper>} />
        <Route path="/DocumentHub" element={<LayoutWrapper currentPageName="DocumentHub"><DocumentHub /></LayoutWrapper>} />
        <Route path="/Messages" element={<LayoutWrapper currentPageName="Messages"><Messages /></LayoutWrapper>} />
        <Route path="/AdminOperations" element={<LayoutWrapper currentPageName="AdminOperations"><AdminOperations /></LayoutWrapper>} />
        <Route path="/UserManagement" element={<LayoutWrapper currentPageName="UserManagement"><UserManagement /></LayoutWrapper>} />
        <Route path="/AdminTraining" element={<LayoutWrapper currentPageName="AdminTraining"><AdminTraining /></LayoutWrapper>} />
        <Route path="/StaffTrainingHub" element={<Navigate to="/AdminTraining" replace />} />
        <Route path="/CarePlanManagement" element={<LayoutWrapper currentPageName="CarePlanManagement"><CarePlanManagement /></LayoutWrapper>} />
        <Route path="/SmartOASISAssessment" element={<LayoutWrapper currentPageName="SmartOASISAssessment"><SmartOASISAssessment /></LayoutWrapper>} />
        <Route path="/SendFax" element={<LayoutWrapper currentPageName="SendFax"><SendFax /></LayoutWrapper>} />
        <Route path="/PhysicianDirectory" element={<LayoutWrapper currentPageName="PhysicianDirectory"><PhysicianDirectory /></LayoutWrapper>} />
        <Route path="/Telehealth" element={<LayoutWrapper currentPageName="Telehealth"><Telehealth /></LayoutWrapper>} />
        <Route path="/ResourceLibrary" element={<LayoutWrapper currentPageName="ResourceLibrary"><ResourceLibrary /></LayoutWrapper>} />
        <Route path="/ComplianceCenter" element={<LayoutWrapper currentPageName="ComplianceCenter"><ComplianceCenter /></LayoutWrapper>} />
        <Route path="/Incidents" element={<LayoutWrapper currentPageName="Incidents"><Incidents /></LayoutWrapper>} />
        <Route path="/ReferralIntake" element={<LayoutWrapper currentPageName="ReferralIntake"><ReferralIntake /></LayoutWrapper>} />
        <Route path="/OfflineMode" element={<LayoutWrapper currentPageName="OfflineMode"><OfflineMode /></LayoutWrapper>} />
        <Route path="/Help" element={<LayoutWrapper currentPageName="Help"><Help /></LayoutWrapper>} />
        <Route path="/ReportsAnalytics" element={<LayoutWrapper currentPageName="ReportsAnalytics"><ReportsAnalytics /></LayoutWrapper>} />
        <Route path="/SecurityCompliance" element={<LayoutWrapper currentPageName="SecurityCompliance"><SecurityCompliance /></LayoutWrapper>} />
        <Route path="/PatientDataManagement" element={<LayoutWrapper currentPageName="PatientDataManagement"><PatientDataManagement /></LayoutWrapper>} />
        <Route path="/UserSettings" element={<LayoutWrapper currentPageName="UserSettings"><UserSettings /></LayoutWrapper>} />
        <Route path="/ClinicalPathwayManager" element={<LayoutWrapper currentPageName="ClinicalPathwayManager"><ClinicalPathwayManager /></LayoutWrapper>} />
        <Route path="/MyLearning" element={<LayoutWrapper currentPageName="MyLearning"><MyLearning /></LayoutWrapper>} />
        <Route path="/LearningCenter" element={<LayoutWrapper currentPageName="LearningCenter"><LearningCenter /></LayoutWrapper>} />
        <Route path="/ClinicalSkillsChecklist" element={<LayoutWrapper currentPageName="ClinicalSkillsChecklist"><ClinicalSkillsChecklist /></LayoutWrapper>} />
        <Route path="/TrainingCoursePlayer" element={<LayoutWrapper currentPageName="TrainingCoursePlayer"><TrainingCoursePlayer /></LayoutWrapper>} />
        <Route path="/EventReport" element={<LayoutWrapper currentPageName="EventReport"><EventReport /></LayoutWrapper>} />
        <Route path="/SmartNoteAssistant" element={<LayoutWrapper currentPageName="SmartNoteAssistant"><SmartNoteAssistant /></LayoutWrapper>} />
        <Route path="/PatientEducationHub" element={<LayoutWrapper currentPageName="PatientEducationHub"><PatientEducationHub /></LayoutWrapper>} />
        <Route path="/VisitScribe" element={<LayoutWrapper currentPageName="VisitScribe"><VisitScribe /></LayoutWrapper>} />
        <Route path="/IncidentReporting" element={<Navigate to="/Incidents" replace />} />
        <Route path="/ClinicalChart" element={<LayoutWrapper currentPageName="ClinicalChart"><ClinicalChart /></LayoutWrapper>} />
        <Route path="/RegulatoryCompliance" element={<LayoutWrapper currentPageName="RegulatoryCompliance"><RegulatoryCompliance /></LayoutWrapper>} />
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