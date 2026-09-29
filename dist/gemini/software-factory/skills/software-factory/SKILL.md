---
name: software-factory
description: "Guides coding agents in using the 8090 Software Factory MCP and executing Work Orders reliably and traceably in a repository—requirements, blueprints, work orders, implementation plans, review, and verification. Read this skill first, then follow the relevant execution process."
---

# Software Factory

Software Factory is an AI-native SDLC method for connecting product intent, technical intent, and implementation work in one traceable workflow.

This skill equips you to use the Software Factory MCP effectively and guides you through reliable, traceable Work Order execution in this repository.

## Records

- **Requirements** describe the system from an external perspective: what it must do for its users and why.
- **Blueprints** describe the system from an internal perspective: its components, contracts, and architecture.
- **Work Orders** describe delivery: the implementable scope of a change, its exclusions, and the requirements and blueprints it connects to.

## Record authoring

Before you create or change a requirement, blueprint, or Work Order, read the project's current writing rules for that kind of record through the Software Factory MCP. Call `list_skills` to find the writing rules for requirements, blueprints, or Work Orders, then call `read_skill` on that skill and read any child skill it points you to. Write the record exactly as those rules describe. If the Software Factory MCP is unavailable, stop and tell the user.

During implementation, read every referenced Blueprint through the Software Factory MCP before coding, including `@…` mentions **and links**.

## Routing

| Task                                            | Read                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Executing one Work Order                        | [execution/execute-work-order.md](execution/execute-work-order.md)                     |
| Executing multiple Work Orders                  | [execution/execute-work-order.md](execution/execute-work-order.md)                     |
| Writing an implementation plan during execution | [execution/writing-implementation-plans.md](execution/writing-implementation-plans.md) |
| Running the review                              | [execution/review.md](execution/review.md)                                             |
| Initializing an execution directory             | [execution/scripts/init-wo-execution.sh](execution/scripts/init-wo-execution.sh)       |
| Updating execution context                      | [execution/scripts/update-context-index.sh](execution/scripts/update-context-index.sh) |
| Creating or changing a Software Factory record  | Project skills, through the Software Factory MCP                                       |

## Work Order Execution

**Follow the execution process for every Work Order. Finish every checklist item in one of two states: checked complete with `[x]`, or marked `[SKIP]` with a skip reason. An unchecked item is an execution failure.**

Follow [execution/execute-work-order.md](execution/execute-work-order.md) for single Work Orders and multi-Work-Order queues, and read the related files in `execution/` when that guide routes to them. The execution files record how the work was done; the Software Factory MCP writing rules govern the records themselves.

The checklist is a living harness-engineering artifact. Teams evolve it with the exact commands, checks, screenshots, migrations, fixtures, seed data, CI gates, and review rituals that make agentic programming reliable in their codebase.

Commit, push, open a pull request, or merge only when the user or the repository workflow asks for it.
