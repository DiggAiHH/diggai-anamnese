# DiggAi — Übergabe-Anleitung

> **Datum:** 05.05.2026
> **Stand:** Spur A (Reklassifizierung „Kein Medizinprodukt") ist code-seitig komplett.
> Alle nachstehenden Schritte sind so weit wie möglich vorbereitet — die letzten Schritte
> erfordern Aktionen ausserhalb des Repos (Render-Account, Sign-off-Unterschriften etc.)
> und sind als „**DU MACHST**" markiert.

---

## Was ist erledigt (51 Dateien geändert in 10 Sessions heute)

✅ **Foundation-Doks (6):** REGULATORY_STRATEGY, INTENDED_USE, REGULATORY_POSITION, CHANGE_LOG_REGULATORY, ROUTING_RULES, MIGRATION_NEXT_STEPS
✅ **Code-Module (4 NEU + 15 EDIT):** RoutingEngine + AnmeldeHinweisOverlay + Adapter + Test-Suiten
✅ **i18n in 10 Sprachen:** 15 `anmeldeHinweis*`-Keys + DE-Werte für `docs.feature.triage.*` und `ai.*`
✅ **Marketing entlastet:** LandingPage + 4 marketing/-Markdowns
✅ **Daten bereinigt:** 12 `triage.message`-Diagnose-Texte aus questions.ts/new-questions.ts
✅ **CI-Fixes:** JWT-Test-Drift + ENCRYPTION_KEY-Scientific-Notation
✅ **PR-Beschreibung:** drop-in unter `docs/PR_SPUR_A_REGULATORY.md`
✅ **Hosting-Migration:** `render.yaml` auf Free Tier Frankfurt + `docs/DEPLOY_RENDER_FREE.md`
✅ **Branch-Push-Skript:** `scripts/push-spur-a-pr.ps1`
✅ **Audit-Trail:** 6 CHANGE_LOG-Einträge + 10 Run-Logs in `memory/runs/`

---

## Schritte 1–5: Code lokal verifizieren (DU MACHST — ca. 15 Min)

### Schritt 1 — Repo-Status prüfen

```powershell
cd "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
git status
```

Erwartung: viele geänderte/neue Files unter `docs/`, `server/`, `src/`, `marketing/`, `public/locales/`, `scripts/`, `memory/runs/`. Dazu Edits in `CLAUDE.md`, `GESAMTUEBERSICHT.md`, `render.yaml`, `.env.example`.

### Schritt 2 — Dependencies installieren (falls nicht aktuell)

```powershell
npm install
```

### Schritt 3 — TypeScript + Lint prüfen

```powershell
npm run type-check
npm run lint
```

Erwartung: keine Fehler. Falls Type-Errors → poste sie, ich helfe.

### Schritt 4 — Unit-Tests laufen lassen

```powershell
npm run test:run
```

Wichtig: die neuen regulatorischen Tests werden ausgeführt:
- `server/engine/__tests__/RoutingEngine.regulatory.test.ts`
- `server/engine/RoutingEngine.priority.test.ts`
- `server/engine/RoutingEngine.performance.test.ts`
- `server/routes/answers.test.ts` (mit neuen RoutingHint-Mocks)
- `src/hooks/usePatientApi.test.tsx`

### Schritt 5 — Browser-Smoke-Test (Frontend isoliert)

```powershell
npm run dev
```

Im Browser http://localhost:5173 öffnen. Smoke-Test:
1. Anamnese starten
2. Bei Beschwerde-Auswahl „Brustschmerzen" wählen
3. **Erwartung:** AnmeldeHinweisOverlay erscheint mit Text „Bitte wenden Sie sich umgehend an das Praxispersonal..." — **kein** Wort „Notfall", „Verdacht", „Herzinfarkt"
4. „Im Zweifel Notruf 112"-Button sichtbar

---

## Schritt 6 — Branch + Commit + Push (DU MACHST — ca. 5 Min, Skript hilft)

### Variante A — Skript (empfohlen)

```powershell
# DryRun zuerst, um zu sehen was passieren würde
.\scripts\push-spur-a-pr.ps1 -DryRun

# Dann echt
.\scripts\push-spur-a-pr.ps1
```

Das Skript:
1. Prüft Git-Status
2. Holt `master` von origin
3. Erstellt Branch `regulatory/spur-a-no-mdsw`
4. Staged + committed mit ausführlicher Multi-Zeilen-Message
5. Pushed zu origin
6. Öffnet PR via `gh` CLI mit `docs/PR_SPUR_A_REGULATORY.md` als Body (sofern `gh` installiert ist)

### Variante B — manuell

```powershell
git fetch origin
git checkout -b regulatory/spur-a-no-mdsw origin/master
git add -A
git commit -F docs/PR_SPUR_A_REGULATORY.md
git push -u origin regulatory/spur-a-no-mdsw
```

Dann auf https://github.com/DiggAiHH/diggai-anamnese/compare/master...regulatory/spur-a-no-mdsw den PR-Body aus `docs/PR_SPUR_A_REGULATORY.md` einfügen.

---

## Schritt 7 — Sign-off (DU ORGANISIERST — extern, nicht im Repo)

Drei Unterschriften für die regulatorische Position:

- [ ] **Dr. Klapproth** (Geschäftsführung) — Unterschrift in `docs/INTENDED_USE.md` und `docs/REGULATORY_POSITION.md`
- [ ] **Dr. Al-Shdaifat** (Medical Advisor) — Pflicht für PRIORITY-Routing-Regeln, gleiche Doks
- [ ] **Tech-Lead** — Code-Review-Approval auf dem GitHub-PR

**Optional aber empfohlen:** externer Regulatory-Berater für Erstgespräch (siehe `docs/REGULATORY_STRATEGY.md` §13.4 — Empfehlungen Johner Institut, MEDIQ).

Die Sign-off-Blocks in den Doks haben Felder für Datum + Unterschrift. Wenn die Doks elektronisch signiert werden sollen, eIDAS-konforme Tools nutzen (DocuSign, signNow).

---

## Schritt 8 — Backend-Hosting umziehen (DU MACHST — ca. 25 Min)

Hetzner ist diesen Monat nicht bezahlt. Übergangs-Lösung: kostenloser DE-Hoster.

**Folge der Anleitung:** [`docs/DEPLOY_RENDER_FREE.md`](./DEPLOY_RENDER_FREE.md)

Kurzfassung:
1. Supabase-Account anlegen → PostgreSQL-DB in Frankfurt-Region (5 Min)
2. Lokal: `npx prisma migrate deploy && npx prisma db seed` mit Supabase-URL (3 Min)
3. Render-Account → **Blueprint** → `render.yaml` aus Repo wird erkannt (10 Min)
4. Environment-Vars im Render-Dashboard setzen (`DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `ARZT_PASSWORD`)
5. Netlify: `VITE_API_URL` auf neue Render-URL setzen, Redeploy (5 Min)
6. Smoke-Test https://diggai.de (2 Min)

**DSGVO-Pflicht:** AVV mit Render UND Supabase abschließen, in `docs/VERFAHRENSVERZEICHNIS.md` ergänzen.

**Bei Hetzner-Wiederbezahlung:** DNS auf Hetzner zurück, Render als Standby-Fallback im Repo lassen.

---

## Schritt 9 — Cert-Issue api-takios.diggai.de (DU MACHST oder DEVOPS-PARTNER)

Aktuell liefert `api-takios.diggai.de` `ERR_CERT_COMMON_NAME_INVALID`. Frontend zeigt zwar nicht mehr darauf (Lauf claude-code-06 hat den preconnect entfernt), aber die Domain ist im DNS noch hinterlegt.

Optionen:
- DNS-Eintrag löschen wenn nicht gebraucht (empfohlen, da neuer API-Host `<service>.onrender.com`)
- Cert renewen wenn weiterhin als Subdomain genutzt
- CNAME auf neue Render-URL umleiten

DNS-Anbieter checken (vermutlich der Registrar von `diggai.de`).

---

## Schritt 10 — 7 offene PRs durchsehen (DU oder TECH-LEAD)

Aus `memory/runs/`-Logs vom 04.05.: PRs `#11`, `#12`, `#13`, `#14`, `#15`, `#16`, `#19`, `#20` sind offen. Vor dem Spur-A-Merge entscheiden:
- Mergen → konfliktfrei nach Spur-A?
- Schließen → wenn überholt?
- Rebase auf Spur-A?

```powershell
gh pr list
gh pr view 11
gh pr view 12
# ... etc
```

---

## Schritt 11 — CI-Lauf grün auf GitHub (AUTOMATISCH nach Push)

Nach `git push` läuft GitHub Actions automatisch (siehe `.github/workflows/`). Erwartung:

✅ `npm run type-check` grün
✅ `npm run lint` grün
✅ `npm run test:run` grün — inkl. neuer regulatorischer Tests
✅ `npm run test:server` grün
⏳ `npm run test:e2e` — eventuell Playwright-Snapshot-Updates nötig

Bei roten Tests: Logs lesen, ggf. Snapshot-Updates committen oder Mock-Fixtures nachjustieren.

---

## Schritt 12 — Merge + Deploy (DU oder TECH-LEAD)

Nach allen Sign-offs + grünem CI:
- PR mergen (Squash-Merge empfohlen für saubere History)
- Netlify auto-deployt das Frontend bei `master`-Push
- Render auto-deployt das Backend bei `master`-Push (sofern in `render.yaml` `autoDeploy: true` gesetzt — aktuell `false`, also manuell triggern)

---

## Schritt 13 — 14 Tage Cache-Drain abwarten (PASSIV)

Aktive PWA-Service-Worker liefern noch alte Bundles. Konservativer Puffer: 14 Tage. In dieser Zeit:
- Doppel-Listener im Frontend lauschen auf `routing:hint` UND alten `triage:alert`
- Server emittiert beide Events parallel
- API-Response trägt `routingHints` UND `redFlags`-Alias

---

## Schritt 14 — Cleanup-PR (DU MACHST — ca. 30 Min)

**Folge der Anleitung:** [`docs/MIGRATION_NEXT_STEPS.md`](./MIGRATION_NEXT_STEPS.md)

6 Phasen:
1. Server-Backwards-Compat entfernen (`emitTriageAlert`, `triage:alert`-Mirror, `redFlags`-Alias)
2. Frontend-Doppel-Listener entfernen
3. `TriageEngine.ts` + alte Tests + `RedFlagOverlay.tsx` löschen
4. Doku-Folgepflege
5. Native-Speaker-Review TR/AR/FA/UK/PL für 24 i18n-Keys
6. CI-Lauf erzwingen

---

## Schritt 15 — Native-Speaker-Review extern (DU ORGANISIERST — parallel)

Für 24 i18n-Keys in TR/AR/FA/UK/PL (besonders kritisch wegen RTL und Telefonseelsorge-Texten):

| Sprache | Empfohlener Reviewer |
|---------|----------------------|
| TR | medizinisch erfahrene*r türkische*r Muttersprachler*in (z. B. KV-Dolmetscher) |
| AR | wie TR, RTL-Layout-Test wichtig |
| FA | wie AR |
| UK | medizinisch erfahrene Person mit Geflüchteten-Kontext |
| PL | medizinisch erfahrene*r polnische*r Muttersprachler*in |

Markteintritt im jeweiligen Sprachraum erst nach abgeschlossener Review.

---

## ⏹️ HIER ÜBERGEBE ICH AN DICH

Die Schritte ab hier brauchen **deine Account-Zugänge** (GitHub, Render, Supabase, Netlify, DNS-Anbieter, Klapproth-/Al-Shdaifat-Unterschrift) und können von mir nicht gemacht werden.

**Empfohlene Reihenfolge für heute:**

1. ✅ Schritte 1–5 lokal verifizieren (15 Min)
2. ✅ Schritt 6 Branch-Push (5 Min, Skript hilft)
3. ✅ Schritt 11 GitHub-Actions-Lauf prüfen (passiv)
4. ⏸️ Schritt 7 Sign-off einholen — kann parallel laufen, mehrere Tage

**Empfohlene Reihenfolge für die Woche:**

1. Schritt 8 Backend-Hosting umziehen
2. Schritt 9 Cert-Issue lösen
3. Schritt 10 PR-Inventur
4. Schritt 12 Merge + Deploy

**Späterer Cleanup-PR:** Schritt 13 + 14, Schritt 15 parallel.

---

## Wenn was schiefgeht

| Problem | Wo nachschlagen |
|---------|-----------------|
| Type-Errors | `docs/CHANGE_LOG_REGULATORY.md` listet alle Code-Edits — prüfe welche Datei den Fehler wirft |
| Tests rot | `docs/PR_SPUR_A_REGULATORY.md` „Wie testen"-Abschnitt |
| Render-Deploy bricht | `docs/DEPLOY_RENDER_FREE.md` „Troubleshooting" |
| Behörden-Anfrage | `docs/REGULATORY_POSITION.md` §9 — Reaktionsplan |
| Patient-UI zeigt Diagnose-Wort | regulatorischer Bug — sofort `e2e/regulatory/no-diagnosis-to-patient.spec.ts` lokal laufen lassen, Bug fixen, in `CHANGE_LOG_REGULATORY.md` dokumentieren |

---

## Kontakt für weitere Fragen

Eine neue Session mit Cowork starten und sagen: „lies docs/REGULATORY_STRATEGY.md, docs/CHANGE_LOG_REGULATORY.md und memory/runs/2026-05-05_*.md, dann hilf mir mit X". Der nächste Agent hat damit den vollen Kontext.

**Du hast jetzt eine vollständig regulatorisch abgesicherte Codebasis. Viel Erfolg beim Roll-Out!**
