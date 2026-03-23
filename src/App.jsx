import './App.css'
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
import LearningCenter from '@/pages/LearningCenter';

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
      <Route path="/MyLearning" element={<LayoutWrapper currentPageName="MyLearning"><MyLearning /></LayoutWrapper>} />
      <Route path="/LearningCenter" element={<LayoutWrapper currentPageName="LearningCenter"><LearningCenter /></LayoutWrapper>} />
      <Route path="/ClinicalSkillsChecklist" element={<LayoutWrapper currentPageName="ClinicalSkillsChecklist"><ClinicalSkillsChecklist /></LayoutWrapper>} />
      <Route path="/TrainingCoursePlayer" element={<LayoutWrapper currentPageName="TrainingCoursePlayer"><TrainingCoursePlayer /></LayoutWrapper>} />
      <Route path="/EventReport" element={<LayoutWrapper currentPageName="EventReport"><EventReport /></LayoutWrapper>} />
      <Route path="/SmartNoteAssistant" element={<LayoutWrapper currentPageName="SmartNoteAssistant"><SmartNoteAssistant /></LayoutWrapper>} />
      <Route path="/PatientEducationHub" element={<LayoutWrapper currentPageName="PatientEducationHub"><PatientEducationHub /></LayoutWrapper>} />
      <Route path="/VisitScribe" element={<LayoutWrapper currentPageName="VisitScribe"><VisitScribe /></LayoutWrapper>} />
      <Route path="/IncidentReporting" element={<LayoutWrapper currentPageName="IncidentReporting"><IncidentReporting /></LayoutWrapper>} />
      <Route path="/ClinicalChart" element={<LayoutWrapper currentPageName="ClinicalChart"><ClinicalChart /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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