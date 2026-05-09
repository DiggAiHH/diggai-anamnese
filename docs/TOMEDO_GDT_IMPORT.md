# Tomedo-Import via GDT (statt In-App-Bridge)

> **Stand:** 9. Mai 2026 — die alte In-App-Tomedo-Bridge ist deaktiviert.
> Stattdessen: Anamnese-Daten als GDT-3.0-Datei (Standard-Format für deutsche Praxis-Software) abholen und in Tomedo importieren.

## Warum?

- **Memory:** In-App-Bridge brachte Connection-Pool, Lauscher, Health-Service etc. — frisst RAM auch wenn keine Praxis Tomedo nutzt.
- **Stabilität:** GDT ist Industriestandard (KBV-spezifiziert seit 1990er). Tomedo importiert GDT zuverlässig, kein API-Sync nötig.
- **Klare Trennung:** DiggAi erfasst Anamnese, Tomedo verwaltet Patienten — wie es auch jeder andere Anbieter macht (Doctolib, Jameda).
- **Class-I-Position:** Reine Datei-Übergabe ist offensichtlich „kein Medizinprodukt", anders als ein bidirektionaler Sync mit Decision-Logic.

## Workflow

### 1. Patient füllt Anamnese aus

Wie gehabt — auf `https://diggai.de` → Patient → Termin/Anamnese → Fragen beantworten → Submit.

### 2. Praxis ruft GDT-Datei ab

Drei Optionen:

**a) Direkt im Arzt-Dashboard** (empfohlen): Klick auf „Tomedo-Export" bei der Patienten-Session → Browser lädt `.gdt`-Datei runter.

**b) URL-Aufruf** (für Automatisierung):
```
GET https://diggai-api.fly.dev/api/sessions/{session-id}/export/gdt?receiverId=TOMEDO
```

mit `Authorization: Bearer <staff-jwt>` oder Session-Cookie.

Response:
```
Content-Type: text/plain; charset=ISO-8859-15
Content-Disposition: attachment; filename="DIGGAI_<patient-nr>.gdt"
```

**c) Tomedo-Watch-Folder** (vollautomatisch, später):
- Praxis-PC startet `gdt-fetcher.exe` (zukünftig)
- Skript pollt alle 60 s `/api/sessions?status=completed&exported=false`
- Lädt jede neue Session als `.gdt`-Datei in den Tomedo-Importordner
- Tomedo erkennt Datei automatisch und importiert

### 3. Tomedo importiert die Datei

In Tomedo:
- **Manuell:** Datei → Import → GDT → Datei wählen → bestätigen.
- **Automatisch:** Tomedo-GDT-Watcher konfigurieren (Patienten → Einstellungen → GDT-Schnittstelle → Importordner). Tomedo liest jede `.gdt`-Datei automatisch ein und legt einen Behandlungsfall an.

## GDT-Inhalt

Erzeugt wird Satzart **6310** (Anamnese-Datentransfer) mit folgenden Feldern:

| GDT-Feld | Inhalt | Quelle |
|----------|--------|--------|
| 8000 | Satzart `6310` | fix |
| 9218 | GDT-Version `3.0` | fix |
| 0102 | Software-Inventarnummer DiggAi | tenant |
| 0103 | Software-Bezeichnung | fix |
| 8316 | Empfänger-ID | `TOMEDO` |
| 8315 | Sender-ID | `DIGGAI` |
| 3000 | Patient-Nummer | session.patient.patientNumber |
| 3101 | Nachname | encryptedName |
| 3102 | Vorname | encryptedName |
| 3103 | Geburtsdatum (DDMMYYYY) | session.patient.birthDate |
| 3110 | Geschlecht (1=M, 2=F, 3=D) | session.patient.gender |
| 3105 | Versichertennummer | session.patient.versichertenNr |
| 3107 | Versichertenstatus | session.patient.versichertenArt |
| 6220 | Anamnese-Text (mehrzeilig) | answers + atom-frage-paare |
| 6228 | Auftragsnummer | session.id |

Jede Antwort wird als `Frage: <text> | Antwort: <wert>` im 6220-Feld serialisiert. Tomedo zeigt das im Behandlungsverlauf.

## Konfiguration

Pro Tenant in den Einstellungen (`tenant.settings`):

```json
{
  "gdtSenderId": "DIGGAI",
  "gdtReceiverId": "TOMEDO"
}
```

Falls nicht gesetzt → Defaults (DIGGAI / TOMEDO) werden verwendet.

## Was wurde aus dem Code entfernt?

- `/api/tomedo-bridge/*` Routen (HTTP-Endpoints für Live-Bridge)
- `/api/tomedo-batch/*` Routen
- `tomedoBridgeAgent` Auto-Register beim Server-Boot
- `tomedoBridgeRoutes` und `tomedoBatchRoutes` Imports in `server/index.ts`

Was bleibt erhalten (für GDT-Export):
- `server/services/pvs/gdt/gdt-writer.ts` — GDT-Datei-Generierung
- `server/services/pvs/gdt/gdt-constants.ts` — Feldcodes + Satzarten
- `server/services/pvs/adapters/gdt-base.adapter.ts` — Daten-Mapping
- FHIR-Subscription-Routes bleiben (für ePA-Anbindung später)

## Zukunft (optional, nicht für jetzt)

- **HL7-FHIR-Export** als Alternative zu GDT (für moderne PVS, KIS-Anbindung)
- **Tomedo-Watch-Service** als kleines .exe das Praxen lokal installieren
- **Webhook-Push** statt Pull (DiggAi POSTet nach Tomedo, sobald Anamnese fertig)

Diese sind alle additiv — die GDT-Export-Datei-Lösung deckt 90% der Praxen ab.
