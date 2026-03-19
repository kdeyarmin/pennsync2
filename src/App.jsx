import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import SignerPortal from '@/pages/SignerPortal';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/utils/ErrorBoundary';

// Page imports
import Dashboard from '@/pages/Dashboard';
import Patients from '@/pages/Patients';
import PatientDetails from '@/pages/PatientDetails';
import ClinicalDocumentation from '@/pages/ClinicalDocumentation';
import DocumentHub from '@/pages/DocumentHub';
import Messages from '@/pages/Messages';
import AdminOperations from '@/pages/AdminOperations';
import UserManagement from '@/pages/UserManagement';
import AdminTraining from '@/pages/AdminTraining';
import StaffTrainingHub from '@/pages/StaffTrainingHub';
import CarePlanManagement from '@/pages/CarePlanManagement';
import SmartOASISAssessment from '@/pages/SmartOASISAssessment';
import SendFax from '@/pages/SendFax';
import PhysicianDirectory from '@/pages/PhysicianDirectory';
import Telehealth from '@/pages/Telehealth';
import ResourceLibrary from '@/pages/ResourceLibrary';
import ComplianceCenter from '@/pages/ComplianceCenter';
import Incidents from '@/pages/Incidents';
import MyLearning from '@/pages/MyLearning';
import ReferralIntake from '@/pages/ReferralIntake';
import OfflineMode from '@/pages/OfflineMode';
import Help from '@/pages/Help';
import ReportsAnalytics from '@/pages/ReportsAnalytics';
import SecurityCompliance from '@/pages/SecurityCompliance';
import PatientDataManagement from '@/pages/PatientDataManagement';
import UserSettings from '@/pages/UserSettings';
import ClinicalPathwayManager from '@/pages/ClinicalPathwayManager';
import ClinicalSkillsChecklist from '@/pages/ClinicalSkillsChecklist';
import TrainingCoursePlayer from '@/pages/TrainingCoursePlayer';
import EventReport from '@/pages/EventReport';
import SmartNoteAssistant from '@/pages/SmartNoteAssistant';
import PatientEducationHub from '@/pages/PatientEducationHub';
import VisitScribe from '@/pages/VisitScribe';
import IncidentReporting from '@/pages/IncidentReporting';
import ClinicalChart from '@/pages/ClinicalChart';

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
    <Routes>
      {/* Public Signer Portal - No auth required */}
      <Route path="/signer" element={<SignerPortal />} />
      
      {/* Authenticated Routes */}
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
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