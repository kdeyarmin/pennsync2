/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminOperations from './pages/AdminOperations';
import AdminTraining from './pages/AdminTraining';
import CarePlanManagement from './pages/CarePlanManagement';
import ClinicalChart from './pages/ClinicalChart';
import ClinicalDocumentation from './pages/ClinicalDocumentation';
import ClinicalPathwayManager from './pages/ClinicalPathwayManager';
import ClinicalSkillsChecklist from './pages/ClinicalSkillsChecklist';
import ComplianceCenter from './pages/ComplianceCenter';
import Dashboard from './pages/Dashboard';
import DocumentHub from './pages/DocumentHub';
import EventReport from './pages/EventReport';
import Help from './pages/Help';
import Incidents from './pages/Incidents';
import LearningCenter from './pages/LearningCenter';
import Messages from './pages/Messages';
import MyLearning from './pages/MyLearning';
import OfflineMode from './pages/OfflineMode';
import PatientDataManagement from './pages/PatientDataManagement';
import PatientDetails from './pages/PatientDetails';
import PatientEducationHub from './pages/PatientEducationHub';
import Patients from './pages/Patients';
import PhysicianDirectory from './pages/PhysicianDirectory';
import ReferralIntake from './pages/ReferralIntake';
import RegulatoryCompliance from './pages/RegulatoryCompliance';
import ReportsAnalytics from './pages/ReportsAnalytics';
import ResourceLibrary from './pages/ResourceLibrary';
import SecurityCompliance from './pages/SecurityCompliance';
import SendFax from './pages/SendFax';
import SmartNoteAssistant from './pages/SmartNoteAssistant';
import SmartOASISAssessment from './pages/SmartOASISAssessment';
import Telehealth from './pages/Telehealth';
import TrainingCoursePlayer from './pages/TrainingCoursePlayer';
import UserManagement from './pages/UserManagement';
import UserSettings from './pages/UserSettings';
import VisitScribe from './pages/VisitScribe';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminOperations": AdminOperations,
    "AdminTraining": AdminTraining,
    "CarePlanManagement": CarePlanManagement,
    "ClinicalChart": ClinicalChart,
    "ClinicalDocumentation": ClinicalDocumentation,
    "ClinicalPathwayManager": ClinicalPathwayManager,
    "ClinicalSkillsChecklist": ClinicalSkillsChecklist,
    "ComplianceCenter": ComplianceCenter,
    "Dashboard": Dashboard,
    "DocumentHub": DocumentHub,
    "EventReport": EventReport,
    "Help": Help,
    "Incidents": Incidents,
    "LearningCenter": LearningCenter,
    "Messages": Messages,
    "MyLearning": MyLearning,
    "OfflineMode": OfflineMode,
    "PatientDataManagement": PatientDataManagement,
    "PatientDetails": PatientDetails,
    "PatientEducationHub": PatientEducationHub,
    "Patients": Patients,
    "PhysicianDirectory": PhysicianDirectory,
    "ReferralIntake": ReferralIntake,
    "RegulatoryCompliance": RegulatoryCompliance,
    "ReportsAnalytics": ReportsAnalytics,
    "ResourceLibrary": ResourceLibrary,
    "SecurityCompliance": SecurityCompliance,
    "SendFax": SendFax,
    "SmartNoteAssistant": SmartNoteAssistant,
    "SmartOASISAssessment": SmartOASISAssessment,
    "Telehealth": Telehealth,
    "TrainingCoursePlayer": TrainingCoursePlayer,
    "UserManagement": UserManagement,
    "UserSettings": UserSettings,
    "VisitScribe": VisitScribe,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};