# Work Order Writing Guide

Source: https://8090.ai/docs/opinions/work-order-writing-guide

Use this guide when creating or updating Work Orders. A Work Order is an implementation task that delivers requirements while following blueprint specifications. A good Work Order connects the correct context, states what needs to be done, defines what is out of scope, and explains how completion will be verified.

The top priority when creating any Work Order is connecting the right Software Factory context. Work Orders can have different types (for example build, fix, requirements, blueprint, artifact, or other), but for every type the first objective is the same: link the correct requirements and blueprints so the implementer can read the source records directly. Do not restate details that already live in connected Requirements or Blueprints; reference the relevant records and describe the specific delivery responsibility for this Work Order.

## Description Structure

Every Work Order description must include six sections:

1. `## Summary`
2. `## In Scope`
3. `## Out of Scope`
4. `## Requirements`
5. `## Blueprints`
6. `## E2E Acceptance Tests`

## Summary

Answer: "What is being built or changed?"

- State the outcome this Work Order enables.
- Focus on value and system impact.
- Keep it to 2-3 sentences.
- Do not include broad background explanation.

## In Scope

List the responsibilities owned by this Work Order.

- Define functional boundaries.
- Do not restate acceptance criteria verbatim.
- Avoid low-level implementation steps unless they are essential constraints.
- Make clear what this Work Order owns.

## Out Of Scope

List what is excluded or deferred.

- Clarify boundaries with adjacent Work Orders.
- Prevent scope creep by making exclusions explicit.

## Requirements

Name the connected Requirements that define this Work Order's scope.

- Include the relevant Requirements document title and IDs.
- Identify which requirement or acceptance-criteria IDs are in scope.
- Do not restate requirement prose that the connected document already contains.
- Add commentary only when it narrows what this Work Order owns.

## Blueprints

Name the connected Blueprints that inform implementation.

Keep this section minimal because the implementer will read the full Blueprints directly. Use one line per Blueprint:

```markdown
- {Blueprint Name} - {one-line summary of what it covers}
```

## E2E Acceptance Tests

Describe the E2E coverage that validates the acceptance criteria. Use structured test specifications that follow the e2e-validator conventions.

For each requirement group, include:

- `COV_` ID mapped to the relevant `REQ-` ID.
- `test.describe` block name.
- Test file path.
- Tags and priority.
- Individual `@COV_...` test cases mapped to acceptance criteria.
- Step-level user actions and assertions.
- Selectors or target UI elements where relevant.
- Data preconditions.
- Persistence verification patterns when state must survive close/reopen or navigation.

Template:

```markdown
### COV_{PREFIX}_{NNN}: {Requirement Group Name}

**File:** `e2e-validator/tests/{module}/{area}/{spec-file-name}.spec.ts`

**Tags:** {tag list} | **Priority:** {P0/P1/P2}

**@COV_{PREFIX}_{NNN}.1 - should {description matching the AC}**

1. Sign in and navigate to {module}.
2. {User action}.
3. Assert {expected visible result}.
4. {Next action}.
5. Assert {state change or persistence}.
```

## Quality Bar

- Precise enough to execute without clarifying questions.
- Narrow enough to prevent scope drift.
- Grounded in connected Requirements and Blueprints.
- Verification-focused: the E2E section proves how acceptance criteria will be validated.
