---
name: Autonomous Optimization Session
description: "Start a fully autonomous, local-first optimization session that routes work through the Optimization Agent with goals, delegation, validation gates, and time estimates."
agent: "agent"
argument-hint: "Describe the objective, scope, autonomy level, and target outcome"
---

Starte eine **vollautonome Optimierungs-Session** für DiggAI / Praxis OS.

Wenn der Workspace-Custom-Agent **`Optimization Agent`** verfügbar ist, nutze ihn als primären Orchestrator.
Falls nicht, emuliere exakt dessen Workflow innerhalb der Standard-Agent-Ausführung.

## Ziel

Arbeite die folgende Aufgabe Ende-zu-Ende ab, mit maximal sinnvoller Nutzung lokaler Ressourcen, Tools, MCPs und spezialisierter Agents.

## Anforderungen an den Ablauf

1. Normalisiere das Ziel und den Scope.
2. Erstelle eine kompakte Scorecard mit:
   - Ziel
   - Erfolgskriterien
   - Risiko
   - Modus
   - Delegation
   - Zeitabschätzung
   - lokale Ressourcen / MCP-Strategie
   - Validierungsgates
3. Erstelle bei nicht-trivialen Aufgaben einen **7-Layer-Plan** bis mindestens zur Form `1.1.1.1.1.1.1`, sofern sinnvoll.
4. Zerlege die Arbeit maximal fein in Subtasks und Micro-Steps.
5. Delegiere bei Bedarf an spezialisierte Agents.
6. Nutze lokale Infrastruktur und vorhandene Tools zuerst.
7. Implementiere nur, wenn die Aufgabe dafür bereit ist.
8. Halte Audit-/Zertifizierungsrelevanz fest, wenn betroffen.
9. Halte nach jeder größeren Phase eine Session-Zusammenfassung fest.
10. Stoppe nur bei echtem Blocker.

## Aufgabe

{{input}}
