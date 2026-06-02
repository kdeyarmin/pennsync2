import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import OfflineManager from '@/components/offline/OfflineManager'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import SignerPortal from '@/pages/SignerPortal';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import React, { Suspense, lazy } from 'react';

// Page imports
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Patients = lazy(() => import('@/pages/Patients'));
const PatientDetails = lazy(() => import('@/pages/PatientDetails'));
const ClinicalDocumentation = lazy(() => import('@/pages/ClinicalDocumentation'));
const DocumentHub = lazy(() => import('@/pages/DocumentHub'));
const Messages = lazy(() => import('@/pages/Messages'));
const PhoneCenter = lazy(() => import('@/pages/PhoneCenter'));
const AdminOperations = lazy(() => import('@/pages/AdminOperations'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const AdminTraining = lazy(() => import('@/pages/AdminTraining'));
const StaffTrainingHub = lazy(() => import('@/pages/StaffTrainingHub'));
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
const IncidentReporting = lazy(() => import('@/pages/IncidentReporting'));
const ClinicalChart = lazy(() => import('@/pages/ClinicalChart'));
const LearningCenter = lazy(() => import('@/pages/LearningCenter'));
const RegulatoryCompliance = lazy(() => import('@/pages/RegulatoryCompliance'));
const TemplateManagement = lazy(() => import('@/pages/TemplateManagement'));
const DocumentAuditLogs = lazy(() => import('@/pages/DocumentAuditLogs'));
const BulkSignatureRequests = lazy(() => import('@/pages/BulkSignatureRequests'));
const FaxAnalytics = lazy(() => import('@/pages/FaxAnalytics'));
const CreateSignatureRequest = lazy(() => import('@/pages/CreateSignatureRequest'));

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

  // Public routes (e.g. external document signers, who have no account) must
  // render WITHOUT the authentication gate below.
  const isPublicRoute = window.location.pathname.startsWith('/signer');

  // Gate the whole app on authentication (public routes excepted). The no-token
  // path does NOT set an authError, so without this an unauthenticated user
  // would render every route and fire PHI queries. Never rely on authError alone.
  if (!isPublicRoute && !isAuthenticated) {
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
        {/* Public Signer Portal - No auth required */}
        <Route path="/signer" element={<SignerPortal />} />

        {/* Authenticated Routes */}
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/Dashboard" element={<LayoutWrapper currentPageName="Dashboard"><Dashboard /></LayoutWrapper>} />
        <Route path="/Patients" element={<LayoutWrapper currentPageName="Patients"><Patients /></LayoutWrapper>} />
        <Route path="/PatientDetails" element={<LayoutWrapper currentPageName="PatientDetails"><PatientDetails /></LayoutWrapper>} />
        <Route path="/ClinicalDocumentation" element={<LayoutWrapper currentPageName="ClinicalDocumentation"><ClinicalDocumentation /></LayoutWrapper>} />
        <Route path="/DocumentHub" element={<LayoutWrapper currentPageName="DocumentHub"><DocumentHub /></LayoutWrapper>} />
        <Route path="/Messages" element={<LayoutWrapper currentPageName="Messages"><Messages /></LayoutWrapper>} />
        <Route path="/PhoneCenter" element={<LayoutWrapper currentPageName="PhoneCenter"><PhoneCenter /></LayoutWrapper>} />
        <Route path="/AdminOperations" element={<LayoutWrapper currentPageName="AdminOperations"><AdminOperations /></LayoutWrapper>} />
        <Route path="/UserManagement" element={<LayoutWrapper currentPageName="UserManagement"><UserManagement /></LayoutWrapper>} />
        <Route path="/AdminTraining" element={<LayoutWrapper currentPageName="AdminTraining"><AdminTraining /></LayoutWrapper>} />
        <Route path="/StaffTrainingHub" element={<LayoutWrapper currentPageName="StaffTrainingHub"><StaffTrainingHub /></LayoutWrapper>} />
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
        <Route path="/ClinicalSkillsChecklist" element={<LayoutWrapper currentPageName="ClinicalSkillsChecklist"><ClinicalSkillsChecklist /></LayoutWrapper>} />
        <Route path="/MyLearning" element={<LayoutWrapper currentPageName="MyLearning"><MyLearning /></LayoutWrapper>} />
        <Route path="/LearningCenter" element={<LayoutWrapper currentPageName="LearningCenter"><LearningCenter /></LayoutWrapper>} />
        <Route path="/TrainingCoursePlayer" element={<LayoutWrapper currentPageName="TrainingCoursePlayer"><TrainingCoursePlayer /></LayoutWrapper>} />
        <Route path="/EventReport" element={<LayoutWrapper currentPageName="EventReport"><EventReport /></LayoutWrapper>} />
        <Route path="/SmartNoteAssistant" element={<LayoutWrapper currentPageName="SmartNoteAssistant"><SmartNoteAssistant /></LayoutWrapper>} />
        <Route path="/PatientEducationHub" element={<LayoutWrapper currentPageName="PatientEducationHub"><PatientEducationHub /></LayoutWrapper>} />
        <Route path="/VisitScribe" element={<LayoutWrapper currentPageName="VisitScribe"><VisitScribe /></LayoutWrapper>} />
        <Route path="/IncidentReporting" element={<LayoutWrapper currentPageName="IncidentReporting"><IncidentReporting /></LayoutWrapper>} />
        <Route path="/ClinicalChart" element={<LayoutWrapper currentPageName="ClinicalChart"><ClinicalChart /></LayoutWrapper>} />
        <Route path="/RegulatoryCompliance" element={<LayoutWrapper currentPageName="RegulatoryCompliance"><RegulatoryCompliance /></LayoutWrapper>} />
        <Route path="/TemplateManagement" element={<LayoutWrapper currentPageName="TemplateManagement"><TemplateManagement /></LayoutWrapper>} />
        <Route path="/DocumentAuditLogs" element={<LayoutWrapper currentPageName="DocumentAuditLogs"><DocumentAuditLogs /></LayoutWrapper>} />
        <Route path="/BulkSignatureRequests" element={<LayoutWrapper currentPageName="BulkSignatureRequests"><BulkSignatureRequests /></LayoutWrapper>} />
        <Route path="/FaxAnalytics" element={<LayoutWrapper currentPageName="FaxAnalytics"><FaxAnalytics /></LayoutWrapper>} />
        <Route path="/CreateSignatureRequest" element={<LayoutWrapper currentPageName="CreateSignatureRequest"><CreateSignatureRequest /></LayoutWrapper>} />
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
          <OfflineManager />
          <VisualEditAgent />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
