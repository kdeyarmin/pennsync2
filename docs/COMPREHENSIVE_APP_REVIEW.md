# Comprehensive App Review (Improvement Plan)

Date: 2026-03-17

## Executive summary

The codebase is feature-rich and operationally ambitious, but it is carrying enough quality debt that delivery speed and confidence are likely being reduced each sprint. The highest leverage improvements are:

1. **Stabilize the quality gates** (lint/typecheck/build reliability).
2. **Reduce architecture complexity** in oversized components and route wiring.
3. **Standardize integration patterns** for backend functions and AI/PDF workflows.
4. **Add critical-path automated tests** in a few high-risk domains.

## Evidence gathered

### Repository scale

- Source files (`.js/.jsx/.ts/.tsx`): **1201**
- `src/pages`: **128** files
- `src/components`: **858** files
- Root `functions/`: **159** backend functions

### Static checks and build health

- `npm run lint` completes with **551 warnings** and no errors.
- `npm run typecheck` did not complete in a 90-second probe (`timeout 90s npm run typecheck`).
- `npm run build` did not complete in a 120-second probe (`timeout 120s npm run build`).

### Maintainability hotspots

Large single-file UI modules create high coupling and regression risk. Largest files sampled:

- `src/components/visit/OASISScrubber.jsx` (4129 LOC)
- `src/pages/OASISAnalyzer.jsx` (3177 LOC)
- `src/components/oasis/AutomatedPDGMNavigator.jsx` (2283 LOC)
- `src/components/visit/QuickTemplatesLibrary.jsx` (1970 LOC)
- `src/pages/DocumentVisit.jsx` (1757 LOC)

### Product architecture observations

- `src/App.jsx` manually wires routes and page imports for app navigation.
- `src/pages.config.js` also exists, suggesting dual routing/config concerns and potential drift.
- README currently contains only a title (`# Base44 App`), which limits onboarding and operational clarity.

## Prioritized recommendations

## P0 (next 1–2 weeks): reliability and delivery safety

1. **Make lint warning budget explicit**
   - Freeze at current level, then ratchet down by domain (admin, smartNote, oasis first).
   - Block new warnings in changed files via CI.

2. **Make typecheck/build deterministic in CI**
   - Split `typecheck` and `build` into memory-aware CI commands.
   - Capture and publish timing budgets + failure diagnostics.

3. **Introduce a minimal test gate for critical workflows**
   - Add smoke tests for: referral intake, visit documentation, PDF export/signature, and fax send/retry.

## P1 (next sprint): architecture simplification

1. **Break up mega-components (>1000 LOC)**
   - Start with OASIS and visit domains.
   - Refactor to container + presentation + pure utility layers.

2. **Unify route source of truth**
   - Either fully derive from `pages.config.js` or from explicit route modules.
   - Add route coverage test to prevent hidden/unlinked pages.

3. **Standardize backend function calls**
   - Create one shared function invocation wrapper with normalized error handling and telemetry.

## P2 (following sprint): domain hardening and performance

1. **AI workflow contracts**
   - Validate model responses with schema checks before render/use.
   - Add retry, timeout, and fallback policy by workflow type.

2. **PDF/document pipeline hardening**
   - Centralize file validation (size/type/page count) and error UX.
   - Add regression tests for expected output metadata contracts.

3. **Observability**
   - Add user-action + function-call tracing IDs across frontend/backend boundaries.
   - Track slowest screens and functions weekly.

## Suggested KPI targets

- Lint warnings: **551 → <250** in two sprints.
- Typecheck/build: **100% CI pass**, each under agreed runtime budget.
- Critical-path smoke tests: **>= 6 end-to-end flows**.
- Mega-components (>1000 LOC): reduce count by **50%**.

## Immediate implementation checklist

- [ ] Add CI step: lint changed files only (fail on new warnings).
- [ ] Add CI step: deterministic typecheck with extended timeout + diagnostics.
- [ ] Add CI step: production build artifact + timing report.
- [ ] Extract first shared hook/util for AI call lifecycle.
- [ ] Refactor first OASIS mega-component into submodules.
- [ ] Write onboarding README (architecture, scripts, env, local run).

