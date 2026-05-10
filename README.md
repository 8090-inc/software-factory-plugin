# Universal AI Plugin Marketplace Template

Author AI assistant plugins once and distribute them to all major platforms at the
highest fidelity each one accepts.

## Supported Platforms

| Platform | Fidelity | Status |
|----------|----------|--------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Tier 1 (rich plugin) | Supported |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Tier 1 (rich extension) | Supported |
| [OpenAI Codex](https://developers.openai.com/codex/plugins/build) | Tier 1 (rich plugin) | Supported |
| [Cursor](https://www.cursor.com/) | Tier 1 (rich plugin) | Supported |
| [Kiro](https://kiro.dev/) | Tier 2 (standalone export) | Supported |
| [Vercel Skills CLI](https://sdk.vercel.ai/docs/ai-sdk-core/agents#skills) | Tier 3 (skills only) | Supported |

## Quick Start

### Create a new plugin

```bash
pnpm run scaffold my-plugin
```

### Validate all plugins

```bash
pnpm run validate
```

### Build standalone exports

```bash
pnpm run build:standalone
```

This generates standalone directories in `dist/` for platforms that require
repo-root manifests (Gemini CLI and Kiro). Claude Code, Cursor, and Codex read
plugins directly from `plugins/<name>/` via their marketplace registries.

## Repository Structure

```
ai-plugin-marketplace-template/
├── .claude-plugin/
│   └── marketplace.json              # Claude Code marketplace registry
├── .cursor-plugin/
│   └── marketplace.json              # Cursor marketplace registry
├── .agents/
│   └── plugins/
│       └── marketplace.json          # OpenAI Codex marketplace registry
├── plugins/
│   └── <plugin-name>/                # One directory per plugin
│       ├── .claude-plugin/
│       │   └── plugin.json           # Claude Code manifest
│       ├── .cursor-plugin/
│       │   └── plugin.json           # Cursor manifest
│       ├── .codex-plugin/
│       │   └── plugin.json           # OpenAI Codex manifest
│       ├── gemini-extension.json     # Gemini CLI manifest
│       ├── POWER.md                  # Kiro power entry point
│       ├── GEMINI.md                 # Gemini CLI context file
│       ├── .mcp.json                 # MCP config (Claude Code / Cursor / Codex)
│       ├── mcp.json                  # MCP config (Kiro)
│       ├── skills/                   # SKILL.md files (universal)
│       ├── agents/                   # Agent definitions (.md)
│       ├── rules/                    # Rules (.md for Claude, .mdc for Cursor)
│       ├── steering/                 # Kiro steering files
│       ├── commands/                 # Commands (.md for Claude/Cursor, .toml for Gemini)
│       ├── hooks/                    # Hook definitions (claude.yaml source)
│       ├── README.md
│       └── LICENSE
├── src/
│   ├── validate.ts                   # Validate plugins and manifests
│   ├── scaffold.ts                   # Create new plugin from template
│   ├── build-hooks.ts                # Convert hooks YAML → per-target JSON
│   └── build-standalone.ts           # Generate standalone exports
├── schemas/                          # JSON Schemas for plugin and marketplace manifests
├── templates/                        # Templates for scaffolding
├── dist/                             # Generated standalone repos
│   ├── gemini/
│   └── kiro/
└── README.md
```

## Platform Compatibility Matrix

| Feature | Claude Code | Cursor | Gemini CLI | Codex | Kiro | Skills CLI |
|---------|:-----------:|:------:|:----------:|:-----:|:----:|:----------:|
| Fidelity tier | 1 | 1 | 1 | 1 | 2 | 3 |
| Skills (SKILL.md) | native | native | native | native | via steering | native |
| Agents (.md) | native | native | native | — | derived (.kiro/agents) | — |
| Rules | .md | .mdc | — | — | steering/ | — |
| Hooks | claude.json | claude.json | hooks.json | — | .kiro/hooks/ | — |
| Commands | .md | .md/.mdc | .toml | — | — | — |
| MCP Servers | .mcp.json | .mcp.json | gemini-extension.json | .mcp.json | mcp.json | — |
| Interface metadata | — | — | — | interface block | POWER.md | — |
| Marketplace | marketplace.json | marketplace.json | distributed per extension | .agents/plugins/marketplace.json | powers panel | `npx skills find` |
| Multi-plugin repo | yes | yes | no (per-extension repo) | yes | no | yes |

## How It Works

> **Platform terminology note:** Claude Code, Cursor, and Codex call these
> *plugins*; Kiro calls them *powers*; Gemini CLI calls them *extensions*;
> Vercel calls them *skills*. This template uses "plugin" as the generic term
> throughout.

Each plugin is authored once under `plugins/<name>/` as a superset of every
component type — `agents/`, `skills/`, `commands/`, `hooks/`, `rules/`,
`steering/`, and MCP config. The build pipeline emits the **richest native
representation** each target tool accepts. Components a given target cannot
express natively are simply absent from its output — they are **not** flattened
into SKILL.md as a fallback.

### Tier 1: Rich plugins (Claude Code, Cursor, Gemini CLI, OpenAI Codex)

These platforms accept full plugin packages bundling multiple component types.

- **Claude Code and Cursor** share the same internal layout — `skills/`,
  `agents/`, `hooks/`, `commands/`, `.mcp.json` are identical. Only the
  manifest wrapper differs (`.claude-plugin/plugin.json` vs
  `.cursor-plugin/plugin.json`). Plugins are referenced directly from the
  per-tool root `marketplace.json`.
- **Gemini CLI** ships as an extension with a richer
  `gemini-extension.json` (MCP servers, `contextFileName`, `excludeTools`,
  `settings`) and native auto-discovered directories for `skills/`,
  `agents/*.md`, `commands/*.toml`, `hooks/hooks.json`, and `policies/*.toml`.
  `pnpm run build:standalone` writes the self-contained extension to
  `dist/gemini/<name>/`, with Claude-flavored agent tool names rewritten to
  Gemini equivalents (`Read` → `read_file`, `Write` → `write_file`, etc.) and
  the hook YAML converted to Gemini's `hooks.json`.
- **OpenAI Codex** reads plugins directly from this repo via
  `./.agents/plugins/marketplace.json`, with each plugin's manifest at
  `plugins/<name>/.codex-plugin/plugin.json`. The Codex manifest carries an
  `interface` block (`displayName`, `shortDescription`, `longDescription`,
  `category`, `capabilities`, `brandColor`, etc.) used to render the plugin in
  the Codex UI. Codex natively supports skills, MCP, apps, and interface
  metadata — sub-agents, commands, and hooks are absent from Codex output
  (they remain available to the Claude/Cursor/Gemini targets).

### Tier 2: Standalone export (Kiro)

Kiro expects its manifest at the repository root. `pnpm run build:standalone`
copies each plugin into `dist/kiro/<name>/` with POWER.md, `steering/`,
`skills/`, and auto-converted `.kiro/agents/*.json` configs (generated from the
Claude agent `.md` files). Kiro reads skills via steering context files rather
than natively parsing SKILL.md frontmatter, and has no commands concept.

### Tier 3: Lossy fallback (Vercel Skills CLI)

`npx skills add <owner>/<repo>` auto-discovers every `SKILL.md` in the
repository. Nothing else — sub-agents, commands, hooks, rules, and MCP configs
are **not** surfaced to Skills CLI consumers. Use this tier when a plugin's
value is carried entirely by its skills.

## OpenAI Codex

Codex plugins live alongside the other platforms' manifests:

- Per-plugin manifest: `plugins/<name>/.codex-plugin/plugin.json`.
- Repo-root marketplace: `.agents/plugins/marketplace.json` with entries of the
  form
  ```json
  {
    "name": "<plugin-name>",
    "source": { "source": "local", "path": "./plugins/<plugin-name>" },
    "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" }
  }
  ```
- The `interface` block on the plugin manifest drives Codex UI rendering
  (`displayName`, `shortDescription`, `longDescription`, `category`,
  `capabilities`, `brandColor`, `composerIcon`, `logo`, `screenshots`,
  `defaultPrompt`, `websiteURL`, `privacyPolicyURL`, `termsOfServiceURL`).

After installing a Codex user source pointing at this repo, `codex /plugins`
will list the plugin with its interface metadata.

## Example Plugin: skill-evaluator

The included `skill-evaluator` plugin demonstrates the full multi-platform
pattern end-to-end. It evaluates AI skills across model tiers (opus → sonnet →
haiku) using blind sub-agent testing.

See [plugins/skill-evaluator/README.md](plugins/skill-evaluator/README.md) for
details.

## Creating a Plugin Manually

If you prefer to create a plugin without the scaffold script:

1. Create a directory under `plugins/`.
2. Add platform manifests (see the `skill-evaluator` plugin for the Tier 1
   shape).
3. Add your skills, agents, rules, commands, and hooks.
4. Update all three root marketplace files:
   - `.claude-plugin/marketplace.json`
   - `.cursor-plugin/marketplace.json`
   - `.agents/plugins/marketplace.json`
5. Run `pnpm run validate` to verify everything is correct.
6. Run `pnpm run build:standalone` to generate Gemini and Kiro exports.

## npm Scripts

| Script | Description |
|--------|-------------|
| `pnpm run validate` | Validate all plugins and manifests |
| `pnpm run scaffold <name>` | Create a new plugin from templates |
| `pnpm run build:hooks` | Convert `hooks/*.yaml` sources to per-target JSON |
| `pnpm run build:standalone` | Generate standalone Gemini/Kiro exports |
| `pnpm run build` | Typecheck + build hooks + validate + build standalone |
| `pnpm run clean` | Remove dist/ directory |

## License

MIT
