---
name: agent-orchestration
description: "Multi-agent coordination, task registry, brainstorm protocol, and no-redundancy workflow for DiggAI workspace. Use when managing agent delegation, running brainstorm flows, checking task registry, coordinating work across agents (claude/codex/copilot/cursor), or preventing duplicate work."
metadata:
  author: diggai
  version: "1.0"
  domain: governance
---

# Agent Orchestration Skill

## 4-Agenten-System

| Agent | Rolle | Stärke |
|-------|-------|--------|
| `claude` | Architecture & Risk | Tiefenanalyse, Security Review |
| `codex` | Implementation | Feature-Implementierung, Code |
| `copilot` | Tooling & Optimization | Developer Productivity, Automation |
| `cursor` | Refactoring & Performance | Code Cleanup, Perf-Tuning |

## Goldene Regel

**Alles darf nur einmal gemacht werden.**

## Pflicht-Protokoll (JEDE Aufgabe)

```powershell
# 1. Precheck — ist die Aufgabe frei?
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 precheck -Task "<task-key>"
# Exit 0 = FREI | Exit 2 = BLOCKIERT | Exit 3 = ERLEDIGT | Exit 4 = ARTEFAKT EXISTIERT

# 2. Claim — reservieren vor Start
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 claim `
  -Task "<task-key>" -Agent "<agent-id>" -SessionId "<YYYY-MM-DD-topic>"

# 3. Knowledge lesen
#    shared/knowledge/knowledge-share.md
#    shared/knowledge/task-registry.json

# 4. Arbeit ausführen

# 4.5. Nach jedem kleinen Paket checkpointen
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 checkpoint `
  -Task "<task-key>" -Agent "<agent-id>" -SessionId "<YYYY-MM-DD-topic>" `
  -Summary "Was jetzt verifiziert ist" -NextStep "naechster verifizierter Schritt" `
  -Files @("path/file1")

# 5. Complete — immer abschließen
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 complete `
  -Task "<task-key>" -Agent "<agent-id>" `
  -Artifacts @("path/file1") -Notes "Was und warum"
```

## Brainstorm Flow

This repo uses the manual flow documented in `AGENT_BRAINSTORM_FLOW.md`.

## Shared Knowledge

| Datei | Zweck |
|-------|-------|
| `shared/knowledge/task-registry.json` | Maschinenlesbarer Task-Status |
| `shared/knowledge/knowledge-share.md` | Entscheidungen, Lessons Learned |
| `SESSIONS_ONCE_POLICY.md` | Policy-Dokumentation |
| `AGENT_BRAINSTORM_FLOW.md` | Brainstorm-Protokoll |

## Delegationsregeln

1. **Fullstack Agent** → Features, Bugfixes, E2E-Implementierung
2. **Medical Agent** → Triage, Fragenfluss, klinische Logik
3. **Security Agent** → DSGVO, Auth, Encryption, Audit
4. **i18n Agent** → Übersetzungen, RTL, Locale-Keys
5. **Planner Agent** → Architektur, Roadmaps, Reihenfolge
6. **Optimization Agent** → Session-Orchestrierung, Effizienz

## 7-Layer-Aufgabenstruktur

Für nicht-triviale Aufgaben:
```
1       — Mission
1.1     — Workstream
1.1.1   — Capability
1.1.1.1 — Implementation Unit
1.1.1.1.1 — Validation Step
1.1.1.1.1.1 — Execution Detail
1.1.1.1.1.1.1 — Micro-Step
```
