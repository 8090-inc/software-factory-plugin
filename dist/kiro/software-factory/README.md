# Software Factory

Software Factory is a portable coding-agent skill for turning requirements and blueprints into traceable Work Orders and repeatable implementation workflows.

## Marketplace Description

Guides agents to use the 8090 Software Factory platform to write requirements and blueprints, then execute traceable Work Orders.

## What It Includes

- Refactored skill layout with `guides/` and `execution/`.
- Requirements, Blueprint, and Work Order writing guides based on public 8090 docs.
- Single and multi-Work-Order execution through one execution process.
- Generic checklist, context, implementation-plan, review-log, initialization, and context-index templates.
- Empty MCP configuration files for teams that want to connect their own Software Factory or project tools.

## Public Docs

- Requirements Writing Guide: https://8090.ai/docs/opinions/requirements-writing-guide
- Blueprint Writing Guide: https://8090.ai/docs/opinions/blueprint-writing-guide
- Work Orders: https://8090.ai/docs/modules/work-orders

## Usage

Start with `skills/software-factory/SKILL.md`. The execution process writes artifacts under `.sw-factory/` by default. The checklist template is intentionally a living harness-engineering artifact: adapt it to the build commands, test suites, generated artifacts, review rituals, and release gates that make agentic programming reliable in your repository.

## License

MIT
