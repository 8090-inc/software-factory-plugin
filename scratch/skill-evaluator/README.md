# Skill Evaluator

Evaluate AI skills across model tiers with blind testing and refinement recommendations.

## What It Does

Given a skill (SKILL.md) and a set of test cases (input/expected-outcome pairs), this plugin:

1. Runs the skill with blind test-subject agents at different model tiers (opus → sonnet → haiku)
2. Compares outputs against expected outcomes
3. Identifies where skill clarity degrades at lower tiers
4. Generates actionable refinement recommendations

## Usage

### Claude Code / Cursor

```
/evaluate path/to/SKILL.md path/to/test-cases.json
```

### Gemini CLI

```
/evaluate path/to/SKILL.md path/to/test-cases.json
```

## Test Cases Format

Create a JSON file with an array of test cases:

```json
[
  {
    "input": "Description of the input scenario",
    "expectedOutcome": "Description of what the skill should produce"
  },
  {
    "input": "Another scenario",
    "expectedOutcome": "Expected result for this scenario"
  }
]
```

## Platform Support

| Platform | Install Method |
|----------|---------------|
| Claude Code | `claude plugin add <repo-url> --path plugins/skill-evaluator` |
| Cursor | `cursor plugin add <repo-url> --path plugins/skill-evaluator` |
| Gemini CLI | `gemini extensions install` (use standalone build in `dist/gemini/skill-evaluator`) |
| Kiro | Install as power (use standalone build in `dist/kiro/skill-evaluator`) |
| Skills CLI | `npx skills add <repo-url>` (auto-discovers SKILL.md files) |

## Architecture

- **evaluate-skill** (skill): Main entry point — orchestrates the evaluation
- **experimenter** (agent): Sets up blind tests, compares outcomes, generates report
- **test-subject** (agent): Executes skills blindly at various model tiers
- **evaluation-protocol** (rule): Ensures structured protocol adherence

## License

ISC
