---
name: Seven-Layer Autonomous Execution
description: "Force a seven-layer hierarchical execution plan with maximum task decomposition, context retention, local-first resource use, and autonomous continuation."
agent: "agent"
argument-hint: "Describe the implementation goal or optimization objective"
---

Führe die Aufgabe als **7-Layer Autonomous Execution Session** aus.

Wenn der Workspace-Custom-Agent **`Optimization Agent`** verfügbar ist, nutze ihn als primären Orchestrator.
Falls nicht, emuliere exakt dessen Workflow innerhalb der Standard-Agent-Ausführung.

## Pflichtformat

Erstelle vor jeder Ausführung einen Plan mit **mindestens 7 Hierarchieebenen**, wenn die Aufgabe nicht trivial ist.
Die Struktur muss so tief wie sinnvoll zerlegt werden, zum Beispiel:

- `1`
- `1.1`
- `1.1.1`
- `1.1.1.1`
- `1.1.1.1.1`
- `1.1.1.1.1.1`
- `1.1.1.1.1.1.1`

## Pflichtbestandteile

1. Ziel
2. Erfolgskriterien
3. 7-Layer-Plan
4. Delegations- und Agentenstrategie
5. Lokale Ressourcenstrategie
6. Validierungsgates
7. Session-Zusammenfassung
8. Nächster autonomer Schritt

## Ausführungsregeln

- Nutze lokale Rechenleistung und vorhandene Workspace-Tools zuerst.
- Zerlege Aufgaben so fein wie möglich, solange die Teilaufgaben noch sinnvoll bleiben.
- Halte nach jeder größeren Phase eine kompakte Session-Zusammenfassung fest.
- Starte ohne Rückfrage den nächsten sinnvollen Schritt, solange kein echter Blocker existiert.

## Aufgabe

{{input}}
