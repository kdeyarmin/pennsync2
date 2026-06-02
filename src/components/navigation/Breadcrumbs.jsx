import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs({ currentPageName, customPath = [] }) {
  // Auto-generate breadcrumbs based on page name if no custom path provided
  const generateBreadcrumbs = () => {
    if (customPath.length > 0) return customPath;

    const breadcrumbs = [{ label: "Dashboard", page: "Dashboard" }];

    // Map page names to breadcrumb structures
    const pageMap = {
      // Patient pages / Patient Care
      "Patients": [{ label: "Patients", page: "Patients" }],
      "PatientDetails": [{ label: "Patients", page: "Patients" }, { label: "Patient Details" }],
      "Patient360": [{ label: "Patients", page: "Patients" }, { label: "Patient 360" }],
      "ClinicalChart": [{ label: "Patients", page: "Patients" }, { label: "Clinical Chart" }],
      "CarePlanManagement": [{ label: "Care Plans", page: "CarePlanManagement" }],
      "SmartOASISAssessment": [{ label: "Patient Care" }, { label: "OASIS Assessment" }],
      "Incidents": [{ label: "Patient Care" }, { label: "Incidents" }],
      "PatientAlerts": [{ label: "Patient Care" }, { label: "Patient Alerts" }],
      "PatientEducationHub": [{ label: "Patient Care" }, { label: "Patient Education" }],

      // Documentation pages
      "QuickNote": [{ label: "Documentation", page: "QuickNote" }, { label: "Quick Note" }],
      "SmartNoteAssistant": [{ label: "Documentation" }, { label: "Smart Notes" }],
      "DocumentVisit": [{ label: "Documentation" }, { label: "Document Visit" }],
      "ClinicalDocumentation": [{ label: "Documentation" }, { label: "Clinical Notes" }],
      "VisitScribe": [{ label: "Documentation" }, { label: "Visit Scribe" }],
      "DocumentHub": [{ label: "Documentation" }, { label: "Documents" }],
      "EventReport": [{ label: "Documentation" }, { label: "Event Report" }],

      // Communication / Messages
      "Messages": [{ label: "Communication", page: "Messages" }],
      "SendFax": [{ label: "Communication" }, { label: "Send Fax" }],
      "PhysicianDirectory": [{ label: "Communication" }, { label: "Physician Directory" }],
      "Telehealth": [{ label: "Communication" }, { label: "Telehealth" }],

      // Reports & Analytics
      "Reports": [{ label: "Reports & Analytics", page: "Reports" }],
      "AgencyAnalytics": [{ label: "Reports & Analytics", page: "Reports" }, { label: "Agency Analytics" }],
      "ReportsAnalytics": [{ label: "Reports & Analytics" }],

      // Admin pages
      "AdminDashboard": [{ label: "Admin", page: "AdminDashboard" }],
      "AdminOperations": [{ label: "Admin", page: "AdminOperations" }],
      "UserManagement": [{ label: "Admin", page: "AdminDashboard" }, { label: "User Management" }],
      "TrainingManagement": [{ label: "Admin", page: "AdminDashboard" }, { label: "Training Management" }],
      "AdminTraining": [{ label: "Admin", page: "AdminOperations" }, { label: "Training Manager" }],
      "ClinicalPathwayManager": [{ label: "Admin", page: "AdminOperations" }, { label: "Clinical Pathways" }],
      "PatientDataManagement": [{ label: "Admin", page: "AdminOperations" }, { label: "Data Management" }],

      // Training / Learning
      "StaffTrainingHub": [{ label: "Training", page: "StaffTrainingHub" }],
      "LearningCenter": [{ label: "Learning" }, { label: "Learning Center" }],
      "MyLearning": [{ label: "Learning" }, { label: "My Courses" }],
      "ClinicalSkillsChecklist": [{ label: "Learning" }, { label: "Skills Checklist" }],
      "TrainingCoursePlayer": [{ label: "Learning", page: "MyLearning" }, { label: "Course Player" }],

      // Compliance
      "MedicareComplianceDashboard": [{ label: "Compliance", page: "MedicareComplianceDashboard" }],
      "MedicareGuidelinesLibrary": [{ label: "Compliance" }, { label: "Guidelines Library" }],
      "ComplianceCenter": [{ label: "Compliance" }, { label: "Compliance Center" }],
      "SecurityCompliance": [{ label: "Admin", page: "AdminDashboard" }, { label: "Security & Compliance" }],
      "RegulatoryCompliance": [{ label: "Compliance" }, { label: "Regulatory Compliance" }],

      // Referrals
      "ReferralIntake": [{ label: "Referrals", page: "ReferralIntake" }],

      // Settings
      "UserSettings": [{ label: "Settings", page: "UserSettings" }],
      "NotificationSettings": [{ label: "Settings", page: "UserSettings" }, { label: "Notifications" }],

      // Workflow
      "NurseWorkflow": [{ label: "My Workflow", page: "NurseWorkflow" }],

      // Features
      "Features": [{ label: "Features & Help", page: "Features" }],

      // Tools
      "ResourceLibrary": [{ label: "Tools" }, { label: "Resource Library" }],
      "OfflineMode": [{ label: "Tools" }, { label: "Offline Mode" }],

      // Help
      "Help": [{ label: "Help" }],
    };

    return pageMap[currentPageName] || breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-600 mb-4 overflow-x-auto py-2">
      <Link
        to={createPageUrl("Dashboard")}
        className="flex items-center hover:text-indigo-600 transition-colors flex-shrink-0"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {crumb.page && index < breadcrumbs.length - 1 ? (
            <Link
              to={createPageUrl(crumb.page)}
              className="hover:text-indigo-600 transition-colors whitespace-nowrap"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className={`whitespace-nowrap ${index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}`}>
              {crumb.label}
            </span>
          )}
          </div>
          ))}
          </nav>
          );
          }
