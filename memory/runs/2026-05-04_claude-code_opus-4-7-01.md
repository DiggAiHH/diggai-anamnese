2026-05-04T00:42+02:00 | Lauf claude-code-01 | Frontend-Triage: Camera-Stream-Leak + kaputter Smoke-Test + .gitignore-Noise
---
- Aktion: tsc/eslint/vite-build/vitest run; CameraScanner stream-cleanup über useRef gefixt; dashboards/__smoke__/smoke.test.ts auf existierende Module reduziert; .gitignore um persistente Dev-Scratch-Globs (.tmp/, .tmp_*, audit-high-*.json, debug_step*.png, lint-report.json, failures.json, *.bak, graphify scratch) erweitert
- Blocker: vitest --reporter=basic existiert nicht mehr in v3 → Fehlermeldung; smoke.test.ts importierte 4 nicht-existente Module → 5 Test-Suites failed at module-resolve
- Fix: --reporter=default --silent; smoke-Test rewrite gegen den index.ts-Barrel; CameraScanner streamRef mirrors live MediaStream damit unmount-cleanup tatsächlich tracks stoppt
- Ergebnis: Commit fd8d56e auf fix/frontend-cleanup; PR #19 https://github.com/DiggAiHH/diggai-anamnese/pull/19
- Out: tsc app green, vite build green, smoke-Suite resolved; 441 Lint-Warnings (0 errors) bleiben pre-existing als Follow-up; PVS-Adapter-Test-Fails (fs mock) sind server-seitig, nicht im Scope
