import { lazy } from 'react';
import { NAV_MANIFEST } from '@/lib/nav.manifest';

// Single source of truth for the app's authenticated routes.
//
// Routes are DERIVED from the navigation manifest (src/lib/nav.manifest.js) so
// the route table, the sidebar, the command palette and breadcrumbs can never
// drift apart: a page is reachable iff it has a manifest entry. App.jsx renders
// ROUTES and NavigationTracker reads PAGE_NAMES for analytics.
//
// IMPORTANT (bundle size): NavigationTracker is always mounted and imports this
// module, so this file must never eagerly import page components. Every page is
// wired through `import.meta.glob` in lazy mode — Vite turns each match into its
// own dynamically-imported chunk that is not fetched until the route renders, so
// the always-loaded code stays small. (Eagerly importing the old auto-generated
// page map here is what previously produced a ~7.8 MB initial chunk.)

// Dashboard is the landing page, so it is eager (no extra round-trip on first
// paint). Every other page is lazy.
import Dashboard from '@/pages/Dashboard';

// Lazy factory per page file. Keys look like './pages/Patients.jsx'.
const pageModules = import.meta.glob('./pages/*.jsx');
const factoryFor = (name) => pageModules[`./pages/${name}.jsx`];

// Pages that are NOT authenticated, manifest-driven routes:
//  - Dashboard is added eagerly above.
//  - JoinTelehealth / SignerPortal are public, token-gated pages rendered
//    without an app login directly in App.jsx, so they are intentionally absent
//    from the manifest and handled there.
const NON_MANIFEST_ROUTES = new Set(['Dashboard']);

/**
 * Authenticated routes. `name` is both the path segment (routes are PascalCase,
 * e.g. /Dashboard) and the analytics page name. React Router matches paths
 * case-insensitively, so createPageUrl()'s lowercase output still resolves here.
 */
export const ROUTES = [
  { name: 'Dashboard', Component: Dashboard, adminOnly: false },
  ...NAV_MANIFEST
    .filter((entry) => !NON_MANIFEST_ROUTES.has(entry.page))
    .map((entry) => ({ name: entry.page, factory: factoryFor(entry.page), adminOnly: !!entry.adminOnly }))
    .filter((entry, index, all) => {
      // Guard against a manifest entry whose page file does not exist (lazy()
      // would crash). Surface it in dev so the mismatch is fixed at the source.
      if (!entry.factory) {
        if (import.meta.env?.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`[routes] manifest page "${entry.name}" has no src/pages/${entry.name}.jsx — skipping route`);
        }
        return false;
      }
      // De-dupe defensively in case a page appears twice in the manifest.
      return all.findIndex((e) => e.name === entry.name) === index;
    })
    // `adminOnly` mirrors the manifest so App.jsx can gate admin routes at the
    // router level (non-admins typing the URL get blocked, not just hidden from
    // the sidebar). Client-side defense in depth; server RLS is the real gate.
    .map((entry) => ({ name: entry.name, Component: lazy(entry.factory), adminOnly: entry.adminOnly })),
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
  // MedicareComplianceDashboard duplicates ComplianceCenter's audit metrics.
  // (Removed from the manifest so this redirect is no longer shadowed by a route.)
  { from: '/MedicareComplianceDashboard', to: '/ComplianceCenter' },

  // ─── Admin console consolidation ───────────────────────────────────────────
  // These standalone admin pages were thin wrappers/duplicates of tools that now
  // live inside an existing hub. Redirect old links/bookmarks to the canonical
  // home (deep-linking the exact Admin Console tab where applicable).
  { from: '/TrainingManagement', to: '/AdminTraining' },
  { from: '/ComplianceRegulatory', to: '/ComplianceCenter' },
  { from: '/DataQualityMonitor', to: '/AdminOperations?tab=data-quality' },
  { from: '/SystemHealthMonitor', to: '/AdminOperations?tab=system-health' },
  { from: '/SystemMonitoring', to: '/AdminOperations?tab=system-jobs' },
];

export const MAIN_PAGE = 'Dashboard';

export const PAGE_NAMES = ROUTES.map((route) => route.name);
