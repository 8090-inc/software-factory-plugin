/**
 * Integration tests for Work Order execution shell scripts (init + context index).
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const SCRIPTS_DIR = path.join(
  repoRoot,
  "plugins/software-factory/skills/software-factory/execution/scripts"
);
const INIT_SCRIPT = path.join(SCRIPTS_DIR, "init-wo-execution.sh");
const UPDATE_SCRIPT = path.join(SCRIPTS_DIR, "update-context-index.sh");

let tmpDir: string | undefined;

function makeTmp(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wo-exec-test-"));
  return tmpDir;
}

afterEach(() => {
  if (tmpDir !== undefined) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

function runBash(script: string, args: string[], cwd: string): void {
  execFileSync("bash", [script, ...args], {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function runBashExpectFail(
  script: string,
  args: string[],
  cwd: string
): { status: number; stderr: string } {
  try {
    execFileSync("bash", [script, ...args], {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: 0, stderr: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stderr?: string };
    return {
      status: e.status ?? 1,
      stderr: typeof e.stderr === "string" ? e.stderr : "",
    };
  }
}

describe("init-wo-execution.sh", () => {
  it("creates four files with substituted placeholders (bare work order number)", () => {
    const root = makeTmp();
    runBash(
      INIT_SCRIPT,
      [
        "--work-order-number",
        "1740",
        "--work-order-title",
        "My WO",
        "--work-order-id",
        "uuid-abc",
      ],
      root
    );
    // Default OUTPUT_ROOT is .sw-factory under cwd
    const woDir = path.join(root, ".sw-factory", "1740");
    for (const name of [
      "checklist.md",
      "context.md",
      "implementation-plan.md",
      "review-log.md",
    ]) {
      expect(fs.existsSync(path.join(woDir, name)), name).toBe(true);
    }
    const ctx = fs.readFileSync(path.join(woDir, "context.md"), "utf-8");
    expect(ctx).toContain("# Work Order Entity Index: WO-1740");
    expect(ctx).toContain("- WO-1740: My WO (`uuid-abc`)");
    expect(ctx).not.toContain("{{WORK_ORDER_LABEL}}");
    expect(ctx).not.toContain("{{WORK_ORDER_TITLE}}");

    const checklist = fs.readFileSync(
      path.join(woDir, "checklist.md"),
      "utf-8"
    );
    expect(checklist).toContain("**Work Order Title:** My WO");
    expect(checklist).not.toContain("{{WORK_ORDER_TITLE}}");
  });

  it("does not double-prefix WO- when work order number already includes WO-", () => {
    const root = makeTmp();
    runBash(
      INIT_SCRIPT,
      [
        "--work-order-number",
        "WO-99",
        "--work-order-title",
        "T",
        "--work-order-id",
        "id",
      ],
      root
    );
    const ctx = fs.readFileSync(
      path.join(root, ".sw-factory", "WO-99", "context.md"),
      "utf-8"
    );
    expect(ctx).toContain("# Work Order Entity Index: WO-99");
    expect(ctx).toContain("- WO-99: T (`id`)");
  });

  it("respects --output-root", () => {
    const root = makeTmp();
    const alt = path.join(root, "alt-out");
    runBash(
      INIT_SCRIPT,
      [
        "--work-order-number",
        "42",
        "--work-order-title",
        "Alt",
        "--work-order-id",
        "z",
        "--output-root",
        alt,
      ],
      root
    );
    expect(fs.existsSync(path.join(alt, "42", "context.md"))).toBe(true);
  });

  it("fails when required args are missing", () => {
    const root = makeTmp();
    const r = runBashExpectFail(
      INIT_SCRIPT,
      ["--work-order-number", "1"],
      root
    );
    expect(r.status).not.toBe(0);
  });

  it("refuses to overwrite an existing work order directory", () => {
    const root = makeTmp();
    const args = [
      "--work-order-number",
      "7",
      "--work-order-title",
      "Once",
      "--work-order-id",
      "a",
    ];
    runBash(INIT_SCRIPT, args, root);
    const r = runBashExpectFail(INIT_SCRIPT, args, root);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/already exists|Refusing to overwrite/i);
  });
});

describe("update-context-index.sh", () => {
  it("writes a full context file on first run (--reset) with entity sections", () => {
    const root = makeTmp();
    const ctxPath = path.join(root, "context.md");
    runBash(
      UPDATE_SCRIPT,
      [
        "--work-order-number",
        "1740",
        "--reset",
        "--context-path",
        ctxPath,
        "--work-order-title",
        "Scoped feature",
        "--work-order-id",
        "wo-uuid",
        "--status",
        "in_progress",
        "--requirement",
        "Feature Req|req-1",
        "--blueprint",
        "Container BP|bp-1",
      ],
      root
    );
    const ctx = fs.readFileSync(ctxPath, "utf-8");
    expect(ctx).toContain("# Work Order Entity Index: WO-1740");
    expect(ctx).toContain("- WO-1740: Scoped feature (`wo-uuid`)");
    expect(ctx).toContain("**Current Status:** in_progress");
    expect(ctx).toContain("- Feature Req (`req-1`)");
    expect(ctx).toContain("- Container BP (`bp-1`)");
    expect(ctx).not.toContain("{{REQUIREMENTS_DOCUMENT_TITLE}}");
    expect(ctx).not.toContain("{{BLUEPRINT_DOCUMENT_TITLE}}");
  });

  it("appends a new requirement without leaving template placeholder lines", () => {
    const root = makeTmp();
    const ctxPath = path.join(root, "context.md");
    runBash(
      UPDATE_SCRIPT,
      [
        "--work-order-number",
        "1",
        "--reset",
        "--context-path",
        ctxPath,
        "--work-order-title",
        "First",
        "--work-order-id",
        "id0",
        "--requirement",
        "R1|r1",
      ],
      root
    );
    runBash(
      UPDATE_SCRIPT,
      [
        "--work-order-number",
        "1",
        "--context-path",
        ctxPath,
        "--requirement",
        "R2|r2",
      ],
      root
    );
    const ctx = fs.readFileSync(ctxPath, "utf-8");
    expect(ctx).toContain("- R1 (`r1`)");
    expect(ctx).toContain("- R2 (`r2`)");
    expect(ctx).not.toContain("{{REQUIREMENTS_DOCUMENT_TITLE}}");
  });

  it("updates status, branch, and PR URL lines in place", () => {
    const root = makeTmp();
    const ctxPath = path.join(root, "context.md");
    runBash(
      UPDATE_SCRIPT,
      [
        "--work-order-number",
        "5",
        "--reset",
        "--context-path",
        ctxPath,
        "--work-order-title",
        "T",
        "--work-order-id",
        "i",
      ],
      root
    );
    runBash(
      UPDATE_SCRIPT,
      [
        "--work-order-number",
        "5",
        "--context-path",
        ctxPath,
        "--status",
        "in_review",
        "--branch",
        "feature/foo",
        "--pull-request-url",
        "https://example.com/pr/1",
      ],
      root
    );
    const ctx = fs.readFileSync(ctxPath, "utf-8");
    expect(ctx).toContain("**Current Status:** in_review");
    expect(ctx).toContain("- Branch: feature/foo");
    expect(ctx).toContain("- Pull Request URL: https://example.com/pr/1");
  });

  it("fails when --work-order-number is omitted", () => {
    const root = makeTmp();
    const r = runBashExpectFail(
      UPDATE_SCRIPT,
      ["--reset", "--context-path", path.join(root, "c.md")],
      root
    );
    expect(r.status).not.toBe(0);
  });
});
