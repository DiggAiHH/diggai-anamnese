# Harness Suite · DiggAi

Drei zusammenhängende Werkzeuge — Doctrine: [shared/knowledge/HARNESS_DOCTRINE.md](../../shared/knowledge/HARNESS_DOCTRINE.md)

| Harness | Datei | Zweck |
|---------|-------|-------|
| Knowledge | `knowledge-harness.mjs` | Run-Logs/Audits/Decisions → KNOWLEDGE_INDEX.md |
| Browser | `browser-harness.mjs` + `e2e/harness/*.spec.ts` | Live-Audit jeder F-XX als Playwright-Test |
| Deploy | `deploy-harness.mjs` | Pre-deploy gate — blockiert Build bei kritischen Findings |

## Quickstart

```bash
# Knowledge-Index aktualisieren
node scripts/harness/knowledge-harness.mjs

# Live-Audit gegen Production
node scripts/harness/browser-harness.mjs --url https://diggai.de --report

# Vor Deploy
node scripts/harness/deploy-harness.mjs
```

## In package.json einhängen

```json
{
  "scripts": {
    "harness:knowledge": "node scripts/harness/knowledge-harness.mjs",
    "harness:browser":   "node scripts/harness/browser-harness.mjs --url https://diggai.de --report",
    "harness:deploy":    "node scripts/harness/deploy-harness.mjs",
    "predeploy":         "npm run harness:deploy"
  }
}
```
