---
inclusion: manual
---

# Evaluation Workflow

## Purpose

Guide the evaluation of AI skills across model tiers to identify clarity breakpoints and generate refinement recommendations.

## Steps

1. **Load the skill and test cases**
   - Read the target SKILL.md file
   - Parse the test cases JSON (array of `{ input, expectedOutcome }`)

2. **Execute blind tests per tier**
   - Tiers: opus → sonnet → haiku
   - For each tier and test case, run the skill blind (no expected outcome provided)
   - Collect structured output from each run

3. **Compare against expected outcomes**
   - Evaluate semantic equivalence (not exact match)
   - Record pass/fail per tier per test case

4. **Analyze failures**
   - Categorize: ambiguous instructions, missing context, complex reasoning, implicit knowledge
   - Map each failure to a specific part of the skill

5. **Generate refinement report**
   - Summary with clarity floor (lowest tier where all tests pass)
   - Per-tier result tables
   - Failure analysis with root causes
   - Ordered recommendations for skill improvement
