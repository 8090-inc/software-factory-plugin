# Blueprint Writing Guide

Source: https://8090.ai/docs/opinions/blueprint-writing-guide

Use when writing or revising Software Factory Blueprints. Requirements say what must be true; Blueprints say how the system is structured and behaves to make it true. Blueprints are written diagrams: structured blocks define nodes, and prose relationship paragraphs define edges. They should trace up to Requirements and down to code symbols, contracts, and runtime interactions.

## Categories

Container Blueprint: one C4 container, meaning a separately deployable or runnable unit such as a web app, API server, database, background worker, or build pipeline. Documents technology stack, runtime characteristics, authentication/error/observability concerns, entry points, and boundaries. Create when establishing or documenting a deployable/runtime unit, especially one referenced by multiple Component Blueprints.

Component Blueprint: reusable system capability made of services, controllers, hooks, strategies, providers, persistence components, and other runtime pieces. It is a written component diagram: structured `component` blocks are nodes, relationship paragraphs are edges. Feature-agnostic; often spans containers. Create when two or more features depend on a capability, reuse is expected, internal structure warrants a document, or shared contracts need a home. Do not create for one helper, feature-only logic, or infrastructure better covered by a Container Blueprint.

Feature Blueprint: composition of Component Blueprints plus feature-specific components to satisfy one FRD. Create when a feature has structured Requirements and needs technical composition, configuration, or feature-only glue. Feature components may later move into Component Blueprints when reuse emerges.

Expected flow: Container Blueprints establish the runtime foundation; Component Blueprints define reusable capabilities within/across containers; Feature Blueprints compose those capabilities for Requirements.

## Syntax

`component` block = runtime node that does work.

````markdown
```component
name: NotificationDeliveryService
container: API Server
responsibilities:
	- Selecting delivery channels from `NotificationPreference`
	- Rendering channel payloads from `NotificationTemplate`
```
````

Rules: `name` is PascalCase and matches code identity; `container` names C4 container(s), comma-separated if needed; `responsibilities` are tab-indented `-` bullets and may mention elements or components.

`model` block = canonical data/domain model central to implementation but not itself a runtime component.

````markdown
```model
name: CustomerOrder
store: Postgres
description: Canonical persisted order model.
fields:
	- id: UUID (required)
constraints:
	- unique `order_number`
```
````

Rules: include `name`, `store`, `description`, `fields`, and `constraints` when a model block is used. Mention models as elements.

## Mentions

- `` `#ComponentName` ``: runtime component that does work; defined by a `component` block in any Blueprint.
- `` `ElementName` ``: schema, config, domain type, enum, request/response model, exception, feature flag, permission matrix, or `model` block.
- `@SystemEntity`: Software Factory entity such as a Requirement, Blueprint, Work Order, or Artifact.

## Relationships

Relationship paragraphs are graph edges between component nodes.

- Mention both components early.
- State direction: who calls, depends on, owns, emits, stores, renders, or transforms.
- Name data/contracts crossing the boundary.
- Explain why the interaction exists.
- One relationship per paragraph; 2-4 sentences.
- Do not restate component responsibilities.
- If adjacency already makes direction, data flow, and intent obvious, the paragraph is optional.

## Required Sections

Container Blueprint:

- `## Container Summary`
- `## Infrastructure`
- `## Entry Points and Boundaries`
- `## System Contracts`
- `## Architecture Decision Records`

Component Blueprint:

- `## Capability Summary`: 2-3 sentences naming the capability and key elements.
- `## Core Components`: component blocks grouped logically.
- `## System Contracts`
- `## Architecture Decision Records`

Feature Blueprint:

- `## Feature Summary`: 2-3 user-centered sentences referencing the corresponding Requirements document.
- `## Component Blueprint Composition`: referenced capabilities, configuration, scope, composition paragraphs, `@...` document mentions, and `#...` concrete component mentions.
- `## Feature-Specific Components`: full component blocks for panels, pages, hooks, services, or extensions that only exist for this feature.
- `## System Contracts`
- `## Architecture Decision Records`

Do not redefine referenced Component Blueprint components inside a Feature Blueprint. Describe how the feature uses them. Feature-specific components get full blocks.

## Contracts And ADRs

`## System Contracts` captures guarantees and boundary interfaces.

- `### Key Contracts`: invariants, correctness rules, idempotency, ordering, consistency, retry behavior.
- `### Integration Contracts`: events, APIs, webhook payloads, composition expectations.
- `### Integration Boundaries`: ownership and separation of concerns when boundary clarity matters more than payload detail.

`## Architecture Decision Records` captures non-obvious decisions. Use `### ADR-NNN: Title`, then labeled `Context`, `Decision`, and `Consequences` paragraphs. Number ADRs sequentially within the Blueprint.

## Checklist

- Choose category: Container, Component, or Feature.
- Use required sections for that category.
- Define runtime nodes with `component` blocks; define central domain models with `model` blocks only when useful.
- Use mentions correctly: `#...` components, `` `...` `` elements, `@...` Software Factory entities.
- Write relationship/composition paragraphs for non-obvious edges.
- Write System Contracts and ADRs.
- For Feature Blueprints, read the corresponding Requirements and ensure each major requirement theme has a technical path.
