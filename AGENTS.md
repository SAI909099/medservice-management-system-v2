# AGENTS.md

## Source of truth
Use these docs as the source of truth for this repository:
- docs/01_PROJECT_CONTEXT.md
- docs/02_ROADMAP.md
- docs/03_DB_SCHEMA.md
- docs/04_API_PLAN.md
- docs/05_BACKEND_PLAN.md
- docs/06_FRONTEND_PLAN.md
- docs/07_CODING_RULES.md
- docs/08_MODULE_CHECKLIST.md
- docs/09_IMPLEMENTATION_ORDER.md
- docs/10_FEATURES.md

## Project
This is Medservice, a modular clinic management system rebuilt from scratch.

## Architecture rules
- Do not collapse the backend into a single `core` app.
- Keep modular apps:
  - accounts
  - clinics
  - patients
  - doctors
  - appointments
  - services
  - billing
  - labs
  - reports
  - notifications
  - audit
- Keep views thin.
- Put business logic in `services.py`.
- Put read/query logic in `selectors.py`.
- Keep permissions explicit.
- Preserve clinic/branch boundaries.
- Use scalable, maintainable architecture.
- Avoid dirty quick hacks unless clearly temporary.

## Workflow priority
Always optimize for this workflow:
patient registration -> doctor appointment -> examination -> lab/referral -> billing/payment -> reports

## Coding expectations
- Read existing docs before making architecture decisions.
- Keep changes consistent with docs.
- Do not invent conflicting models or endpoints.
- Prefer simple, clean, production-friendly code.
- Update docs if architecture changes materially.

## When implementing
Before coding:
1. Identify which module the task belongs to.
2. Check related docs first.
3. Follow existing naming and status conventions.
4. Keep changes scoped and easy to review.

## Validation
- Protect status transitions.
- Use Decimal for money.
- Be careful with timezone handling.
- Keep API names consistent.