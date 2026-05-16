# Execute Work Order

## Purpose

Execute one or more Work Orders end to end: gather context, plan, implement, review, verify, and hand off.

## Single Work Order Execution

### 1. Resume or initialize the execution directory

First check whether `.sw-factory/WO-<number>/` already exists.

- If it exists: resume from the existing execution files and continue from the current checklist phase.
- If it does not exist: initialize it using the bash script.

```bash
bash path/to/software-factory/execution/scripts/init-wo-execution.sh \
  --work-order-number "WO-<number>" \
  --work-order-title "<title>" \
  --work-order-id "<stable-id>"
```

Resolve `path/to/software-factory` relative to this skill directory. If the shell is already in the skill directory, use `bash execution/scripts/init-wo-execution.sh ...`.

Initialization creates:

- `checklist.md` - execution checklist
- `context.md` - quick-reference links and notes for execution context
- `implementation-plan.md` - implementation plan
- `review-log.md` - review log

Do not re-run initialization for an existing Work Order directory unless the user explicitly approves replacing execution files, and commit `.sw-factory/` with the rest of the change when Git is your execution-artifact system of record.

### 2. Follow the checklist protocol

**CHECKLIST COMPLETION IS MANDATORY. EVERY ITEM MUST END IN ONE OF TWO STATES: CHECKED COMPLETE WITH `[x]`, OR MARKED `[SKIP]` WITH A SKIP REASON. UNCHECKED ITEMS ARE EXECUTION FAILURES, NOT TODOs TO IGNORE.**

Complete the checklist incrementally throughout execution. Check items off immediately after completing them and add notes in real time when evidence or skip reasons are needed. Do not defer checklist updates to the end. Each phase ends with a certification line that must be checked before proceeding to the next phase.

Skip protocol:

```markdown
- [SKIP] E2E tests run/passing
  Skip reason: Backend-only service refactor with no user-facing flow.
```

### 3. Gather Software Factory context

Use the Software Factory MCP to gather work order context. Track each completed context step in `checklist.md`; do not duplicate checklist detail here.

1. Treat the Work Order description or task request as execution scope: in-scope deliverables, exclusions, linked records, and acceptance expectations.
2. Read all linked requirements and extract the acceptance criteria that must pass.
3. Read all linked blueprints and identify the architecture path: components, models, contracts, composition, and implementation boundaries.
4. CRITICAL: Follow all blueprint references in the documents you read, including `@…` mentions and markdown links to other blueprints (resolve and read those through MCP too). It is absolutely necessary to understand linked blueprints.
5. Explore analogous code in the repository before inventing new structure. Identify file structure, naming patterns, service patterns, error handling, dependency injection, reusable components, and conventions specific to the touched module.
6. Use subagents or parallel exploration when the environment supports it and the work can be separated cleanly.
7. Fill or update `context.md` using `execution/scripts/update-context-index.sh` when structured links are known. Rerun the script whenever new referenced blueprints or user-directed delivery links become known.

Example (you may pass `--requirement`, `--blueprint`, and `--referenced-blueprint` more than once):

```bash
bash path/to/software-factory/execution/scripts/update-context-index.sh \
  --work-order-number "WO-<number>" \
  --work-order-title "<title>" \
  --work-order-id "<stable-id>" \
  --status "in_progress" \
  --requirement "<requirement title>|<id-or-url>" \
  --requirement "<another requirement>|<id-or-url>" \
  --blueprint "<blueprint title>|<id-or-url>" \
  --blueprint "<another blueprint>|<id-or-url>" \
  --referenced-blueprint "<component blueprint title>|<id-or-url>" \
  --referenced-blueprint "<another referenced blueprint>|<id-or-url>" \
  --branch "<branch-name-if-applicable>" \
  --pull-request-url "<url-if-applicable>"
```

### 4. Write the implementation plan

Write the implementation plan to `.sw-factory/WO-<number>/implementation-plan.md` (see [writing-implementation-plans.md](writing-implementation-plans.md) for structure and guidance).

**Do not create or modify implementation files until `implementation-plan.md` is written.** The plan must exist before code changes begin.

### 5. Implement with context

Implement only the Work Order scope. The implementation must stay traceable to:

- Work Order deliverables and exclusions
- linked requirements and acceptance criteria
- linked blueprint architecture, contracts, component composition, and implementation boundaries
- local codebase conventions and reusable code discovered during context gathering

### 6. Review and verify

After implementation is complete, follow [review-phase.md](review-phase.md). The review phase owns review orchestration and writes to `review-log.md`.

After review approval, run or confirm all relevant verification:

- tests required by the Work Order, requirements, implementation risk, and changed code paths
- acceptance criteria satisfaction
- blueprint alignment
- checklist evidence and phase certifications

### 7. Complete the handoff

Before handoff, confirm:

- `checklist.md` has all phase certifications checked, every item is `[x]` or `[SKIP]`, and every `[SKIP]` has a reason
- `context.md` has the Work Order entity line, connected requirements, connected blueprints, referenced blueprints, current status, and known delivery links filled in
- `implementation-plan.md` reflects the implementation that landed
- `review-log.md` final verdict is `APPROVED`

Using the Software Factory MCP update the Work Order status to `in_review`.

Follow the user's requested version-control handoff; do not assume commit, push, PR, or merge behavior.

## Multiple Work Orders

Use this section when the user's request references more than one Work Order, for example:

- "implement WO-1740, WO-1741, WO-1742"
- "execute WO-1740 through WO-1758"
- "move all Work Orders in phase 23 to review"
- "run the epic for feature X" after listing its Work Orders

Batch execution is sequential by default. Expand ranges or phase/epic references into an ordered list before starting. If ordering is ambiguous, resolve by explicit dependency first, then phase/order metadata, then Work Order number or creation order.

For each Work Order in order:

1. Create or update a visible progress item for that Work Order.
2. Execute the Work Order using this file.
3. If the Work Order reaches handoff, record `WO-<number>: COMPLETE - <summary>` and continue.
4. If the Work Order fails permanently, record `WO-<number>: FAILED - <reason>` and stop the queue. The user decides whether to fix, retry, or skip.

Rules:

- One Work Order at a time unless the user explicitly authorizes parallel execution and the tasks are independent.
- Do not batch unrelated Work Orders into one execution directory.
- Do not skip failed Work Orders without user direction.
- Keep each Work Order's checklist, context, plan, and review log separate.

When the queue stops or finishes, report completed, failed, and not-started Work Orders.
