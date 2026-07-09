# AGENTS.md

Instructions for Codex cloud and other AI coding agents working in this repository.

## Codex cloud environment

- Configure this repository in Codex cloud settings and use the default universal image unless a task needs a pinned runtime.
- Setup script:

  ```bash
  npm ci || npm install
  ```

- Store `VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL`, Telnyx, OpenAI, and other backend-service credentials in Codex environment variables or secrets. Do not commit `.env` files.
- The app can be built and tested without backend credentials, but authenticated flows require a real hosted Base44 app.

## Project shape

PennSync (package `base44-app`) is a frontend-only Vite + React 19 SPA. There is no local backend to run: the Base44 platform (auth, data entities, and the Deno functions under `base44/functions/`) is a hosted remote service. Those Deno functions are not runnable from this repo because there is no `deno.json` or local runner; `src/functions/*` are thin client wrappers that call the remote backend.

Use npm. Do not introduce yarn or pnpm unless the package manager is intentionally changed.

## Running, building, and testing

Standard scripts are in `package.json` and `README.md`. Notable points:

- `npm run dev` starts only the Vite dev server (default `http://localhost:5173`) inside the cloud environment.
- `npm test` runs `test:utils` (node `--test`) then `test:components` (Vitest/jsdom).
- `npm run lint` currently reports warnings only (0 errors); treat lint as passing when there are still 0 errors.
- `npm run typecheck` is an informational baseline in CI (`continue-on-error`); it may report pre-existing errors and is not a gate.
- CI uses Node 20; Node 22 also builds, tests, and lints successfully.

| Task | Command |
| --- | --- |
| Install | `npm ci` when a lockfile exists, otherwise `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Typecheck baseline | `npm run typecheck` |
| Tests | `npm test` |

## Environment config

The only vars the frontend reads are `VITE_BASE44_APP_ID` and `VITE_BASE44_BACKEND_URL` (consumed in `src/lib/app-params.js`). The Vite dev server boots regardless, but without a valid app id + backend URL the app shows a blocking config state or redirects to `/login` and renders blank because `/login` is served by the hosted backend, not client-side.

App id and backend URL can also be passed via URL params `?app_id=...&server_url=...`, which are persisted to localStorage. All other vars such as `TELNYX_*` and `OPENAI_API_KEY` are backend Deno-function secrets and are not used by the local frontend bundle.

## Testing the running app in a browser without backend credentials

- Authenticated routes are gated; without a real backend they redirect to `/login` and may appear blank.
- Public capability-token pages render fully client-side: `/signer` renders an "Access Denied" card with no token, and `/join` renders an "Invalid Visit Link" card with no token. Use these to verify the SPA renders in a browser.
- Console 404s against the backend origin such as "App not found" are expected when `VITE_BASE44_APP_ID` or `VITE_BASE44_BACKEND_URL` points at a non-existent app.
- Core clinical logic (OASIS scoring in `src/components/oasis/`, PDGM grouping in `src/components/pdgm/pdgmGrouper.js`, SmartNote compliance, fax/SMS/voice utils) is pure and covered by the automated test suite.

## Full end-to-end authenticated flows

Logging in and exercising patient/clinical workflows requires a real hosted Base44 app. Set `VITE_BASE44_APP_ID` and `VITE_BASE44_BACKEND_URL` in Codex environment settings and use valid login credentials. These are not present in the default cloud environment.

Before finishing a code change, run the smallest relevant checks first. For typical app changes, prefer `npm test`, `npm run lint`, and `npm run build`. Run `npm run typecheck` to compare against the known baseline when touching types or shared utilities.
