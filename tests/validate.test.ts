/**
 * Tests for src/validate.ts
 *
 * @see https://agentskills.io — SKILL.md frontmatter spec
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  normalizePathField,
  parseFrontmatterField,
  REQUIRED_FILES,
  resolveMarketplaceSource,
  validateAgentFrontmatter,
  validateClaudeHooks,
  validateCodexManifest,
  validateCodexMarketplace,
  validateGeminiExtension,
  validateManifestFileRefs,
  validateMarketplace,
  validateMcpSync,
  validateNameConsistency,
  validatePluginFiles,
  validatePowerMdFrontmatter,
  validateReadme,
  validateSkillFrontmatter,
  type ValidationResult,
} from "../src/validate.js";

function freshResult(): ValidationResult {
  return { passed: [], failed: [] };
}

let tmpDir: string | undefined;

function makeTmpDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-test-"));
  return tmpDir;
}

afterEach(() => {
  if (tmpDir !== undefined) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

/**
 * Write a file inside the given directory, creating intermediate dirs.
 */
function writeFile(dir: string, relPath: string, content: string): void {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}

// ---------------------------------------------------------------------------
// parseFrontmatterField
// ---------------------------------------------------------------------------

describe("parseFrontmatterField", () => {
  it("extracts a field from valid frontmatter", () => {
    const content = "---\nname: my-skill\ndescription: A skill\n---\n# Body";
    expect(parseFrontmatterField(content, "name")).toBe("my-skill");
    expect(parseFrontmatterField(content, "description")).toBe("A skill");
  });

  it("returns undefined for a missing field", () => {
    const content = "---\nname: my-skill\n---\n# Body";
    expect(parseFrontmatterField(content, "description")).toBeUndefined();
  });

  it("returns undefined when no frontmatter is present", () => {
    const content = "# Just a heading\nSome text.";
    expect(parseFrontmatterField(content, "name")).toBeUndefined();
  });

  it("handles frontmatter with multiple fields", () => {
    const content = "---\nname: test\nversion: 1.0.0\nauthor: Alice\n---\n";
    expect(parseFrontmatterField(content, "version")).toBe("1.0.0");
    expect(parseFrontmatterField(content, "author")).toBe("Alice");
  });
});

// ---------------------------------------------------------------------------
// normalizePathField
// ---------------------------------------------------------------------------

