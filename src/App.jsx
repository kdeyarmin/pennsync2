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
import Layout from './layout.jsx';

// Page imports
import Dashboard from '@/pages/Dashboard';
import Patients from '@/pages/Patients';
import PatientDetails from '@/pages/PatientDetails';
import SmartNoteAssistant from '@/pages/SmartNoteAssistant';
import DocumentHub from '@/pages/DocumentHub';
import Messages from '@/pages/Messages';
import AdminDashboard from '@/pages/AdminDashboard';
import UserManagement from '@/pages/UserManagement';
import TrainingManagement from '@/pages/TrainingManagement';
import StaffTrainingHub from '@/pages/StaffTrainingHub';
import CarePlanManagement from '@/pages/CarePlanManagement';
import SmartOASISAssessment from '@/pages/SmartOASISAssessment';
import SendFax from '@/pages/SendFax';
import PhysicianDirectory from '@/pages/PhysicianDirectory';
import Telehealth from '@/pages/Telehealth';
import ClinicalLibrary from '@/pages/ClinicalLibrary';
import PatientEducationHub from '@/pages/PatientEducationHub';
import MedicareGuidelinesLibrary from '@/pages/MedicareGuidelinesLibrary';
import MedicareComplianceDashboard from '@/pages/MedicareComplianceDashboard';
import IncidentReporting from '@/pages/IncidentReporting';
import VisitScribe from '@/pages/VisitScribe';
import ReferralIntake from '@/pages/ReferralIntake';
import CarePlanBuilder from '@/pages/CarePlanBuilder';
import OfflineMode from '@/pages/OfflineMode';
import Help from '@/pages/Help';
import Reports from '@/pages/Reports';
import PopulationHealthAnalytics from '@/pages/PopulationHealthAnalytics';
import ComplianceRegulatory from '@/pages/ComplianceRegulatory';
import SecurityCompliance from '@/pages/SecurityCompliance';
import PatientDataManagement from '@/pages/PatientDataManagement';
import UserSettings from '@/pages/UserSettings';
import ClinicalPathwayManager from '@/pages/ClinicalPathwayManager';
import PersonnelFile from '@/pages/PersonnelFile';
import MyTraining from '@/pages/MyTraining';
import AIComplianceInServices from '@/pages/AIComplianceInServices';
import MyAnnualEducation from '@/pages/MyAnnualEducation';
import AnnualMandatoryEducation from '@/pages/AnnualMandatoryEducation';
import EmployeeTranscript from '@/pages/EmployeeTranscript';
import AnnualEducationTranscript from '@/pages/AnnualEducationTranscript';
import ManagerSkillGapDashboard from '@/pages/ManagerSkillGapDashboard';
import ClinicalSkillsChecklist from '@/pages/ClinicalSkillsChecklist';
import TrainingCoursePlayer from '@/pages/TrainingCoursePlayer';

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
      <Route path="/SmartNoteAssistant" element={<LayoutWrapper currentPageName="SmartNoteAssistant"><SmartNoteAssistant /></LayoutWrapper>} />
      <Route path="/DocumentHub" element={<LayoutWrapper currentPageName="DocumentHub"><DocumentHub /></LayoutWrapper>} />
      <Route path="/Messages" element={<LayoutWrapper currentPageName="Messages"><Messages /></LayoutWrapper>} />
      <Route path="/AdminDashboard" element={<LayoutWrapper currentPageName="AdminDashboard"><AdminDashboard /></LayoutWrapper>} />
      <Route path="/UserManagement" element={<LayoutWrapper currentPageName="UserManagement"><UserManagement /></LayoutWrapper>} />
      <Route path="/TrainingManagement" element={<LayoutWrapper currentPageName="TrainingManagement"><TrainingManagement /></LayoutWrapper>} />
      <Route path="/StaffTrainingHub" element={<LayoutWrapper currentPageName="StaffTrainingHub"><StaffTrainingHub /></LayoutWrapper>} />
      <Route path="/CarePlanManagement" element={<LayoutWrapper currentPageName="CarePlanManagement"><CarePlanManagement /></LayoutWrapper>} />
      <Route path="/SmartOASISAssessment" element={<LayoutWrapper currentPageName="SmartOASISAssessment"><SmartOASISAssessment /></LayoutWrapper>} />
      <Route path="/SendFax" element={<LayoutWrapper currentPageName="SendFax"><SendFax /></LayoutWrapper>} />
      <Route path="/PhysicianDirectory" element={<LayoutWrapper currentPageName="PhysicianDirectory"><PhysicianDirectory /></LayoutWrapper>} />
      <Route path="/Telehealth" element={<LayoutWrapper currentPageName="Telehealth"><Telehealth /></LayoutWrapper>} />
      <Route path="/ClinicalLibrary" element={<LayoutWrapper currentPageName="ClinicalLibrary"><ClinicalLibrary /></LayoutWrapper>} />
      <Route path="/PatientEducationHub" element={<LayoutWrapper currentPageName="PatientEducationHub"><PatientEducationHub /></LayoutWrapper>} />
      <Route path="/MedicareGuidelinesLibrary" element={<LayoutWrapper currentPageName="MedicareGuidelinesLibrary"><MedicareGuidelinesLibrary /></LayoutWrapper>} />
      <Route path="/MedicareComplianceDashboard" element={<LayoutWrapper currentPageName="MedicareComplianceDashboard"><MedicareComplianceDashboard /></LayoutWrapper>} />
      <Route path="/IncidentReporting" element={<LayoutWrapper currentPageName="IncidentReporting"><IncidentReporting /></LayoutWrapper>} />
      <Route path="/VisitScribe" element={<LayoutWrapper currentPageName="VisitScribe"><VisitScribe /></LayoutWrapper>} />
      <Route path="/ReferralIntake" element={<LayoutWrapper currentPageName="ReferralIntake"><ReferralIntake /></LayoutWrapper>} />
      <Route path="/CarePlanBuilder" element={<LayoutWrapper currentPageName="CarePlanBuilder"><CarePlanBuilder /></LayoutWrapper>} />
      <Route path="/OfflineMode" element={<LayoutWrapper currentPageName="OfflineMode"><OfflineMode /></LayoutWrapper>} />
      <Route path="/Help" element={<LayoutWrapper currentPageName="Help"><Help /></LayoutWrapper>} />
      <Route path="/Reports" element={<LayoutWrapper currentPageName="Reports"><Reports /></LayoutWrapper>} />
      <Route path="/PopulationHealthAnalytics" element={<LayoutWrapper currentPageName="PopulationHealthAnalytics"><PopulationHealthAnalytics /></LayoutWrapper>} />
      <Route path="/ComplianceRegulatory" element={<LayoutWrapper currentPageName="ComplianceRegulatory"><ComplianceRegulatory /></LayoutWrapper>} />
      <Route path="/SecurityCompliance" element={<LayoutWrapper currentPageName="SecurityCompliance"><SecurityCompliance /></LayoutWrapper>} />
      <Route path="/PatientDataManagement" element={<LayoutWrapper currentPageName="PatientDataManagement"><PatientDataManagement /></LayoutWrapper>} />
      <Route path="/UserSettings" element={<LayoutWrapper currentPageName="UserSettings"><UserSettings /></LayoutWrapper>} />
      <Route path="/ClinicalPathwayManager" element={<LayoutWrapper currentPageName="ClinicalPathwayManager"><ClinicalPathwayManager /></LayoutWrapper>} />
      <Route path="/PersonnelFile" element={<LayoutWrapper currentPageName="PersonnelFile"><PersonnelFile /></LayoutWrapper>} />
      <Route path="/MyTraining" element={<LayoutWrapper currentPageName="MyTraining"><MyTraining /></LayoutWrapper>} />
      <Route path="/AIComplianceInServices" element={<LayoutWrapper currentPageName="AIComplianceInServices"><AIComplianceInServices /></LayoutWrapper>} />
      <Route path="/MyAnnualEducation" element={<LayoutWrapper currentPageName="MyAnnualEducation"><MyAnnualEducation /></LayoutWrapper>} />
      <Route path="/AnnualMandatoryEducation" element={<LayoutWrapper currentPageName="AnnualMandatoryEducation"><AnnualMandatoryEducation /></LayoutWrapper>} />
      <Route path="/EmployeeTranscript" element={<LayoutWrapper currentPageName="EmployeeTranscript"><EmployeeTranscript /></LayoutWrapper>} />
      <Route path="/AnnualEducationTranscript" element={<LayoutWrapper currentPageName="AnnualEducationTranscript"><AnnualEducationTranscript /></LayoutWrapper>} />
      <Route path="/ManagerSkillGapDashboard" element={<LayoutWrapper currentPageName="ManagerSkillGapDashboard"><ManagerSkillGapDashboard /></LayoutWrapper>} />
      <Route path="/ClinicalSkillsChecklist" element={<LayoutWrapper currentPageName="ClinicalSkillsChecklist"><ClinicalSkillsChecklist /></LayoutWrapper>} />
      <Route path="/TrainingCoursePlayer" element={<LayoutWrapper currentPageName="TrainingCoursePlayer"><TrainingCoursePlayer /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
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
  )
}

export default App