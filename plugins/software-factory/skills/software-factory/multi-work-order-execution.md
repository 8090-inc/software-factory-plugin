# Multi-Work-Order Execution

## Purpose

Execute a queue of work orders without losing ordering, state, or evidence.

## When to use

Use this file when the user provides more than one work order, for example:

- "Implement WO-101, WO-102, and WO-103."
- "Execute work orders 20 through 25."
- "Complete every ready work order in this phase."
- "Run this epic."

For a single work order, follow [start-work-order.md](start-work-order.md), [review-phase.md](review-phase.md), and [complete-work-order.md](complete-work-order.md).

## Workflow

1. Expand the queue into an ordered list.
2. Confirm dependencies and intended execution order. If ordering is ambiguous, use upstream phase/order metadata when available, then work order number or creation order.
3. Create a visible progress list with one item per work order.
4. Execute one work order at a time unless the user explicitly asks for parallel execution and the tasks are independent.
5. For each work order:
   - Initialize or resume its `.sw-factory/WO-XXX/` execution tracking directory.
   - Follow the single-work-order workflow end to end.
   - Stop if a blocking failure prevents completion.
   - Record outcome, evidence, and next status.
6. Return a queue summary.

## Queue Summary Format

```markdown
Completed:
- WO-101: <summary>

Failed:
- WO-102: <reason and next action>

Not started:
- WO-103
```

## Rules

- Preserve sequential dependencies unless independence is explicit.
- Do not skip failed work orders silently.
- Keep each work order's checklist, context, plan, and review log separate.
- Commit, PR, or handoff according to the repository's normal workflow and the user's instructions.
