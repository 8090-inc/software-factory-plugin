---
name: software-factory
description: Use Software Factory methods to turn requirements and blueprints into traceable, repeatable coding-agent work in any repository.
---

# Software Factory

Software Factory is an AI-native SDLC method for connecting product intent to working code. Use this skill when a user asks you to work with Software Factory requirements, blueprints, work orders, implementation plans, or repeatable coding-agent execution.

The core flow is:

1. Requirements define what must be true for users and the business.
2. Blueprints define how the system should be structured to satisfy those requirements.
3. Work orders define the executable development tasks that move the codebase toward the target state.
4. The execution checklist captures the repository-specific harness: build commands, test commands, review steps, verification evidence, and handoff expectations.

If the user is confused about Software Factory concepts, link them to the relevant public docs:

- Requirements Writing Guide: https://www.8090.ai/docs/opinions/requirements-writing-guide
- Blueprint Writing Guide: https://www.8090.ai/docs/opinions/blueprint-writing-guide
- Work Orders: https://www.8090.ai/docs/modules/work-orders

## Requirements

Requirements describe what the product must do and why. They stay user-centered and testable; they should not prescribe internal implementation details.

Read [sofa-rws.md](sofa-rws.md) when writing or reviewing requirements. Prefer the token-efficient summary there before opening the full public guide.

## Blueprints

Blueprints describe how the system should be built. They allocate behavior to runtime components, describe contracts and data flow, and give coding agents architectural context before implementation starts.

Read [sofa-bws.md](sofa-bws.md) when writing or reviewing blueprints. When a blueprint references another blueprint or component, follow the reference before implementation so you understand the full component graph.

## Work Order Execution

Use this workflow for any scoped engineering task that should be repeatable and auditable, whether the task came from Software Factory, an issue tracker, a ticket, or a direct user request.

1. Read the work order or task request and identify upstream requirements, blueprints, designs, artifacts, and relevant code.
2. Initialize or resume an execution tracking directory at `.sw-factory/WO-XXX/` with [scripts/init-wo-execution.sh](scripts/init-wo-execution.sh).
3. Fill out `context.md` with the task, links, branch, and upstream document references.
4. Maintain `checklist.md` throughout the work. Check items immediately after completing them, mark non-applicable items as `[SKIP]` with a reason, and add project-specific checks as the repository's harness matures.
5. Write `implementation-plan.md` before editing product code. See [writing-implementation-plans.md](writing-implementation-plans.md).
6. Implement the task, keeping changes scoped to the work order and aligned to the blueprints.
7. Run review and verification. Record findings and evidence in `review-log.md`.
8. Complete the handoff only after the checklist, plan, review log, tests, and user-facing evidence are coherent.

The checklist is intentionally a living harness-engineering artifact. Teams should evolve it over time with the exact commands, checks, screenshots, migrations, fixtures, seed data, CI gates, and review rituals that make agentic programming reliable in their codebase.

## Multi-Work-Order Queues

When the user gives more than one work order, follow [multi-work-order-execution.md](multi-work-order-execution.md). Execute work orders sequentially unless the user explicitly asks for parallel execution and the tasks are independent.

## Skill File Index

| File | Purpose |
| --- | --- |
| [sofa-rws.md](sofa-rws.md) | Token-efficient Requirements Writing Specification based on the public 8090 Software Factory docs |
| [sofa-bws.md](sofa-bws.md) | Token-efficient Blueprint Writing Specification based on the public 8090 Software Factory docs |
| [start-work-order.md](start-work-order.md) | Start phase guide for context gathering and execution-directory setup |
| [writing-implementation-plans.md](writing-implementation-plans.md) | Implementation plan guidance for files, signatures, control flow, and resumable steps |
| [review-phase.md](review-phase.md) | Generic review workflow for code, tests, architecture, and user-facing behavior |
| [complete-work-order.md](complete-work-order.md) | Completion and handoff workflow |
| [multi-work-order-execution.md](multi-work-order-execution.md) | Sequential orchestration for multiple work orders |
| [scripts/init-wo-execution.sh](scripts/init-wo-execution.sh) | Initializes a `.sw-factory/WO-XXX/` execution tracking directory |
| [scripts/checklist-template.md](scripts/checklist-template.md) | Living execution checklist template |
| [scripts/context-template.md](scripts/context-template.md) | Task context template |
| [scripts/implementation-plan-template.md](scripts/implementation-plan-template.md) | Implementation plan template |
| [scripts/review-log-template.md](scripts/review-log-template.md) | Review and verification log template |
