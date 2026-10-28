# Workspace Rules & Skill Orchestration

## Skills Directory Reference

All project skills reside under `.agents/skills/`:
- `laravel-specialist`: Located at `.agents/skills/laravel-specialist/SKILL.md`
- `websocket-engineer`: Located at `.agents/skills/websocket-engineer/SKILL.md`
- `javascript-pro`: Located at `.agents/skills/javascript-pro/SKILL.md`
- `debugging-wizard`: Located at `.agents/skills/debugging-wizard/SKILL.md`
- `code-reviewer`: Located at `.agents/skills/code-reviewer/SKILL.md`
- `code-documenter`: Located at `.agents/skills/code-documenter/SKILL.md`

## Instructions for AI Assistant

- When a task touches PHP or Laravel (routes, controllers, models, migrations, tests), proactively consult `.agents/skills/laravel-specialist/SKILL.md`.
- When a task involves WebSockets, broadcasting, real-time events, or Echo listeners, proactively consult `.agents/skills/websocket-engineer/SKILL.md`.
- When a task involves client-side JavaScript or Vite bundling, consult `.agents/skills/javascript-pro/SKILL.md`.
- When debugging unexpected exceptions or test failures, follow the hypothesis-driven workflow in `.agents/skills/debugging-wizard/SKILL.md`.
- When requested to review or audit code, use the structured review checklist from `.agents/skills/code-reviewer/SKILL.md`.
- When generating docs or API specs, follow `.agents/skills/code-documenter/SKILL.md`.
