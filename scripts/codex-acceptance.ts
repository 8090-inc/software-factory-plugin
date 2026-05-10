#!/usr/bin/env node
/**
 * Codex acceptance-test driver.
 *
 * Codex's CLI ships no `plugin validate` / `plugin list` command today (the
 * `plugins` feature is flagged `under development`), so end-to-end validation
 * requires the macOS Codex desktop app. This script minimizes the human's
 * involvement to one click (Install in the Codex app) + one paste (the
 * introspection prompt) — the marketplace itself is registered by writing
 * a `[marketplaces.<name>]` section into `~/.codex/config.toml`.
 *
 * Phases:
 *   preflight   — schema, path, and asset validation of the local plugin +
 *                 marketplace; writes the `[marketplaces.<name>]` entry to
 *                 ~/.codex/config.toml (idempotent, with a dated backup);
 *                 snapshots pre-install state; emits the copy-ready prompt.
 *   verify      — after Install + prompt paste, reads the agent-written
 *                 report + the on-disk cache + config.toml and prints a
 *                 pass/fail matrix.
 *   cleanup     — removes the marketplace entry, any plugin entries, and
 *                 the cache directory so the machine is left as-found.
 *
 * Usage:
 *   pnpm run test:codex            # preflight (writes marketplace entry)
 *   pnpm run test:codex:verify     # run after the in-app steps
 *   pnpm run test:codex:cleanup    # tear down
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCRATCH = path.join(ROOT, "scratch");
const SNAPSHOT_FILE = path.join(SCRATCH, "codex-acceptance-snapshot.json");
const REPORT_FILE = path.join(SCRATCH, "codex-introspection-report.json");
const PROMPT_FILE = path.join(SCRATCH, "codex-introspection-prompt.md");
const CODEX_HOME = path.join(os.homedir(), ".codex");
const CACHE_ROOT = path.join(CODEX_HOME, "plugins", "cache");
const CONFIG_TOML = path.join(CODEX_HOME, "config.toml");

/** Target plugin + marketplace under test. */
const MARKETPLACE_NAME = "ai-plugin-marketplace";
const PLUGIN_NAME = "skill-evaluator";
const PLUGIN_DIR = path.join(ROOT, "plugins", PLUGIN_NAME);
const MARKETPLACE_FILE = path.join(
  ROOT,
  ".agents",
  "plugins",
  "marketplace.json",
);

// ──────────────────────────────────────────────────────────────────────────
// Zod schemas — documented shape per developers.openai.com/codex/plugins/build
// ──────────────────────────────────────────────────────────────────────────

const codexAuthor = z.object({
  name: z.string(),
  email: z.string().optional(),
  url: z.string().optional(),
});

const codexInterface = z.object({
  displayName: z.string().min(1),
  shortDescription: z.string().min(1),
  longDescription: z.string().optional(),
  developerName: z.string().optional(),
  category: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  websiteURL: z.string().optional(),
  privacyPolicyURL: z.string().optional(),
  termsOfServiceURL: z.string().optional(),
  defaultPrompt: z.union([z.string(), z.array(z.string())]).optional(),
  brandColor: z.string().optional(),
  composerIcon: z.string().optional(),
  logo: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
});

const codexPlugin = z
  .object({
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    version: z.string().regex(/^\d+\.\d+\.\d+/),
    description: z.string().min(1),
    author: codexAuthor.optional(),
    homepage: z.string().optional(),
    repository: z.string().optional(),
    license: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    skills: z.string().optional(),
    mcpServers: z.string().optional(),
    apps: z.string().optional(),
    interface: codexInterface.optional(),
  })
  .strict();

