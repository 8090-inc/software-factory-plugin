# Requirements Writing Guide

Source: https://8090.ai/docs/opinions/requirements-writing-guide

Use this guide when drafting or revising Product Overview Documents or Feature Requirements Documents (FRDs). Requirements capture product intent: what the product must do and why it matters.

## Document Types

Product Overview Documents: product-wide why and what. The why is business motivation: problems, unmet KPIs, North Star goals. The what is product description: what the product is and how its parts fit together. Default documents:

- Business Problem: the pain points the product addresses and why they matter.
- Current State: the status quo the product improves.
- Personas: users, goals, and success conditions.
- Product Description: what the product is and how its parts fit together.
- Success Metrics: the metrics used to measure product success.
- Technical Requirements: product-level technical constraints and requirements.

Write overview documents in plain language for the whole company. Focus on motivation and durable context.

Feature Requirements Documents (FRDs): localized feature why and what. The why is the user story; the what is acceptance criteria. FRDs use the project template from Project Settings > Requirements > Feature Requirements Template. FRDs can be nested when a child feature enhances a parent feature but is not required for the parent to function.

## FRD Structure

Use three sections:

1. `## Overview`
   - Write 1-2 narrative paragraphs.
   - Explain what the feature does and why users need it.
   - Focus on problem and value, not implementation.

2. `## Terminology`
   - Define only feature-specific ambiguous terms.
   - Use brief, precise definitions.

3. `## Requirements`
   - Each requirement is one cohesive, independently testable capability.
   - Use IDs: `REQ-[PREFIX]-NNN: Requirement Name`.
   - Child feature IDs append a suffix, for example `REQ-AUTH-PR-001`.
   - User story format: `As a [role], I want to [action], so that I can [outcome].`
   - Acceptance criteria use IDs: `AC-[PREFIX]-NNN.N`.
   - Acceptance criteria format: `When [condition], the system shall [behavior].`

Use `shall` for mandatory behavior, `should` for recommended behavior, and `may` for optional behavior.

## Quality Bar

- User-centered: describe user and business outcomes, not internal mechanisms.
- Testable: every acceptance criterion should be clear enough to turn into a test.
- Atomic: each acceptance criterion covers one behavior.
- Specific: avoid generic roles, vague actions, and phrases like "handled appropriately."
- Structured: preserve requirement and AC IDs exactly once assigned.

## Split, Merge, Or Nest Features

- Split features when each passes the feature unit definition independently or different roles own different parts.
- Keep one feature when the requirements break without each other, complete one task together, or can be described in one sentence.
- Nest a child feature when the parent already delivers value, the child enhances the parent, and the child is meaningless without the parent.
