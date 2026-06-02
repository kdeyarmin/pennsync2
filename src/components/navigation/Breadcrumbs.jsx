import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, Home } from "lucide-react";
import { buildBreadcrumbs } from "@/lib/nav.manifest";

export default function Breadcrumbs({ currentPageName, customPath = [] }) {
  const breadcrumbs = customPath.length > 0 ? customPath : buildBreadcrumbs(currentPageName);

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
            <span className={`whitespace-nowrap ${index === breadcrumbs.length - 1 ? "text-slate-900 font-medium" : ""}`}>
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}

