# Live-Deploy Unblock — Browser-Only Anleitung

Stand: 2026-04-22
Ziel: `diggai.de` (Frontend via Netlify) und `api.diggai.de` (Backend
via Hetzner) so konfigurieren, dass jeder Push nach `master`
automatisch live geht.
Aufwand: **ca. 10 Minuten**, zwei Schritte, **komplett im Browser**,
kein SSH-Client, kein Key, keine Kommandozeile.

Wenn beides erledigt ist: einfach "go" in den Chat tippen. Der Agent
verifiziert live und zieht Run 1 durch.

---

## Schritt 1 — Netlify Auto-Deploy verdrahten (ca. 5 min)

**Warum:** Die letzten Pushes nach `master` haben auf GitHub gelandet,
aber Netlify hat nichts neu gebaut. Live `diggai.de` zeigt immer noch
das Bundle vom 12. April. Die GitHub↔Netlify-Integration ist
entweder getrennt oder auf einen anderen Branch gebunden.

**Was zu tun ist:**

1. https://app.netlify.com/ öffnen, anmelden (Account: DiggAi).
2. In der Liste **die Site auswählen, die `https://diggai.de` ausliefert**.
   - Unter *Domain management* muss dort `diggai.de` als Custom-Domain
     stehen.
   - Falls es zwei Sites gibt, die das behaupten: die mit dem
     aktuellsten Deploy (oder der Site-ID
     `d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90` bzw.
     `aeb2a8e2-e8ac-47e0-a5bc-fef4df4aceaa`).
3. Links im Menü: **Site configuration → Build & deploy →
   Continuous deployment**.
4. Block "Build settings" prüfen:
   - Repository: `DiggAiHH/diggai-anamnese`
   - Production branch: **`master`**
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Falls das Repository als "not linked" angezeigt wird oder einen
   anderen Branch nutzt → Button **Link repository** → GitHub →
   `DiggAiHH/diggai-anamnese` → Branch `master`.
6. Weiter unten: *Deploy contexts* muss zeigen
   - Production branch: `master`
   - Branch deploys: *None*
7. Oben rechts (oder im *Deploys*-Tab): **Trigger deploy → Deploy site**.

**Fertig, wenn:**
- Im *Deploys*-Tab taucht innerhalb von ~30 s ein neuer Deploy auf.
- Der Deploy endet mit Status **Published** (grün).
- Im Browser: `diggai.de` zeigt im Quelltext (Strg+U) eine neue
  `index-...js`-Hash-Datei. Vorher war das `index-CEa7cYBO.js`.

---

## Schritt 2 — VPS-Git-Rechte via Hetzner Cloud Console (ca. 3 min)

**Warum:** Der GitHub-Actions-Deploy schlägt fehl mit
`.git/FETCH_HEAD: Permission denied`. Der Deploy-User `diggai` auf
dem Server darf in `/opt/diggai/repo/.git/` nicht schreiben, weil das
Verzeichnis jemand anders (vermutlich `root`) gehört.

**Kein SSH-Key nötig — Hetzner bietet einen Browser-Terminal direkt
im Cloud-Dashboard.**

1. https://console.hetzner.cloud/ öffnen, anmelden (Hetzner-Account).
2. Projekt mit dem DiggAi-Server öffnen.
3. Den Server klicken, der `api.diggai.de` hostet.
4. Oben im Server-Menü: Tab **"Console"** (Symbol: kleines
   Terminal-Fenster).
   - Das öffnet ein Browser-Terminal mit Root-Zugang.
   - Login: `root` + Root-Passwort (liegt im Hetzner-Account-
     Kontext, oder wurde beim Server-Setup vergeben).
   - Falls das Passwort unklar ist: im Hetzner-Dashboard
     **"Reset root password"** klicken — neues Passwort kommt per
     E-Mail. Nimmt ~30 s.
5. Im Terminal diese **zwei** Befehle tippen:

   ```
   chown -R diggai:diggai /opt/diggai/repo
   sudo -u diggai git -C /opt/diggai/repo pull origin master
   ```

   Der zweite Befehl soll `Updating ...` oder `Already up to date.`
   ausgeben — **nicht** "Permission denied".

6. Terminal-Tab schließen.

**Fertig, wenn:**
- Der zweite Befehl hat ohne Permission-Error durchgelaufen.

---

## Schritt 3 — Rückmeldung (30 s)

Zurück in den Chat schreiben:

> **go** — Netlify trigger-deployed, neue ETag gesehen; VPS-chown
> gemacht, git pull hat geklappt.

Falls einer der Schritte nicht geht:

> **hängt bei Schritt N** — `<genaue Fehlermeldung>`.

---

## Was der Agent nach "go" automatisch erledigt

1. `diggai.de` ETag + Bundle-Hash neu abfragen → bestätigen, dass
   `index-BGIBQ2Sa.js` live liegt.
2. Einen leeren Commit pushen (`git commit --allow-empty`), um den
   `Deploy to VPS`-Workflow auf GitHub erneut zu triggern.
3. Den neuen Workflow-Run streamen, bis grün.
4. `api.diggai.de` Uptime checken (muss von ~840.000 s auf < 60 s
   fallen — bedeutet, der Backend-Container wurde neu gestartet).
5. Die eine offene manuelle SQL-Migration
   `prisma/migrations_manual/20260421_add_patient_connections.sql`
   gegen Supabase ausführen (über `gh workflow run
   migrate-production-once.yml` — nutzt bereits die GitHub-
   Secret-Credentials, keine lokalen DB-Passwörter nötig).
6. Das Run-1 → live Scorecard-Delta posten.

---

## Was *nicht* nötig ist

- Kein lokaler SSH-Key.
- Kein CLI-Tool außer Browser.
- Keine Passwörter im Chat.
- Keine Änderungen an Code oder Secrets.

Alles Code-seitig liegt schon auf GitHub (Commits
`a51d54a`, `0ea0d78`, `9ea0966`, `08489b2`, `d07573e`, `d93388c`).
Der nächste Push nach den beiden Schritten oben deployed automatisch.
