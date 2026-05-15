# Review Phase

## Purpose

Review the implemented work against the Work Order, requirements, blueprints, repository conventions, and verification evidence. Record each review round in `review-log.md`.

## When To Use This File

Use after implementation is complete and before final completion or handoff.

## Workflow

### 1. Collect the changed-files list

Use the repository's VCS to list changed files. For git repositories, a common command is:

```bash
git diff --name-only main...HEAD
```

If the base branch is not `main`, use the correct base for the repository.

### 2. Run review dimensions

Run every applicable dimension. Use subagents when available and useful, especially when the dimensions can run independently.

- Requirements alignment: every linked acceptance criterion is satisfied or explicitly out of scope.
- Blueprint alignment: implementation follows named components, contracts, data flow, and architectural boundaries.
- Architecture and conventions: file placement, naming, layering, dependency direction, error handling, logging, and reuse match local patterns.
- Tests and build health: relevant unit, integration, E2E, lint, typecheck, and build commands pass or have documented unrelated failures.
- User-facing verification: screenshots, browser checks, CLI output, generated files, emails, PDFs, exports, or manual flows are inspected when the change affects visible behavior.
- Security, privacy, and data safety: authz/authn, input validation, secrets, PII handling, migrations, and destructive operations are checked when relevant.

### 3. Record the review round

Append a new round to `review-log.md`. Do not overwrite earlier rounds.

Each finding should include:

- Severity: blocking or advisory
- File or area
- Requirement, blueprint, or convention violated
- Concrete fix needed

### 4. Handle the verdict

- `APPROVED`: no blocking findings remain; proceed to completion.
- `CHANGES_REQUESTED`: fix every blocking finding, then run another review round.

Do not loop indefinitely on user-judgment questions. Surface the decision to the user when the correct fix is ambiguous.

## Rules

- Every review round appends to `review-log.md`.
- Visual verification may require browser or screenshot tooling when the change produces user-facing output.
- If a finding is unresolvable, requires user judgment, or is out of scope, surface it to the user rather than looping forever.
- The builder should act on blocking findings before handoff.
