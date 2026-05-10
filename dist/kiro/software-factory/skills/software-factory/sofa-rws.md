# Software Factory Requirements Writing Specification

Public guide: https://www.8090.ai/docs/opinions/requirements-writing-guide

Use this token-efficient reference when writing or reviewing Software Factory Requirements Documents.

## Purpose

Requirements capture what the product must do and why it matters. They are the upstream truth source for blueprints, work orders, implementation, tests, and completion review.

Good requirements are user-centered, testable, atomic, traceable, and living.

## Document Types

### Product Overview Documents

Product Overview Documents define product-wide context. They are prose-first and normally do not contain structured requirement IDs.

Common overview documents:

- Business Problem: pain points and why they matter.
- Current State: the status quo the product improves.
- Personas: user archetypes, goals, and success definitions.
- Product Description: what the product is and how its parts fit.
- Success Metrics: the metrics used to judge success.
- Technical Requirements: product-level constraints.

Write these in plain language for product, design, engineering, and leadership readers.

### Feature Requirements Documents

Feature Requirements Documents (FRDs) define behavior for one feature or sub-feature. They usually contain:

1. `## Overview`: 1-2 paragraphs explaining what the feature does and why users need it.
2. `## Terminology`: brief definitions for feature-specific terms.
3. `## Requirements`: structured requirement blocks with user stories and acceptance criteria.

Large features can be decomposed into nested FRDs. Parent FRDs can stay lightweight and point to child FRDs; child FRDs carry detailed `REQ-` and `AC-` entries.

## Requirement Block Format

Use one block per cohesive capability.

```markdown
### REQ-[PREFIX]-NNN: Requirement Name

**User Story:** As a [role], I want to [action], so that I can [outcome].

**Acceptance Criteria:**

* **AC-[PREFIX]-NNN.1:** When [condition], the system shall [mandatory behavior].
* **AC-[PREFIX]-NNN.2:** When [condition], the system should [recommended behavior].
* **AC-[PREFIX]-NNN.3:** When [condition], the system may [optional behavior].
```

ID guidance:

- Derive `PREFIX` from the feature name, for example `CHK` for Checkout.
- Use zero-padded requirement numbers: `001`, `002`, `003`.
- For child features, append a child suffix when useful, for example `REQ-AUTH-PR-001` for Password Reset under Auth.
- Acceptance criteria use the parent requirement ID plus a local sequence: `AC-CHK-003.1`.

## Writing Rules

- Keep requirements implementation-neutral. Avoid naming services, database tables, UI components, or APIs unless the product behavior depends on an externally visible contract.
- Use "shall" for mandatory behavior, "should" for recommended behavior, and "may" for optional behavior.
- Make triggers explicit.
- Split compound criteria. One criterion should test one behavior.
- Capture negative paths, permission boundaries, empty states, loading states, error states, and recovery behavior when relevant.
- Define ambiguous domain terms in Terminology once, then use them consistently.
- Cite related documents with `@DocumentName` when the platform supports document mentions.

## Review Checklist

- The Overview states purpose, user value, and scope.
- Terminology defines only terms needed to understand the feature.
- Every `REQ-` has one user story and at least one acceptance criterion.
- Every `AC-` starts from a condition or trigger and states observable expected behavior.
- Requirements avoid implementation details unless those details are user-visible constraints.
- Requirement IDs and acceptance-criterion IDs are unique and consistently formatted.
- Downstream blueprints and work orders can cite the requirement IDs without ambiguity.
