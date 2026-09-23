# AI Execution Contract — VERTUMNO Frontend

## 1. Purpose

Define the execution contract for AI-assisted frontend changes in the VERTUMNO ERP.

The frontend must evolve as part of the VERTUMNO architecture, not as an isolated visual layer.

## 2. Source of truth

The order of authority is:

1. Current repository code
2. Accepted product/technical requirements
3. `AGENTS.md`
4. `docs/AI_WORKFLOW.md`
5. `docs/ARCHITECTURE.md`
6. `docs/DESIGN_SYSTEM.md`
7. Task specification
8. Agent assumptions

Conflicts must be surfaced, not silently resolved.

## 3. Task contract

Every frontend task must define:

- Task ID and title
- Objective
- Context
- Screens/modules affected
- User flow
- Scope included
- Scope excluded
- API/data dependencies
- Permissions
- UX requirements
- Responsive requirements
- Acceptance criteria
- Required tests
- Executor
- Reviewer
- Known risks

## 4. Agent responsibilities

### GPT — Technical Lead / Orchestrator

Defines the task, dependencies, acceptance criteria and architectural constraints.

### Claude — Primary implementation agent

Default executor for React/Vite implementation, integration, tests and strictly necessary frontend refactoring.

### Gemini — UX/UI specialist

Supports visual hierarchy, interaction design, responsive behavior and design-system decisions.

### Codex — Secondary engineer

Reviews code, diagnoses CI/test failures, checks integration and performs focused debugging.

### CI — Quality Gate

Required checks are objective completion gates.

### Product Owner — Human

Approves business behavior, UX direction, scope changes and final homologation.

## 5. Frontend execution rules

The executor MUST:

- work on a dedicated branch;
- never commit directly to `master`;
- inspect existing components/services before changing them;
- use the existing routing/auth/access architecture;
- respect backend authorization rather than treating frontend guards as security;
- handle loading, empty, error and validation states;
- preserve responsive behavior;
- follow the VERTUMNO design system;
- add/update tests for changed behavior;
- avoid unrelated refactoring;
- open a PR with the required template.

The executor MUST NOT:

- invent business rules;
- duplicate backend security rules as if they were sufficient;
- bypass access controls;
- silently change API contracts;
- remove tests to make CI pass;
- introduce a new UI pattern when an established pattern already exists without justification;
- change unrelated screens.

## 6. UX/UI protocol

For visual or interaction work:

1. Identify the existing design-system pattern.
2. Reuse established components where appropriate.
3. Define the user flow before implementation.
4. Preserve functional clarity over decoration.
5. Validate desktop and responsive behavior.
6. Keep the VERTUMNO visual identity distinct and coherent.
7. Document intentional deviations from the design system.

## 7. API integration protocol

Before changing API usage:

- inspect the existing service layer;
- verify endpoint, payload and response shape;
- preserve authentication/session behavior;
- handle loading and errors;
- do not hard-code authorization decisions that belong to the backend.

If the frontend requires a backend change, stop the frontend-only implementation and register the dependency explicitly.

## 8. Ambiguity protocol

If ambiguity affects business behavior, permissions, navigation, data semantics or API contracts:

1. inspect existing code and documentation;
2. identify existing patterns;
3. present the ambiguity and consequences;
4. wait for a decision.

Do not guess.

## 9. CI failure protocol

When CI fails:

1. identify the failing step;
2. inspect the exact error;
3. classify the cause;
4. fix the smallest relevant cause;
5. preserve test intent;
6. re-run CI;
7. document the result.

Warnings must not be converted into hidden failures merely to make the gate pass.

## 10. Definition of Done

A frontend task is DONE only when:

- acceptance criteria are met;
- user flow works;
- permissions are integrated;
- loading/empty/error states are handled where relevant;
- tests are green;
- lint is green;
- build is green;
- CI is green;
- responsive behavior is checked;
- PR documentation is complete;
- Product Owner can homologate the feature.

## 11. Standard handoff

### Implemented
What changed.

### Screens/modules
What was affected.

### UX
User-flow and visual changes.

### API/data
Endpoints and data contracts used.

### Permissions
Access rules involved.

### Tests
Tests added/changed and results.

### CI
Final gate status.

### Known limitations
Intentional omissions.

### Homologation
Exact validation steps.

## 12. Standard task envelope

```text
TASK ID:
TITLE:

OBJECTIVE:

CONTEXT:

SCREENS/MODULES:

USER FLOW:

SCOPE IN:
- 

SCOPE OUT:
- 

API/DATA:
- 

PERMISSIONS:
- 

UX/UI:
- 

RESPONSIVE:
- 

ACCEPTANCE CRITERIA:
- 

TESTS:
- 

PRIMARY EXECUTOR:
- 

SECONDARY REVIEWER:
- 

RISKS:
- 

HOMOLOGATION:
- 
```

This envelope is the minimum contract between the orchestrator and a frontend implementation agent.
