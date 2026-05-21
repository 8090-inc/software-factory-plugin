# Review Phase

## Purpose

Run a **full code review pass** isolated from day‑to‑day implementation work. The review checks the change against the Work Order, linked requirements, blueprints, repository conventions, tests and build health, user‑visible behavior where relevant, and security when relevant — then records a structured round in `review-log.md` and yields a clear verdict.

Prefer routing this work through a **dedicated review delegate** (subagent) when your environment supports it, so context stays focused and findings stay consistent.

## Workflow

### 1. Scope the change set

Review **only the work on the checked-out line**: use your VCS to list changes from the **merge base** of your current tip and the **branch this work merges into** through your current tip. That branch is the **PR base** when a PR exists for this work; otherwise the **default branch** your remote or host reports. Pass that **changed-paths list** into the review pass.

### 2. Run every applicable review dimension

Prefer **delegated review** (separate agents or subagents).

Split the changed-paths list into **a few coherent buckets** — e.g. by subsystem, layer, or top-level directory — so each bucket fits a single focused review pass. **Spawn one review delegate per bucket**. Once the reviews are complete, synthesize a combined review report in `review-log.md`.

Align each finding with the sections in your `review-log.md` (and your team’s templates):

- **Requirements alignment** — linked acceptance criteria satisfied or explicitly out of scope.
- **Blueprint alignment** — components, contracts, data flow, and boundaries match linked blueprints.
- **Architecture and conventions** — placement, naming, layering, dependencies, errors, logging, reuse.
- **Tests and build health** — unit, integration, E2E, **lint**, **typecheck**, and build as relevant; document unrelated baseline failures rather than hiding them.
- **User-facing verification** — when behavior is visible or externally observable (UI, exports, emails, CLI output, etc.): exploratory checks, screenshots, or other evidence as appropriate. For browser apps, use the Cursor browser if available, or [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) if available; if no browser tool is available and browser behavior is relevant to the user's software, set up [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) automatically, or ask the user only when automatic setup is not possible, before approving the review.
- **Security, privacy, and data safety** — when relevant: auth, validation, secrets, PII, migrations, destructive operations.

For **codebase-specific** dimensions — architecture and conventions, tests and tooling, security expectations, and similar — rely on **skills and other documentation already in this repository** to decide what “good” looks like and the best checks to run. Those sources override generic bullets here.

### 3. Record the review round

Append a **new** round to `review-log.md`. Do not overwrite earlier rounds.

Each finding should include:

- Severity: blocking or advisory
- File or area
- **Review dimension** — name the dimension from the list above that this finding belongs to, and briefly what failed within it

The review pass (or delegate) should **synthesize** one verdict for the round.

### 4. Handle the verdict

- **`APPROVED`** — no blocking findings; proceed per [execute-work-order.md](execute-work-order.md).
- **`CHANGES_REQUESTED`** — fix every blocking finding; then **run another full review round** (with a fresh delegate pass when you use delegation).

If a finding needs product or policy judgment, **stop looping** and surface the question to the user.

## Rules

- When delegation is available, the **review delegate owns** running and synthesizing dimensions; the implementation agent acts on the verdict rather than re‑reviewing.
- Every round **appends** to `review-log.md`.
- User‑facing verification may need browser, device, or screenshot tooling when the change produces observable output. For browser apps, prefer the Cursor browser when available, use [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) when that is the available browser tool, and set up [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) automatically when browser behavior is relevant but no browser tool is available. Ask the user only when automatic setup is not possible. Only that dimension should **change product code** when fixes are layout or presentation — not business logic — unless the team’s review guide says otherwise.
- Unresolvable or out‑of‑scope findings go to the user instead of endless retry loops.
- Resolve blocking findings before handoff or status moves.
