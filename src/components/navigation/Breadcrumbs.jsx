import React from "react";
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
      // Patient pages
      "Patients": [{ label: "Patients", page: "Patients" }],
      "PatientDetails": [{ label: "Patients", page: "Patients" }, { label: "Patient Details" }],
      "Patient360": [{ label: "Patients", page: "Patients" }, { label: "Patient 360" }],
      
      // Documentation pages
      "QuickNote": [{ label: "Documentation", page: "QuickNote" }, { label: "Quick Note" }],
      "SmartNoteAssistant": [{ label: "Documentation" }, { label: "Smart Notes" }],
      "DocumentVisit": [{ label: "Documentation" }, { label: "Document Visit" }],
      
      // Reports & Analytics
      "Reports": [{ label: "Reports & Analytics", page: "Reports" }],
      "AgencyAnalytics": [{ label: "Reports & Analytics", page: "Reports" }, { label: "Agency Analytics" }],
      
      // Admin pages
      "AdminDashboard": [{ label: "Admin", page: "AdminDashboard" }],
      "UserManagement": [{ label: "Admin", page: "AdminDashboard" }, { label: "User Management" }],
      "SecurityCompliance": [{ label: "Admin", page: "AdminDashboard" }, { label: "Security & Compliance" }],
      
      // Training
      "StaffTrainingHub": [{ label: "Training", page: "StaffTrainingHub" }],
      "TrainingManagement": [{ label: "Admin", page: "AdminDashboard" }, { label: "Training Management" }],
      
      // Care Plans
      "CarePlanManagement": [{ label: "Care Plans", page: "CarePlanManagement" }],
      
      // Compliance
      "MedicareComplianceDashboard": [{ label: "Compliance", page: "MedicareComplianceDashboard" }],
      "MedicareGuidelinesLibrary": [{ label: "Compliance" }, { label: "Guidelines Library" }],
      
      // Referrals
      "ReferralIntake": [{ label: "Referrals", page: "ReferralIntake" }],
      
      // Alerts & Notifications
      "PatientAlerts": [{ label: "Patient Care" }, { label: "Patient Alerts" }],
      
      // Messages
      "Messages": [{ label: "Communication", page: "Messages" }],
      
      // Settings
      "UserSettings": [{ label: "Settings", page: "UserSettings" }],
      "NotificationSettings": [{ label: "Settings", page: "UserSettings" }, { label: "Notifications" }],
      
      // Workflow
      "NurseWorkflow": [{ label: "My Workflow", page: "NurseWorkflow" }],
      
      // Features
      "Features": [{ label: "Features & Help", page: "Features" }],
      
      // Offline
      "OfflineMode": [{ label: "Tools" }, { label: "Offline Mode" }],
      
      // Education
      "PatientEducationHub": [{ label: "Patient Care" }, { label: "Patient Education" }]
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