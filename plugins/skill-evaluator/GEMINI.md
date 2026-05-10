# Skill Evaluator

Evaluate AI skills across model tiers with blind testing and refinement recommendations.

## Overview

This extension tests AI skills across model tiers (opus → sonnet → haiku) using blind sub-agent testing. It identifies where skill clarity degrades and provides actionable refinement recommendations.

## Usage

Use the `/evaluate` command to start an evaluation:

```
/evaluate <skill-path> <test-cases-path>
```

- `skill-path`: Path to the SKILL.md file to evaluate
- `test-cases-path`: Path to a JSON file with test cases (array of `{ input, expectedOutcome }`)

## How It Works

1. The experimenter agent reads the skill and test cases
2. Separate blind test-subject agents are spawned per test case at the highest tier (opus)
3. The process repeats at lower tiers (sonnet, then haiku)
4. Results are compared against expected outcomes per tier
5. A refinement report identifies where clarity breaks down and recommends improvements
