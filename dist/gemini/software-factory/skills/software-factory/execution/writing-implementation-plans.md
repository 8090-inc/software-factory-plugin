# Writing Implementation Plans

Use this file to write `.sw-factory/WO-<number>/implementation-plan.md`.

The implementation plan is the bridge from Software Factory context to code. It translates the Work Order, linked requirements, and linked Blueprints into concrete repository changes.

Treat the Blueprint as the first-class architecture anchor. It defines required components and contracts; the implementation plan expands that model into package structure, supporting components, interfaces, control flow, and **how you will test the change**.

## Filling in the file

`implementation-plan.md` is created from `execution/scripts/implementation-plan-template.md`. That file uses **italic prompt lines** and **example step bullets** as scaffolding only. **You must replace all of that with substantive, work-order-specific content** for every section below. The finished plan must not still contain instructional placeholder text (for example `_1-3 sentences: …_`), generic `[title]` step stubs, or any other template hints meant for the author.

## Plan Structure

1. **Summary** - state what this Work Order delivers and the high-level implementation approach.

2. **Code Reuse And Package Structure** - identify the critical existing files, components, services, hooks, utilities, schemas, or tests that the implementation will reuse or import as dependencies. Note whether existing code will be reused directly, extracted into a shared component/utility, or followed as a proven pattern. Then list the files, packages, and directories intentionally created or modified by the plan, grouped by module or layer. Do not enumerate incidental files that may change because of import ordering, barrel exports, formatting, generated code, or other mechanical follow-on edits. Planned placement should follow the stack rules, codebase package conventions, sibling module patterns, and documented architecture.

3. **Components And Flow** - identify the Blueprint-defined components that must exist, then name supporting components needed to implement them cleanly: services, repositories, hooks, adapters, schemas, utilities, UI components, tests, and wiring code. Define public interfaces before bodies when they clarify boundaries: class/function/hook/component names, parameters, return types, request/response shapes, model fields, events, or API contracts. Translate Blueprint relationship paragraphs into code-level call flow: which component calls which, in what order, and what data crosses each boundary.

4. **Steps** - list concrete implementation steps that produce reviewable, preferably compilable intermediate states. Note dependencies or parallelizable steps when useful, especially when steps touch different files or layers.

5. **Testing** - specify **automated and manual tests** you will rely on to validate this work: suites to run or extend (unit, integration, E2E, contract, etc.), new or changed test files and cases, important scenarios to cover, and the commands or workflows to execute them. Prefer concrete file paths and commands when you know them. **Do not** use this section to rehash whether the change satisfies requirements or blueprints; that traceability is handled in the review phase and checklist. Use repository-local testing guidance for flags, ordering, and environment setup.

## Rules

- Prefer reuse over net-new code. If existing code almost fits, plan whether to reuse directly, extract shared code, or follow it as a pattern.
- Prefer mature, extensible component and package structure over a direct but brittle implementation path.
- Do not plan out-of-scope improvements. Capture them as follow-up notes only when they affect delivery risk.
