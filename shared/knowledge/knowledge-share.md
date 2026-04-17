# Shared Knowledge

This file stores durable checkpoints, completions, and handoff notes for crash-safe resume.

## Rules
- Add a checkpoint after each small work pack.
- Add a checkpoint before risky operations like git pull, merge, rebase, reset, deploys, browser automation, or database migrations.
- Record the next verified step, not a vague intention.
- Detailed per-task checkpoints are written to `shared/knowledge/checkpoints/<task-key>.md`.
- Use `scripts/once-guard.mjs` or `scripts/once-guard.cmd` after every small pack, after validation, and before leaving unfinished work.
- Preferred pack size: one user-visible outcome, usually no more than 3 edited files or 30 minutes before a checkpoint.
- Resume order: read `shared/knowledge/task-registry.json`, then the task checkpoint in `shared/knowledge/checkpoints/`, then continue from the saved `Next` items.

## Current Verified Repo Facts
- `.claude/mcp.json` already points its filesystem server at this workspace.
- `server/index.ts` contains a valid `/api/live` endpoint.
- Local browser validation still depends on the backend serving on port 3001.
- `server/services/pvs/security/audit-logger.ts` now persists buffered PVS audit events into Prisma `AuditLog` with fallback and requeue behavior.
- Shared encrypted credential parser is now used by `server/services/pvs/tomedo-api.client.ts`, `server/services/pvs/adapters/tomedo.adapter.ts`, `server/services/pvs/adapters/t2med.adapter.ts`, and `server/services/pvs/adapters/fhir-generic.adapter.ts`.
- Focused validation gate completed with 80/80 tests across webhook, audit logger, parser, Tomedo API client, and adapter suites.