const codexMarketplaceEntry = z.object({
  name: z.string(),
  source: z.object({
    source: z.literal("local"),
    path: z.string().regex(/^\.\//, "paths must start with ./"),
  }),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  policy: z
    .object({
      installation: z.enum([
        "AVAILABLE",
        "INSTALLED_BY_DEFAULT",
        "NOT_AVAILABLE",
      ]),
      authentication: z.enum(["ON_INSTALL", "ON_FIRST_USE"]).optional(),
    })
    .optional(),
});

const codexMarketplace = z.object({
  name: z.string(),
  owner: z.object({ name: z.string() }).optional(),
  metadata: z
    .object({
      version: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  plugins: z.array(codexMarketplaceEntry),
});

// ──────────────────────────────────────────────────────────────────────────
// Check harness
// ──────────────────────────────────────────────────────────────────────────

interface Check {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn" | "info";
  detail?: string;
}

const checks: Check[] = [];
const pass = (id: string, label: string, detail?: string) =>
  checks.push({ id, label, status: "pass", detail });
const fail = (id: string, label: string, detail: string) =>
  checks.push({ id, label, status: "fail", detail });
const warn = (id: string, label: string, detail: string) =>
  checks.push({ id, label, status: "warn", detail });
const info = (id: string, label: string, detail: string) =>
  checks.push({ id, label, status: "info", detail });

function printChecks(): boolean {
  let failed = 0;
  for (const c of checks) {
    const glyph =
      c.status === "pass"
        ? "✓"
        : c.status === "fail"
          ? "✗"
          : c.status === "warn"
            ? "!"
            : "·";
    const line = `  ${glyph} ${c.label}`;
    process.stdout.write(line + "\n");
    if (c.detail) process.stdout.write(`      ${c.detail}\n`);
    if (c.status === "fail") failed++;
  }
  return failed === 0;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function ensureScratch() {
  if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });
}

// ──────────────────────────────────────────────────────────────────────────
// Preflight
// ──────────────────────────────────────────────────────────────────────────

function preflight(): number {
  process.stdout.write("── Codex acceptance: preflight ──\n\n");

  // 1. Plugin manifest schema
  const manifestPath = path.join(PLUGIN_DIR, ".codex-plugin", "plugin.json");
  if (!fs.existsSync(manifestPath)) {
    fail("manifest-exists", "plugin.json present", manifestPath);
  } else {
    pass("manifest-exists", "plugin.json present");
    const parsed = codexPlugin.safeParse(readJson(manifestPath));
    if (!parsed.success) {
      fail(
        "manifest-schema",
        "plugin.json matches documented schema",
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    } else {
      pass("manifest-schema", "plugin.json matches documented schema");
      const m = parsed.data;

      // Name matches directory
      if (m.name !== PLUGIN_NAME) {
        fail(
          "manifest-name",
          "plugin.name matches directory name",
          `got "${m.name}", expected "${PLUGIN_NAME}"`,
        );
      } else pass("manifest-name", "plugin.name matches directory name");

      // Referenced paths exist
      const pathRefs: Array<[string, string | undefined]> = [
        ["skills", m.skills],
        ["mcpServers", m.mcpServers],
        ["apps", m.apps],
      ];
      for (const [field, ref] of pathRefs) {
        if (!ref) continue;
        const resolved = path.join(PLUGIN_DIR, ref);
        if (fs.existsSync(resolved)) {
          pass(`path-${field}`, `${field} → ${ref} resolves`);
        } else {
          fail(
            `path-${field}`,
            `${field} → ${ref} resolves`,
            `missing: ${resolved}`,
          );
        }
      }

      // Interface completeness
      if (!m.interface) {
        warn(
          "interface-present",
          "interface metadata present",
          "desktop app will show fallback UI without it",
        );
      } else {
        pass("interface-present", "interface metadata present");

        // Assets referenced by interface must exist
        const assetFields = [
          ["composerIcon", m.interface.composerIcon],
          ["logo", m.interface.logo],
        ] as const;
        for (const [field, ref] of assetFields) {
          if (!ref) continue;
          const resolved = path.join(PLUGIN_DIR, ref);
          if (fs.existsSync(resolved)) {
            pass(`asset-${field}`, `interface.${field} asset exists`);
          } else {
            warn(
              `asset-${field}`,
              `interface.${field} asset exists`,
              `missing: ${resolved} — desktop app will render a placeholder`,
            );
          }
        }
        for (const shot of m.interface.screenshots ?? []) {
          const resolved = path.join(PLUGIN_DIR, shot);
          if (!fs.existsSync(resolved)) {
            warn(
              `asset-shot-${shot}`,
              `screenshot ${shot} exists`,
              `missing: ${resolved}`,
            );
          }
        }
      }
    }
  }

  // 2. Marketplace schema
  if (!fs.existsSync(MARKETPLACE_FILE)) {
    fail("marketplace-exists", ".agents/plugins/marketplace.json present", MARKETPLACE_FILE);
  } else {
    pass("marketplace-exists", ".agents/plugins/marketplace.json present");
    const parsed = codexMarketplace.safeParse(readJson(MARKETPLACE_FILE));
    if (!parsed.success) {
      fail(
        "marketplace-schema",
        "marketplace.json matches documented schema",
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    } else {
      pass("marketplace-schema", "marketplace.json matches documented schema");
      const entry = parsed.data.plugins.find((p) => p.name === PLUGIN_NAME);
      if (!entry) {
        fail(
          "marketplace-lists-plugin",
          `marketplace lists "${PLUGIN_NAME}"`,
          "add a plugins[] entry in .agents/plugins/marketplace.json",
        );
      } else {
        pass("marketplace-lists-plugin", `marketplace lists "${PLUGIN_NAME}"`);
        const resolved = path.join(ROOT, entry.source.path);
        if (resolved !== PLUGIN_DIR) {
          fail(
            "marketplace-path",
            "source.path resolves to plugin directory",
            `expected ${PLUGIN_DIR}, got ${resolved}`,
          );
        } else pass("marketplace-path", "source.path resolves to plugin directory");

        if (parsed.data.name !== MARKETPLACE_NAME) {
          warn(
            "marketplace-name",
            `marketplace.name = "${MARKETPLACE_NAME}"`,
            `got "${parsed.data.name}" — verify prompt uses the correct name`,
          );
        } else pass("marketplace-name", `marketplace.name = "${MARKETPLACE_NAME}"`);
      }
    }
  }

  // 3. Pre-install snapshot
  ensureScratch();
  const snapshot = {
    takenAt: new Date().toISOString(),
    marketplaceName: MARKETPLACE_NAME,
    pluginName: PLUGIN_NAME,
    repoRoot: ROOT,
    cacheBefore: safeListDir(path.join(CACHE_ROOT, MARKETPLACE_NAME)),
    configTomlBefore: tomlHasPluginEntry(CONFIG_TOML, PLUGIN_NAME, MARKETPLACE_NAME),
    marketplaceEntryBefore: tomlHasMarketplaceEntry(CONFIG_TOML, MARKETPLACE_NAME),
  };
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
  info(
    "snapshot",
    "pre-install snapshot written",
    path.relative(ROOT, SNAPSHOT_FILE),
  );

  // 4. Register the marketplace in ~/.codex/config.toml
  try {
    const result = registerMarketplaceInConfig(CONFIG_TOML, {
      name: MARKETPLACE_NAME,
      source: ROOT,
    });
    if (result.action === "added")
      pass("register", `added [marketplaces.${MARKETPLACE_NAME}] → config.toml`);
    else if (result.action === "updated")
      pass(
        "register",
        `updated [marketplaces.${MARKETPLACE_NAME}] → config.toml`,
        `(was: ${result.previousSource ?? "unknown"})`,
      );
    else
      pass(
        "register",
        `[marketplaces.${MARKETPLACE_NAME}] already points at this repo`,
      );
    if (result.backupPath)
      info("register-backup", "config.toml backup", result.backupPath);
  } catch (e) {
    fail(
      "register",
      `register [marketplaces.${MARKETPLACE_NAME}] in config.toml`,
      String(e),
    );
  }

  // 4. Emit the introspection prompt
  const promptBody = renderIntrospectionPrompt({
    marketplaceName: MARKETPLACE_NAME,
    pluginName: PLUGIN_NAME,
    reportFile: REPORT_FILE,
  });
  fs.writeFileSync(PROMPT_FILE, promptBody);
  info(
    "prompt",
    "introspection prompt written",
    path.relative(ROOT, PROMPT_FILE),
  );

  const ok = printChecks();
  printManualSteps();
  return ok ? 0 : 1;
}

function safeListDir(p: string): string[] | null {
  if (!fs.existsSync(p)) return null;
  try {
    return fs.readdirSync(p);
  } catch {
    return null;
  }
}

function tomlHasPluginEntry(
  file: string,
  pluginName: string,
  marketplaceName: string,
): boolean {
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf8");
  const needle = `[plugins."${pluginName}@${marketplaceName}"]`;
  return text.includes(needle);
}

function tomlHasMarketplaceEntry(file: string, name: string): boolean {
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf8");
  return text.includes(`[marketplaces.${name}]`);
}

/**
 * Extract the value of a TOML string key inside a known section. Tolerates
 * optional surrounding whitespace. Returns null if section/key not found.
 */
function readTomlSectionString(
  text: string,
  section: string,
  key: string,
): string | null {
  const lines = text.split("\n");
  const header = `[${section}]`;
  const i = lines.findIndex((l) => l.trim() === header);
  if (i === -1) return null;
  for (let j = i + 1; j < lines.length; j++) {
    const line = lines[j];
    if (/^\[/.test(line.trim())) break;
    const m = line.match(
      new RegExp(`^\\s*${escapeRegex(key)}\\s*=\\s*"([^"]*)"`),
    );
    if (m) return m[1];
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Idempotently register a local marketplace in ~/.codex/config.toml.
 * Writes a dated backup before the first modification, then atomically
 * rewrites the file.
 */
function registerMarketplaceInConfig(
  file: string,
  opts: { name: string; source: string },
): {
  action: "added" | "updated" | "unchanged";
  previousSource?: string;
  backupPath?: string;
} {
  const header = `[marketplaces.${opts.name}]`;
  const block = [
    header,
    `last_updated = "${new Date().toISOString()}"`,
    `source_type = "local"`,
    `source = "${opts.source.replace(/"/g, '\\"')}"`,
    "",
  ].join("\n");

  const exists = fs.existsSync(file);
  const original = exists ? fs.readFileSync(file, "utf8") : "";

  const sectionRegex = new RegExp(
    `(^|\\n)${escapeRegex(header)}\\n(?:(?!\\[).*\\n?)*`,
    "s",
  );
  let next: string;
  let action: "added" | "updated" | "unchanged";
  let previousSource: string | undefined;

  if (sectionRegex.test(original)) {
    previousSource =
      readTomlSectionString(original, `marketplaces.${opts.name}`, "source") ??
      undefined;
    if (previousSource === opts.source) {
      // Still rewrite to refresh `last_updated`, but mark unchanged.
      next = original.replace(sectionRegex, (match) =>
        match.startsWith("\n") ? "\n" + block : block,
      );
      action = "unchanged";
    } else {
      next = original.replace(sectionRegex, (match) =>
        match.startsWith("\n") ? "\n" + block : block,
      );
      action = "updated";
    }
  } else {
    const suffix = original.endsWith("\n") || original === "" ? "" : "\n";
    next = original + suffix + (original === "" ? "" : "\n") + block;
    action = "added";
  }

  if (next === original) return { action: "unchanged", previousSource };

  // Backup before modifying.
  let backupPath: string | undefined;
  if (exists) {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .replace(/\..+$/, "");
    backupPath = `${file}.bak-${stamp}`;
    fs.copyFileSync(file, backupPath);
  }

  // Atomic write.
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, file);
  return { action, previousSource, backupPath };
}

/**
 * Remove the `[marketplaces.<name>]` section, any
 * `[plugins."<x>@<name>"]` sections, and optionally the cache dir.
 */
function unregisterMarketplaceFromConfig(
  file: string,
  opts: { name: string },
): { removed: string[]; backupPath?: string } {
  if (!fs.existsSync(file)) return { removed: [] };
  const original = fs.readFileSync(file, "utf8");
  const removed: string[] = [];
  let next = original;

  const marketplaceRegex = new RegExp(
    `(^|\\n)${escapeRegex(`[marketplaces.${opts.name}]`)}\\n(?:(?!\\[).*\\n?)*`,
    "s",
  );
  if (marketplaceRegex.test(next)) {
    next = next.replace(marketplaceRegex, "\n");
    removed.push(`[marketplaces.${opts.name}]`);
  }

  const pluginRegex = new RegExp(
    `(^|\\n)\\[plugins\\."[^"]+@${escapeRegex(opts.name)}"\\]\\n(?:(?!\\[).*\\n?)*`,
    "sg",
  );
  const pluginMatches = next.match(pluginRegex) ?? [];
  for (const m of pluginMatches)
    removed.push(m.match(/\[plugins\."[^"]+@[^"]+"\]/)?.[0] ?? m.trim());
  next = next.replace(pluginRegex, "\n");

  // Collapse runs of 3+ newlines introduced by removals.
  next = next.replace(/\n{3,}/g, "\n\n");

  if (next === original) return { removed };

  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .replace(/\..+$/, "");
  const backupPath = `${file}.bak-${stamp}`;
  fs.copyFileSync(file, backupPath);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, file);
  return { removed, backupPath };
}

function printManualSteps() {
  const steps = `
── Manual steps in the Codex desktop app ──

  The marketplace is already registered in ~/.codex/config.toml — you do
  not need to click "Add marketplace".

  1.  Open (or restart) Codex.app and go to the  Plugins  panel.
      Find the marketplace "${MARKETPLACE_NAME}" and click  Install  on
      "${PLUGIN_NAME}". Wait until the status shows "Installed".

  2.  In the Codex composer (a new session in this repo is fine), paste
      the entire contents of:

          scratch/codex-introspection-prompt.md

      and send. The agent writes its report to
      scratch/codex-introspection-report.json, then replies "report
      written".

  3.  Back in this terminal, run:

          pnpm run test:codex:verify

  When you're done, tear everything down with:

          pnpm run test:codex:cleanup
`;
  process.stdout.write(steps + "\n");
}

function renderIntrospectionPrompt(opts: {
  marketplaceName: string;
  pluginName: string;
  reportFile: string;
}): string {
  const { marketplaceName, pluginName, reportFile } = opts;
  return `# Codex plugin acceptance — introspection prompt

You are being asked to self-report the state of a specific plugin installation
so an external verifier can confirm Codex accepted it correctly. Do not install
or modify anything. Just observe and write a report.

## Target

- Marketplace: \`${marketplaceName}\`
- Plugin: \`${pluginName}\`

## Steps

1. Inspect the plugin cache under \`~/.codex/plugins/cache/${marketplaceName}/${pluginName}/\`.
   Resolve the single version directory that exists (it will be a commit-hash
   or \`local\`). Call that \`$VERSION\`.
2. Read \`~/.codex/plugins/cache/${marketplaceName}/${pluginName}/$VERSION/.codex-plugin/plugin.json\`.
3. Read \`~/.codex/config.toml\` and find the \`[plugins."${pluginName}@${marketplaceName}"]\`
   section (if present).
4. From your own runtime state, enumerate:
   - Skills currently loaded from this plugin (name + absolute location).
   - MCP servers currently running from this plugin (name + command + status).
   - Apps/connectors attached from this plugin.
5. For each skill in the plugin's \`skills\` directory, confirm Codex's skill
   loader has picked it up — compare your loaded skills list against the
   filesystem.

## Output

Write the report as JSON to:

    ${reportFile}

Schema:

\`\`\`json
{
  "pluginName": "${pluginName}",
  "marketplaceName": "${marketplaceName}",
  "version": "<resolved version dir name>",
  "cachePath": "<absolute path to version dir>",
  "configTomlEntry": true | false,
  "manifest": { /* contents of .codex-plugin/plugin.json */ },
  "loadedSkills": [ { "name": "...", "location": "..." } ],
  "expectedSkills": [ { "name": "...", "location": "..." } ],
  "mcpServers": [ { "name": "...", "status": "...", "command": "..." } ],
  "apps": [ { "name": "...", "status": "..." } ],
  "notes": "<free text — anything unexpected>"
}
\`\`\`

After writing the file, reply with just \`report written\`. Do not summarize.
`;
}

// ──────────────────────────────────────────────────────────────────────────
// Verify
// ──────────────────────────────────────────────────────────────────────────

function verify(): number {
  process.stdout.write("── Codex acceptance: verify ──\n\n");

  if (!fs.existsSync(SNAPSHOT_FILE)) {
    fail(
      "snapshot-missing",
      "pre-install snapshot exists",
      "run `pnpm run test:codex` first",
    );
    printChecks();
    return 1;
  }

  const snapshot = readJson<{
    cacheBefore: string[] | null;
    configTomlBefore: boolean;
  }>(SNAPSHOT_FILE);

  // 1. Cache directory populated
  const cacheMarketplace = path.join(CACHE_ROOT, MARKETPLACE_NAME);
  const versionDirs =
    safeListDir(path.join(cacheMarketplace, PLUGIN_NAME)) ?? [];
  if (versionDirs.length === 0) {
    fail(
      "cache-populated",
      `cache dir populated at ~/.codex/plugins/cache/${MARKETPLACE_NAME}/${PLUGIN_NAME}/`,
      "did you click Install in the Codex app?",
    );
  } else {
    pass(
      "cache-populated",
      `cache dir populated (version: ${versionDirs.join(", ")})`,
    );

    // 2. Manifest in cache matches source
    const cachedManifest = path.join(
      cacheMarketplace,
      PLUGIN_NAME,
      versionDirs[0],
      ".codex-plugin",
      "plugin.json",
    );
    const sourceManifest = path.join(
      PLUGIN_DIR,
      ".codex-plugin",
      "plugin.json",
    );
    if (!fs.existsSync(cachedManifest)) {
      fail("cache-manifest", "cached plugin.json exists", cachedManifest);
    } else {
      pass("cache-manifest", "cached plugin.json exists");
      try {
        const a = JSON.stringify(readJson(cachedManifest));
        const b = JSON.stringify(readJson(sourceManifest));
        if (a === b) pass("cache-manifest-matches", "cached manifest === source manifest");
        else
          warn(
            "cache-manifest-matches",
            "cached manifest === source manifest",
            "Codex may have normalized/augmented — diff manually if concerned",
          );
      } catch (e) {
        warn(
          "cache-manifest-matches",
          "cached manifest === source manifest",
          String(e),
        );
      }
    }
  }

  // 3. config.toml updated
  const cfgHas = tomlHasPluginEntry(CONFIG_TOML, PLUGIN_NAME, MARKETPLACE_NAME);
  if (!cfgHas && snapshot.configTomlBefore) {
    warn(
      "config-entry",
      `[plugins."${PLUGIN_NAME}@${MARKETPLACE_NAME}"] in config.toml`,
      "pre-existing entry removed — double-check",
    );
  } else if (!cfgHas) {
    fail(
      "config-entry",
      `[plugins."${PLUGIN_NAME}@${MARKETPLACE_NAME}"] in config.toml`,
      "no entry found — installation may not have persisted",
    );
  } else {
    pass(
      "config-entry",
      `[plugins."${PLUGIN_NAME}@${MARKETPLACE_NAME}"] in config.toml`,
    );
  }

  // 4. Agent introspection report
  if (!fs.existsSync(REPORT_FILE)) {
    fail(
      "report-exists",
      "agent report written",
      `missing: ${path.relative(ROOT, REPORT_FILE)} — did you paste the prompt into the Codex app?`,
    );
  } else {
    pass("report-exists", "agent report written");
    try {
      const r = readJson<{
        configTomlEntry?: boolean;
        loadedSkills?: Array<{ name: string; location: string }>;
        expectedSkills?: Array<{ name: string; location: string }>;
        mcpServers?: Array<{ name: string; status: string }>;
        apps?: Array<{ name: string; status: string }>;
        notes?: string;
      }>(REPORT_FILE);

      if (r.configTomlEntry === false && cfgHas) {
        warn(
          "report-config",
          "agent saw config.toml entry",
          "filesystem has it but agent reports missing — stale session?",
        );
      } else if (r.configTomlEntry) {
        pass("report-config", "agent confirms config.toml entry");
      }

      const loaded = r.loadedSkills ?? [];
      const expected = r.expectedSkills ?? [];
      if (expected.length === 0) {
        info("skills-expected", "agent enumerated plugin skills", "none reported");
      } else {
        const missing = expected.filter(
          (e) => !loaded.some((l) => l.name === e.name),
        );
        if (missing.length === 0) {
          pass(
            "skills-loaded",
            `all ${expected.length} plugin skill(s) loaded by Codex`,
          );
        } else {
          fail(
            "skills-loaded",
            "all plugin skills loaded by Codex",
            `not loaded: ${missing.map((m) => m.name).join(", ")}`,
          );
        }
      }

      if (r.mcpServers && r.mcpServers.length > 0) {
        const ok = r.mcpServers.filter((m) => /run|start|ok/i.test(m.status));
        if (ok.length === r.mcpServers.length) {
          pass(
            "mcp-servers",
            `all ${r.mcpServers.length} MCP server(s) running`,
          );
        } else {
          warn(
            "mcp-servers",
            "MCP servers running",
            r.mcpServers.map((m) => `${m.name}: ${m.status}`).join("; "),
          );
        }
      }

      if (r.notes) {
        info("agent-notes", "agent notes", r.notes);
      }
    } catch (e) {
      fail(
        "report-parse",
        "agent report is valid JSON",
        String(e),
      );
    }
  }

  const ok = printChecks();
  process.stdout.write(
    "\n" +
      (ok
        ? "All automated Codex acceptance checks passed.\n"
        : "One or more checks failed — see detail above.\n"),
  );
  return ok ? 0 : 1;
}

// ──────────────────────────────────────────────────────────────────────────
// Cleanup
// ──────────────────────────────────────────────────────────────────────────

function cleanup(): number {
  process.stdout.write("── Codex acceptance: cleanup ──\n\n");

  try {
    const { removed, backupPath } = unregisterMarketplaceFromConfig(
      CONFIG_TOML,
      { name: MARKETPLACE_NAME },
    );
    if (removed.length === 0) {
      info("unregister", "config.toml", "no matching sections found");
    } else {
      pass(
        "unregister",
        `removed ${removed.length} section(s) from config.toml`,
        removed.join(", "),
      );
      if (backupPath) info("unregister-backup", "config.toml backup", backupPath);
    }
  } catch (e) {
    fail("unregister", "remove config.toml sections", String(e));
  }

  const cacheDir = path.join(CACHE_ROOT, MARKETPLACE_NAME);
  if (fs.existsSync(cacheDir)) {
    try {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      pass("cache-cleared", `removed cache dir ${cacheDir}`);
    } catch (e) {
      fail("cache-cleared", "remove cache dir", String(e));
    }
  } else {
    info("cache-cleared", "cache dir", "already absent");
  }

  for (const f of [SNAPSHOT_FILE, REPORT_FILE, PROMPT_FILE]) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }
  info("scratch-cleared", "scratch artifacts removed", "");

  const ok = printChecks();
  process.stdout.write(
    "\nYou may need to restart Codex.app for the change to take effect.\n",
  );
  return ok ? 0 : 1;
}

// ──────────────────────────────────────────────────────────────────────────
// Entry
// ──────────────────────────────────────────────────────────────────────────

const [, , cmd = "preflight"] = process.argv;
switch (cmd) {
  case "preflight":
    process.exit(preflight());
  case "verify":
    process.exit(verify());
  case "cleanup":
    process.exit(cleanup());
  default:
    process.stderr.write(`unknown subcommand: ${cmd}\n`);
    process.stderr.write(
      "usage: codex-acceptance.ts [preflight|verify|cleanup]\n",
    );
    process.exit(2);
}
