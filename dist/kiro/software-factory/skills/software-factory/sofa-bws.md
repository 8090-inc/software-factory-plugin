# Software Factory Blueprint Writing Specification

Public guide: https://www.8090.ai/docs/opinions/blueprint-writing-guide

Use this token-efficient reference when writing or reviewing Software Factory Blueprints.

## Purpose

Blueprints are technical specifications. Requirements say what must be true; Blueprints explain how the system is structured and behaves to make those requirements true.

Good blueprints are code-grounded, compositional, structured, narrative, implementable, traceable, and living.

## Blueprint Categories

### Container Blueprint

Describes one C4 container: a deployable or runnable unit such as a web app, API server, database, worker, mobile app, CLI, or build pipeline.

Baseline sections:

- `## Container Summary`
- `## Infrastructure`
- `## Entry Points and Boundaries`
- `## System Contracts`
- `## Architecture Decision Records`

### Component Blueprint

Describes a reusable system capability composed of runtime components. A Component Blueprint is feature-agnostic and often spans more than one container.

Baseline sections:

- `## Capability Summary`
- `## Core Components`
- `## System Contracts`
- `## Architecture Decision Records`

### Feature Blueprint

Describes how Container and Component Blueprints compose, plus any feature-specific components, to satisfy a Feature Requirements Document.

Baseline sections:

- `## Feature Summary`
- `## Component Blueprint Composition`
- `## Feature-Specific Components`
- `## System Contracts`
- `## Architecture Decision Records`

## Structured Blocks

### Component Blocks

Use `component` blocks for runtime nodes that do work: services, controllers, jobs, strategies, UI components, providers, adapters, and orchestrators.

````markdown
```component
name: NotificationDeliveryService
container: API Server
responsibilities:
	- Selecting delivery channels based on `NotificationPreference` and message type
	- Rendering channel-specific payloads from `NotificationTemplate`
	- Dispatching messages through provider adapters with retry and idempotency guards
```
````

Rules:

- `name` uses the code identity or intended code identity.
- `container` names the C4 container or containers.
- `responsibilities` are tab-indented bullets.
- Mention important contracts or collaborators with element or component mentions.

### Model Blocks

Use `model` blocks for canonical data/domain models that are central to implementation but are not runtime components.

````markdown
```model
name: CustomerOrder
store: Postgres
description: Canonical persisted order model used by checkout and fulfillment.
fields:
	- id: UUID (required)
	- status: Draft | Placed | Shipped | Cancelled (required)
constraints:
	- `status` changes are append-only in `OrderStatusHistory`
```
````

## Mentions

Use consistent mention syntax:

- `` `#ComponentName` `` for runtime components defined by `component` blocks.
- `` `ElementName` `` for data shapes, types, schemas, configs, events, enums, request/response models, exceptions, and models.
- `@SystemEntity` for Requirements, Blueprints, Work Orders, Artifacts, or other platform documents.

When deciding which to use:

- Does work -> `#Component`.
- Describes shape or contract -> `Element`.
- Whole document or platform entity -> `@SystemEntity`.

If a Blueprint references another Blueprint, read that referenced Blueprint before implementation or review. Feature Blueprints often depend on Component Blueprint contracts that are not repeated inline.

## Relationship Paragraphs

Prose paragraphs are the edges between structured nodes. Each relationship paragraph should:

- Mention the concrete components early.
- State direction: who calls, owns, publishes, consumes, stores, or validates.
- Name the contracts crossing the boundary.
- Explain why the interaction exists.
- Stay focused on one relationship or flow.

Avoid restating component responsibilities. Use prose to explain dependency, data flow, lifecycle, invariants, or tradeoffs.

## System Contracts and ADRs

Use `## System Contracts` when behavior depends on invariants, reliability guarantees, security boundaries, events, APIs, or integration expectations.

Common subsections:

- `### Key Contracts`
- `### Integration Contracts`
- `### Integration Boundaries`

Use `## Architecture Decision Records` for non-obvious decisions. Prefer concise entries:

```markdown
### ADR-001: Use server-side idempotency keys

**Context:** Duplicate checkout submissions can occur during retries.
**Decision:** `#CheckoutApiController` requires an idempotency key for payment submission.
**Consequences:** Clients must generate stable keys; backend storage must expire them safely.
```

## Review Checklist

- The Blueprint category is clear: Container, Component, or Feature.
- Structured blocks define important runtime components and canonical models.
- Mentions use the correct syntax and refer to real or intended symbols.
- Relationship paragraphs explain direction, data flow, and intent.
- Feature Blueprints trace to the relevant requirements.
- Referenced Blueprints are followed instead of assumed.
- Contracts and ADRs capture invariants and tradeoffs that implementation must preserve.
