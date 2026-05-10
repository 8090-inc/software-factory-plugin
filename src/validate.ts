#!/usr/bin/env node
/**
 * Validates all plugins and marketplace manifests are in sync.
 *
 * Checks:
 * - Each plugin directory has all required files
 * - Name fields are consistent across plugin.json, gemini-extension.json, POWER.md, and directory name
 * - .mcp.json and mcp.json have the same mcpServers keys
 * - Root marketplace.json files list all plugin directories
 * - Marketplace entry path fields point to actual plugin directories
 * - Each plugin has a README.md
 * - SKILL.md frontmatter is valid per agentskills.io spec (name, description, body length)
 * - Files referenced in plugin.json manifests (skills, agents, commands, hooks) exist on disk
 * - Agent .md files have name and description in frontmatter
 * - hooks/claude.json has a valid Claude Code hooks object
 * - POWER.md frontmatter has name, description, and version
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLUGINS_DIR = path.join(ROOT, "plugins");
const CLAUDE_MARKETPLACE = path.join(ROOT, ".claude-plugin", "marketplace.json");
const CURSOR_MARKETPLACE = path.join(ROOT, ".cursor-plugin", "marketplace.json");
const CODEX_MARKETPLACE = path.join(ROOT, ".agents", "plugins", "marketplace.json");

export const REQUIRED_FILES = [
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  "gemini-extension.json",
  "POWER.md",
  "GEMINI.md",
  ".mcp.json",
  "mcp.json",
];

export interface ValidationResult {
  passed: string[];
  failed: string[];
}

function pass(results: ValidationResult, msg: string): void {
  results.passed.push(msg);
}

function fail(results: ValidationResult, msg: string): void {
  results.failed.push(msg);
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function readJson(filePath: string): unknown {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as unknown;
}

/**
 * Extract a named field from YAML frontmatter (between --- markers).
 * Returns undefined if not found.
 */
export function parseFrontmatterField(content: string, field: string): string | undefined {
  const fmMatch = /^---\s*\n([\s\S]*?)\n---/m.exec(content);
  if (!fmMatch) return undefined;
  const frontmatter = fmMatch[1] ?? "";
  const fieldMatch = new RegExp(`^${field}:\\s*(.+)$`, "m").exec(frontmatter);
  return fieldMatch ? (fieldMatch[1]?.trim() ?? undefined) : undefined;
}

function getPluginDirectories(): string[] {
  if (!fs.existsSync(PLUGINS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

export function validatePluginFiles(pluginDir: string, pluginName: string, results: ValidationResult): void {
  for (const relPath of REQUIRED_FILES) {
    const fullPath = path.join(pluginDir, relPath);
    if (fileExists(fullPath)) {
      pass(results, `[${pluginName}] Required file present: ${relPath}`);
    } else {
      fail(results, `[${pluginName}] Missing required file: ${relPath}`);
    }
  }

  // Check for at least one SKILL.md in skills/
  const skillsDir = path.join(pluginDir, "skills");
  if (fs.existsSync(skillsDir)) {
    const skillFiles = findFilesRecursive(skillsDir, "SKILL.md");
    if (skillFiles.length > 0) {
      pass(results, `[${pluginName}] At least one SKILL.md found in skills/ (${skillFiles.length})`);
    } else {
      fail(results, `[${pluginName}] No SKILL.md found in skills/`);
    }
  } else {
    fail(results, `[${pluginName}] Missing skills/ directory`);
  }
}

function findFilesRecursive(dir: string, filename: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFilesRecursive(fullPath, filename));
    } else if (entry.name === filename) {
      results.push(fullPath);
    }
  }
  return results;
}

const PluginJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  agents: z.union([z.string(), z.array(z.string())]).optional(),
  commands: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown())]).optional(),
  hooks: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  keywords: z.array(z.string()).optional(),
}).loose();

const GeminiExtensionSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
}).loose();

const McpJsonSchema = z.object({
  mcpServers: z.record(z.string(), z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
  }).loose()).optional(),
}).loose();

