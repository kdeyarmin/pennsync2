# Dependency & Config Update Pass (2026-06-03)

This pass refreshes dependencies to their latest **safe** versions, removes dead
dependencies, and fixes the security findings that are within our control.
Run `npm run check:updates` to regenerate the outdated report.

## What changed

### Security (npm audit: 15 → 2)

`npm audit` went from **15 vulnerabilities (1 critical, 7 high, 7 moderate)** to
**2 low**. Fixes applied via in-range upgrades:

- `jspdf` 4.2.0 → 4.2.1 — **critical** PDF object injection (GHSA-7x6v-j9x4-qf24).
- `lodash` → 4.18.x — high prototype-pollution / code-injection.
- `dompurify` 3.3.3 → 3.4.7 — moderate FORBID_TAGS / template bypasses.
- `postcss` → 8.5.15 — moderate CSS stringify XSS.
- Transitive (`axios`, `follow-redirects`, `ws`, `flatted`, `picomatch`, …)
  resolved by `npm audit fix` within existing ranges.

**Remaining (2 low, no clean fix):** `quill` 2.0.3 XSS-via-HTML-export
(GHSA-v3m3-f69x-jf25). All quill 2.x are affected and `react-quill-new@3.8.x`
requires quill 2.x, so `audit fix --force` would only *downgrade*
`react-quill-new` to 3.7.0 (regressing fixes) without removing the advisory.
We stay on the latest quill 2.0.3; editor HTML is sanitized with DOMPurify.

### Removed unused dependencies (bundle + supply-chain hygiene)

These had **zero imports** anywhere in `src/`, `base44/`, or build config and
were shipping dead weight (and attack surface) in a HIPAA app:

| Package | Why removed |
| --- | --- |
| `three` | ~600 KB 3D engine, never imported |
| `react-leaflet` | maps lib (+ pulls `leaflet`), never imported |
| `@stripe/react-stripe-js`, `@stripe/stripe-js` | no billing/payments feature exists |
| `zod`, `@hookform/resolvers` | no schema validation in use |
| `react-hot-toast` | superseded by `sonner` + the in-repo toaster |
| `@radix-ui/react-progress`, `@radix-ui/react-toast` | replaced by hand-rolled `ui/progress.jsx` / `ui/toast.jsx` |
| `@floating-ui/core` | only a transitive dep of Radix, never imported directly |
| `quill` (direct) | pulled transitively by `react-quill-new`; the version pin lives in `overrides` (bumped to 2.0.3) |

Build, lint, and the 145-case util test suite all stay green after removal.

### Refreshed to latest within current major (drop-in)

All `@radix-ui/*`, `@tanstack/react-query`, `cmdk`, `embla-carousel-react`,
`next-themes`, `react-hook-form`, `react-quill-new`, `sonner`, `twilio-video`,
plus dev tooling (`autoprefixer`, `baseline-browser-mapping`,
`eslint-plugin-react`, `eslint-plugin-unused-imports`, `globals`).

## Deferred: breaking major upgrades (need migration + runtime QA)

These were intentionally **not** bumped — each is a breaking major that requires
code changes and full runtime testing, which is unsafe to land blindly in a
clinical app. Track as follow-up work, ideally grouped:

- **React 19 cluster** — `react`/`react-dom` 18→19, `@types/react(-dom)` 18→19,
  `@vitejs/plugin-react` 4→6, `react-day-picker` 8→10, `react-leaflet` (if
  re-added). Move together.
- **Build/lint cluster** — `vite` 6→8, `eslint`/`@eslint/js` 9→10,
  `eslint-plugin-react-hooks` 5→7, `typescript` 5→6.
- **Tailwind 4** — `tailwindcss` 3→4 is a full config/CSS-engine rewrite
  (`@tailwindcss/postcss`, CSS-first config). Largest single migration.
- **Standalone majors** — `zod` 3→4 (if re-introduced), `date-fns` 3→4 (+ keep
  `date-fns-tz` in lockstep), `recharts` 2→3, `react-router-dom` 6→7,
  `framer-motion` 11→12, `@stripe/*` (if re-introduced), `react-markdown` 9→10,
  `react-resizable-panels` 2→4, `tailwind-merge` 2→3, `lucide-react` 0.x→1,
  `pdfjs-dist` 4→6, `@hello-pangea/dnd` 17→18, `@hookform/resolvers` 4→5.

`@base44/*` packages are vendor-pinned and excluded from the update check.
