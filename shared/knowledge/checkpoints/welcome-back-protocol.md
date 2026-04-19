# welcome-back-protocol

## 2026-04-15 21:17:27 | completed

- Agent: copilot
- Session: 2026-04-15-welcome-back
- Batch: 1
- Summary: Created real crash-recovery tooling, seeded shared knowledge, and documented the smaller-pack resume flow.

### Done
- Added node-based once-guard entrypoint
- Added PowerShell variant for shells that allow it
- Created shared knowledge store and seeded current episode checkpoint
- Updated agent instructions to require small-pack checkpoints

### Next
- Use the protocol before the next backend validation pack

### Artifacts
- scripts/once-guard.mjs
- scripts/once-guard.ps1
- shared/knowledge/task-registry.json
- shared/knowledge/checkpoints/episode-opsedien-persistence.md
- shared/knowledge/checkpoints/welcome-back-protocol.md
- CLAUDE.md
- .github/copilot-instructions.md

## 2026-04-16 05:59:52 | completed

- Agent: copilot
- Session: 2026-04-16-welcome-back
- Batch: 2
- Summary: Cleaned the corrupted wrapper, added a Windows CMD wrapper, moved artifact-exists checks into the node entrypoint, and validated the usable resume flows.

### Done
- Removed the duplicated legacy body from scripts/once-guard.ps1
- Added scripts/once-guard.cmd for Windows shells blocked by PowerShell policy
- Extended scripts/once-guard.mjs with --targetPath and --files handling
- Aligned checkpoint docs with the real repo layout and working Windows invocation

### Next
- Use node scripts/once-guard.mjs or scripts\\once-guard.cmd before the next work pack

### Artifacts
- scripts/once-guard.mjs
- scripts/once-guard.cmd
- scripts/once-guard.ps1
- shared/knowledge/knowledge-share.md
- shared/knowledge/checkpoints/README.md
- CLAUDE.md
- .github/copilot-instructions.md

