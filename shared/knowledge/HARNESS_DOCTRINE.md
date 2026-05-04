# Harness Doctrine · DiggAi

**Eselsbrücke:** *"Wissen sammelt, Browser misst, Deploy schützt."*

Drei zusammenhängende Werkzeuge, die agentenübergreifend benutzt werden.
Jeder Harness ist **eigenständig aufrufbar** und schreibt strukturierten Output in `memory/`.

---

## 1. Knowledge Harness — `scripts/harness/knowledge-harness.mjs`

**Zweck:** Aggregiert verstreute Spuren (Run-Logs, Audits, Decisions) in einen einzigen Index, den der nächste Agent in 30 Sekunden überfliegen kann.

**Trigger:** Vor jeder neuen Session, nach jedem Merge, in CI als Artefakt.

**Befehle:**
```bash
node scripts/harness/knowledge-harness.mjs                # vollständiger Index
node scripts/harness/knowledge-harness.mjs --latest 10    # nur letzte 10 Run-Logs
node scripts/harness/knowledge-harness.mjs --findings     # offene Audit-Findings
node scripts/harness/knowledge-harness.mjs --since 7d     # Aktivität letzter 7 Tage
```

**Output:** `shared/knowledge/KNOWLEDGE_INDEX.md` (auto-generiert, NICHT manuell editieren)

---

## 2. Browser Harness — `scripts/harness/browser-harness.mjs` + `e2e/harness/`

**Zweck:** Reproduzierbare, automatisierte Audit-Suite gegen Live- oder Staging-URL. Übersetzt jedes Audit-Finding (F-XX) in einen Playwright-Test, der pass/fail liefert.

**Trigger:** Manuell, in Pre-Deploy-Gate, als nightly cron, nach jedem Production-Deploy.

**Befehle:**
```bash
# gegen Production
node scripts/harness/browser-harness.mjs --url https://diggai.de

# gegen Staging-Preview
node scripts/harness/browser-harness.mjs --url https://deploy-preview-XYZ--diggai-drklaproth.netlify.app

# nur DSGVO-Tests
node scripts/harness/browser-harness.mjs --tag dsgvo

# JSON-Report nach memory/audits/<datum>-<host>.json schreiben
node scripts/harness/browser-harness.mjs --report
```

**Output:** `memory/audits/YYYY-MM-DD_<host>_browser-harness.json` + Markdown-Zusammenfassung

---

## 3. Deploy Harness — `scripts/harness/deploy-harness.mjs`

**Zweck:** Pre-deploy gate. Hält Builds an, die kritische Findings haben würden. Exit-Code blockiert CI.

**Checks (alle MÜSSEN grün):**
- ☐ `https://api.diggai.de` Cert läuft >14 Tage
- ☐ `index.html` enthält keine `fonts.googleapis.com`/`fonts.gstatic.com` Links
- ☐ `public/robots.txt` und `public/sitemap.xml` existieren
- ☐ `public/manifest.json` hat `theme_color != #3b82f6` (kein Tailwind-Default)
- ☐ Pflicht-Env-Vars gesetzt (DATABASE_URL, JWT_SECRET ≥32, ENCRYPTION_KEY =32)
- ☐ `dist/`-Bundle nicht über Performance-Budget (`scripts/check-performance-budget.mjs`)

**Befehle:**
```bash
node scripts/harness/deploy-harness.mjs           # alle Checks
node scripts/harness/deploy-harness.mjs --skip cert   # ohne Cert-Check
node scripts/harness/deploy-harness.mjs --json    # Maschinen-Output für CI
```

**Integration:** In `package.json`:
```json
{
  "scripts": {
    "predeploy": "node scripts/harness/deploy-harness.mjs"
  }
}
```

---

## Zusammenspiel

```
┌─ Agent baut Feature ──────────────────────────────────────────────────┐
│                                                                        │
│  1. liest KNOWLEDGE_INDEX.md (Knowledge Harness Output)               │
│  2. arbeitet                                                           │
│  3. schreibt Run-Log → memory/runs/YYYY-MM-DD_<agent>_<model>-<NN>.md │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                  ↓
          knowledge-harness.mjs läuft (cron oder pre-commit)
                                  ↓
                        KNOWLEDGE_INDEX.md aktualisiert
                                  ↓
┌─ Pre-Deploy ──────────────────────────────────────────────────────────┐
│                                                                        │
│  4. deploy-harness.mjs läuft                                          │
│  5. bei Failure: STOP. bei Success: Deploy fortsetzen                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                  ↓
                          Deploy nach Netlify
                                  ↓
┌─ Post-Deploy ─────────────────────────────────────────────────────────┐
│                                                                        │
│  6. browser-harness.mjs läuft gegen Live-URL                          │
│  7. Report nach memory/audits/                                        │
│  8. Knowledge Harness picks it up beim nächsten Aggregations-Lauf     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Best Practice:** Alle drei Harnesses sind **idempotent** und **side-effect-frei** außer Schreiben in `memory/` bzw. `shared/knowledge/`. Nie produktive Daten anfassen.
