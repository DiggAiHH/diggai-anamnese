2026-05-03T20:30+02:00 | Lauf claude-code-01 | Arzt-Feedback Track A komplett, Track B PB-0 (ADR-001), 9 PRs eröffnet
---
- Aktion: 9 Branches angelegt (M1-M3, M6/K9, H3, H5/H6, B1-B3, A1, H1/H2, K1-K5+M4/M5, ADR-001) → 9 Commits → 9 PRs (#10-#18) gegen master
- Blocker: husky pre-push `tsc -b` SIGABRT (Exit 134, V8-Stack-Frames) bei mehreren Branches; parallele `git push` führten zu GitHub `cannot lock ref ... reference already exists` trotz erfolgreichem Server-Side-Push
- Fix: `NODE_OPTIONS="--max-old-space-size=8192"` für Pushes; sequenzielle Pushes statt for-loop; `git ls-remote --heads origin` als Quelle der Wahrheit statt lokalen Exit-Codes
- Ergebnis: Commits `dd4a53e` (marketing), `e882fb7` (ADR-001), `d2e2cb7` (DSE), `ca08ff0` (branding), `79b5043` (sovereignty), `24d8c63` (multiselect), `ec39f81` (agent-queue), `bccba63` (voice/egk), `a889b42` (hub/theme); PRs https://github.com/DiggAiHH/diggai-anamnese/pull/{10..18}
- Out: Track A vollständig in PRs (Track-A 5+6 vorher gemerged via #2/#4); Track B PB-1..PB-8 weiterhin blockiert auf F1-F8; AGENT_PREFLIGHT_PROTOCOL.md am Workspace-Root angelegt; keine Tests neu geschrieben (zeitlich nicht möglich, in PR-Bodies als `[ ] Test plan` notiert)
