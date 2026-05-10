# Writing Implementation Plans

Write the implementation plan after context gathering and before product-code edits. The Blueprint defines intended architecture; the implementation plan translates that architecture into repository-specific files, APIs, call paths, and verification.

## Prerequisites

Before writing the plan:

1. Read the work order or task request.
2. Read linked requirements and acceptance criteria.
3. Read linked blueprints and any referenced blueprints needed for the component graph.
4. Explore nearby code and established patterns.
5. Identify the repository's build, lint, typecheck, test, and review commands.
6. Run a reuse-first discovery pass to find existing code to reuse, extract, or follow as a pattern.

## Required Sections

### Summary

State the intended outcome and high-level approach in 1-3 sentences.

### File and Package Structure

List every file you expect to create or modify, grouped by module. Explain why each belongs there.

### Signatures and Contracts

Define public interfaces before writing bodies: component names, function signatures, service methods, request/response models, events, feature flags, config keys, schemas, and error types.

### Control Flow

Describe the call chain and data flow. Name which component calls which, what data crosses each boundary, where validation happens, and where state changes commit.

### Implementation Steps

Break work into ordered, resumable steps. Each step should produce a coherent intermediate state when possible. Mark steps that can run in parallel only when they touch disjoint files or have no dependency.

### Verification Plan

List exact commands and manual checks the agent should run. Include tests to add or update, build checks, visual checks, migrations, generated artifacts, and any known gaps.

## Maintenance

If implementation changes the plan, update the plan before continuing. The plan is part of the handoff surface, not a disposable note.
