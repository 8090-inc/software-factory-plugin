# Repository guide for agents

## Plugin registries (Cursor, Claude, Codex, Gemini, Kiro, Vercel)

Keywords/tags are plain strings; hyphens are a naming convention, not special array syntax. For **official documentation links** by platform (marketplaces, manifests, extensions, powers, skills), see [docs/plugin-registry-documentation.md](docs/plugin-registry-documentation.md).

## Pre-commit checks

This repo uses [Husky](https://typicode.github.io/husky/) so a **pre-commit** Git hook runs after a normal **`pnpm install`**.

- The hook runs **`pnpm run test`** (Vitest), including integration tests for Work Order execution scripts under `tests/work-order-execution-scripts.test.ts` and validation tests under `tests/validate.test.ts`.
- If tests fail, the commit is aborted; fix failures or update tests before committing.

Cloning fresh: run `pnpm install` once so the `prepare` script registers Husky hooks. If hooks were never installed, run `pnpm exec husky` (or `pnpm install` again).

## Checks elsewhere

CI (`.github/workflows/ci.yml`) also runs `pnpm run test` among other steps, so pre-commit and CI stay aligned on the Vitest suite.

## Pull requests

Open pull requests from a topic branch with a focused title, a concise summary of user-facing or registry-facing changes, and the exact validation commands run. Keep unrelated refactors, formatting churn, and generated-output changes out of the PR unless they are required for the change. Before requesting review, run the narrowest relevant checks plus `pnpm run test` for behavior changes or `pnpm run validate`/`pnpm run verify:software-factory` for plugin registry changes, and mention any check that could not be run.

## Useful commands

| Command                            | Purpose                                        |
| ---------------------------------- | ---------------------------------------------- |
| `pnpm run test`                    | Full Vitest suite (same as pre-commit)         |
| `pnpm run lint`                    | ESLint (`src/`) + Markdown lint (`plugins/`)   |
| `pnpm run verify:software-factory` | Software Factory plugin publishability         |
| `pnpm run build`                   | Typecheck, hooks, validate, standalone exports |
