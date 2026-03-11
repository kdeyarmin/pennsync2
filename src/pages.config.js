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
import AITrainingGenerator from './pages/AITrainingGenerator';
import About from './pages/About';
import AdminDashboard from './pages/AdminDashboard';
import AdminTrainingAnalytics from './pages/AdminTrainingAnalytics';
import AdminUserSetup from './pages/AdminUserSetup';
import AgencyAnalytics from './pages/AgencyAnalytics';
import AgencySettings from './pages/AgencySettings';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import AutomaticCarePlans from './pages/AutomaticCarePlans';
import CarePlanBuilder from './pages/CarePlanBuilder';
import CarePlanManagement from './pages/CarePlanManagement';
import ClinicalInsightsDashboard from './pages/ClinicalInsightsDashboard';
import ClinicalLibrary from './pages/ClinicalLibrary';
import ClinicalPathwayManager from './pages/ClinicalPathwayManager';
import ComplianceCenter from './pages/ComplianceCenter';
import ComplianceDashboard from './pages/ComplianceDashboard';
import ComplianceRegulatory from './pages/ComplianceRegulatory';
import CustomizableDashboard from './pages/CustomizableDashboard';
import Dashboard from './pages/Dashboard';
import DischargeSummaries from './pages/DischargeSummaries';
import DocumentHub from './pages/DocumentHub';
import DocumentIngestion from './pages/DocumentIngestion';
import DocumentManagement from './pages/DocumentManagement';
import DocumentSignatures from './pages/DocumentSignatures';
import DocumentVisit from './pages/DocumentVisit';
import DocumentationTraining from './pages/DocumentationTraining';
import DuplicatePatients from './pages/DuplicatePatients';
import EducationLibrary from './pages/EducationLibrary';
import FaxAddressBook from './pages/FaxAddressBook';
import FaxContacts from './pages/FaxContacts';
import FaxDashboard from './pages/FaxDashboard';
import FaxLogsDashboard from './pages/FaxLogsDashboard';
import Features from './pages/Features';
import Help from './pages/Help';
import Home from './pages/Home';
import IncidentReporting from './pages/IncidentReporting';
import JoinTelehealth from './pages/JoinTelehealth';
import LearningCenter from './pages/LearningCenter';
import LearningReports from './pages/LearningReports';
import ManageNewFeatures from './pages/ManageNewFeatures';
import MedicalScribe from './pages/MedicalScribe';
import MedicareComplianceDashboard from './pages/MedicareComplianceDashboard';
import MedicareGuidelinesLibrary from './pages/MedicareGuidelinesLibrary';
import MedicationReconciliation from './pages/MedicationReconciliation';
import Messages from './pages/Messages';
import NotificationSettings from './pages/NotificationSettings';
import NurseEducationVideos from './pages/NurseEducationVideos';
import NursePerformanceDashboard from './pages/NursePerformanceDashboard';
import NurseTraining from './pages/NurseTraining';
import NurseTrainingHub from './pages/NurseTrainingHub';
import OASISAnalyticsDashboard from './pages/OASISAnalyticsDashboard';
import OASISAnalyzer from './pages/OASISAnalyzer';
import OASISAuditDashboard from './pages/OASISAuditDashboard';
import OASISClinicalReview from './pages/OASISClinicalReview';
import OASISComplianceReview from './pages/OASISComplianceReview';
import OASISDocumentationReview from './pages/OASISDocumentationReview';
import OASISRevenueAnalysis from './pages/OASISRevenueAnalysis';
import OASISReview from './pages/OASISReview';
import OfflineDocumentation from './pages/OfflineDocumentation';
import OfflineMode from './pages/OfflineMode';
import OfflineVisitDocumentation from './pages/OfflineVisitDocumentation';
import PDFSearch from './pages/PDFSearch';
import PDFTemplateLibrary from './pages/PDFTemplateLibrary';
import PDFTools from './pages/PDFTools';
import PatientAlerts from './pages/PatientAlerts';
import PatientDataManagement from './pages/PatientDataManagement';
import PatientDetails from './pages/PatientDetails';
import PatientEducation from './pages/PatientEducation';
import PatientEducationHub from './pages/PatientEducationHub';
import PatientEducationPortal from './pages/PatientEducationPortal';
import PatientRecordDashboard from './pages/PatientRecordDashboard';
import Patients from './pages/Patients';
import PhysicianDirectory from './pages/PhysicianDirectory';
import PopulationHealthAnalytics from './pages/PopulationHealthAnalytics';
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import RealTimeComplianceDashboard from './pages/RealTimeComplianceDashboard';
import ReferralAdmissionNote from './pages/ReferralAdmissionNote';
import ReferralIntake from './pages/ReferralIntake';
import ReferralProcessor from './pages/ReferralProcessor';
import ReferralTriage from './pages/ReferralTriage';
import RegulatoryCompliance from './pages/RegulatoryCompliance';
import Reports from './pages/Reports';
import SecurityCompliance from './pages/SecurityCompliance';
import SecurityPolicy from './pages/SecurityPolicy';
import SendFax from './pages/SendFax';
import SignDocument from './pages/SignDocument';
import SmartNoteAssistant from './pages/SmartNoteAssistant';
import SmartOASISAssessment from './pages/SmartOASISAssessment';
import StaffTrainingHub from './pages/StaffTrainingHub';
import Support from './pages/Support';
import SystemJobMonitor from './pages/SystemJobMonitor';
import SystemMonitoring from './pages/SystemMonitoring';
import Telehealth from './pages/Telehealth';
import TemplateLibrary from './pages/TemplateLibrary';
import TrainingManagement from './pages/TrainingManagement';
import UserActivityLog from './pages/UserActivityLog';
import UserActivityReport from './pages/UserActivityReport';
import UserGuides from './pages/UserGuides';
import UserManagement from './pages/UserManagement';
import UserSettings from './pages/UserSettings';
import VisitScribe from './pages/VisitScribe';
import MyTraining from './pages/MyTraining';
import TrainingCoursePlayer from './pages/TrainingCoursePlayer';
import AIComplianceInServices from './pages/AIComplianceInServices';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITrainingGenerator": AITrainingGenerator,
    "About": About,
    "AdminDashboard": AdminDashboard,
    "AdminTrainingAnalytics": AdminTrainingAnalytics,
    "AdminUserSetup": AdminUserSetup,
    "AgencyAnalytics": AgencyAnalytics,
    "AgencySettings": AgencySettings,
    "AnalyticsDashboard": AnalyticsDashboard,
    "AutomaticCarePlans": AutomaticCarePlans,
    "CarePlanBuilder": CarePlanBuilder,
    "CarePlanManagement": CarePlanManagement,
    "ClinicalInsightsDashboard": ClinicalInsightsDashboard,
    "ClinicalLibrary": ClinicalLibrary,
    "ClinicalPathwayManager": ClinicalPathwayManager,
    "ComplianceCenter": ComplianceCenter,
    "ComplianceDashboard": ComplianceDashboard,
    "ComplianceRegulatory": ComplianceRegulatory,
    "CustomizableDashboard": CustomizableDashboard,
    "Dashboard": Dashboard,
    "DischargeSummaries": DischargeSummaries,
    "DocumentHub": DocumentHub,
    "DocumentIngestion": DocumentIngestion,
    "DocumentManagement": DocumentManagement,
    "DocumentSignatures": DocumentSignatures,
    "DocumentVisit": DocumentVisit,
    "DocumentationTraining": DocumentationTraining,
    "DuplicatePatients": DuplicatePatients,
    "EducationLibrary": EducationLibrary,
    "FaxAddressBook": FaxAddressBook,
    "FaxContacts": FaxContacts,
    "FaxDashboard": FaxDashboard,
    "FaxLogsDashboard": FaxLogsDashboard,
    "Features": Features,
    "Help": Help,
    "Home": Home,
    "IncidentReporting": IncidentReporting,
    "JoinTelehealth": JoinTelehealth,
    "LearningCenter": LearningCenter,
    "LearningReports": LearningReports,
    "ManageNewFeatures": ManageNewFeatures,
    "MedicalScribe": MedicalScribe,
    "MedicareComplianceDashboard": MedicareComplianceDashboard,
    "MedicareGuidelinesLibrary": MedicareGuidelinesLibrary,
    "MedicationReconciliation": MedicationReconciliation,
    "Messages": Messages,
    "NotificationSettings": NotificationSettings,
    "NurseEducationVideos": NurseEducationVideos,
    "NursePerformanceDashboard": NursePerformanceDashboard,
    "NurseTraining": NurseTraining,
    "NurseTrainingHub": NurseTrainingHub,
    "OASISAnalyticsDashboard": OASISAnalyticsDashboard,
    "OASISAnalyzer": OASISAnalyzer,
    "OASISAuditDashboard": OASISAuditDashboard,
    "OASISClinicalReview": OASISClinicalReview,
    "OASISComplianceReview": OASISComplianceReview,
    "OASISDocumentationReview": OASISDocumentationReview,
    "OASISRevenueAnalysis": OASISRevenueAnalysis,
    "OASISReview": OASISReview,
    "OfflineDocumentation": OfflineDocumentation,
    "OfflineMode": OfflineMode,
    "OfflineVisitDocumentation": OfflineVisitDocumentation,
    "PDFSearch": PDFSearch,
    "PDFTemplateLibrary": PDFTemplateLibrary,
    "PDFTools": PDFTools,
    "PatientAlerts": PatientAlerts,
    "PatientDataManagement": PatientDataManagement,
    "PatientDetails": PatientDetails,
    "PatientEducation": PatientEducation,
    "PatientEducationHub": PatientEducationHub,
    "PatientEducationPortal": PatientEducationPortal,
    "PatientRecordDashboard": PatientRecordDashboard,
    "Patients": Patients,
    "PhysicianDirectory": PhysicianDirectory,
    "PopulationHealthAnalytics": PopulationHealthAnalytics,
    "PredictiveAnalytics": PredictiveAnalytics,
    "RealTimeComplianceDashboard": RealTimeComplianceDashboard,
    "ReferralAdmissionNote": ReferralAdmissionNote,
    "ReferralIntake": ReferralIntake,
    "ReferralProcessor": ReferralProcessor,
    "ReferralTriage": ReferralTriage,
    "RegulatoryCompliance": RegulatoryCompliance,
    "Reports": Reports,
    "SecurityCompliance": SecurityCompliance,
    "SecurityPolicy": SecurityPolicy,
    "SendFax": SendFax,
    "SignDocument": SignDocument,
    "SmartNoteAssistant": SmartNoteAssistant,
    "SmartOASISAssessment": SmartOASISAssessment,
    "StaffTrainingHub": StaffTrainingHub,
    "Support": Support,
    "SystemJobMonitor": SystemJobMonitor,
    "SystemMonitoring": SystemMonitoring,
    "Telehealth": Telehealth,
    "TemplateLibrary": TemplateLibrary,
    "TrainingManagement": TrainingManagement,
    "UserActivityLog": UserActivityLog,
    "UserActivityReport": UserActivityReport,
    "UserGuides": UserGuides,
    "UserManagement": UserManagement,
    "UserSettings": UserSettings,
    "VisitScribe": VisitScribe,
    "MyTraining": MyTraining,
    "TrainingCoursePlayer": TrainingCoursePlayer,
    "AIComplianceInServices": AIComplianceInServices,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};