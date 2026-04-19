# Checkpoints

This folder stores durable task-by-task checkpoints written by `scripts/once-guard.mjs`, the Windows CMD wrapper `scripts/once-guard.cmd`, or the PowerShell wrapper `scripts/once-guard.ps1` when local policy allows it.

Each task gets a single markdown file so interrupted work can resume from the last saved batch.