describe("normalizePathField", () => {
  it("returns empty array for undefined", () => {
    expect(normalizePathField(undefined)).toEqual([]);
  });

  it("wraps a string in an array", () => {
    expect(normalizePathField("./skills/foo")).toEqual(["./skills/foo"]);
  });

  it("filters non-string entries from arrays", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing runtime behavior with mixed types
    const mixed = ["./a.md", 42, "./b.md", null] as any;
    expect(normalizePathField(mixed)).toEqual(["./a.md", "./b.md"]);
  });

  it("returns empty array for objects", () => {
    expect(normalizePathField({ key: "value" })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveMarketplaceSource
// ---------------------------------------------------------------------------

describe("resolveMarketplaceSource", () => {
  it("strips leading ./ from string sources", () => {
    expect(resolveMarketplaceSource("./plugins/foo")).toBe("plugins/foo");
  });

  it("returns string as-is when no ./ prefix", () => {
    expect(resolveMarketplaceSource("plugins/foo")).toBe("plugins/foo");
  });

  it("returns undefined for object sources", () => {
    expect(resolveMarketplaceSource({ github: "owner/repo" })).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(resolveMarketplaceSource(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// validatePluginFiles
// ---------------------------------------------------------------------------

describe("validatePluginFiles", () => {
  it("passes when all required files and skills/ are present", () => {
    const dir = makeTmpDir();
    for (const f of REQUIRED_FILES) {
      writeFile(dir, f, "{}");
    }
    writeFile(dir, "skills/my-skill/SKILL.md", "---\nname: my-skill\n---\n");

    const results = freshResult();
    validatePluginFiles(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.length).toBeGreaterThan(0);
  });

  it("fails for each missing required file", () => {
    const dir = makeTmpDir();
    // Create skills/ with a SKILL.md but no required files
    writeFile(dir, "skills/my-skill/SKILL.md", "---\nname: my-skill\n---\n");

    const results = freshResult();
    validatePluginFiles(dir, "test-plugin", results);

    expect(results.failed.length).toBe(REQUIRED_FILES.length);
    for (const f of REQUIRED_FILES) {
      expect(results.failed.some((msg) => msg.includes(f))).toBe(true);
    }
  });

  it("fails when skills/ directory is missing", () => {
    const dir = makeTmpDir();
    for (const f of REQUIRED_FILES) {
      writeFile(dir, f, "{}");
    }

    const results = freshResult();
    validatePluginFiles(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("Missing skills/ directory"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateNameConsistency
// ---------------------------------------------------------------------------

describe("validateNameConsistency", () => {
  it("passes when all manifest names match directory name", () => {
    const dir = makeTmpDir();
    const name = "my-plugin";
    writeFile(dir, ".claude-plugin/plugin.json", JSON.stringify({ name }));
    writeFile(dir, ".cursor-plugin/plugin.json", JSON.stringify({ name }));
    writeFile(dir, "gemini-extension.json", JSON.stringify({ name }));
    writeFile(dir, "POWER.md", `---\nname: ${name}\n---\n`);

    const results = freshResult();
    validateNameConsistency(dir, name, results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("consistent"))).toBe(true);
  });

  it("fails when a manifest name mismatches", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".claude-plugin/plugin.json", JSON.stringify({ name: "my-plugin" }));
    writeFile(dir, "gemini-extension.json", JSON.stringify({ name: "wrong-name" }));

    const results = freshResult();
    validateNameConsistency(dir, "my-plugin", results);

    expect(results.failed.some((msg) => msg.includes("Name mismatch"))).toBe(true);
  });

  it("fails when a manifest is missing the name field", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".claude-plugin/plugin.json", JSON.stringify({ version: "1.0" }));

    const results = freshResult();
    validateNameConsistency(dir, "my-plugin", results);

    expect(results.failed.some((msg) => msg.includes("Missing 'name'"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateSkillFrontmatter
// ---------------------------------------------------------------------------

describe("validateSkillFrontmatter", () => {
  it("passes for valid agentskills.io frontmatter", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      "skills/my-skill/SKILL.md",
      "---\nname: my-skill\ndescription: A valid skill description\n---\n# Skill\nBody content here.",
    );

    const results = freshResult();
    validateSkillFrontmatter(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("name") && msg.includes("valid"))).toBe(true);
    expect(results.passed.some((msg) => msg.includes("description"))).toBe(true);
  });

  it("fails for name exceeding 64 characters", () => {
    const dir = makeTmpDir();
    const longName = "a".repeat(65);
    writeFile(dir, `skills/${longName}/SKILL.md`, `---\nname: ${longName}\ndescription: Test\n---\n`);

    const results = freshResult();
    validateSkillFrontmatter(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("exceeds 64 characters"))).toBe(true);
  });

  it("fails for name with uppercase characters", () => {
    const dir = makeTmpDir();
    writeFile(dir, "skills/MySkill/SKILL.md", "---\nname: MySkill\ndescription: Test\n---\n");

    const results = freshResult();
    validateSkillFrontmatter(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("lowercase"))).toBe(true);
  });

  it("fails for name not matching parent directory", () => {
    const dir = makeTmpDir();
    writeFile(dir, "skills/actual-dir/SKILL.md", "---\nname: different-name\ndescription: Test\n---\n");

    const results = freshResult();
    validateSkillFrontmatter(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("does not match parent directory"))).toBe(true);
  });

  it("fails for missing description", () => {
    const dir = makeTmpDir();
    writeFile(dir, "skills/my-skill/SKILL.md", "---\nname: my-skill\n---\n");

    const results = freshResult();
    validateSkillFrontmatter(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("missing required 'description'"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateClaudeHooks
// ---------------------------------------------------------------------------

describe("validateClaudeHooks", () => {
  it("passes for valid hooks object with known event types", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      "hooks/claude.json",
      JSON.stringify({ hooks: { PostToolUse: [], PreToolUse: [] } }),
    );

    const results = freshResult();
    validateClaudeHooks(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("valid hooks object"))).toBe(true);
  });

  it("fails for unknown event types", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      "hooks/claude.json",
      JSON.stringify({ hooks: { PostToolUse: [], InvalidEvent: [] } }),
    );

    const results = freshResult();
    validateClaudeHooks(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("unknown event types") && msg.includes("InvalidEvent"))).toBe(
      true,
    );
  });

  it("fails for hooks as array instead of object", () => {
    const dir = makeTmpDir();
    writeFile(dir, "hooks/claude.json", JSON.stringify({ hooks: [{ event: "PostToolUse" }] }));

    const results = freshResult();
    validateClaudeHooks(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("must be an object"))).toBe(true);
  });

  it("fails for invalid JSON", () => {
    const dir = makeTmpDir();
    writeFile(dir, "hooks/claude.json", "{ not valid json");

    const results = freshResult();
    validateClaudeHooks(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("not valid JSON"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateAgentFrontmatter
// ---------------------------------------------------------------------------

describe("validateAgentFrontmatter", () => {
  it("passes when name and description are present", () => {
    const dir = makeTmpDir();
    writeFile(dir, "agents/my-agent.md", "---\nname: my-agent\ndescription: Does things\n---\n# Agent");

    const results = freshResult();
    validateAgentFrontmatter(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("frontmatter valid"))).toBe(true);
  });

  it("fails when name is missing", () => {
    const dir = makeTmpDir();
    writeFile(dir, "agents/my-agent.md", "---\ndescription: Does things\n---\n");

    const results = freshResult();
    validateAgentFrontmatter(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("missing 'name'"))).toBe(true);
  });

  it("fails when description is missing", () => {
    const dir = makeTmpDir();
    writeFile(dir, "agents/my-agent.md", "---\nname: my-agent\n---\n");

    const results = freshResult();
    validateAgentFrontmatter(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("missing 'description'"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateManifestFileRefs
// ---------------------------------------------------------------------------

describe("validateManifestFileRefs", () => {
  it("passes when all referenced paths exist", () => {
    const dir = makeTmpDir();
    writeFile(dir, "skills/evaluate-skill/SKILL.md", "---\nname: evaluate-skill\n---\n");
    writeFile(dir, "agents/experimenter.md", "---\nname: experimenter\n---\n");
    writeFile(dir, "commands/evaluate.md", "# Command");
    writeFile(dir, "hooks/claude.json", "{}");
    writeFile(
      dir,
      ".claude-plugin/plugin.json",
      JSON.stringify({
        name: "test",
        skills: ["./skills/evaluate-skill"],
        agents: ["./agents/experimenter.md"],
        commands: ["./commands/evaluate.md"],
        hooks: "./hooks/claude.json",
      }),
    );

    const results = freshResult();
    validateManifestFileRefs(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("references are all valid"))).toBe(true);
  });

  it("fails when a referenced skill directory is missing", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".claude-plugin/plugin.json",
      JSON.stringify({
        name: "test",
        skills: ["./skills/nonexistent"],
      }),
    );

    const results = freshResult();
    validateManifestFileRefs(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("non-existent path") && msg.includes("skills/nonexistent"))).toBe(
      true,
    );
  });

  it("fails when a referenced agent file is missing", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".claude-plugin/plugin.json",
      JSON.stringify({
        name: "test",
        agents: ["./agents/missing.md"],
      }),
    );

    const results = freshResult();
    validateManifestFileRefs(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("non-existent path") && msg.includes("agents/missing.md"))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// validatePowerMdFrontmatter
// ---------------------------------------------------------------------------

describe("validatePowerMdFrontmatter", () => {
  it("passes when all fields are present", () => {
    const dir = makeTmpDir();
    writeFile(dir, "POWER.md", "---\nname: my-plugin\ndescription: A plugin\nversion: 1.0.0\n---\n");

    const results = freshResult();
    validatePowerMdFrontmatter(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("POWER.md frontmatter valid"))).toBe(true);
  });

  it("fails when fields are missing", () => {
    const dir = makeTmpDir();
    writeFile(dir, "POWER.md", "---\nname: my-plugin\n---\n");

    const results = freshResult();
    validatePowerMdFrontmatter(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("description") && msg.includes("version"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateReadme
// ---------------------------------------------------------------------------

describe("validateReadme", () => {
  it("passes when README.md is present", () => {
    const dir = makeTmpDir();
    writeFile(dir, "README.md", "# Plugin");

    const results = freshResult();
    validateReadme(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("README.md present"))).toBe(true);
  });

  it("fails when README.md is missing", () => {
    const dir = makeTmpDir();

    const results = freshResult();
    validateReadme(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("Missing README.md"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateMcpSync
// ---------------------------------------------------------------------------

describe("validateMcpSync", () => {
  it("passes when .mcp.json and mcp.json have the same keys", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".mcp.json", JSON.stringify({ mcpServers: { "my-server": { command: "node" } } }));
    writeFile(dir, "mcp.json", JSON.stringify({ mcpServers: { "my-server": { command: "node" } } }));

    const results = freshResult();
    validateMcpSync(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("consistent mcpServers keys"))).toBe(true);
  });

  it("passes when both have empty mcpServers", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".mcp.json", JSON.stringify({ mcpServers: {} }));
    writeFile(dir, "mcp.json", JSON.stringify({ mcpServers: {} }));

    const results = freshResult();
    validateMcpSync(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((msg) => msg.includes("consistent"))).toBe(true);
  });

  it("fails when mcpServers keys differ", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".mcp.json", JSON.stringify({ mcpServers: { "server-a": { command: "node" } } }));
    writeFile(dir, "mcp.json", JSON.stringify({ mcpServers: { "server-b": { command: "node" } } }));

    const results = freshResult();
    validateMcpSync(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes("key mismatch"))).toBe(true);
  });

  it("skips when one of the files is missing", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".mcp.json", JSON.stringify({ mcpServers: {} }));
    // mcp.json missing

    const results = freshResult();
    validateMcpSync(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateMarketplace
// ---------------------------------------------------------------------------

/**
 * Helper to create a minimal valid marketplace JSON file.
 */
function writeMarketplace(
  dir: string,
  filename: string,
  plugins: Array<{ name: string; source: string }>,
): string {
  const filePath = path.join(dir, filename);
  const content = {
    name: "test-marketplace",
    owner: { name: "Test" },
    plugins: plugins.map((p) => ({ ...p, description: "", tags: [] })),
  };
  writeFile(dir, filename, JSON.stringify(content));
  return filePath;
}

describe("validateMarketplace", () => {
  it("passes the listing check when plugin name and source both match in the same entry", () => {
    const dir = makeTmpDir();
    const mpPath = writeMarketplace(dir, "marketplace.json", [
      { name: "my-plugin", source: "./plugins/my-plugin" },
    ]);

    const results = freshResult();
    validateMarketplace(mpPath, ["my-plugin"], "marketplace.json", results);

    // The listing check should pass (name + source match in one entry).
    // The source existence check may fail since ROOT isn't our temp dir — that's fine.
    expect(results.passed.some((msg) => msg.includes("lists plugin: my-plugin"))).toBe(true);
    expect(results.failed.every((msg) => !msg.includes("missing plugin"))).toBe(true);
  });

  it("fails when name matches one entry but source matches a different entry", () => {
    const dir = makeTmpDir();
    fs.mkdirSync(path.join(dir, "plugins", "alpha"), { recursive: true });
    fs.mkdirSync(path.join(dir, "plugins", "beta"), { recursive: true });
    // Name "alpha" appears in one entry, source "plugins/alpha" appears in another
    const mpPath = writeMarketplace(dir, "marketplace.json", [
      { name: "alpha", source: "./plugins/beta" },
      { name: "beta", source: "./plugins/alpha" },
    ]);

    const results = freshResult();
    validateMarketplace(mpPath, ["alpha"], "marketplace.json", results);

    expect(results.failed.some((msg) => msg.includes("missing plugin: alpha"))).toBe(true);
  });

  it("fails when plugin is not listed at all", () => {
    const dir = makeTmpDir();
    const mpPath = writeMarketplace(dir, "marketplace.json", []);

    const results = freshResult();
    validateMarketplace(mpPath, ["my-plugin"], "marketplace.json", results);

    expect(results.failed.some((msg) => msg.includes("missing plugin: my-plugin"))).toBe(true);
  });

  it("fails when marketplace file is missing", () => {
    const dir = makeTmpDir();

    const results = freshResult();
    validateMarketplace(path.join(dir, "nonexistent.json"), ["my-plugin"], "marketplace.json", results);

    expect(results.failed.some((msg) => msg.includes("Missing"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateManifestFileRefs — path validation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// validateCodexManifest
// ---------------------------------------------------------------------------

/**
 * Minimal valid Codex plugin.json payload — used as a starting point for negative-path tests.
 */
function baseCodexManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "test-plugin",
    version: "0.0.1",
    description: "Test",
    skills: "./skills",
    mcpServers: "./.mcp.json",
    interface: {
      displayName: "Test Plugin",
      shortDescription: "A test plugin",
    },
    ...overrides,
  };
}

describe("validateCodexManifest", () => {
  it("passes for a valid manifest with existing paths", () => {
    const dir = makeTmpDir();
    writeFile(dir, "skills/test-skill/SKILL.md", "---\nname: test-skill\n---\n");
    writeFile(dir, ".mcp.json", JSON.stringify({ mcpServers: {} }));
    writeFile(
      dir,
      ".codex-plugin/plugin.json",
      JSON.stringify(baseCodexManifest()),
    );

    const results = freshResult();
    validateCodexManifest(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((m) => m.includes("interface has required fields"))).toBe(true);
    expect(results.passed.some((m) => m.includes("paths resolve"))).toBe(true);
  });

  it("skips deep checks when the manifest file is absent", () => {
    const dir = makeTmpDir();
    const results = freshResult();
    validateCodexManifest(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed).toEqual([]);
  });

  it("fails when a required top-level field is missing", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".codex-plugin/plugin.json",
      JSON.stringify({
        name: "test-plugin",
        version: "0.0.1",
        interface: { displayName: "X", shortDescription: "Y" },
      }),
    );

    const results = freshResult();
    validateCodexManifest(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes("schema errors") && m.includes("description"))).toBe(true);
  });

  it("fails when interface.displayName is empty", () => {
    const dir = makeTmpDir();
    writeFile(dir, "skills/.gitkeep", "");
    writeFile(dir, ".mcp.json", JSON.stringify({ mcpServers: {} }));
    writeFile(
      dir,
      ".codex-plugin/plugin.json",
      JSON.stringify(
        baseCodexManifest({
          interface: { displayName: "", shortDescription: "ok" },
        }),
      ),
    );

    const results = freshResult();
    validateCodexManifest(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes("displayName"))).toBe(true);
  });

  it("fails when interface.shortDescription is missing", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".codex-plugin/plugin.json",
      JSON.stringify(
        baseCodexManifest({
          interface: { displayName: "OK" },
        }),
      ),
    );

    const results = freshResult();
    validateCodexManifest(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes("shortDescription"))).toBe(true);
  });

  it("fails when a path field is not ./-prefixed", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".codex-plugin/plugin.json",
      JSON.stringify(
        baseCodexManifest({
          skills: "skills",
        }),
      ),
    );

    const results = freshResult();
    validateCodexManifest(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes('must start with "./"'))).toBe(true);
  });

  it("fails when a referenced skills directory does not exist", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".codex-plugin/plugin.json",
      JSON.stringify(
        baseCodexManifest({
          skills: "./skills-missing",
        }),
      ),
    );

    const results = freshResult();
    validateCodexManifest(dir, "test-plugin", results);

    expect(
      results.failed.some(
        (m) => m.includes("non-existent path") && m.includes("./skills-missing"),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateCodexMarketplace
// ---------------------------------------------------------------------------

/**
 * Writes a Codex-shaped marketplace JSON to the given directory and returns the full path.
 */
function writeCodexMarketplace(
  dir: string,
  filename: string,
  plugins: Array<Record<string, unknown>>,
): string {
  const content = {
    name: "test-marketplace",
    owner: { name: "Test" },
    plugins,
  };
  writeFile(dir, filename, JSON.stringify(content));
  return path.join(dir, filename);
}

describe("validateCodexMarketplace", () => {
  it("passes when a plugin is listed with the expected source and policy", () => {
    const dir = makeTmpDir();
    // Create the plugin directory under ROOT — codex validator resolves ./plugins/<name> against ROOT,
    // so we can't easily satisfy that from a tmp dir. The listing+policy checks still run before the
    // path existence check, and expectation here is only that listing passes even when ROOT path doesn't match.
    const mpPath = writeCodexMarketplace(dir, "marketplace.json", [
      {
        name: "skill-evaluator",
        source: { source: "local", path: "./plugins/skill-evaluator" },
        description: "",
        tags: [],
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      },
    ]);

    const results = freshResult();
    validateCodexMarketplace(mpPath, ["skill-evaluator"], "marketplace.json", results);

    // Either the path-existence check succeeds (if ROOT/plugins/skill-evaluator exists from the worktree)
    // or it fails with a specific message — policy and listing checks should NOT fail either way.
    expect(results.failed.every((m) => !m.includes("must use source.source"))).toBe(true);
    expect(results.failed.every((m) => !m.includes("expected source.path"))).toBe(true);
    expect(results.failed.every((m) => !m.includes("should declare policy"))).toBe(true);
    expect(results.failed.every((m) => !m.includes("is missing plugin"))).toBe(true);
  });

  it("fails when plugin is missing from the marketplace", () => {
    const dir = makeTmpDir();
    const mpPath = writeCodexMarketplace(dir, "marketplace.json", []);

    const results = freshResult();
    validateCodexMarketplace(mpPath, ["skill-evaluator"], "marketplace.json", results);

    expect(results.failed.some((m) => m.includes("missing plugin: skill-evaluator"))).toBe(true);
  });

  it("fails when source.path does not match expected ./plugins/<name>", () => {
    const dir = makeTmpDir();
    const mpPath = writeCodexMarketplace(dir, "marketplace.json", [
      {
        name: "foo",
        source: { source: "local", path: "./somewhere/foo" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      },
    ]);

    const results = freshResult();
    validateCodexMarketplace(mpPath, ["foo"], "marketplace.json", results);

    expect(results.failed.some((m) => m.includes("expected source.path"))).toBe(true);
  });

  it("fails when policy is missing or wrong", () => {
    const dir = makeTmpDir();
    const mpPath = writeCodexMarketplace(dir, "marketplace.json", [
      {
        name: "foo",
        source: { source: "local", path: "./plugins/foo" },
        // policy intentionally absent
      },
    ]);

    const results = freshResult();
    validateCodexMarketplace(mpPath, ["foo"], "marketplace.json", results);

    expect(results.failed.some((m) => m.includes("should declare policy"))).toBe(true);
  });

  it("fails when the marketplace file is missing", () => {
    const dir = makeTmpDir();
    const results = freshResult();
    validateCodexMarketplace(path.join(dir, "nonexistent.json"), ["foo"], "marketplace.json", results);

    expect(results.failed.some((m) => m.includes("Missing"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateGeminiExtension
// ---------------------------------------------------------------------------

describe("validateGeminiExtension", () => {
  it("passes when all referenced components exist on disk", () => {
    const dir = makeTmpDir();
    writeFile(dir, "gemini-extension.json", JSON.stringify({
      name: "test",
      contextFileName: "GEMINI.md",
    }));
    writeFile(dir, "GEMINI.md", "# context");
    writeFile(dir, "skills/.gitkeep", "");
    writeFile(dir, "commands/evaluate.toml", 'description = "x"\nprompt = "y"');
    writeFile(dir, "agents/foo.md", "---\nname: foo\ndescription: bar\n---\n# Foo");

    const results = freshResult();
    validateGeminiExtension(dir, "test-plugin", results);

    expect(results.failed).toEqual([]);
    expect(results.passed.some((m) => m.includes("cross-references are valid"))).toBe(true);
  });

  it("fails when contextFileName points to a missing file", () => {
    const dir = makeTmpDir();
    writeFile(dir, "gemini-extension.json", JSON.stringify({
      name: "test",
      contextFileName: "MISSING.md",
    }));
    writeFile(dir, "skills/.gitkeep", "");

    const results = freshResult();
    validateGeminiExtension(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes("contextFileName") && m.includes("MISSING.md"))).toBe(true);
  });

  it("fails when a command TOML is missing required keys", () => {
    const dir = makeTmpDir();
    writeFile(dir, "gemini-extension.json", JSON.stringify({ name: "test" }));
    writeFile(dir, "skills/.gitkeep", "");
    writeFile(dir, "commands/bad.toml", "# no description or prompt");

    const results = freshResult();
    validateGeminiExtension(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes("commands/bad.toml"))).toBe(true);
  });

  it("fails when an agent md is missing name/description frontmatter", () => {
    const dir = makeTmpDir();
    writeFile(dir, "gemini-extension.json", JSON.stringify({ name: "test" }));
    writeFile(dir, "skills/.gitkeep", "");
    writeFile(dir, "agents/broken.md", "---\nname: broken\n---\n# no description");

    const results = freshResult();
    validateGeminiExtension(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes("agents/broken.md"))).toBe(true);
  });

  it("fails when skills/ directory is missing", () => {
    const dir = makeTmpDir();
    writeFile(dir, "gemini-extension.json", JSON.stringify({ name: "test" }));

    const results = freshResult();
    validateGeminiExtension(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes("skills/"))).toBe(true);
  });

  it("fails when hooks/hooks.json is malformed", () => {
    const dir = makeTmpDir();
    writeFile(dir, "gemini-extension.json", JSON.stringify({ name: "test" }));
    writeFile(dir, "skills/.gitkeep", "");
    writeFile(dir, "hooks/hooks.json", "{ not valid json");

    const results = freshResult();
    validateGeminiExtension(dir, "test-plugin", results);

    expect(results.failed.some((m) => m.includes("hooks.json"))).toBe(true);
  });
});

describe("validateManifestFileRefs path validation", () => {
  it("fails when a path does not start with ./", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".claude-plugin/plugin.json",
      JSON.stringify({
        name: "test",
        skills: ["skills/no-dot-slash"],
      }),
    );

    const results = freshResult();
    validateManifestFileRefs(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes('must start with "./"'))).toBe(true);
  });

  it("fails when a path contains ..", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".claude-plugin/plugin.json",
      JSON.stringify({
        name: "test",
        agents: ["./../escape/agent.md"],
      }),
    );

    const results = freshResult();
    validateManifestFileRefs(dir, "test-plugin", results);

    expect(results.failed.some((msg) => msg.includes('must not contain ".."'))).toBe(true);
  });
});
