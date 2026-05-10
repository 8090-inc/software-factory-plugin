# Complete Work Order Phase

## Purpose

Confirm the work is implemented, verified, documented, and ready for human review or release.

## Workflow

1. Review `checklist.md`.
   - Every item is checked or marked `[SKIP]` with a reason.
   - Phase certifications are complete.
   - Notes, changed files, commands, and evidence are filled in.

2. Review `context.md`.
   - Task identifiers and source links are present.
   - Requirements and blueprints are listed.
   - Branch, PR, or handoff destination is current.
   - Assumptions and open questions are resolved or clearly called out.

3. Review `implementation-plan.md`.
   - The final implementation matches the plan or the plan was updated.
   - File list, signatures, control flow, and verification plan reflect reality.

4. Review `review-log.md`.
   - The latest round verdict is `APPROVED`.
   - Blocking findings from earlier rounds are fixed or explicitly accepted by the user.
   - Evidence paths and command results are recorded.

5. Verify repository state.
   - Intended files are tracked.
   - Generated files are current if the repository expects them.
   - Tests and builds relevant to the change have run.
   - Unrelated dirty files are identified and not mixed into the handoff.

6. Prepare the handoff.
   - Summarize the outcome.
   - List verification commands and results.
   - Call out risks, skipped checks, follow-up work, and any user decisions.
   - If a PR is expected, create or update it according to the repository's normal workflow.

## Completion Standard

Completion means there is enough evidence for another engineer to understand what changed, why it changed, how it maps to requirements and blueprints, and how it was verified.
