#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="plugins/software-factory"
GEMINI_DIST="dist/gemini/software-factory"
KIRO_DIST="dist/kiro/software-factory"

fail() {
  echo "::error::$1" >&2
  exit 1
}

require_file() {
  local file="$1"
  [[ -f "$file" ]] || fail "Missing required file: $file"
}

require_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || fail "Missing required directory: $dir"
}

require_file "$PLUGIN_DIR/.claude-plugin/plugin.json"
require_file "$PLUGIN_DIR/.cursor-plugin/plugin.json"
require_file "$PLUGIN_DIR/.codex-plugin/plugin.json"
require_file "$PLUGIN_DIR/gemini-extension.json"
require_file "$PLUGIN_DIR/POWER.md"
require_file "$PLUGIN_DIR/GEMINI.md"
require_file "$PLUGIN_DIR/.mcp.json"
require_file "$PLUGIN_DIR/mcp.json"
require_file "$PLUGIN_DIR/README.md"
require_file "$PLUGIN_DIR/LICENSE"
require_file "$PLUGIN_DIR/skills/software-factory/SKILL.md"
require_file "$PLUGIN_DIR/skills/software-factory/guides/requirements-writing-guide.md"
require_file "$PLUGIN_DIR/skills/software-factory/guides/blueprint-writing-guide.md"
require_file "$PLUGIN_DIR/skills/software-factory/guides/work-order-writing-guide.md"
require_file "$PLUGIN_DIR/skills/software-factory/execution/execute-work-order.md"
require_file "$PLUGIN_DIR/skills/software-factory/execution/review-phase.md"
require_file "$PLUGIN_DIR/skills/software-factory/execution/writing-implementation-plans.md"
require_file "$PLUGIN_DIR/skills/software-factory/execution/scripts/checklist-template.md"
require_file "$PLUGIN_DIR/skills/software-factory/execution/scripts/context-template.md"
require_file "$PLUGIN_DIR/skills/software-factory/execution/scripts/implementation-plan-template.md"
require_file "$PLUGIN_DIR/skills/software-factory/execution/scripts/review-log-template.md"
require_file "$PLUGIN_DIR/skills/software-factory/execution/scripts/init-wo-execution.sh"
require_file "$PLUGIN_DIR/skills/software-factory/execution/scripts/update-context-index.sh"

require_dir "$GEMINI_DIST"
require_dir "$KIRO_DIST"
require_file "$GEMINI_DIST/gemini-extension.json"
require_file "$GEMINI_DIST/skills/software-factory/SKILL.md"
require_file "$KIRO_DIST/POWER.md"
require_file "$KIRO_DIST/skills/software-factory/SKILL.md"

if [[ -e "$PLUGIN_DIR/hooks/claude.yaml" || -e "$PLUGIN_DIR/hooks/claude.json" ]]; then
  fail "Software Factory plugin must not publish hook definitions."
fi

FORBIDDEN_PATTERN="verification-receipt|completion-gate|validate-work-order|edit_work_orders|read_work_order|read_requirement|read_blueprint|search_requirements|search_blueprints|\\.cursor|Foundry|Feature Node|code-simplifier|Task tool|Figma|e2e-playwright|✅|❌"
if grep -R -n -E "$FORBIDDEN_PATTERN" "$PLUGIN_DIR" "$GEMINI_DIST" "$KIRO_DIST"; then
  fail "Software Factory plugin contains private or non-portable workflow references."
fi

for marketplace in .claude-plugin/marketplace.json .cursor-plugin/marketplace.json .agents/plugins/marketplace.json; do
  if ! grep -q '"name": "software-factory"' "$marketplace"; then
    fail "Marketplace does not list software-factory: $marketplace"
  fi
done

echo "Software Factory plugin publishability checks passed."
