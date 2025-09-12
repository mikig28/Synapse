# Repository Guidelines

## Project Structure & Module Organization
- `src/frontend` — React + TypeScript (Vite, Tailwind). Public assets in `public/`.
- `src/backend` — Express + TypeScript API. Python helpers in `python_scripts/` and services.
- `src/shared` — Code shared across app layers.
- `scripts/` — Dev/automation tooling (e.g., `scripts/dev.js`).
- `tests/` — Cross‑project tests (Python `unittest` present).
- `docs/`, `memory-bank/`, `tasks/` — Documentation, context, and task files.

## Build, Test, and Development Commands
- `npm install` — Install root dependencies.
- `npm run dev` — Local development orchestrator (frontend + backend).
- `npm run dev:backend` — Start API in watch mode from `src/backend`.
- `npm run build` — Build frontend for production.
- `npm start` — Preview built frontend locally.
- `npm test` — Run Jest tests (when present).
- Python: `python -m unittest` or `python -m unittest discover` to run tests in `tests/`.

## Coding Style & Naming Conventions
- TypeScript: 2‑space indentation, single quotes, semicolons. Avoid `any`; prefer explicit types.
- React: functional components; files `PascalCase.tsx` (e.g., `AgentSettingsPage.tsx`).
- Backend: route/controllers `camelCase` with clear suffixes (e.g., `whatsappRoutes.ts`).
- Prefer named exports; keep modules cohesive and under ~300 lines when practical.

## Testing Guidelines
- Frontend/Node: Jest. Place tests near code or under `tests/` using `*.test.ts(x)` or `*.spec.ts(x)`.
- Python: `unittest` with files named `test_*.py` in `tests/` or feature directories.
- Write tests for new logic and bug fixes; keep tests fast and deterministic.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat(scope): summary`, `fix(whatsapp): …`, `docs: …`, `refactor: …`.
- Commits should be small and focused; reference issues (e.g., `#123`) when applicable.
- PRs include: concise description, linked issue(s), screenshots for UI changes, steps to validate, and risks/rollbacks.
- Ensure `npm test` and `npm run build` pass; for Python changes, run `python -m unittest`.

## Security & Configuration Tips
- Copy `.env.example` to `.env` at the root and per app (`src/backend/.env`, `src/frontend/.env`).
- Never commit secrets. Required keys commonly include `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `JWT_SECRET`.
- Python services: create a venv (`python -m venv .venv`) and install `src/backend/requirements.txt` when needed.

