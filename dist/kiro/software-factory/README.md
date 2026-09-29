# Software Factory

This plugin equips coding agents to use the Software Factory MCP effectively and guides them through reliable, traceable Work Order execution in your repository.

## How It Works

The plugin directs agents to read your project's current writing rules through the Software Factory MCP before they create or change a Knowledge Base document, requirement, blueprint, Work Order, feedback item, or theme.

When executing one or more Work Orders, the plugin guides the agent to gather the linked requirements and blueprints, write an implementation plan, implement only the Work Order scope, run a review, and hand the Work Order off for review. The skill ships the templates this process fills in: a checklist, a context index, an implementation plan, and a review log. It also ships scripts that initialize an execution directory and keep its context index current.

The plugin assumes the Software Factory MCP is already installed and connected for your project. It also ships an empty MCP configuration where your team can register the Software Factory MCP, along with any other MCP servers your workflow depends on.

## Usage

Agents start at `skills/software-factory/SKILL.md`, which routes each task to the right execution guide or MCP skill. By default, execution artifacts are written under `.sw-factory/`.

The checklist template is meant to evolve. Adapt it to the build commands, test suites, generated artifacts, review rituals, and release gates that make agentic programming reliable in your repository.

## License

MIT
