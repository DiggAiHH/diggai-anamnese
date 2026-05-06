# DiggAi — Test-Setup für Dr. Klapproth (Live-Backend ohne Hetzner)

> **Zweck:** Klapproth kann den aktuellen Spur-A-Stand inkl. Klapproth-UX-Refactor (`/patient` mit 8 Kacheln, neuer AnmeldeHinweisOverlay) testen — sofort, ohne auf Render-Setup warten zu müssen.
> **Wie:** Backend läuft auf deinem (Laith) PC, der über einen kostenlosen Tunnel von außen erreichbar gemacht wird.
> **Lebensdauer:** Solange dein PC an ist und das Skript läuft.

---

## Variante A — Cloudflare Quick Tunnel (empfohlen, 0 Konfiguration)

**Vorteile:** kein Account, kein Token, einfach starten und URL teilen.
**Nachteile:** URL ändert sich bei jedem Restart.

### 1. Cloudflared installieren (einmalig, 1 Min)

```powershell
winget install --id Cloudflare.cloudflared
```

Falls `winget` nicht da: https://github.com/cloudflare/cloudflared/releases → Windows-amd64 .exe runterladen, in `C:\Tools\cloudflared.exe` ablegen, dann `setx PATH "%PATH%;C:\Tools"`.

### 2. Backend starten

Doppelklick auf:

```
D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master\START_LOCAL_BACKEND.bat
```

Warten bis im Fenster steht: `Server listening on :3001` und `VITE ready in ... ms`.

### 3. Tunnel öffnen — **NEUES** cmd-Fenster:

```cmd
cloudflared tunnel --url http://localhost:5173
```

Output zeigt nach 5 Sekunden eine URL wie:

```
+--------------------------------------------------+
| Your quick Tunnel has been created! Visit it at: |
| https://random-words-1234.trycloudflare.com      |
+--------------------------------------------------+
```

Diese URL an Klapproth senden. Er ruft sie im Browser auf → sieht den **neuen Stand mit 8 Kacheln**.

---

## Variante B — VS Code Tunnel (mit Microsoft-Account)

Falls Cloudflared nicht klappt:

```cmd
code tunnel --accept-server-license-terms
```

Erste Ausführung: Login mit GitHub. Zweite Ausführung: gibt URL aus wie `https://vscode.dev/tunnel/<deinPC>`. Dann an Klapproth senden — er kann den Frontend-Port 5173 dort öffnen.

---

## Variante C — ngrok (mit Account)

```cmd
winget install Ngrok.Ngrok
ngrok config add-authtoken <dein-token>
ngrok http 5173
```

URL aus `https://xxxx-xx-xxx-xx-xx.ngrok-free.app`-Format.

---

## Was Klapproth zu testen hat

Nach Aufruf der Tunnel-URL:

1. **Service-Auswahl:** sollte **8 Kacheln** zeigen, davon zwei mit Sub-Buttons (Kommunikation = Telefon+Nachricht; Dokumente = Upload+Anfordern). KEIN „4-Felder-Ansicht öffnen"-Link.

2. **Klick auf Anamnese-Kachel:** Service-Page mit Inline-Start-Button neben dem Titel (kein „Wie es funktioniert"-Block, keine Schritt-1-2-3-Liste). Button-Label: **„Jetzt starten"** (nicht mehr „Anamnese jetzt starten").

3. **DSGVO/Encrypted Pills:** Hover über die Pills → Tooltip mit Erklärung der wichtigsten Quiz-Inhalte (DSGVO Art. 9 Abs. 2 lit. h, AES-256-GCM, TLS 1.3).

4. **„Jetzt starten" Button klicken:** DSGVO-Modal erscheint. Falls Backend offline: **expliziter Error-Banner** „Verbindung zum Praxis-Server unterbrochen" mit Retry-Button (NICHT mehr endloser Loading-Spinner).

5. **Patient-Antwort mit Beschwerde „Brustschmerzen":** Overlay erscheint mit Text **„Bitte sprechen Sie das Praxispersonal an"** + 112-Button. KEIN Wort wie „Notfall", „Verdacht", „Herzinfarkt" sichtbar (regulatorischer Beweis Spur A).

---

## Tunnel beenden

In der Tunnel-cmd-Fenster: **Strg+C**. Oder Fenster schließen.

Backend stoppt automatisch wenn `START_LOCAL_BACKEND.bat`-Fenster geschlossen wird.

---

## Wenn Klapproth Bugs findet

- Screenshot + Beschreibung in Cowork-Session zurückgeben
- Ich fixe → du machst neuen `git push` → er lädt die Tunnel-URL nochmal neu (Vite hot-reload sollte automatisch greifen)

---

## Längerfristig: Render Free Tier (statt PC-Tunnel)

Wenn der PC nicht 24/7 anbleiben soll: `docs/DEPLOY_RENDER_FREE.md` Schritt-für-Schritt durchgehen — 25 Min Setup, dann läuft das Backend dauerhaft kostenlos auf Render Frankfurt mit Supabase Free PostgreSQL EU.
