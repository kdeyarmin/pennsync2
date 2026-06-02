import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, Home } from "lucide-react";
<<<<<<< HEAD
import { buildBreadcrumbs } from "@/lib/nav.manifest";

export default function Breadcrumbs({ currentPageName, customPath = [] }) {
  const breadcrumbs = customPath.length > 0 ? customPath : buildBreadcrumbs(currentPageName);
=======
import { getPageMeta } from "@/components/navigation/navConfig";

// Curated multi-level breadcrumbs — kept ONLY for routed pages that benefit from
// a clickable parent (e.g. a detail page that should link back to its list).
// Every other page derives its breadcrumb from the shared navConfig manifest
// below, so this map stays small and can't reference unrouted/renamed pages.
const CUSTOM_TRAILS = {
  PatientDetails: [{ label: "Patients", page: "Patients" }, { label: "Patient Details" }],
  ClinicalChart: [{ label: "Patients", page: "Patients" }, { label: "Clinical Chart" }],
  TrainingCoursePlayer: [{ label: "My Courses", page: "MyLearning" }, { label: "Course Player" }],
  DocumentSignatures: [{ label: "Documents", page: "DocumentHub" }, { label: "Signatures" }],
  CreateSignatureRequest: [{ label: "Documents", page: "DocumentHub" }, { label: "New Signature Request" }],
  BulkSignatureRequests: [{ label: "Documents", page: "DocumentHub" }, { label: "Bulk Signatures" }],
  EventReport: [{ label: "Incidents", page: "Incidents" }, { label: "Event Report" }],
};

export default function Breadcrumbs({ currentPageName, customPath = [] }) {
  const generateBreadcrumbs = () => {
    if (customPath.length > 0) return customPath;
    if (CUSTOM_TRAILS[currentPageName]) return CUSTOM_TRAILS[currentPageName];
    if (currentPageName === "Dashboard") return [{ label: "Dashboard" }];

    // Fallback: derive from the shared nav manifest so every routed page gets a
    // consistent "Category › Page" breadcrumb without a hand-maintained entry.
    const meta = getPageMeta(currentPageName);
    const crumbs = [];
    if (meta.category && meta.category !== "Overview") crumbs.push({ label: meta.category });
    crumbs.push({ label: meta.label });
    return crumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
>>>>>>> origin/main

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-600 mb-4 overflow-x-auto py-2">
      <Link
        to={createPageUrl("Dashboard")}
        className="flex items-center hover:text-indigo-600 transition-colors flex-shrink-0"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {crumb.page && index < breadcrumbs.length - 1 ? (
            <Link
              to={createPageUrl(crumb.page)}
              className="hover:text-indigo-600 transition-colors whitespace-nowrap"
            >
              {crumb.label}
            </Link>
          ) : (
<<<<<<< HEAD
            <span className={`whitespace-nowrap ${index === breadcrumbs.length - 1 ? "text-slate-900 font-medium" : ""}`}>
=======
            <span className={`whitespace-nowrap ${index === breadcrumbs.length - 1 ? 'text-slate-900 font-medium' : ''}`}>
>>>>>>> origin/main
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
<<<<<<< HEAD

=======
>>>>>>> origin/main
