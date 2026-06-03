import { lazy } from 'react';

// Single source of truth for the app's authenticated routes.
//
// App.jsx renders these and NavigationTracker reads PAGE_NAMES for analytics,
// so the route table and the analytics page-name list can never drift apart.
//
// IMPORTANT (bundle size): NavigationTracker is always mounted. Importing the
// auto-generated `pages.config.js` there used to pull EVERY page component into
// the main bundle, which defeated the route-level code splitting below and
// produced a ~7.8 MB initial chunk. This module only ships lazy() references
// (which do not import a page module until it is actually rendered) plus the
// eager landing page, so the always-loaded code stays small.

// Dashboard is the landing page, so it is eager (no extra round-trip on first
// paint). Every other page is lazy and ships as its own chunk.
import Dashboard from '@/pages/Dashboard';

const lazyPage = (factory) => lazy(factory);

/**
 * Authenticated routes. `name` is both the path segment (routes are PascalCase,
 * e.g. /Dashboard) and the analytics page name. Keep names in PascalCase so the
 * case-insensitive matching in NavigationTracker and createPageUrl stays valid.
 */
export const ROUTES = [
  { name: 'Dashboard', Component: Dashboard },
  { name: 'Patients', Component: lazyPage(() => import('@/pages/Patients')) },
  { name: 'PatientDetails', Component: lazyPage(() => import('@/pages/PatientDetails')) },
  { name: 'ClinicalDocumentation', Component: lazyPage(() => import('@/pages/ClinicalDocumentation')) },
  { name: 'DocumentHub', Component: lazyPage(() => import('@/pages/DocumentHub')) },
  { name: 'Messages', Component: lazyPage(() => import('@/pages/Messages')) },
  { name: 'PhoneCenter', Component: lazyPage(() => import('@/pages/PhoneCenter')) },
  { name: 'AdminOperations', Component: lazyPage(() => import('@/pages/AdminOperations')) },
  { name: 'UserManagement', Component: lazyPage(() => import('@/pages/UserManagement')) },
  { name: 'AdminTraining', Component: lazyPage(() => import('@/pages/AdminTraining')) },
  { name: 'CarePlanManagement', Component: lazyPage(() => import('@/pages/CarePlanManagement')) },
  { name: 'SmartOASISAssessment', Component: lazyPage(() => import('@/pages/SmartOASISAssessment')) },
  { name: 'SendFax', Component: lazyPage(() => import('@/pages/SendFax')) },
  { name: 'PhysicianDirectory', Component: lazyPage(() => import('@/pages/PhysicianDirectory')) },
  { name: 'Telehealth', Component: lazyPage(() => import('@/pages/Telehealth')) },
  { name: 'ResourceLibrary', Component: lazyPage(() => import('@/pages/ResourceLibrary')) },
  { name: 'ComplianceCenter', Component: lazyPage(() => import('@/pages/ComplianceCenter')) },
  { name: 'Incidents', Component: lazyPage(() => import('@/pages/Incidents')) },
  { name: 'ReferralIntake', Component: lazyPage(() => import('@/pages/ReferralIntake')) },
  { name: 'OfflineMode', Component: lazyPage(() => import('@/pages/OfflineMode')) },
  { name: 'Help', Component: lazyPage(() => import('@/pages/Help')) },
  { name: 'ReportsAnalytics', Component: lazyPage(() => import('@/pages/ReportsAnalytics')) },
  { name: 'SecurityCompliance', Component: lazyPage(() => import('@/pages/SecurityCompliance')) },
  { name: 'PatientDataManagement', Component: lazyPage(() => import('@/pages/PatientDataManagement')) },
  { name: 'UserSettings', Component: lazyPage(() => import('@/pages/UserSettings')) },
  { name: 'ClinicalPathwayManager', Component: lazyPage(() => import('@/pages/ClinicalPathwayManager')) },
  { name: 'MyLearning', Component: lazyPage(() => import('@/pages/MyLearning')) },
  { name: 'LearningCenter', Component: lazyPage(() => import('@/pages/LearningCenter')) },
  { name: 'ClinicalSkillsChecklist', Component: lazyPage(() => import('@/pages/ClinicalSkillsChecklist')) },
  { name: 'TrainingCoursePlayer', Component: lazyPage(() => import('@/pages/TrainingCoursePlayer')) },
  { name: 'EventReport', Component: lazyPage(() => import('@/pages/EventReport')) },
  { name: 'SmartNoteAssistant', Component: lazyPage(() => import('@/pages/SmartNoteAssistant')) },
  { name: 'PatientEducationHub', Component: lazyPage(() => import('@/pages/PatientEducationHub')) },
  { name: 'VisitScribe', Component: lazyPage(() => import('@/pages/VisitScribe')) },
  { name: 'ClinicalChart', Component: lazyPage(() => import('@/pages/ClinicalChart')) },
  { name: 'RegulatoryCompliance', Component: lazyPage(() => import('@/pages/RegulatoryCompliance')) },

  // Real features that are linked from already-routed pages (patient chart,
  // document hub, admin operations, learning center) but had lost their route,
  // so those links dead-ended on PageNotFound. Re-routed so navigation works.
  { name: 'SignDocument', Component: lazyPage(() => import('@/pages/SignDocument')) },
  { name: 'DocumentSignatures', Component: lazyPage(() => import('@/pages/DocumentSignatures')) },
  { name: 'DocumentVisit', Component: lazyPage(() => import('@/pages/DocumentVisit')) },
  { name: 'PatientAlerts', Component: lazyPage(() => import('@/pages/PatientAlerts')) },
  { name: 'ReferralAdmissionNote', Component: lazyPage(() => import('@/pages/ReferralAdmissionNote')) },
  { name: 'AIComplianceInServices', Component: lazyPage(() => import('@/pages/AIComplianceInServices')) },
  { name: 'AnnualEducationTranscript', Component: lazyPage(() => import('@/pages/AnnualEducationTranscript')) },
  { name: 'EmployeeTranscript', Component: lazyPage(() => import('@/pages/EmployeeTranscript')) },
  { name: 'MyAnnualEducation', Component: lazyPage(() => import('@/pages/MyAnnualEducation')) },
  { name: 'MyTraining', Component: lazyPage(() => import('@/pages/MyTraining')) },
  { name: 'AnnualMandatoryEducation', Component: lazyPage(() => import('@/pages/AnnualMandatoryEducation')) },
  { name: 'ManagerSkillGapDashboard', Component: lazyPage(() => import('@/pages/ManagerSkillGapDashboard')) },
  // Reachable via navigate('/X') from routed screens (DocumentHub, AdminOperations).
  { name: 'CreateSignatureRequest', Component: lazyPage(() => import('@/pages/CreateSignatureRequest')) },
  { name: 'DataQualityMonitor', Component: lazyPage(() => import('@/pages/DataQualityMonitor')) },
  { name: 'SystemHealthMonitor', Component: lazyPage(() => import('@/pages/SystemHealthMonitor')) },
  { name: 'TimeOff', Component: lazyPage(() => import('@/pages/TimeOff')) },

  // Pages that are linked from routed screens (sidebar, OASIS assessment, admin
  // operations, learning center) but had no route, so those links dead-ended on
  // PageNotFound. Re-routed so the navigation that already points here works.
  { name: 'AgencySettings', Component: lazyPage(() => import('@/pages/AgencySettings')) },
  { name: 'NursePerformanceDashboard', Component: lazyPage(() => import('@/pages/NursePerformanceDashboard')) },
  { name: 'NurseTraining', Component: lazyPage(() => import('@/pages/NurseTraining')) },
  { name: 'OASISAnalyzer', Component: lazyPage(() => import('@/pages/OASISAnalyzer')) },
  { name: 'OASISComplianceReview', Component: lazyPage(() => import('@/pages/OASISComplianceReview')) },
  { name: 'OASISDocumentationReview', Component: lazyPage(() => import('@/pages/OASISDocumentationReview')) },
  { name: 'OASISRevenueAnalysis', Component: lazyPage(() => import('@/pages/OASISRevenueAnalysis')) },

  // Feature suites documented in the nav manifest (with breadcrumb parents) but
  // never routed, so the whole sub-area was unreachable — invisible in the
  // command palette and 404 if linked. Routed here so each hub's sub-pages work.
  // OASIS review suite (children of SmartOASISAssessment)
  { name: 'OASISReview', Component: lazyPage(() => import('@/pages/OASISReview')) },
  { name: 'OASISClinicalReview', Component: lazyPage(() => import('@/pages/OASISClinicalReview')) },
  { name: 'OASISAuditDashboard', Component: lazyPage(() => import('@/pages/OASISAuditDashboard')) },
  { name: 'OASISAnalyticsDashboard', Component: lazyPage(() => import('@/pages/OASISAnalyticsDashboard')) },
  // Documents, PDF & templates suite (children of DocumentHub)
  { name: 'DocumentManagement', Component: lazyPage(() => import('@/pages/DocumentManagement')) },
  { name: 'DocumentIngestion', Component: lazyPage(() => import('@/pages/DocumentIngestion')) },
  { name: 'DocumentAuditLogs', Component: lazyPage(() => import('@/pages/DocumentAuditLogs')) },
  { name: 'DischargeSummaries', Component: lazyPage(() => import('@/pages/DischargeSummaries')) },
  { name: 'PDFTools', Component: lazyPage(() => import('@/pages/PDFTools')) },
  { name: 'PDFSearch', Component: lazyPage(() => import('@/pages/PDFSearch')) },
  { name: 'PDFTemplateLibrary', Component: lazyPage(() => import('@/pages/PDFTemplateLibrary')) },
  { name: 'TemplateLibrary', Component: lazyPage(() => import('@/pages/TemplateLibrary')) },
  { name: 'TemplateManagement', Component: lazyPage(() => import('@/pages/TemplateManagement')) },
  // Fax suite (children of SendFax)
  { name: 'FaxDashboard', Component: lazyPage(() => import('@/pages/FaxDashboard')) },
  { name: 'FaxLogsDashboard', Component: lazyPage(() => import('@/pages/FaxLogsDashboard')) },
  { name: 'FaxContacts', Component: lazyPage(() => import('@/pages/FaxContacts')) },
  { name: 'FaxAddressBook', Component: lazyPage(() => import('@/pages/FaxAddressBook')) },
  { name: 'FaxAnalytics', Component: lazyPage(() => import('@/pages/FaxAnalytics')) },

  // Remaining real pages that were documented in the nav manifest but unrouted,
  // so they were unreachable and absent from the command palette. Routed so the
  // whole feature set is navigable. Admin-only pages (per the manifest) are
  // guarded at the route level in App.jsx, so a routed URL can't expose an admin
  // screen to non-admins. (Empty placeholder pages are intentionally left
  // unrouted: Home, PatientTriage, ProductivityDashboard, ScheduleOptimizer,
  // SurveyPreparation, PopulationHealthAnalytics, QualityDashboard.)
  // Patient care
  { name: 'PatientRecordDashboard', Component: lazyPage(() => import('@/pages/PatientRecordDashboard')) },
  { name: 'DuplicatePatients', Component: lazyPage(() => import('@/pages/DuplicatePatients')) },
  { name: 'MedicationReconciliation', Component: lazyPage(() => import('@/pages/MedicationReconciliation')) },
  { name: 'CarePlanBuilder', Component: lazyPage(() => import('@/pages/CarePlanBuilder')) },
  { name: 'AutomaticCarePlans', Component: lazyPage(() => import('@/pages/AutomaticCarePlans')) },
  { name: 'PatientEducation', Component: lazyPage(() => import('@/pages/PatientEducation')) },
  { name: 'PatientEducationPortal', Component: lazyPage(() => import('@/pages/PatientEducationPortal')) },
  // Documentation & clinical
  { name: 'MedicalScribe', Component: lazyPage(() => import('@/pages/MedicalScribe')) },
  { name: 'OfflineDocumentation', Component: lazyPage(() => import('@/pages/OfflineDocumentation')) },
  { name: 'OfflineVisitDocumentation', Component: lazyPage(() => import('@/pages/OfflineVisitDocumentation')) },
  { name: 'IncidentReportingModule', Component: lazyPage(() => import('@/pages/IncidentReportingModule')) },
  { name: 'ReferralProcessor', Component: lazyPage(() => import('@/pages/ReferralProcessor')) },
  { name: 'ReferralTriage', Component: lazyPage(() => import('@/pages/ReferralTriage')) },
  { name: 'BulkSignatureRequests', Component: lazyPage(() => import('@/pages/BulkSignatureRequests')) },
  // Resources & learning
  { name: 'ClinicalLibrary', Component: lazyPage(() => import('@/pages/ClinicalLibrary')) },
  { name: 'MedicareGuidelinesLibrary', Component: lazyPage(() => import('@/pages/MedicareGuidelinesLibrary')) },
  { name: 'UserGuides', Component: lazyPage(() => import('@/pages/UserGuides')) },
  { name: 'EducationLibrary', Component: lazyPage(() => import('@/pages/EducationLibrary')) },
  { name: 'NurseEducationVideos', Component: lazyPage(() => import('@/pages/NurseEducationVideos')) },
  { name: 'DocumentationTraining', Component: lazyPage(() => import('@/pages/DocumentationTraining')) },
  { name: 'NurseTrainingHub', Component: lazyPage(() => import('@/pages/NurseTrainingHub')) },
  { name: 'AITrainingGenerator', Component: lazyPage(() => import('@/pages/AITrainingGenerator')) },
  { name: 'TrainingManagement', Component: lazyPage(() => import('@/pages/TrainingManagement')) },
  { name: 'AdminTrainingAnalytics', Component: lazyPage(() => import('@/pages/AdminTrainingAnalytics')) },
  { name: 'LearningReports', Component: lazyPage(() => import('@/pages/LearningReports')) },
  // Compliance & security
  { name: 'MedicareComplianceDashboard', Component: lazyPage(() => import('@/pages/MedicareComplianceDashboard')) },
  { name: 'ComplianceMonitoringDashboard', Component: lazyPage(() => import('@/pages/ComplianceMonitoringDashboard')) },
  { name: 'RealTimeComplianceDashboard', Component: lazyPage(() => import('@/pages/RealTimeComplianceDashboard')) },
  { name: 'ComplianceRegulatory', Component: lazyPage(() => import('@/pages/ComplianceRegulatory')) },
  { name: 'SecurityPolicy', Component: lazyPage(() => import('@/pages/SecurityPolicy')) },
  // Analytics
  { name: 'AgencyAnalytics', Component: lazyPage(() => import('@/pages/AgencyAnalytics')) },
  { name: 'AnalyticsDashboard', Component: lazyPage(() => import('@/pages/AnalyticsDashboard')) },
  { name: 'PredictiveAnalytics', Component: lazyPage(() => import('@/pages/PredictiveAnalytics')) },
  { name: 'ClinicalInsightsDashboard', Component: lazyPage(() => import('@/pages/ClinicalInsightsDashboard')) },
  { name: 'CustomizableDashboard', Component: lazyPage(() => import('@/pages/CustomizableDashboard')) },
  // Admin & system
  { name: 'AdminUserSetup', Component: lazyPage(() => import('@/pages/AdminUserSetup')) },
  { name: 'PersonnelFile', Component: lazyPage(() => import('@/pages/PersonnelFile')) },
  { name: 'UserActivityLog', Component: lazyPage(() => import('@/pages/UserActivityLog')) },
  { name: 'UserActivityReport', Component: lazyPage(() => import('@/pages/UserActivityReport')) },
  { name: 'SystemMonitoring', Component: lazyPage(() => import('@/pages/SystemMonitoring')) },
  { name: 'SystemJobMonitor', Component: lazyPage(() => import('@/pages/SystemJobMonitor')) },
  { name: 'ManageNewFeatures', Component: lazyPage(() => import('@/pages/ManageNewFeatures')) },
  { name: 'PullRequests', Component: lazyPage(() => import('@/pages/PullRequests')) },
  // Tools, settings & info
  { name: 'NotificationSettings', Component: lazyPage(() => import('@/pages/NotificationSettings')) },
  { name: 'About', Component: lazyPage(() => import('@/pages/About')) },
  { name: 'Features', Component: lazyPage(() => import('@/pages/Features')) },
];

/**
 * Permanent redirects from retired/renamed page paths to their current home.
 * Add an entry here (instead of leaving a dead link) whenever a page is
 * consolidated, so existing links and bookmarks never hit PageNotFound.
 */
export const REDIRECTS = [
  { from: '/StaffTrainingHub', to: '/AdminTraining' },
  { from: '/IncidentReporting', to: '/Incidents' },
  // Renamed/consolidated pages — point old links and bookmarks at the current page.
  { from: '/AdminDashboard', to: '/AdminOperations' },
  { from: '/ComplianceDashboard', to: '/ComplianceCenter' },
  { from: '/Reports', to: '/ReportsAnalytics' },
  { from: '/Support', to: '/Help' },
  // QualityDashboard is an empty placeholder; its quality metrics live in the
  // Compliance Center, so send links there instead of an empty page.
  { from: '/QualityDashboard', to: '/ComplianceCenter' },
];

export const MAIN_PAGE = 'Dashboard';

export const PAGE_NAMES = ROUTES.map((route) => route.name);
