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
      // Patient Care
      "Patients": [{ label: "Patients", page: "Patients" }],
      "PatientDetails": [{ label: "Patients", page: "Patients" }, { label: "Patient Details" }],
      "ClinicalChart": [{ label: "Patients", page: "Patients" }, { label: "Clinical Chart" }],
      "CarePlanManagement": [{ label: "Patient Care" }, { label: "Care Plans" }],
      "SmartOASISAssessment": [{ label: "Patient Care" }, { label: "OASIS Assessment" }],
      "Incidents": [{ label: "Patient Care" }, { label: "Incidents" }],
      "PatientEducationHub": [{ label: "Patient Care" }, { label: "Patient Education" }],

      // Documentation
      "ClinicalDocumentation": [{ label: "Documentation" }, { label: "Clinical Notes" }],
      "SmartNoteAssistant": [{ label: "Documentation" }, { label: "Smart Notes" }],
      "VisitScribe": [{ label: "Documentation" }, { label: "Visit Scribe" }],
      "DocumentHub": [{ label: "Documentation" }, { label: "Documents" }],
      "ReferralIntake": [{ label: "Documentation" }, { label: "Referral Intake" }],
      "EventReport": [{ label: "Documentation" }, { label: "Event Report" }],

      // Communication
      "Messages": [{ label: "Communication", page: "Messages" }],
      "SendFax": [{ label: "Communication" }, { label: "Send Fax" }],
      "PhysicianDirectory": [{ label: "Communication" }, { label: "Physician Directory" }],
      "Telehealth": [{ label: "Communication" }, { label: "Telehealth" }],

      // Compliance
      "ComplianceCenter": [{ label: "Compliance" }, { label: "Compliance Center" }],
      "SecurityCompliance": [{ label: "Compliance" }, { label: "Security & Compliance" }],
      "RegulatoryCompliance": [{ label: "Compliance" }, { label: "Regulatory Compliance" }],

      // Analytics
      "ReportsAnalytics": [{ label: "Reports & Analytics" }],

      // Learning
      "LearningCenter": [{ label: "Learning" }, { label: "Learning Center" }],
      "MyLearning": [{ label: "Learning" }, { label: "My Courses" }],
      "ClinicalSkillsChecklist": [{ label: "Learning" }, { label: "Skills Checklist" }],
      "TrainingCoursePlayer": [{ label: "Learning", page: "MyLearning" }, { label: "Course Player" }],

      // Admin
      "AdminOperations": [{ label: "Admin", page: "AdminOperations" }],
      "UserManagement": [{ label: "Admin", page: "AdminOperations" }, { label: "User Management" }],
      "AdminTraining": [{ label: "Admin", page: "AdminOperations" }, { label: "Training Manager" }],
      "ClinicalPathwayManager": [{ label: "Admin", page: "AdminOperations" }, { label: "Clinical Pathways" }],
      "PatientDataManagement": [{ label: "Admin", page: "AdminOperations" }, { label: "Data Management" }],

      // Settings & Tools
      "UserSettings": [{ label: "Settings" }],
      "ResourceLibrary": [{ label: "Tools" }, { label: "Resource Library" }],
      "OfflineMode": [{ label: "Tools" }, { label: "Offline Mode" }],
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