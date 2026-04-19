# Tomedo Testing Playbook

Stand: 2026-04-16
Ziel: Sofort testbare End-to-End und API-Smoke-Checks fuer den aktuellen Implementierungsstand.

## 1. Testumfang

Dieses Playbook trennt in zwei Bereiche:

- Bereich A: Sofort lokal testbar ohne Zollsoft-Freigaben.
- Bereich B: Vorbereitete Tests, die erst nach externer Zollsoft-Klaerung sinnvoll/final sind.

## 2. Voraussetzungen

- Arbeitsverzeichnis: Ananmese/diggai-anamnese-master
- Backend auf Port 3001 gestartet
- Frontend auf Port 5173 gestartet
- Demo-Daten vorhanden (siehe AGENTS.md)
- PowerShell 5.1+ oder 7+

Empfohlene Startkommandos:

```powershell
cd "d:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
docker-compose -f docker-compose.local.yml up -d
npm run dev:all
```

## 3. Bereich A: Sofort lokal testbar

### A1. Basis-Liveness

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET | Select-Object StatusCode
```

Erwartung:

- StatusCode 200

### A2. Login und Session (Cookie + CSRF)

Hinweis: Das Backend setzt CSRF-Schutz fuer state-changing Requests. Deshalb zuerst Token holen, dann mit Header senden.

```powershell
$base = "http://localhost:3001"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1) CSRF Token abholen
$csrfResp = Invoke-RestMethod -Uri "$base/api/csrf-token" -WebSession $session -Method GET
$csrf = $csrfResp.csrfToken

# 2) Login (Arzt Demo)
$loginBody = @{
  username = "arzt"
  password = "arzt1234"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$base/api/arzt/login" -WebSession $session -Method POST -ContentType "application/json" -Headers @{ "x-csrf-token" = $csrf } -Body $loginBody
```

Erwartung:

- Login Response mit Userdaten
- Session-Cookies in $session gesetzt

### A3. Upload positive (PDF)

Vorbereitung: Beispiel-PDF anlegen, falls noch nicht vorhanden.

```powershell
$testPdf = Join-Path (Get-Location) "testing\tomedo\sample.pdf"
if (-not (Test-Path $testPdf)) {
  Set-Content -Path $testPdf -Value "DiggAI Tomedo Upload Smoke Test"
}

$form = @{ document = Get-Item $testPdf }
Invoke-RestMethod -Uri "$base/api/upload" -WebSession $session -Method POST -Headers @{ "x-csrf-token" = $csrf } -Form $form
```

Erwartung:

- success = true
- filename vorhanden
- size > 0

### A4. Upload negative (ungueltiger Dateityp)

```powershell
$badFile = Join-Path (Get-Location) "testing\tomedo\sample.txt"
Set-Content -Path $badFile -Value "invalid file type test"
$formBad = @{ document = Get-Item $badFile }
Invoke-RestMethod -Uri "$base/api/upload" -WebSession $session -Method POST -Headers @{ "x-csrf-token" = $csrf } -Form $formBad
```

Erwartung:

- Fehlerantwort (4xx/5xx je nach Multer-Errorpfad)
- Fehlermeldung zu ungueltigem Dateityp

### A5. PVS-Verbindung TOMEDO/FHIR anlegen

Payload-Datei: testing/tomedo/payloads/create-connection-tomedo-fhir.json

```powershell
$connectionBody = Get-Content "testing/tomedo/payloads/create-connection-tomedo-fhir.json" -Raw
Invoke-RestMethod -Uri "$base/api/pvs/connection" -WebSession $session -Method POST -ContentType "application/json" -Headers @{ "x-csrf-token" = $csrf } -Body $connectionBody
```

Erwartung:

- 201 Created
- testResult Objekt in der Antwort
- Verbindung in GET /api/pvs/connection sichtbar

### A6. PVS Capabilities abrufen

```powershell
$connections = Invoke-RestMethod -Uri "$base/api/pvs/connection" -WebSession $session -Method GET
$connId = $connections[0].id
Invoke-RestMethod -Uri "$base/api/pvs/connection/$connId/capabilities" -WebSession $session -Method GET
```

Erwartung:

- Strukturierte Faehigkeiten fuer TOMEDO Adapter

### A7. Exportformate pruefen (CSV, TXT, PDF, FHIR)

Voraussetzung: gueltige Session-ID aus vorhandenen Demo-Daten.

```powershell
$sessionId = "<SESSION_ID_EINTRAGEN>"

Invoke-WebRequest -Uri "$base/api/export/sessions/$sessionId/export/csv" -WebSession $session -Method GET -OutFile "testing/tomedo/out-session.csv"
Invoke-WebRequest -Uri "$base/api/export/sessions/$sessionId/export/txt" -WebSession $session -Method GET -OutFile "testing/tomedo/out-session.txt"
Invoke-WebRequest -Uri "$base/api/export/sessions/$sessionId/export/pdf" -WebSession $session -Method GET -OutFile "testing/tomedo/out-session.pdf"
Invoke-RestMethod -Uri "$base/api/export/sessions/$sessionId/export/fhir" -WebSession $session -Method GET | ConvertTo-Json -Depth 8
```

Erwartung:

- Dateien werden geschrieben
- FHIR Response enthaelt mindestens QuestionnaireResponse

### A8. PVS Session Export triggern (Hybrid)

Payload-Datei: testing/tomedo/payloads/export-session-body.json

```powershell
$sessionId = "<SESSION_ID_EINTRAGEN>"
$exportBody = Get-Content "testing/tomedo/payloads/export-session-body.json" -Raw
Invoke-RestMethod -Uri "$base/api/pvs/export/session/$sessionId" -WebSession $session -Method POST -ContentType "application/json" -Headers @{ "x-csrf-token" = $csrf } -Body $exportBody
```

Erwartung:

- Ergebnisstatus COMPLETED, PARTIAL oder FAILED (je nach lokaler Umgebung)
- Transferlog-Eintrag wird erzeugt
- Bei Fehlern: strukturierte Fehlerinfos statt Crash

## 4. Bereich B: Vorbereitete Tests nach Zollsoft-Klaerung

Diese Tests sind vorbereitet, aber fachlich erst nach externen Antworten validierbar:

- Dokumentimport in Tomedo per final festgelegtem Kanal (FHIR Binary+DocumentReference oder Alternative)
- Sichtbarkeitstest in Tomedo UI (Karteikarte, richtiger Reiter, richtiger Dokumenttyp)
- Idempotenztest mit doppeltem Upload gleicher Datei
- Retry-/DLQ-Verhalten fuer Dokumentimportfehler
- Routingtest fuer BSNR/Mandant-ID/Standort-ID

## 5. Abnahmecheckliste (quick)

- Backend health 200
- Login inklusive CSRF erfolgreich
- Upload akzeptiert PDF und blockiert ungueltige Typen
- PVS-Verbindung fuer TOMEDO/FHIR speicherbar
- Capabilities abrufbar
- Exporte (CSV/TXT/PDF/FHIR) funktionieren
- PVS Session Export liefert deterministische Response

Wenn alle Punkte gruen sind, ist der aktuelle Ist-Stand reproduzierbar getestet.

## 6. Zugehoerige Artefakte

- TOMEDO_GAPS.md
- TOMEDO_ZOLLSOFT_KLAERUNGSPAKET.md
- testing/tomedo/payloads/create-connection-tomedo-fhir.json
- testing/tomedo/payloads/export-session-body.json
- testing/tomedo/payloads/import-patient-body.json