export function validateNameConsistency(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const names: Record<string, string | undefined> = {
    "directory": pluginName,
  };

  const claudePluginPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  if (fileExists(claudePluginPath)) {
    try {
      const json = PluginJsonSchema.parse(readJson(claudePluginPath));
      names[".claude-plugin/plugin.json"] = json.name;
    } catch {
      fail(results, `[${pluginName}] Failed to parse .claude-plugin/plugin.json`);
    }
  }

  const cursorPluginPath = path.join(pluginDir, ".cursor-plugin", "plugin.json");
  if (fileExists(cursorPluginPath)) {
    try {
      const json = PluginJsonSchema.parse(readJson(cursorPluginPath));
      names[".cursor-plugin/plugin.json"] = json.name;
    } catch {
      fail(results, `[${pluginName}] Failed to parse .cursor-plugin/plugin.json`);
    }
  }

  const codexPluginPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
  if (fileExists(codexPluginPath)) {
    try {
      const json = PluginJsonSchema.parse(readJson(codexPluginPath));
      names[".codex-plugin/plugin.json"] = json.name;
    } catch {
      fail(results, `[${pluginName}] Failed to parse .codex-plugin/plugin.json`);
    }
  }

  const geminiPath = path.join(pluginDir, "gemini-extension.json");
  if (fileExists(geminiPath)) {
    try {
      const json = GeminiExtensionSchema.parse(readJson(geminiPath));
      names["gemini-extension.json"] = json.name;
    } catch {
      fail(results, `[${pluginName}] Failed to parse gemini-extension.json`);
    }
  }

  const powerMdPath = path.join(pluginDir, "POWER.md");
  if (fileExists(powerMdPath)) {
    try {
      const content = fs.readFileSync(powerMdPath, "utf-8");
      const name = parseFrontmatterField(content, "name");
      names["POWER.md frontmatter"] = name;
    } catch {
      fail(results, `[${pluginName}] Failed to read POWER.md`);
    }
  }

  // Compare all found names against the directory name.
  // Only emit a pass if at least one non-directory source was checked.
  const nonDirectorySources = Object.keys(names).filter((k) => k !== "directory");
  if (nonDirectorySources.length === 0) {
    fail(results, `[${pluginName}] No plugin manifest files found to validate name consistency`);
    return;
  }

  let allConsistent = true;
  for (const source of nonDirectorySources) {
    const name = names[source];
    if (name === undefined) {
      fail(results, `[${pluginName}] Missing 'name' field in ${source}`);
      allConsistent = false;
    } else if (name !== pluginName) {
      fail(results, `[${pluginName}] Name mismatch in ${source}: expected "${pluginName}", got "${name}"`);
      allConsistent = false;
    }
  }

  if (allConsistent) {
    pass(results, `[${pluginName}] Name is consistent across all files`);
  }
}

export function validateMcpSync(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const hiddenMcpPath = path.join(pluginDir, ".mcp.json");
  const mcpPath = path.join(pluginDir, "mcp.json");

  if (!fileExists(hiddenMcpPath) || !fileExists(mcpPath)) {
    // Missing files are reported by file presence check — skip sync check
    return;
  }

  try {
    const hiddenMcp = McpJsonSchema.parse(readJson(hiddenMcpPath));
    const mcp = McpJsonSchema.parse(readJson(mcpPath));

    const hiddenKeys = Object.keys(hiddenMcp.mcpServers ?? {}).sort();
    const mcpKeys = Object.keys(mcp.mcpServers ?? {}).sort();

    const hiddenKeysStr = JSON.stringify(hiddenKeys);
    const mcpKeysStr = JSON.stringify(mcpKeys);

    if (hiddenKeysStr === mcpKeysStr) {
      pass(results, `[${pluginName}] .mcp.json and mcp.json have consistent mcpServers keys`);
    } else {
      fail(
        results,
        `[${pluginName}] mcpServers key mismatch — .mcp.json: [${hiddenKeys.join(", ")}], mcp.json: [${mcpKeys.join(", ")}]`,
      );
    }
  } catch {
    fail(results, `[${pluginName}] Failed to parse .mcp.json or mcp.json for key comparison`);
  }
}

const MarketplaceEntrySchema = z.object({
  name: z.string(),
  source: z.union([z.string(), z.record(z.string(), z.unknown())]),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).loose();

const MarketplaceOwnerSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  url: z.string().optional(),
}).loose();

