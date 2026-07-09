# AGENTS.md

Instructions for Codex cloud and other AI coding agents working in this repository.

## Codex cloud environment

- Configure this repository in Codex cloud settings and use the default universal image unless a task needs a pinned runtime.
- Setup script:

  ```bash
  npm ci || npm install
  ```

- Store Base44 app IDs, backend URLs, API keys, and other credentials in Codex environment variables or secrets. Do not commit `.env` files.
- Agent internet can stay off after setup for most code tasks. Enable it only when a task must reach package registries, Base44, or another external API.

## Project shape

- This is a Base44 Vite/React app.
- Run commands from the repository root.
- Use npm. Do not introduce yarn or pnpm unless the package manager is intentionally changed.
- Backend, auth, and data behavior are owned by the hosted Base44 platform unless this repo includes explicit backend code.

## Commands

| Task | Command |
| --- | --- |
| Install | `npm ci` when a lockfile exists, otherwise `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Lint fix | `npm run lint:fix` |
| Typecheck | `npm run typecheck` |
| Utility tests | `npm run test:utils` |
| Production audit | `npm run audit:prod` |
| Workflow target lint | `npm run lint:workflow-targets` |
| Workflow quality verification | `npm run verify:workflow-quality` |
| Preview | `npm run preview` |

Before finishing a code change, run `npm run typecheck`, `npm run lint`, and `npm run build` when the change affects application code. Use the workflow and audit commands when touching clinical workflows, production gating, or related utilities.

## Working rules

- Keep generated assets, build output, and credentials out of git.
- Match the existing Base44 SDK patterns instead of creating a separate API layer.
- If validation cannot run because a required cloud secret is missing, state that clearly in the final response.
