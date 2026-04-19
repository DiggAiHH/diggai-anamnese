# Sessions Once Policy

This repository uses a local once-guard plus checkpoint workflow so work can resume after editor crashes, token exhaustion, terminal resets, or interrupted deployments.

## Goal

- Work in small packs.
- Save the current state after every pack.
- Resume from the last verified checkpoint instead of reconstructing everything from memory.

## Mandatory Commands

Run all commands from the repository root.

```powershell
# 1. Verify the task is free.
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 precheck -Task "<task-key>"

# 2. Claim the task before editing.
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 claim -Task "<task-key>" -Agent "copilot" -SessionId "<YYYY-MM-DD-topic>"

# 3. Checkpoint after each work pack and before risky operations.
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 checkpoint -Task "<task-key>" -Agent "copilot" -SessionId "<YYYY-MM-DD-topic>" -Summary "what changed" -NextStep "next verified step" -Files @("relative/path.ts")

# 4. Mark the task complete when done.
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 complete -Task "<task-key>" -Agent "copilot" -SessionId "<YYYY-MM-DD-topic>" -Artifacts @("relative/path.ts") -Summary "final result"
```

## Exit Codes

- `0`: free or successful command.
- `2`: task is already in progress. Stop and read the registry entry first.
- `3`: task is already completed. Extend existing work; do not rebuild it.
- `4`: requested artifact path already exists. Read before creating anything new.

## Work Pack Size

Every work pack should stay inside these limits unless the task genuinely cannot be split further:

- One logical objective.
- Prefer 3 to 5 touched files maximum.
- Prefer 30 to 45 minutes of uninterrupted work maximum.
- One risky operation maximum per pack.

If a task grows past those limits, split it into another checkpointed pack.

## When A Checkpoint Is Mandatory

Create a checkpoint in all of these situations:

- After each completed work pack.
- Before `git pull`, `git merge`, `git rebase`, `git reset`, or other history-changing operations.
- Before deployments, schema migrations, or restore scripts.
- After browser automation or other large-output phases.
- Before switching to a new subtask.
- Before ending the session for any reason.

## Required Checkpoint Content

Every checkpoint must contain enough detail for another session to continue immediately:

- Task key.
- Agent and session ID.
- What changed.
- Which files were touched.
- What was verified.
- The next verified step.
- Any blocker or risk that remains.

## Welcome Back Protocol

When resuming after a crash or interruption:

1. Read `shared/knowledge/task-registry.json` and `shared/knowledge/knowledge-share.md`.
2. Run `powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 status -Task "<task-key>"`.
3. Reconstruct local repository state with `git status` and a short recent history check.
4. Continue from the stored `nextStep`, not from memory.
5. Create a fresh checkpoint as soon as the resumed state is verified.

## Durable Files

- `shared/knowledge/task-registry.json`: machine-readable task state.
- `shared/knowledge/knowledge-share.md`: human-readable checkpoints and completions.
- `SESSIONS_ONCE_POLICY.md`: the operating rule for small packs and crash-safe resume.