const MarketplaceJsonSchema = z.object({
  name: z.string(),
  owner: MarketplaceOwnerSchema,
  plugins: z.array(MarketplaceEntrySchema),
  metadata: z.object({
    version: z.string().optional(),
    description: z.string().optional(),
  }).loose().optional(),
}).loose();

/**
 * Resolve the source field of a marketplace entry to a filesystem path string.
 * Only string sources are resolved against ROOT; object sources (GitHub, npm, etc.) are skipped.
 */
export function resolveMarketplaceSource(source: string | Record<string, unknown> | undefined): string | undefined {
  if (typeof source !== "string") return undefined;
  // Strip leading "./" so we can join with ROOT cleanly
  const normalized = source.startsWith("./") ? source.slice(2) : source;
  return normalized;
}

export function validateMarketplace(
  marketplacePath: string,
  pluginNames: string[],
  label: string,
  results: ValidationResult,
): void {
  if (!fileExists(marketplacePath)) {
    fail(results, `[marketplace] Missing ${label}`);
    return;
  }

  let marketplace: z.infer<typeof MarketplaceJsonSchema>;
  try {
    marketplace = MarketplaceJsonSchema.parse(readJson(marketplacePath));
  } catch {
    fail(results, `[marketplace] Failed to parse ${label}`);
    return;
  }

  const plugins = marketplace.plugins;

  // Check every plugin directory is listed. A single entry must match both name and source.
  for (const pluginName of pluginNames) {
    const expectedPath = `plugins/${pluginName}`;
    const found = plugins.some((entry) => {
      const resolved = resolveMarketplaceSource(entry.source);
      return entry.name === pluginName && resolved === expectedPath;
    });
    if (found) {
      pass(results, `[marketplace] ${label} lists plugin: ${pluginName}`);
    } else {
      fail(results, `[marketplace] ${label} is missing plugin: ${pluginName}`);
    }
  }

  // Check every marketplace entry's source (if a string path) points to a real directory
  for (const entry of plugins) {
    if (typeof entry.source !== "string") {
      // Object sources (GitHub, npm, etc.) — skip local filesystem check
      pass(results, `[marketplace] ${label} entry "${entry.name}" uses object source (skipping path check)`);
      continue;
    }

    const normalizedSource = resolveMarketplaceSource(entry.source);
    if (normalizedSource === undefined) continue;

    const resolvedPath = path.join(ROOT, normalizedSource);
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      pass(results, `[marketplace] ${label} source exists: ${entry.source}`);
    } else {
      fail(results, `[marketplace] ${label} source does not exist or is not a directory: ${entry.source}`);
    }
  }
}

export function validateReadme(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const readmePath = path.join(pluginDir, "README.md");
  if (fileExists(readmePath)) {
    pass(results, `[${pluginName}] README.md present`);
  } else {
    fail(results, `[${pluginName}] Missing README.md`);
  }
}

export function validateSkillFrontmatter(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const skillsDir = path.join(pluginDir, "skills");
  if (!fs.existsSync(skillsDir)) return;

  const skillFiles = findFilesRecursive(skillsDir, "SKILL.md");

  for (const skillPath of skillFiles) {
    const content = fs.readFileSync(skillPath, "utf-8");
    const relPath = path.relative(pluginDir, skillPath);
    // Derive expected skill name from parent directory
    const parentDir = path.basename(path.dirname(skillPath));

    // Check name field (required per agentskills.io)
    const name = parseFrontmatterField(content, "name");
    if (name === undefined) {
      fail(results, `[${pluginName}] ${relPath}: missing required 'name' in frontmatter`);
    } else {
      // Validate name constraints per agentskills.io spec
      if (name.length > 64) {
        fail(results, `[${pluginName}] ${relPath}: name exceeds 64 characters`);
      } else if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        fail(results, `[${pluginName}] ${relPath}: name must be lowercase alphanumeric with hyphens, starting with a letter`);
      } else if (name.includes("--")) {
        fail(results, `[${pluginName}] ${relPath}: name must not contain consecutive hyphens`);
      } else if (name.endsWith("-")) {
        fail(results, `[${pluginName}] ${relPath}: name must not end with a hyphen`);
      } else if (name !== parentDir) {
        fail(results, `[${pluginName}] ${relPath}: name "${name}" does not match parent directory "${parentDir}"`);
      } else {
        pass(results, `[${pluginName}] ${relPath}: name "${name}" is valid and matches directory`);
      }
    }

    // Check description field (required per agentskills.io)
    const description = parseFrontmatterField(content, "description");
    if (description === undefined || description.length === 0) {
      fail(results, `[${pluginName}] ${relPath}: missing required 'description' in frontmatter`);
    } else if (description.length > 1024) {
      fail(results, `[${pluginName}] ${relPath}: description exceeds 1024 characters`);
    } else {
      pass(results, `[${pluginName}] ${relPath}: description present and valid`);
    }

    // Check body length recommendation (500 lines max)
    const bodyStart = content.indexOf("---", content.indexOf("---") + 3);
    if (bodyStart !== -1) {
      const body = content.slice(bodyStart + 3).trim();
      const bodyLines = body.split("\n").length;
      if (bodyLines > 500) {
        fail(results, `[${pluginName}] ${relPath}: body is ${bodyLines} lines (recommended max 500)`);
      }
    }
  }
}

