---
name: skill-evaluator
description: Evaluate AI skills across model tiers with blind testing and refinement recommendations
version: 0.0.1
---

# Skill Evaluator

This power evaluates AI skills across model tiers (opus → sonnet → haiku) using blind sub-agent testing.

## Capabilities

- **Blind evaluation**: Test subjects execute skills without knowledge of expected outcomes
- **Multi-tier testing**: Run skills at progressively lower model tiers to find clarity breakpoints
- **Refinement recommendations**: Generate specific suggestions to improve skill clarity

## Workflow

1. Provide a skill path and test cases (input/expected-outcome pairs)
2. The experimenter agent orchestrates blind test runs across model tiers
3. Results are compared against expected outcomes
4. A refinement report is generated with specific recommendations

## Related Files

- `steering/evaluation-workflow.md` — Evaluation workflow steering
- `mcp.json` — MCP server configuration (empty — this power is skill/agent-based)
