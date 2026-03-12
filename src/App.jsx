import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PersonnelFile from './pages/PersonnelFile.jsx';
import MyTraining from './pages/MyTraining.jsx';
import AIComplianceInServices from './pages/AIComplianceInServices.jsx';
import MyAnnualEducation from './pages/MyAnnualEducation.jsx';
import AnnualMandatoryEducation from './pages/AnnualMandatoryEducation.jsx';
import EmployeeTranscript from './pages/EmployeeTranscript.jsx';
import AnnualEducationTranscript from './pages/AnnualEducationTranscript.jsx';
import ManagerSkillGapDashboard from './pages/ManagerSkillGapDashboard.jsx';
import ClinicalSkillsChecklist from './pages/ClinicalSkillsChecklist.jsx';
import TrainingCoursePlayer from './pages/TrainingCoursePlayer.jsx';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

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
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
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