/**
 * Plugin manifest schema reflecting the real Claude Code schema.
 *
 * - `skills`: directory path string or array of directory path strings (not SKILL.md paths)
 * - `agents`: .md file path string or array of .md file path strings
 * - `commands`: path string, array of path strings, or record of command objects
 * - `hooks`: path string to .json file, or inline hooks object
 *
 * All path strings must start with "./".
 */
const PluginManifestSchema = z.object({
  name: z.string().optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  agents: z.union([z.string(), z.array(z.string())]).optional(),
  commands: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown())]).optional(),
  hooks: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
}).loose();

/**
 * Normalize a manifest field that can be a string path, an array of string paths,
 * or a non-path value (object/undefined). Returns only the string path entries.
 */
export function normalizePathField(value: string | string[] | Record<string, unknown> | undefined): string[] {
  if (value === undefined) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  // Object value (inline hooks object, record of commands) — no paths to check
  return [];
}

export function validateManifestFileRefs(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const manifests = [
    { relPath: ".claude-plugin/plugin.json", label: "claude-plugin" },
    { relPath: ".cursor-plugin/plugin.json", label: "cursor-plugin" },
  ];

  for (const { relPath, label } of manifests) {
    const fullPath = path.join(pluginDir, relPath);
    if (!fileExists(fullPath)) continue;

    let manifest: z.infer<typeof PluginManifestSchema>;
    try {
      manifest = PluginManifestSchema.parse(readJson(fullPath));
    } catch {
      continue; // Parse errors reported elsewhere
    }

    // skills: directory paths — check that the directory exists
    const skillPaths = normalizePathField(manifest.skills);
    // agents: .md file paths — check that the file exists
    const agentPaths = normalizePathField(manifest.agents);
    // commands: path string(s) — check that file or directory exists
    const commandPaths = normalizePathField(manifest.commands);
    // hooks: path string to .json file — check that the file exists (skip inline objects)
    const hookPaths = typeof manifest.hooks === "string" ? [manifest.hooks] : [];

    const refGroups: { field: string; paths: string[] }[] = [
      { field: "skills", paths: skillPaths },
      { field: "agents", paths: agentPaths },
      { field: "commands", paths: commandPaths },
      { field: "hooks", paths: hookPaths },
    ];

    let allRefsValid = true;
    for (const { field, paths: refPaths } of refGroups) {
      for (const refPath of refPaths) {
        // All manifest paths must start with "./" and must not contain ".." segments
        if (!refPath.startsWith("./")) {
          fail(results, `[${pluginName}] ${label} ${field} path must start with "./": ${refPath}`);
          allRefsValid = false;
          continue;
        }
        if (refPath.includes("..")) {
          fail(results, `[${pluginName}] ${label} ${field} path must not contain "..": ${refPath}`);
          allRefsValid = false;
          continue;
        }
        const normalized = refPath.slice(2);
        const resolvedPath = path.join(pluginDir, normalized);
        if (!fs.existsSync(resolvedPath)) {
          fail(results, `[${pluginName}] ${label} ${field} references non-existent path: ${refPath}`);
          allRefsValid = false;
        }
      }
    }

    if (allRefsValid) {
      pass(results, `[${pluginName}] ${label} manifest file references are all valid`);
    }
  }
}

