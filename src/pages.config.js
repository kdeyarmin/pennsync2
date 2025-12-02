import Dashboard from './pages/Dashboard';
import DocumentVisit from './pages/DocumentVisit';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import ProductivityDashboard from './pages/ProductivityDashboard';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import Features from './pages/Features';
import CarePlanManagement from './pages/CarePlanManagement';
import AutomaticCarePlans from './pages/AutomaticCarePlans';
import ComplianceCenter from './pages/ComplianceCenter';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import QualityDashboard from './pages/QualityDashboard';
import SmartNoteAssistant from './pages/SmartNoteAssistant';
import SecurityPolicy from './pages/SecurityPolicy';
import PatientTriage from './pages/PatientTriage';
import TemplateLibrary from './pages/TemplateLibrary';
import ComplianceDashboard from './pages/ComplianceDashboard';
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import StaffTraining from './pages/StaffTraining';
import PatientEducation from './pages/PatientEducation';
import ScheduleOptimizer from './pages/ScheduleOptimizer';
import NurseTraining from './pages/NurseTraining';
import PatientAlerts from './pages/PatientAlerts';
import RegulatoryCompliance from './pages/RegulatoryCompliance';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "DocumentVisit": DocumentVisit,
    "Patients": Patients,
    "PatientDetails": PatientDetails,
    "ProductivityDashboard": ProductivityDashboard,
    "Admin": Admin,
    "AdminDashboard": AdminDashboard,
    "Features": Features,
    "CarePlanManagement": CarePlanManagement,
    "AutomaticCarePlans": AutomaticCarePlans,
    "ComplianceCenter": ComplianceCenter,
    "AnalyticsDashboard": AnalyticsDashboard,
    "QualityDashboard": QualityDashboard,
    "SmartNoteAssistant": SmartNoteAssistant,
    "SecurityPolicy": SecurityPolicy,
    "PatientTriage": PatientTriage,
    "TemplateLibrary": TemplateLibrary,
    "ComplianceDashboard": ComplianceDashboard,
    "PredictiveAnalytics": PredictiveAnalytics,
    "StaffTraining": StaffTraining,
    "PatientEducation": PatientEducation,
    "ScheduleOptimizer": ScheduleOptimizer,
    "NurseTraining": NurseTraining,
    "PatientAlerts": PatientAlerts,
    "RegulatoryCompliance": RegulatoryCompliance,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};