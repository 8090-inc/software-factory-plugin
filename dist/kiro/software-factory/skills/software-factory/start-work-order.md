# Start Work Order Phase

## Purpose

Gather enough product, architecture, and repository context to implement correctly before editing code.

## Workflow

### 1. Resume or initialize the execution tracking directory

Check whether `.sw-factory/WO-XXX/` already exists for the work order or task, where `WO-XXX` is the work order number or another stable task identifier.

- If it exists: resume from the current checklist state.
- If it does not exist: initialize it with the script.

```bash
bash path/to/software-factory/scripts/init-wo-execution.sh \
  --work-order-number "WO-XXX" \
  --work-order-title "<title>" \
  --work-order-id "<stable-id>"
```

Resolve `path/to/software-factory` relative to this skill directory. If the shell is already in the skill directory, use `bash scripts/init-wo-execution.sh ...`.

The script creates:

- `checklist.md`: execution checklist to maintain progressively.
- `context.md`: task metadata, upstream docs, branch, and delivery context.
- `implementation-plan.md`: implementation plan workspace.
- `review-log.md`: review and verification evidence log.

Do not re-run initialization for an existing `.sw-factory/WO-XXX/` directory unless the user explicitly approves replacing execution files.

### 2. Follow the checklist protocol

Complete the checklist incrementally throughout execution. Check items off immediately after completing them, add notes in real time, and record file paths, commands, decisions, and evidence during implementation.

If a checklist item does not apply, write `[SKIP]` in the checkbox and include a reason:

```markdown
- [SKIP] E2E tests run and passing
  Skip reason: Backend-only change with no user-facing workflow.
```

Teams should customize the checklist over time so it reflects the repository's actual harness: build commands, test commands, screenshots, generated artifacts, database checks, deploy checks, and review expectations.

### 3. Gather context

1. Read the work order, ticket, or user request as execution scope.
2. Identify linked requirements, blueprints, designs, artifacts, issue threads, and code references.
3. Read all linked requirements and extract the acceptance criteria that completion must satisfy.
4. Read all linked blueprints. Follow referenced blueprints and component mentions that affect the implementation path.
5. Explore analogous code in the repository before inventing new structure.
6. Identify project commands for formatting, linting, type checking, tests, builds, migrations, and local verification.
7. Fill in `context.md` with task identifiers, source links, upstream documents, branch, assumptions, and open questions.
8. Ask the user only for blockers that cannot be resolved from the repository or upstream docs.

Use subagents or parallel search when the environment supports it and the work can be separated cleanly, for example one agent for blueprint/context reading and another for codebase pattern discovery.

### 4. Write the implementation plan

Write the plan to `implementation-plan.md` before editing implementation files. See [writing-implementation-plans.md](writing-implementation-plans.md).

The plan should name files, signatures, control flow, verification commands, risk areas, and parallelizable steps.

## Guardrails

- Keep implementation tied to work order scope, requirement acceptance criteria, and blueprint architecture.
- Prefer existing patterns and reusable code over new abstractions.
- Treat unchecked assumptions as risks and record them.
- Keep checklist, plan, and review log current enough that another agent can resume the work.