export function validateAgentFrontmatter(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const agentsDir = path.join(pluginDir, "agents");
  if (!fs.existsSync(agentsDir)) return;

  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const agentPath = path.join(agentsDir, entry.name);
    const content = fs.readFileSync(agentPath, "utf-8");

    const name = parseFrontmatterField(content, "name");
    const description = parseFrontmatterField(content, "description");

    if (name === undefined) {
      fail(results, `[${pluginName}] agents/${entry.name}: missing 'name' in frontmatter`);
    }
    if (description === undefined) {
      fail(results, `[${pluginName}] agents/${entry.name}: missing 'description' in frontmatter`);
    }
    if (name !== undefined && description !== undefined) {
      pass(results, `[${pluginName}] agents/${entry.name}: frontmatter valid (name + description)`);
    }
  }
}

export function validateClaudeHooks(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const hooksDir = path.join(pluginDir, "hooks");
  if (!fs.existsSync(hooksDir)) return;

  const hooksPath = path.join(hooksDir, "claude.json");
  if (!fileExists(hooksPath)) return;

  try {
    const HookEntrySchema = z.object({
      type: z.enum(["command"]),
      command: z.string(),
    }).loose();

    const HookMatcherSchema = z.object({
      matcher: z.string().optional(),
      description: z.string().optional(),
      hooks: z.array(HookEntrySchema),
    }).loose();

    const HooksFileSchema = z.object({
      hooks: z.record(z.string(), z.array(HookMatcherSchema)),
    }).loose();
    const parseResult = HooksFileSchema.safeParse(readJson(hooksPath));
    if (parseResult.success) {
      const validEvents = new Set(["PreToolUse", "PostToolUse", "Stop", "UserPromptSubmit"]);
      const hookEvents = Object.keys(parseResult.data.hooks);
      const invalidEvents = hookEvents.filter((e) => !validEvents.has(e));
      if (invalidEvents.length > 0) {
        fail(results, `[${pluginName}] hooks/claude.json has unknown event types: ${invalidEvents.join(", ")}`);
      } else {
        pass(results, `[${pluginName}] hooks/claude.json has valid hooks object`);
      }
    } else {
      fail(results, `[${pluginName}] hooks/claude.json 'hooks' must be an object keyed by event type (PreToolUse, PostToolUse, Stop, UserPromptSubmit)`);
    }
  } catch {
    fail(results, `[${pluginName}] hooks/claude.json is not valid JSON`);
  }
}

/**
 * Schema for the Codex plugin manifest (.codex-plugin/plugin.json).
 * Mirrors schemas/codex-plugin.json. `skills`, `mcpServers`, and `apps` are
 * string paths (unlike Claude's skills/agents which can also be arrays).
 */
const CodexInterfaceSchema = z.object({
  displayName: z.string().min(1),
  shortDescription: z.string().min(1),
  longDescription: z.string().optional(),
  category: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  brandColor: z.string().optional(),
  composerIcon: z.string().optional(),
  logo: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
  defaultPrompt: z.string().optional(),
  websiteURL: z.string().optional(),
  privacyPolicyURL: z.string().optional(),
  termsOfServiceURL: z.string().optional(),
}).loose();

const CodexPluginManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string().optional(),
    url: z.string().optional(),
  }).loose().optional(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  skills: z.string().optional(),
  mcpServers: z.string().optional(),
  apps: z.string().optional(),
  interface: CodexInterfaceSchema,
}).loose();

/**
 * Required fields on the Codex interface object — these must be non-empty
 * even when the rest of the interface block is minimally populated.
 */
const CODEX_INTERFACE_REQUIRED: readonly (keyof z.infer<typeof CodexInterfaceSchema>)[] = [
  "displayName",
  "shortDescription",
];

