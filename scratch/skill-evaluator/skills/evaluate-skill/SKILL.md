---
name: evaluate-skill
description: Evaluate an AI skill across model tiers using blind sub-agent testing
arguments:
  - name: skill-path
    description: Path to the SKILL.md file to evaluate
    required: true
  - name: test-cases-path
    description: Path to a JSON file containing test cases (array of { input, expectedOutcome })
    required: true
---

# Evaluate Skill

Orchestrate a cross-tier evaluation of an AI skill to determine its clarity and robustness.

## Procedure

1. **Load inputs**
   - Read the skill file at `{{ skill-path }}`
   - Read the test cases file at `{{ test-cases-path }}`
   - Validate that test cases is a JSON array of objects with `input` and `expectedOutcome` fields

2. **Set up evaluation matrix**
   - Model tiers to test: `opus`, `sonnet`, `haiku`
   - For each tier, for each test case: plan one blind test run

3. **Execute blind tests** (highest tier first)
   - For each model tier (opus → sonnet → haiku):
     - For each test case:
       - Spawn a **test-subject** agent at the current tier
       - Provide it ONLY the skill content and the test case `input`
       - Do NOT provide the `expectedOutcome` to the test subject
       - Collect the test subject's output

4. **Evaluate results**
   - For each test run, compare the test subject's output against the `expectedOutcome`
   - Determine pass/fail using semantic similarity (the output need not be identical, but must achieve the same goal)
   - Record: tier, test case index, pass/fail, output summary

5. **Generate refinement report**
   - Identify the lowest tier where all test cases pass ("clarity floor")
   - For each failure, analyze WHY the lower-tier agent failed:
     - Ambiguous instructions?
     - Missing context or assumptions?
     - Overly complex multi-step reasoning?
     - Implicit knowledge requirements?
   - Produce specific, actionable recommendations to improve the skill
   - Format as a structured report with sections: Summary, Per-Tier Results, Failure Analysis, Recommendations

6. **Output the report** to the user
