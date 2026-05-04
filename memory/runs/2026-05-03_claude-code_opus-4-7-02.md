2026-05-03T20:55+02:00 | Lauf claude-code-02 | DoD-Memory-Discipline in 6 Agent-Instruction-Files verankert
---
- Aktion: Uniform-Block "Definition of Done — Memory Discipline" an workspace + project Agent-Rules angehängt: CLAUDE.md (×2), AGENTS.md (×2), .cursorrules, .github/copilot-instructions.md
- Blocker: —
- Fix: Idempotenz via `grep -q "Definition of Done — Memory Discipline" "$f"`-Guard im Append-Loop, sodass Re-Run nicht dupliziert
- Ergebnis: 6 Files modifiziert; jede enthält den DoD-Block genau 1×; verweist zurück auf AGENT_PREFLIGHT_PROTOCOL.md §10
- Out: Memory-Disziplin ist nun Vertragsbestandteil für Claude/Copilot/Codex/Kimi/Gemini/Cursor; nicht commited (User entscheidet ob Branch/PR oder direkter master-Commit)