export function validateCodexManifest(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const codexPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
  if (!fileExists(codexPath)) {
    // Missing file already reported by validatePluginFiles — skip deeper checks.
    return;
  }

  const parseResult = CodexPluginManifestSchema.safeParse(readJson(codexPath));
  if (!parseResult.success) {
    const messages = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    fail(results, `[${pluginName}] .codex-plugin/plugin.json schema errors: ${messages.join("; ")}`);
    return;
  }
  const manifest = parseResult.data;

  // Required interface fields
  let interfaceValid = true;
  for (const field of CODEX_INTERFACE_REQUIRED) {
    const value = manifest.interface[field];
    if (typeof value !== "string" || value.length === 0) {
      fail(results, `[${pluginName}] .codex-plugin/plugin.json interface.${field} is required and must be a non-empty string`);
      interfaceValid = false;
    }
  }
  if (interfaceValid) {
    pass(results, `[${pluginName}] .codex-plugin/plugin.json interface has required fields`);
  }

  // Path fields must start with "./" and referenced files/dirs must exist.
  const pathFields: { field: "skills" | "mcpServers" | "apps"; kind: "dir" | "file" }[] = [
    { field: "skills", kind: "dir" },
    { field: "mcpServers", kind: "file" },
    { field: "apps", kind: "file" },
  ];

  let allPathsValid = true;
  for (const { field, kind } of pathFields) {
    const value = manifest[field];
    if (value === undefined) continue;
    if (!value.startsWith("./")) {
      fail(results, `[${pluginName}] .codex-plugin/plugin.json ${field} path must start with "./": ${value}`);
      allPathsValid = false;
      continue;
    }
    if (value.includes("..")) {
      fail(results, `[${pluginName}] .codex-plugin/plugin.json ${field} path must not contain "..": ${value}`);
      allPathsValid = false;
      continue;
    }
    const resolved = path.join(pluginDir, value.slice(2));
    if (!fs.existsSync(resolved)) {
      fail(results, `[${pluginName}] .codex-plugin/plugin.json ${field} references non-existent path: ${value}`);
      allPathsValid = false;
      continue;
    }
    const stat = fs.statSync(resolved);
    if (kind === "dir" && !stat.isDirectory()) {
      fail(results, `[${pluginName}] .codex-plugin/plugin.json ${field} must reference a directory: ${value}`);
      allPathsValid = false;
    } else if (kind === "file" && !stat.isFile()) {
      fail(results, `[${pluginName}] .codex-plugin/plugin.json ${field} must reference a file: ${value}`);
      allPathsValid = false;
    }
  }

  // MCP cross-reference: if `mcpServers` points at a file, sanity-check that it parses.
  if (manifest.mcpServers !== undefined) {
    const mcpResolved = path.join(pluginDir, manifest.mcpServers.replace(/^\.\//, ""));
    if (fs.existsSync(mcpResolved)) {
      try {
        McpJsonSchema.parse(readJson(mcpResolved));
      } catch {
        fail(results, `[${pluginName}] .codex-plugin/plugin.json mcpServers points to a file that is not a valid MCP config: ${manifest.mcpServers}`);
        allPathsValid = false;
      }
    }
  }

  if (allPathsValid) {
    pass(results, `[${pluginName}] .codex-plugin/plugin.json paths resolve to real files/directories`);
  }
}

const CodexMarketplaceEntrySchema = z.object({
  name: z.string(),
  source: z.object({
    source: z.literal("local"),
    path: z.string(),
  }).loose(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  policy: z.object({
    installation: z.string().optional(),
    authentication: z.string().optional(),
  }).loose().optional(),
}).loose();

const CodexMarketplaceJsonSchema = z.object({
  name: z.string().optional(),
  owner: MarketplaceOwnerSchema.optional(),
  metadata: z.object({
    version: z.string().optional(),
    description: z.string().optional(),
  }).loose().optional(),
  plugins: z.array(CodexMarketplaceEntrySchema),
}).loose();

export function validateCodexMarketplace(
  marketplacePath: string,
  pluginNames: string[],
  label: string,
  results: ValidationResult,
): void {
  if (!fileExists(marketplacePath)) {
    fail(results, `[marketplace] Missing ${label}`);
    return;
  }

  const parseResult = CodexMarketplaceJsonSchema.safeParse(readJson(marketplacePath));
  if (!parseResult.success) {
    const messages = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    fail(results, `[marketplace] Failed to parse ${label}: ${messages.join("; ")}`);
    return;
  }
  const marketplace = parseResult.data;

  for (const pluginName of pluginNames) {
    const expectedPath = `./plugins/${pluginName}`;
    const entry = marketplace.plugins.find((e) => e.name === pluginName);
    if (!entry) {
      fail(results, `[marketplace] ${label} is missing plugin: ${pluginName}`);
      continue;
    }
    if (entry.source.path !== expectedPath) {
      fail(results, `[marketplace] ${label} plugin "${pluginName}" expected source.path "${expectedPath}", got "${entry.source.path}"`);
      continue;
    }
    if (entry.policy?.installation !== "AVAILABLE" || entry.policy.authentication !== "ON_INSTALL") {
      fail(results, `[marketplace] ${label} plugin "${pluginName}" should declare policy { installation: "AVAILABLE", authentication: "ON_INSTALL" }`);
      continue;
    }
    const resolvedPath = path.join(ROOT, entry.source.path.replace(/^\.\//, ""));
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      fail(results, `[marketplace] ${label} plugin "${pluginName}" source.path does not exist or is not a directory: ${entry.source.path}`);
      continue;
    }
    pass(results, `[marketplace] ${label} lists plugin: ${pluginName}`);
  }
}

/**
 * Schema for the Gemini CLI extension manifest (gemini-extension.json).
 * Per geminicli.com/docs/extensions/reference: supports name/version/description
 * plus mcpServers, contextFileName, excludeTools, and settings.
 */
const GeminiExtensionManifestSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  contextFileName: z.string().optional(),
  excludeTools: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  mcpServers: z.record(z.string(), z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    url: z.string().optional(),
  }).loose()).optional(),
}).loose();

