**Kurzanleitung: n8n + Discord-Bot lokal starten**

1) Kopiere die env-Vorlage und fülle den `DISCORD_TOKEN`:

- Linux/macOS:
```bash
cp .env.n8n_discord.template .env.n8n_discord
```
- Windows PowerShell:
```powershell
Copy-Item .env.n8n_discord.template .env.n8n_discord
```

Trage deinen `DISCORD_TOKEN` in `.env.n8n_discord` ein.

2) Starte die Dienste:
```bash
docker compose -f docker-compose.n8n-discord.yml --env-file .env.n8n_discord up -d
```
oder (ältere Docker-Versionen):
```bash
docker-compose --env-file .env.n8n_discord -f docker-compose.n8n-discord.yml up -d
```

3) Zugriffe:
- n8n UI: http://localhost:5678 (Basic Auth: `N8N_USER`/`N8N_PASSWORD` aus der .env)
- Discord-Bot HTTP API: http://localhost:3002/send (POST JSON `{ "channelId": "..", "content": "..." }`)

4) Beispiel: n8n → Discord
- In n8n einen HTTP Request Node konfigurieren (POST) an `http://discord-bot:3002/send` mit JSON-Body:
```json
{
  "channelId": "123456789012345678",
  "content": "Hallo von n8n"
}
```

Hinweis: Verwende `discord-bot:3002` aus n8n (gleicher Docker-Compose-Network). Von deinem Host aus erreichst du den Bot über `localhost:3002`.

5) Sicherheit
- Teile niemals `.env.n8n_discord` mit echten Tokens in VCS.
- Für Produktion n8n-DB, SSL, und sichere Secrets verwenden.

---

Lokal (Windows, ohne Docker)

1) Kopiere die lokale env-Vorlage und setze Werte:

- PowerShell:
```powershell
Copy-Item .env.n8n_local.template .env.n8n_local
Copy-Item .env.n8n_discord.template .env.n8n_discord
```

Bearbeite die Dateien `.env.n8n_local` und `.env.n8n_discord` und trage mindestens `DISCORD_TOKEN` sowie die n8n-Auth-Daten ein.

2) Starten (empfohlen):

Starte beide Dienste in neuen PowerShell-Fenstern:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-all-local.ps1
```

Oder einzeln (wenn du die Fenster manuell öffnen willst):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-n8n-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-discord-local.ps1
```

3) Hinweise
- Node.js 18+ und npm sind erforderlich.
- Der Discord-Bot ist danach unter http://localhost:3002/send erreichbar.
- Die n8n UI läuft unter http://localhost:5678 (Basic Auth gemäss `.env.n8n_local`).

4) Troubleshooting
- Wenn `npx` meldet, dass es Pakete installiert, warte den Installationsprozess ab. Bei Fehlern `npm install -g n8n` prüfen.
- Stelle sicher, dass der `DISCORD_TOKEN` gültig ist und der Bot zum Schreiben in den Ziel-Channel berechtigt ist.

