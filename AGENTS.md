# Repository Guidelines

## Project Structure & Module Organization
Keep feature work inside `src/`. `src/frontend` hosts the React + TypeScript client bootstrapped with Vite and styled with Tailwind; static assets live in `public/`. `src/backend` contains the Express API plus Python helpers under `python_scripts/` and service modules. Shared models, enums, and utility hooks belong in `src/shared`. Automation lives in `scripts/` (e.g., `scripts/dev.js`), and docs, memory, and task context sit under `docs/`, `memory-bank/`, and `tasks/` respectively. Cross-project tests reside in `tests/`.

## Build, Test, and Development Commands
Run `npm install` once per machine to pull root dependencies. Use `npm run dev` for the orchestrated frontend + backend dev environment, or `npm run dev:backend` when iterating on the API only. `npm run build` compiles the production frontend bundle, and `npm start` previews the built assets. Execute `npm test` for Jest suites and `python -m unittest` (or `python -m unittest discover`) for Python coverage.

## Coding Style & Naming Conventions
TypeScript follows 2-space indentation, single quotes, and required semicolons; avoid `any` by preferring explicit interfaces or generics. React components stay functional with PascalCase filenames (e.g., `AgentSettingsPage.tsx`). Backend routes and controllers use camelCase with clear role suffixes such as `whatsappRoutes.ts`. Favor named exports and keep modules focused under roughly 300 lines.

## Testing Guidelines
Co-locate frontend tests with features or place shared suites in `tests/` using `*.test.ts(x)` naming. Python tests adopt `tests/test_*.py` and must remain deterministic. Before pushing, run `npm test`, `npm run build`, and relevant `python -m unittest` commands; add new tests alongside added logic.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes like `feat(scope): ...`, `fix(backend): ...`, or `docs: ...`. Each PR should include a concise summary, linked issues (e.g., `#123`), build/test evidence, and screenshots for UI adjustments. Call out risks and rollback steps when changes impact deployments.

## Security & Configuration Tips
Copy `.env.example` into `.env` at the root, plus per app (`src/backend/.env`, `src/frontend/.env`). Never commit API keys; required secrets typically include `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `JWT_SECRET`. For Python utilities, create a virtual environment via `python -m venv .venv` and install `src/backend/requirements.txt` when needed.
