# Plugin registry documentation (by platform)

This repository ships one plugin (`software-factory`) to several assistants. Each platform has its own name for the bundle (_plugin_, _extension_, _power_, _skill_) and its own manifest layout. Below are **primary official (or maintainer) docs** useful when editing `marketplace.json`, `plugin.json`, `gemini-extension.json`, or related files.

## Keywords, tags, and hyphens

In **`keywords`** (Claude/Cursor `plugin.json`) and **`tags`** (marketplace entries), each item is a **plain JSON string**. There is **no special syntax** that requires hyphens.

- **`software-factory`** and **`agentic-engineering`** use **kebab-case** (words joined with hyphens). That matches common conventions for URL-safe, single-token labels and for **plugin `name`** patterns (often lowercase `[a-z0-9-]+`).
- You **could** use a space inside a string (e.g. `"agentic engineering"`) where the schema allows arbitrary strings; hyphenated tags are usually easier to search and stay consistent with identifiers.

For this repo’s **validation rules**, see `schemas/plugin.json` and `schemas/marketplace.json`.

---

## Cursor

| Resource                                  | URL                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| Plugins overview                          | [cursor.com/docs/plugins](https://cursor.com/docs/plugins)                     |
| Plugins reference (manifest fields)       | [cursor.com/docs/reference/plugins](https://cursor.com/docs/reference/plugins) |
| Example / schema work in `cursor/plugins` | [github.com/cursor/plugins](https://github.com/cursor/plugins)                 |

Marketplace catalog in this repo: `.cursor-plugin/marketplace.json`. Per-plugin manifest: `plugins/<name>/.cursor-plugin/plugin.json`.

---

## Claude Code (Anthropic)

| Resource                            | URL                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Discover / install via marketplaces | [code.claude.com/docs/en/discover-plugins](https://code.claude.com/docs/en/discover-plugins)       |
| Create and distribute a marketplace | [code.claude.com/docs/en/plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) |
| Plugins reference (technical spec)  | [code.claude.com/docs/en/plugins-reference](https://code.claude.com/docs/en/plugins-reference)     |

Marketplace catalog in this repo: `.claude-plugin/marketplace.json`. Per-plugin manifest: `plugins/<name>/.claude-plugin/plugin.json`.

---

## OpenAI Codex

| Resource                                                     | URL                                                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Plugins overview                                             | [developers.openai.com/codex/plugins](https://developers.openai.com/codex/plugins)             |
| Build plugins (marketplace shape, `marketplace.json`, paths) | [developers.openai.com/codex/plugins/build](https://developers.openai.com/codex/plugins/build) |

Marketplace catalog in this repo: `.agents/plugins/marketplace.json`. Per-plugin manifest: `plugins/<name>/.codex-plugin/plugin.json`.

---

## Gemini CLI

| Resource                                      | URL                                                                                                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extensions overview                           | [google-gemini.github.io/gemini-cli/docs/extensions/](https://google-gemini.github.io/gemini-cli/docs/extensions/)                                                                 |
| Getting started with extensions               | [google-gemini.github.io/gemini-cli/docs/extensions/getting-started-extensions.html](https://google-gemini.github.io/gemini-cli/docs/extensions/getting-started-extensions.html)   |
| Extension reference (`gemini-extension.json`) | [github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md)                   |
| Writing extensions                            | [github.com/google-gemini/gemini-cli/blob/main/docs/extensions/writing-extensions.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/writing-extensions.md) |

This repo’s **standalone** Gemini export is generated under `dist/gemini/<plugin>/` via `pnpm run build:standalone`; the source manifest lives at `plugins/<name>/gemini-extension.json`.

---

## Kiro

| Resource                                         | URL                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| Powers                                           | [kiro.dev/docs/powers/](https://kiro.dev/docs/powers/)               |
| Create powers (`POWER.md`, `mcp.json`, steering) | [kiro.dev/docs/powers/create/](https://kiro.dev/docs/powers/create/) |
| MCP in Kiro                                      | [kiro.dev/docs/mcp/](https://kiro.dev/docs/mcp/)                     |

Standalone export: `dist/kiro/<plugin>/` (see `POWER.md` and `mcp.json` there).

---

## Vercel / Skills CLI & agent skills

| Resource                                     | URL                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Agent skills (Vercel docs)                   | [vercel.com/docs/agent-resources/skills](https://vercel.com/docs/agent-resources/skills) |
| `vercel-labs/skills` (CLI patterns, install) | [github.com/vercel-labs/skills](https://github.com/vercel-labs/skills)                   |

This template Tier-3 path is **skills-only** discovery (`npx skills`, skills.sh); see the root `README.md` compatibility matrix.

---

## In this repository

- **`README.md`** — platform matrix and publishing strategy.
- **`schemas/`** — JSON Schema for `plugin.json`, `marketplace.json`, and Codex-specific marketplace layout.
- **`src/validate.ts`** — enforcement of listings and paths when you run `pnpm run validate`.

If an upstream doc moves, update the link in this file and keep one canonical row per platform.
