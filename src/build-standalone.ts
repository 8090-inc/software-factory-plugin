/**
 * Builds standalone distribution exports for each plugin.
 *
 * For each plugin in plugins/, produces two platform-specific bundles:
 *   dist/gemini/<plugin>/  — Gemini CLI extension (gemini-extension.json, GEMINI.md, skills/, agents/, commands/*.toml)
 *   dist/kiro/<plugin>/    — Kiro plugin (POWER.md, mcp.json, steering/, skills/)
 *
 * Usage: pnpm run build
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLUGINS_DIR = path.join(ROOT, "plugins");
const DIST_DIR = path.join(ROOT, "dist");

function copyFile(src: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src: string, dest: string, filter?: (name: string) => boolean): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (filter && !filter(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, filter);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function copyIfExists(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) return false;
  if (fs.statSync(src).isDirectory()) {
    copyDir(src, dest);
  } else {
    copyFile(src, dest);
  }
  return true;
}

function cleanDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
}

interface BuildResult {
  plugin: string;
  gemini: string[];
  kiro: string[];
}

/**
 * Maps Claude Code tool names (PascalCase) to Gemini CLI tool names (snake_case).
 * Gemini CLI validates tool names in agent frontmatter and rejects unknown names.
 */
const CLAUDE_TO_GEMINI_TOOLS: Record<string, string> = {
  Read: "read_file",
  Write: "write_file",
  Edit: "replace",
  Glob: "glob",
  Grep: "search_file_content",
  Bash: "run_shell_command",
  Agent: "activate_skill",
};

/**
 * Maps Claude Code tool names (PascalCase) to Kiro CLI tool names (lowercase).
 * Kiro CLI agent configs use JSON with a `tools` array of lowercase names.
 *
 * @see ~/.kiro/agents/agent_config.json.example for reference
 */
const CLAUDE_TO_KIRO_TOOLS: Record<string, string> = {
  Read: "read",
  Write: "write",
  Edit: "write",
  Glob: "glob",
  Grep: "grep",
  Bash: "shell",
  Agent: "delegate",
};

/**
 * Rewrites agent .md files in the Gemini standalone export, translating
 * Claude Code tool names in the YAML frontmatter `tools:` list to Gemini CLI equivalents.
 * Tools with no known mapping are dropped with a warning.
 */
function rewriteGeminiAgentTools(agentsDir: string): void {
  if (!fs.existsSync(agentsDir)) return;
  for (const file of fs.readdirSync(agentsDir)) {
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(agentsDir, file);
    let content = fs.readFileSync(filePath, "utf-8");

    // Match YAML frontmatter tools list
    content = content.replace(
      /^(---\n[\s\S]*?)(tools:\n)((?:\s+-\s+\S+\n)+)([\s\S]*?---)/m,
      (_match, before: string, toolsKey: string, toolsList: string, after: string) => {
        const translatedLines: string[] = [];
        for (const line of toolsList.split("\n")) {
          const toolMatch = /^\s+-\s+(\S+)/.exec(line);
          if (!toolMatch?.[1]) continue;
          const claudeTool = toolMatch[1];
          const geminiTool = CLAUDE_TO_GEMINI_TOOLS[claudeTool];
          if (geminiTool) {
            translatedLines.push(`  - ${geminiTool}`);
          } else {
            console.warn(`    ⚠ Agent ${file}: no Gemini equivalent for tool "${claudeTool}" — skipped`);
          }
        }
        if (translatedLines.length === 0) {
          return `${before}tools: []\n${after}`;
        }
        return `${before}${toolsKey}${translatedLines.join("\n")}\n${after}`;
      },
    );

    fs.writeFileSync(filePath, content);
  }
}

function buildGeminiStandalone(pluginDir: string, destDir: string): string[] {
  cleanDir(destDir);
  const copied: string[] = [];

  const files: [string, string][] = [
    ["gemini-extension.json", "gemini-extension.json"],
    ["GEMINI.md", "GEMINI.md"],
    ["README.md", "README.md"],
    ["LICENSE", "LICENSE"],
  ];

  for (const [src, dest] of files) {
    if (copyIfExists(path.join(pluginDir, src), path.join(destDir, dest))) {
      copied.push(dest);
    }
  }

  const dirs: [string, string][] = [
    ["skills", "skills"],
    ["agents", "agents"],
  ];

  for (const [src, dest] of dirs) {
    if (copyIfExists(path.join(pluginDir, src), path.join(destDir, dest))) {
      copied.push(`${dest}/`);
    }
  }

  // Rewrite agent tool names from Claude Code → Gemini CLI equivalents
  rewriteGeminiAgentTools(path.join(destDir, "agents"));

  // commands: only .toml files (Gemini uses TOML for commands)
  const commandsSrc = path.join(pluginDir, "commands");
  const commandsDest = path.join(destDir, "commands");
  if (fs.existsSync(commandsSrc)) {
    const tomlFiles = fs.readdirSync(commandsSrc).filter((f) => f.endsWith(".toml"));
    if (tomlFiles.length > 0) {
      fs.mkdirSync(commandsDest, { recursive: true });
      for (const file of tomlFiles) {
        copyFile(path.join(commandsSrc, file), path.join(commandsDest, file));
      }
      copied.push("commands/ (.toml only)");
    }
  }

  // hooks/hooks.json: Gemini CLI native hooks format
  const hooksJsonSrc = path.join(pluginDir, "hooks", "hooks.json");
  const hooksJsonDest = path.join(destDir, "hooks", "hooks.json");
  if (fs.existsSync(hooksJsonSrc)) {
    copyFile(hooksJsonSrc, hooksJsonDest);
    copied.push("hooks/hooks.json");
  }

  // policies/: Gemini CLI policy TOML files (if present)
  const policiesSrc = path.join(pluginDir, "policies");
  const policiesDest = path.join(destDir, "policies");
  if (fs.existsSync(policiesSrc) && fs.statSync(policiesSrc).isDirectory()) {
    copyDir(policiesSrc, policiesDest);
    copied.push("policies/");
  }

  return copied;
}

