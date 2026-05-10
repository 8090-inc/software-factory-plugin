#!/usr/bin/env node
/**
 * Scaffolds a new plugin directory from templates.
 *
 * Usage: pnpm run scaffold <plugin-name>
 *
 * Plugin names must be lowercase with hyphens only (no spaces or uppercase).
 * Templates are read from the templates/ directory at the repo root.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLUGINS_DIR = path.join(ROOT, "plugins");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const CLAUDE_MARKETPLACE = path.join(ROOT, ".claude-plugin", "marketplace.json");
const CURSOR_MARKETPLACE = path.join(ROOT, ".cursor-plugin", "marketplace.json");
const CODEX_MARKETPLACE = path.join(ROOT, ".agents", "plugins", "marketplace.json");

interface TemplateVars {
  name: string;
  description: string;
  title: string;
  keywords: string;
}

function toTitleCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function applyTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{description\}\}/g, vars.description)
    .replace(/\{\{title\}\}/g, vars.title)
    .replace(/\{\{keywords\}\}/g, vars.keywords);
}

function readTemplate(filename: string): string {
  const templatePath = path.join(TEMPLATES_DIR, filename);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${filename}`);
  }
  return fs.readFileSync(templatePath, "utf-8");
}

function writeFile(filePath: string, content: string, createdFiles: string[]): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  createdFiles.push(filePath);
}

function writeGitkeep(dirPath: string, createdFiles: string[]): void {
  fs.mkdirSync(dirPath, { recursive: true });
  const gitkeepPath = path.join(dirPath, ".gitkeep");
  fs.writeFileSync(gitkeepPath, "", "utf-8");
  createdFiles.push(gitkeepPath);
}

interface MarketplaceOwner {
  name: string;
  email?: string;
  url?: string;
}

interface MarketplaceEntry {
  name: string;
  source: string;
  description: string;
  tags: string[];
}

interface CodexMarketplaceEntry {
  name: string;
  source: { source: "local"; path: string };
  description: string;
  tags: string[];
  policy: { installation: "AVAILABLE"; authentication: "ON_INSTALL" };
}

interface MarketplaceJson {
  name?: string;
  owner?: MarketplaceOwner;
  metadata?: {
    version?: string;
    description?: string;
    pluginRoot?: string;
  };
  plugins?: MarketplaceEntry[];
  [key: string]: unknown;
}

interface CodexMarketplaceJson {
  name?: string;
  owner?: MarketplaceOwner;
  metadata?: {
    version?: string;
    description?: string;
  };
  plugins?: CodexMarketplaceEntry[];
  [key: string]: unknown;
}

function updateMarketplace(marketplacePath: string, entry: MarketplaceEntry): void {
  if (!fs.existsSync(marketplacePath)) {
    throw new Error(`Marketplace file not found: ${marketplacePath}`);
  }

  const content = fs.readFileSync(marketplacePath, "utf-8");
  const marketplace = JSON.parse(content) as MarketplaceJson;

  if (!Array.isArray(marketplace.plugins)) {
    marketplace.plugins = [];
  }

  // Check for duplicate
  const exists = marketplace.plugins.some((p) => p.name === entry.name || p.source === entry.source);
  if (!exists) {
    marketplace.plugins.push(entry);
  }

  fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n", "utf-8");
}

function updateCodexMarketplace(marketplacePath: string, entry: CodexMarketplaceEntry): void {
  if (!fs.existsSync(marketplacePath)) {
    throw new Error(`Marketplace file not found: ${marketplacePath}`);
  }

  const content = fs.readFileSync(marketplacePath, "utf-8");
  const marketplace = JSON.parse(content) as CodexMarketplaceJson;

  if (!Array.isArray(marketplace.plugins)) {
    marketplace.plugins = [];
  }

  const exists = marketplace.plugins.some(
    (p) => p.name === entry.name || p.source.path === entry.source.path,
  );
  if (!exists) {
    marketplace.plugins.push(entry);
  }

  fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n", "utf-8");
}

function validatePluginName(name: string): void {
  if (!name) {
    throw new Error("Plugin name is required.");
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `Invalid plugin name: "${name}". ` +
        "Names must be lowercase, start with a letter, and contain only letters, digits, and hyphens.",
    );
  }
  if (name.includes("--")) {
    throw new Error(`Invalid plugin name: "${name}". Names must not contain consecutive hyphens.`);
  }
  if (name.endsWith("-")) {
    throw new Error(`Invalid plugin name: "${name}". Names must not end with a hyphen.`);
  }
}

function scaffoldPlugin(pluginName: string): void {
  const pluginDir = path.join(PLUGINS_DIR, pluginName);

  if (fs.existsSync(pluginDir)) {
    throw new Error(`Plugin directory already exists: ${pluginDir}`);
  }

  const vars: TemplateVars = {
    name: pluginName,
    description: `A plugin for ${pluginName}`,
    title: toTitleCase(pluginName),
    keywords: "",
  };

  const createdFiles: string[] = [];

  console.log(`\nScaffolding plugin: ${pluginName}`);
  console.log(`Directory: ${pluginDir}\n`);

  // .claude-plugin/plugin.json
  writeFile(
    path.join(pluginDir, ".claude-plugin", "plugin.json"),
    applyTemplate(readTemplate("plugin.json.tmpl"), vars),
    createdFiles,
  );

  // .cursor-plugin/plugin.json
  writeFile(
    path.join(pluginDir, ".cursor-plugin", "plugin.json"),
    applyTemplate(readTemplate("cursor-plugin.json.tmpl"), vars),
    createdFiles,
  );

  // .codex-plugin/plugin.json
  writeFile(
    path.join(pluginDir, ".codex-plugin", "plugin.json"),
    applyTemplate(readTemplate("codex-plugin.json.tmpl"), vars),
    createdFiles,
  );

  // gemini-extension.json
  writeFile(
    path.join(pluginDir, "gemini-extension.json"),
    applyTemplate(readTemplate("gemini-extension.json.tmpl"), vars),
    createdFiles,
  );

  // POWER.md
  writeFile(
    path.join(pluginDir, "POWER.md"),
    applyTemplate(readTemplate("POWER.md.tmpl"), vars),
    createdFiles,
  );

  // GEMINI.md
  const md = String.raw;
  writeFile(
    path.join(pluginDir, "GEMINI.md"),
    md`# ${vars.title}

${vars.description}

## Overview

Describe what this plugin does for Gemini CLI users.
`,
    createdFiles,
  );

  // .mcp.json
  writeFile(
    path.join(pluginDir, ".mcp.json"),
    JSON.stringify({ mcpServers: {} }, null, 2) + "\n",
    createdFiles,
  );

  // mcp.json
  writeFile(
    path.join(pluginDir, "mcp.json"),
    JSON.stringify({ mcpServers: {} }, null, 2) + "\n",
    createdFiles,
  );

  // skills/<plugin-name>/SKILL.md
  writeFile(
    path.join(pluginDir, "skills", pluginName, "SKILL.md"),
    applyTemplate(readTemplate("SKILL.md.tmpl"), vars),
    createdFiles,
  );

  // Empty dirs with .gitkeep
  writeGitkeep(path.join(pluginDir, "agents"), createdFiles);
  writeGitkeep(path.join(pluginDir, "rules"), createdFiles);
  writeGitkeep(path.join(pluginDir, "steering"), createdFiles);
  writeGitkeep(path.join(pluginDir, "commands"), createdFiles);

  // hooks/claude.yaml — YAML source for Claude Code hooks (build:hooks converts to JSON)
  const yaml = String.raw;
  writeFile(
    path.join(pluginDir, "hooks", "claude.yaml"),
    yaml`hooks: {}
`,
    createdFiles,
  );

  // README.md
  const readme = String.raw;
  writeFile(
    path.join(pluginDir, "README.md"),
    readme`# ${vars.title}

${vars.description}

## Installation

Install this plugin by copying it into your AI assistant's plugin directory.

## Usage

See \`skills/${pluginName}/SKILL.md\` for available skills.

## License

ISC
`,
    createdFiles,
  );

  // LICENSE
  const currentYear = new Date().getFullYear();
  writeFile(
    path.join(pluginDir, "LICENSE"),
    `ISC License

Copyright (c) ${currentYear}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
`,
    createdFiles,
  );

  // Update marketplace manifests
  const marketplaceEntry: MarketplaceEntry = {
    name: pluginName,
    source: `./plugins/${pluginName}`,
    description: vars.description,
    tags: [],
  };

  updateMarketplace(CLAUDE_MARKETPLACE, marketplaceEntry);
  updateMarketplace(CURSOR_MARKETPLACE, marketplaceEntry);

  const codexMarketplaceEntry: CodexMarketplaceEntry = {
    name: pluginName,
    source: { source: "local", path: `./plugins/${pluginName}` },
    description: vars.description,
    tags: [],
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
  };
  updateCodexMarketplace(CODEX_MARKETPLACE, codexMarketplaceEntry);
  console.log(`Updated marketplace manifests.`);

  // Print summary
  console.log(`\nCreated ${createdFiles.length} files:`);
  for (const file of createdFiles) {
    const relPath = path.relative(ROOT, file);
    console.log(`  ${relPath}`);
  }

  console.log(`\n✓ Plugin "${pluginName}" scaffolded successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  1. Edit plugins/${pluginName}/POWER.md to describe your plugin`);
  console.log(`  2. Edit plugins/${pluginName}/GEMINI.md to describe your plugin for Gemini CLI users`);
  console.log(`  3. Edit plugins/${pluginName}/skills/${pluginName}/SKILL.md to define your skill`);
  console.log(`  4. Run "pnpm run build" to build hooks, validate, and generate standalone exports`);
}

function main(): void {
  const args = process.argv.slice(2);
  const pluginName = args[0];

  if (!pluginName) {
    console.error("Usage: pnpm run scaffold <plugin-name>");
    console.error("Example: pnpm run scaffold my-plugin");
    process.exit(1);
  }

  try {
    validatePluginName(pluginName);
    scaffoldPlugin(pluginName);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
