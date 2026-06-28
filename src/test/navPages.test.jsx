/**
 * Navigation-bar render smoke test.
 *
 * Mounts every page reachable from the navigation bar (the sidebar/mobile-drawer
 * sections plus the mobile bottom bar) with the base44 backend, auth context and
 * the browser APIs jsdom lacks all mocked, and asserts each renders real DOM
 * without throwing. This catches runtime render crashes (null derefs, bad
 * imports, bad initial-state assumptions) that a successful build cannot — the
 * build proves a module *compiles*, this proves the component *mounts*.
 *
 * It deliberately asserts nothing about behavior; the page list is derived from
 * the live manifest so new sidebar entries are covered automatically.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
// nav.manifest.js and routes.jsx import each other; in the app, routes.jsx is
// the cycle's entry point. Evaluate it first here so NAV_MANIFEST is fully
// defined before routes.jsx reads it (otherwise we hit a TDZ-style undefined).
import "@/routes";
import { NAV_MANIFEST } from "@/lib/nav.manifest";

// ── Browser APIs jsdom doesn't implement but charts / Radix / mobile helpers use ──
beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  globalThis.ResizeObserver ||= NoopObserver;
  globalThis.IntersectionObserver ||= NoopObserver;
  window.scrollTo ||= () => {};
  Element.prototype.scrollIntoView ||= () => {};
  if (!HTMLCanvasElement.prototype.getContext) HTMLCanvasElement.prototype.getContext = () => null;
  globalThis.crypto ||= {};
  globalThis.crypto.randomUUID ||= () => "00000000-0000-4000-8000-000000000000";
  URL.createObjectURL ||= () => "blob:mock";
  URL.revokeObjectURL ||= () => {};
  // pdfjs-dist (pulled in by the fax PDF annotator) touches DOMMatrix at import.
  globalThis.DOMMatrix ||= class DOMMatrix { constructor() {} };
});

// ── Mock the base44 backend so entity/auth/function calls resolve to empty data ──
vi.mock("@/api/base44Client", () => {
  const arr = async () => [];
  const obj = async () => ({});
  const entityStub = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === "then") return undefined; // never look like a thenable
      if (prop === "get" || prop === "create" || prop === "update") return obj;
      return arr; // filter / list / bulk* → []
    },
  });
  const entities = new Proxy({}, { get: () => entityStub });
  const functions = new Proxy({}, { get: () => async () => ({ data: {} }) });
  const integrations = new Proxy({}, { get: () => new Proxy({}, { get: () => async () => ({}) }) });
  return {
    base44: {
      entities,
      functions,
      integrations,
      auth: {
        me: async () => ({ id: "u1", email: "test@example.com", role: "admin", is_approved: true, is_manager: true, full_name: "Test User" }),
        list: arr,
        updateMyUserData: obj,
      },
    },
  };
});

// Some deep components read auth from context rather than base44 directly.
vi.mock("@/lib/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { id: "u1", email: "test@example.com", role: "admin", is_approved: true, full_name: "Test User" },
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: {},
    navigateToLogin: () => {},
  }),
}));

// Lazy importers for every page file, mirroring how src/routes.jsx loads them.
const pageModules = import.meta.glob("../pages/*.jsx");
const importerFor = (name) => pageModules[`../pages/${name}.jsx`];

// Nav-bar pages = sidebar/drawer sections (category != null) + mobile bottom bar.
const sidebarPages = NAV_MANIFEST.filter((e) => e.category).map((e) => e.page);
const bottomNavPages = ["Dashboard", "Patients", "SmartNoteAssistant", "SendFax", "Messages"];
const navPages = [...new Set([...sidebarPages, ...bottomNavPages])];

function Providers({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("navigation-bar pages mount without crashing", () => {
  it.each(navPages)("%s", async (page) => {
    const importer = importerFor(page);
    expect(importer, `no module ../pages/${page}.jsx — nav links to an unrouted page`).toBeTruthy();
    let mod;
    await act(async () => {
      mod = await importer();
    });
    const Page = mod.default;
    expect(Page, `${page}.jsx has no default export`).toBeTruthy();

    // The contract is "mounts without throwing": render() throws on a crash,
    // failing the test. A page that shows an empty loading state on first paint
    // (no backing data yet) is fine, so we don't assert on rendered DOM content.
    // (We mount the loading state rather than flushing data to the loaded state
    // because some pages start polling/interval queries that never let an async
    // act() settle — that would hang the suite, not catch more real bugs.)
    const { unmount } = render(
      <Providers>
        <Page />
      </Providers>,
    );
    unmount();
  });
});
