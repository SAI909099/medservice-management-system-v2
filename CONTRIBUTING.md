# Contributing Guide

Thanks for contributing to Medservice.

## Branching
- Create feature branches from `main`
- Use clear branch names (`feature/...`, `fix/...`, `chore/...`)

## Commit Style
- Keep commits focused and small
- Use meaningful messages:
  - `feat: add service queue filter`
  - `fix: handle expired token redirect`
  - `chore: update docker deploy docs`

## Pull Requests
- Explain what changed and why
- Add screenshots for UI changes
- Mention any migration or env variable changes
- Keep architecture modular (`services.py`, `selectors.py`, thin views)

## Quality Checks
Before opening PR:
```bash
npm run build
cd backend
../.venv/bin/python manage.py check
```

## Architecture Rules
Follow `AGENTS.md` and `docs/` as source of truth.
