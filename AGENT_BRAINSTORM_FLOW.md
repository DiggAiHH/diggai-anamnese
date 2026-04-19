# Agent Brainstorm Flow

This repository uses a manual, file-based brainstorm flow. There is no required brainstorm automation script in this project.

## When To Use It

Use a brainstorm flow when a task has multiple plausible designs, unclear ownership boundaries, or meaningful architecture tradeoffs.

## Manual Flow

1. Run once-guard `precheck` and `claim` for the brainstorm topic.
2. Read `shared/knowledge/task-registry.json` and `shared/knowledge/knowledge-share.md` first.
3. Capture each option in a short markdown section with:
   - decision name
   - benefits
   - risks
   - migration cost
   - recommended next step
4. Store the synthesized result in `shared/knowledge/knowledge-share.md` or in the final task artifact when the task is complete.
5. Create a once-guard `checkpoint` after the preferred option is selected.

## Required Output

Every brainstorm result should end with a single implementation recommendation and one next verified step.
