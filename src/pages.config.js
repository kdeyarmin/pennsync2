import Dashboard from './pages/Dashboard';
import DocumentVisit from './pages/DocumentVisit';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import Features from './pages/Features';
import CarePlanManagement from './pages/CarePlanManagement';
import AutomaticCarePlans from './pages/AutomaticCarePlans';
import ComplianceCenter from './pages/ComplianceCenter';
import SecurityPolicy from './pages/SecurityPolicy';
import TemplateLibrary from './pages/TemplateLibrary';
import ComplianceDashboard from './pages/ComplianceDashboard';
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import StaffTraining from './pages/StaffTraining';
import PatientEducation from './pages/PatientEducation';
import NurseTraining from './pages/NurseTraining';
import PatientAlerts from './pages/PatientAlerts';
import RegulatoryCompliance from './pages/RegulatoryCompliance';
import SmartNoteAssistant from './pages/SmartNoteAssistant';
import NursePerformanceDashboard from './pages/NursePerformanceDashboard';
import ImportPatients from './pages/ImportPatients';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "DocumentVisit": DocumentVisit,
    "Patients": Patients,
    "PatientDetails": PatientDetails,
    "Admin": Admin,
    "AdminDashboard": AdminDashboard,
    "Features": Features,
    "CarePlanManagement": CarePlanManagement,
    "AutomaticCarePlans": AutomaticCarePlans,
    "ComplianceCenter": ComplianceCenter,
    "SecurityPolicy": SecurityPolicy,
    "TemplateLibrary": TemplateLibrary,
    "ComplianceDashboard": ComplianceDashboard,
    "PredictiveAnalytics": PredictiveAnalytics,
    "StaffTraining": StaffTraining,
    "PatientEducation": PatientEducation,
    "NurseTraining": NurseTraining,
    "PatientAlerts": PatientAlerts,
    "RegulatoryCompliance": RegulatoryCompliance,
    "SmartNoteAssistant": SmartNoteAssistant,
    "NursePerformanceDashboard": NursePerformanceDashboard,
    "ImportPatients": ImportPatients,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};