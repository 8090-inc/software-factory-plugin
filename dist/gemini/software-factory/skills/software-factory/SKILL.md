---
name: software-factory
description: "Skills for coding agents to use the 8090 Software Factory—requirements, blueprints, work orders, and structured work order execution, with implementation plans, review, and verification. This skill is a directory: read it first, then follow the relevant guide or execution process."
---

# Software Factory

Software Factory is an AI-native SDLC method for connecting product intent, technical intent, and implementation work in one traceable workflow.

This portable skill is for writing Software Factory records and executing Work Orders headlessly in any repository. It does not assume access to a hosted Software Factory service, private repository automation, or repository-specific review skills. When project tools are available, use them; otherwise, use the files and templates in this skill as the execution system of record.

## Records

### Requirements

Requirements describe the system from an external perspective.

- Product Overview Documents capture durable product-wide why and what: business problem, current state, product description, success metrics, technical requirements, and other framing.
- Feature Requirements Documents capture localized feature intent with user stories and acceptance criteria. User stories state who needs what and why; acceptance criteria define testable behavior.

Read [guides/requirements-writing-guide.md](guides/requirements-writing-guide.md) when writing or revising requirements.

### Blueprints

Blueprints describe the system from an internal perspective.

- Container Blueprints document separately deployable or runnable units and their runtime boundaries.
- Component Blueprints document reusable system capabilities. Structured `component` blocks define runtime nodes; relationship paragraphs describe data, contracts, and control flow.
- Feature Blueprints compose Component Blueprints and feature-specific components to satisfy a Feature Requirements Document.

Read [guides/blueprint-writing-guide.md](guides/blueprint-writing-guide.md) when writing or revising blueprints. During implementation, follow referenced Blueprints—including `@…` mentions **and links** resolved via MCP—before coding so the full component graph is understood.

### Delivery

Work Orders describe delivery intent: implementable scope, exclusions, connected requirements, connected blueprints, and acceptance-test expectations.

Read [guides/work-order-writing-guide.md](guides/work-order-writing-guide.md) when creating or updating Work Orders.

## Routing

| Task                                            | Read                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Executing one Work Order                        | [execution/execute-work-order.md](execution/execute-work-order.md)                     |
| Executing multiple Work Orders                  | [execution/execute-work-order.md](execution/execute-work-order.md)                     |
| Writing an implementation plan during execution | [execution/writing-implementation-plans.md](execution/writing-implementation-plans.md) |
| Running the review phase                        | [execution/review-phase.md](execution/review-phase.md)                                 |
| Initializing an execution directory             | [execution/scripts/init-wo-execution.sh](execution/scripts/init-wo-execution.sh)       |
| Updating execution context                      | [execution/scripts/update-context-index.sh](execution/scripts/update-context-index.sh) |
| Writing or revising requirements                | [guides/requirements-writing-guide.md](guides/requirements-writing-guide.md)           |
| Writing or revising blueprints                  | [guides/blueprint-writing-guide.md](guides/blueprint-writing-guide.md)                 |
| Creating or updating Work Orders                | [guides/work-order-writing-guide.md](guides/work-order-writing-guide.md)               |

## Work Order Execution

**Work Order executions must follow the execution process every time. Every checklist item must be checked complete with `[x]` or explicitly marked `[SKIP]` with a skip reason. Do not treat an unchecked item as implied, optional, or complete.**

Follow [execution/execute-work-order.md](execution/execute-work-order.md) for single Work Orders and multi-Work-Order queues. Read the related files in `execution/` when that guide routes to them.

The checklist is intentionally a living harness-engineering artifact. Teams should evolve it with the exact commands, checks, screenshots, migrations, fixtures, seed data, CI gates, and review rituals that make agentic programming reliable in their codebase.

Version-control handoff is user-directed. Do not assume when to commit, push, open a PR, or merge unless the user or repository workflow specifies it.

## Public Docs

- Requirements Writing Guide: https://8090.ai/docs/opinions/requirements-writing-guide
- Blueprint Writing Guide: https://8090.ai/docs/opinions/blueprint-writing-guide
- Work Orders: https://8090.ai/docs/modules/work-orders