/**
 * Parses YAML frontmatter from a markdown agent file and generates
 * a Kiro CLI agent JSON config.
 */
function buildKiroAgentJson(agentMdPath: string): Record<string, unknown> | null {
  const content = fs.readFileSync(agentMdPath, "utf-8");
  const fmMatch = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(content);
  if (!fmMatch) return null;

  const frontmatter = fmMatch[1] ?? "";
  const body = fmMatch[2] ?? "";

  const nameMatch = /^name:\s*(.+)$/m.exec(frontmatter);
  const descMatch = /^description:\s*(.+)$/m.exec(frontmatter);

  const tools: string[] = [];
  const toolsBlockMatch = /^tools:\n((?:\s+-\s+\S+\n?)+)/m.exec(frontmatter);
  if (toolsBlockMatch?.[1]) {
    for (const line of toolsBlockMatch[1].split("\n")) {
      const toolMatch = /^\s+-\s+(\S+)/.exec(line);
      if (!toolMatch?.[1]) continue;
      const kiroTool = CLAUDE_TO_KIRO_TOOLS[toolMatch[1]];
      if (kiroTool && !tools.includes(kiroTool)) {
        tools.push(kiroTool);
      }
    }
  }

  return {
    name: nameMatch?.[1] ?? path.basename(agentMdPath, ".md"),
    description: descMatch?.[1] ?? "",
    prompt: body.trim(),
    mcpServers: {},
    tools,
    toolAliases: {},
    allowedTools: [],
    resources: [],
    hooks: {},
    toolsSettings: {},
    includeMcpJson: true,
    model: null,
  };
}

/**
 * Converts Claude Code agent .md files to Kiro CLI agent JSON configs
 * under .kiro/agents/ in the destination directory.
 */
function buildKiroAgents(agentsDir: string, destDir: string): boolean {
  if (!fs.existsSync(agentsDir)) return false;
  const kiroAgentsDir = path.join(destDir, ".kiro", "agents");
  fs.mkdirSync(kiroAgentsDir, { recursive: true });

  let count = 0;
  for (const file of fs.readdirSync(agentsDir)) {
    if (!file.endsWith(".md")) continue;
    const config = buildKiroAgentJson(path.join(agentsDir, file));
    if (!config) continue;
    const jsonName = file.replace(/\.md$/, ".json");
    fs.writeFileSync(path.join(kiroAgentsDir, jsonName), JSON.stringify(config, null, 2) + "\n");
    count++;
  }

  return count > 0;
}

function buildKiroStandalone(pluginDir: string, destDir: string): string[] {
  cleanDir(destDir);
  const copied: string[] = [];

  const files: [string, string][] = [
    ["POWER.md", "POWER.md"],
    ["mcp.json", "mcp.json"],
    ["README.md", "README.md"],
    ["LICENSE", "LICENSE"],
  ];

  for (const [src, dest] of files) {
    if (copyIfExists(path.join(pluginDir, src), path.join(destDir, dest))) {
      copied.push(dest);
    }
  }

  const dirs: [string, string][] = [
    ["steering", "steering"],
    ["skills", "skills"],
  ];

  for (const [src, dest] of dirs) {
    if (copyIfExists(path.join(pluginDir, src), path.join(destDir, dest))) {
      copied.push(`${dest}/`);
    }
  }

  // Generate .kiro/agents/ JSON configs from Claude Code agent .md files
  if (buildKiroAgents(path.join(pluginDir, "agents"), destDir)) {
    copied.push(".kiro/agents/");
  }

  return copied;
}

function buildAll(): void {
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`plugins/ directory not found at ${PLUGINS_DIR}`);
    process.exit(1);
  }

  const plugins = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (plugins.length === 0) {
    console.log("No plugins found in plugins/");
    return;
  }

  const results: BuildResult[] = [];

  for (const plugin of plugins) {
    const pluginDir = path.join(PLUGINS_DIR, plugin);

    const geminiDest = path.join(DIST_DIR, "gemini", plugin);
    const kiroDest = path.join(DIST_DIR, "kiro", plugin);

    const geminiCopied = buildGeminiStandalone(pluginDir, geminiDest);
    const kiroCopied = buildKiroStandalone(pluginDir, kiroDest);

    results.push({ plugin, gemini: geminiCopied, kiro: kiroCopied });
  }

  console.log("\nBuild complete — standalone exports generated:\n");

  for (const { plugin, gemini, kiro } of results) {
    console.log(`  ${plugin}`);
    console.log(`    dist/gemini/${plugin}/`);
    for (const item of gemini) {
      console.log(`      ${item}`);
    }
    console.log(`    dist/kiro/${plugin}/`);
    for (const item of kiro) {
      console.log(`      ${item}`);
    }
    console.log();
  }

  console.log(`Generated ${results.length} plugin(s) × 2 platforms = ${results.length * 2} standalone exports.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAll();
}