/**
 * Validate that the Gemini extension manifest cross-references (contextFileName,
 * referenced command/agent/hook/skill directories) actually exist on disk.
 *
 * Gemini CLI auto-discovers the `commands/`, `agents/`, `hooks/`, and `skills/`
 * directories next to the manifest — we verify that directories advertised in
 * the manifest (or auto-discovered on disk) contain syntactically valid files.
 */
export function validateGeminiExtension(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const geminiPath = path.join(pluginDir, "gemini-extension.json");
  if (!fileExists(geminiPath)) return;

  const parseResult = GeminiExtensionManifestSchema.safeParse(readJson(geminiPath));
  if (!parseResult.success) {
    const messages = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    fail(results, `[${pluginName}] gemini-extension.json schema errors: ${messages.join("; ")}`);
    return;
  }
  const manifest = parseResult.data;

  let allValid = true;

  // contextFileName: if declared, the file must exist on disk.
  if (manifest.contextFileName !== undefined) {
    const ctxPath = path.join(pluginDir, manifest.contextFileName);
    if (!fs.existsSync(ctxPath) || !fs.statSync(ctxPath).isFile()) {
      fail(results, `[${pluginName}] gemini-extension.json contextFileName references missing file: ${manifest.contextFileName}`);
      allValid = false;
    }
  }

  // Auto-discovered components — if the dir exists, spot-check files are syntactically
  // reasonable. If the dir is missing AND referenced by disk, fine; we don't demand
  // every plugin have every component.
  const commandsDir = path.join(pluginDir, "commands");
  if (fs.existsSync(commandsDir) && fs.statSync(commandsDir).isDirectory()) {
    const tomlFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".toml"));
    if (tomlFiles.length === 0) {
      // No .toml is fine — Gemini simply has no commands to load.
    } else {
      for (const f of tomlFiles) {
        const content = fs.readFileSync(path.join(commandsDir, f), "utf-8");
        if (!/^\s*(description|prompt)\s*=/m.test(content)) {
          fail(results, `[${pluginName}] gemini commands/${f} is missing required TOML keys (description or prompt)`);
          allValid = false;
        }
      }
    }
  }

  const agentsDir = path.join(pluginDir, "agents");
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    const mdFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    for (const f of mdFiles) {
      const content = fs.readFileSync(path.join(agentsDir, f), "utf-8");
      const name = parseFrontmatterField(content, "name");
      const description = parseFrontmatterField(content, "description");
      if (name === undefined || description === undefined) {
        fail(results, `[${pluginName}] gemini agents/${f} must have name and description in frontmatter`);
        allValid = false;
      }
    }
  }

  const hooksJson = path.join(pluginDir, "hooks", "hooks.json");
  // If a Gemini hooks.json exists, sanity-check it's at least valid JSON with a `hooks` root.
  if (fs.existsSync(hooksJson)) {
    let parsed: unknown;
    try {
      parsed = readJson(hooksJson);
    } catch {
      fail(results, `[${pluginName}] hooks/hooks.json is not valid JSON`);
      allValid = false;
      parsed = undefined;
    }
    if (parsed !== undefined) {
      if (typeof parsed !== "object" || parsed === null || !("hooks" in parsed)) {
        fail(results, `[${pluginName}] hooks/hooks.json must have a top-level "hooks" key`);
        allValid = false;
      }
    }
  }

  const skillsDir = path.join(pluginDir, "skills");
  if (!fs.existsSync(skillsDir)) {
    fail(results, `[${pluginName}] gemini-extension.json expects skills/ directory on disk (missing)`);
    allValid = false;
  }

  if (allValid) {
    pass(results, `[${pluginName}] gemini-extension.json cross-references are valid`);
  }
}

