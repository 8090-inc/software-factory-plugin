---
name: evaluate
description: Evaluate a skill across model tiers using blind testing
arguments:
  - name: skill-path
    description: Path to the SKILL.md file to evaluate
    required: true
  - name: test-cases-path
    description: Path to the test cases JSON file
    required: true
---

Evaluate the skill at `$ARGUMENTS.skill-path` using the test cases at `$ARGUMENTS.test-cases-path`.

Use the `evaluate-skill` skill to orchestrate the evaluation. This will:

1. Run the skill with blind test-subject agents at opus, sonnet, and haiku tiers
2. Compare outputs against expected outcomes
3. Generate a refinement report with specific recommendations

Report the results when complete.
