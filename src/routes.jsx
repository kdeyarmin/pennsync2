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
];

export const MAIN_PAGE = 'Dashboard';

export const PAGE_NAMES = ROUTES.map((route) => route.name);