export function validatePowerMdFrontmatter(pluginDir: string, pluginName: string, results: ValidationResult): void {
  const powerPath = path.join(pluginDir, "POWER.md");
  if (!fileExists(powerPath)) return;

  const content = fs.readFileSync(powerPath, "utf-8");
  const name = parseFrontmatterField(content, "name");
  const description = parseFrontmatterField(content, "description");
  const version = parseFrontmatterField(content, "version");

  const missing: string[] = [];
  if (name === undefined) missing.push("name");
  if (description === undefined) missing.push("description");
  if (version === undefined) missing.push("version");

  if (missing.length === 0) {
    pass(results, `[${pluginName}] POWER.md frontmatter valid (name, description, version)`);
  } else {
    fail(results, `[${pluginName}] POWER.md frontmatter missing: ${missing.join(", ")}`);
  }
}

function printResults(results: ValidationResult): void {
  if (results.passed.length > 0) {
    console.log("\n✓ Passed:");
    for (const msg of results.passed) {
      console.log(`  ✓ ${msg}`);
    }
  }

  if (results.failed.length > 0) {
    console.log("\n✗ Failed:");
    for (const msg of results.failed) {
      console.error(`  ✗ ${msg}`);
    }
  }

  console.log(
    `\nResults: ${results.passed.length} passed, ${results.failed.length} failed`,
  );
}

function main(): void {
  console.log("Validating AI Plugin Marketplace...\n");

  const results: ValidationResult = { passed: [], failed: [] };
  const pluginNames = getPluginDirectories();

  if (pluginNames.length === 0) {
    console.log("No plugin directories found in plugins/");
  } else {
    console.log(`Found ${pluginNames.length} plugin(s): ${pluginNames.join(", ")}`);
  }

  for (const pluginName of pluginNames) {
    const pluginDir = path.join(PLUGINS_DIR, pluginName);
    validatePluginFiles(pluginDir, pluginName, results);
    validateNameConsistency(pluginDir, pluginName, results);
    validateMcpSync(pluginDir, pluginName, results);
    validateReadme(pluginDir, pluginName, results);
    validateSkillFrontmatter(pluginDir, pluginName, results);
    validateManifestFileRefs(pluginDir, pluginName, results);
    validateAgentFrontmatter(pluginDir, pluginName, results);
    validateClaudeHooks(pluginDir, pluginName, results);
    validateCodexManifest(pluginDir, pluginName, results);
    validateGeminiExtension(pluginDir, pluginName, results);
    validatePowerMdFrontmatter(pluginDir, pluginName, results);
  }

  validateMarketplace(CLAUDE_MARKETPLACE, pluginNames, ".claude-plugin/marketplace.json", results);
  validateMarketplace(CURSOR_MARKETPLACE, pluginNames, ".cursor-plugin/marketplace.json", results);
  validateCodexMarketplace(CODEX_MARKETPLACE, pluginNames, ".agents/plugins/marketplace.json", results);

  printResults(results);

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
