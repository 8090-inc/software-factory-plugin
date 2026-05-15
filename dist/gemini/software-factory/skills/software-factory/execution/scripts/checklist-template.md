<!--lint disable no-undefined-references strong-marker-->

# Work Order Execution Checklist: __WORK_ORDER_NUMBER__

**Work Order Number or ID:** __WORK_ORDER_NUMBER__
**Work Order Title:** __WORK_ORDER_TITLE__
**Stable Work Order ID:** __WORK_ORDER_ID__
**Initialized At (UTC):** __INITIALIZED_AT__

## How To Use This Checklist

Update this file continuously. Check items immediately after completion. Mark non-applicable items as `[SKIP]` and add a reason on the next line. Add repository-specific commands and checks as the team learns what makes agent work reliable here.

## Phase 1: Start / Context Gathering

### Required Steps

- [ ] Work Order, ticket, or user request reviewed
- [ ] Scope and out-of-scope boundaries identified
- [ ] Linked requirements and blueprints identified
- [ ] Every connected requirements document reviewed
- [ ] Acceptance criteria extracted from requirements
- [ ] Every connected blueprint document reviewed
- [ ] Referenced blueprints and relevant component mentions followed
- [ ] Architecture path identified from blueprints: components, contracts, composition, data flow, boundaries
- [ ] Existing code patterns and reusable modules explored
- [ ] Project harness commands identified: format, lint, typecheck, tests, build, generated artifacts, migrations, local run
- [ ] `context.md` filled or updated
- [ ] User asked about unresolved blockers, if any

- [ ] **Certification: Phase 1 complete. Proceeding to Phase 2.**

## Phase 2: Planning And Implementation

### Implementation Plan

- [ ] Reuse-first discovery documented in `implementation-plan.md`
- [ ] Code reuse and package structure documented
- [ ] Components, interfaces, contracts, and flow documented
- [ ] Verification plan documented
- [ ] Plan updated if implementation diverged

### Implementation

- [ ] Changes are scoped to the Work Order
- [ ] Existing patterns are followed
- [ ] Tests added or updated for changed behavior
- [ ] Documentation, generated files, fixtures, migrations, or config updated where relevant
- [ ] Key implementation decisions recorded below

### Notes

- Files changed:
- Implementation decisions:
- Risks or assumptions:

- [ ] **Certification: Phase 2 complete. Proceeding to Phase 3.**

## Phase 3: Review And Verification

### Review

- [ ] Review phase completed per `execution/review-phase.md`
- [ ] Requirements alignment reviewed
- [ ] Blueprint alignment reviewed
- [ ] Architecture and conventions reviewed
- [ ] Security, privacy, data safety, and migration risks reviewed where relevant
- [ ] User-facing behavior reviewed where relevant
- [ ] Latest `review-log.md` verdict is `APPROVED`
- [ ] All acceptance criteria from the Work Order and linked requirements are satisfied
- [ ] Architecture is aligned with linked blueprints, or documented drift is accepted

### Harness Commands

Record exact commands and results.

- Format:
- Lint:
- Typecheck:
- Unit tests:
- Integration tests:
- E2E tests:
- Build:
- Migrations or generated artifacts:
- Manual or visual verification:
- Other:

### Evidence

- Screenshots:
- Logs:
- Test output:
- PR or review link:

- [ ] **Certification: Phase 3 complete. Proceeding to Final Completion.**

## Final Completion Check

- [ ] All phase certifications complete
- [ ] Checklist fully filled out with evidence
- [ ] `context.md` current
- [ ] `implementation-plan.md` current
- [ ] `review-log.md` current
- [ ] Intended files are tracked and unrelated dirty files are excluded from handoff
- [ ] Handoff summary prepared

## Final Summary

- Outcome:
- Verification:
- Remaining risks:
- Follow-up tasks:
