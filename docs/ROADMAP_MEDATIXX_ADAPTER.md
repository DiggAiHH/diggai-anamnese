# Medatixx-Adapter — Roadmap-Skizze

> **Quelle:** Klapproth-Feedback 2026-05-04 — „Friedrich hat erste Interessenten die Medatixx nutzen und unser Programm einsetzen möchten. Da müssen wir den Datenexport und Übergabe der personenbezogenen Daten wie mit Tomedo bewerkstelligen, damit wir die Datensätze pseudonymisieren können. Denn sonst wäre die Nutzung für nicht-Tomedo-Nutzer zu umständlich. Das ist eine der nächsten größeren Baustellen."
> **Status:** geplant — nicht in aktuellem Sprint
> **Priorität:** P2 (kein Blocker für Spur-A-Roll-Out, aber Vertriebs-Enabler für Friedrichs Pipeline)

---

## 1. Ausgangslage

DiggAi hat heute eine **Tomedo-Bridge** (`scripts/tomedo-praktiq.applescript` + `server/routes/tomedo-import.routes.ts`), die Patienten-Stammdaten aus Tomedo via AppleScript ausliest, sicher übergibt und pseudonymisiert.

Friedrichs Interessenten nutzen **Medatixx** (deutscher PVS-Marktführer für niedergelassene Ärzte). Ohne entsprechenden Adapter müssten Praxen Patientendaten manuell in DiggAi nachpflegen — laut Klapproth „zu umständlich".

## 2. Kernanforderung

Ein analoger Adapter für Medatixx, der:

1. **Patient-Stammdaten** aus dem Medatixx-Bestand liest (Name, Geburtsdatum, Versicherung, Anschrift, Vorerkrankungen, Medikation)
2. **Pseudonymisiert** an DiggAi übergibt (analog Tomedo-Pipeline)
3. **Daten zurück** in Medatixx schreibt nach abgeschlossener Anamnese (strukturierter Befundtext, AU-Bescheinigung etc.)

## 3. Technische Optionen

Medatixx bietet **mehrere Schnittstellen-Wege** — Reihenfolge nach Aufwand und Stabilität:

### 3.1 GDT (Geräte-Daten-Träger) — Standard, weit verbreitet

GDT ist das BVitG-/QMS-Standardprotokoll für PVS-Drittsoftware-Anbindung. Datei-basiert, plattformunabhängig.

| Aspekt | Wert |
|--------|------|
| Standard | xDT-Protokollfamilie (BVitG, [xDT-Doku](https://www.kbv.de/html/xdt.php)) |
| Format | Textdatei, strukturierte Feldcodes |
| Richtung | Patient-Daten → DiggAi (lesend) **und** DiggAi → Medatixx (schreibend) |
| DiggAi heute | GDT-Export ist bereits universal vorhanden (siehe `marketing/landing-arzt.md` „GDT-Export funktioniert universell") |
| Aufwand | mittel — bestehender GDT-Layer um Medatixx-spezifische Verzeichnisse / Trigger erweitern |
| Vorteil | DSGVO-leicht, keine API-Credentials, läuft offline |
| Nachteil | datei-basiert, Polling-Loops, keine Realtime-Updates |

**Empfehlung:** GDT als **Phase 1** — schnellster Markteintritt, deckt Friedrichs Use-Case ab.

### 3.2 KV-Connect / KIM (Kommunikation im Medizinwesen)

Für sichere Befund-Übermittlung zwischen Praxis und Drittsoftware. KIM-fähige Lösung wird ohnehin für eRezept/eAU empfohlen.

| Aspekt | Wert |
|--------|------|
| Aufwand | hoch — KIM-Anbindung erfordert eIDAS-Komponenten + Praxis-Heilberufeausweis (eHBA) |
| Vorteil | regulatorisch wasserdicht, gematik-zertifiziert |
| Nachteil | Setup pro Praxis, kostet Zeit + Geld pro Lizenz |

**Empfehlung:** als **Phase 3** mittelfristig.

### 3.3 medatixx-Direct-API (proprietär)

Medatixx selbst bietet eine **Cloud-Schnittstelle** und ein Plugin-System (medatixx api / medatixx connect).

| Aspekt | Wert |
|--------|------|
| Verfügbarkeit | nicht öffentlich dokumentiert — direkter Kontakt zu medatixx GmbH erforderlich |
| Aufwand | unbekannt — Partner-Programm-Anfrage nötig |
| Vorteil | Native Integration, Realtime |
| Nachteil | Vendor-Lock, Lizenzkosten, längerer Onboarding-Zyklus |

**Empfehlung:** **Phase 2** — parallel zu GDT-Phase 1 anfragen.

## 4. Architektur-Skizze

```
┌────────────────────┐                      ┌────────────────────┐
│     Medatixx       │                      │      DiggAi        │
│   (Praxis-PVS)     │                      │  (Anmelde-/Routing-│
│                    │                      │   Plattform)       │
│  ┌──────────────┐  │  ┌────────────────┐  │  ┌──────────────┐  │
│  │  Patient-DB  │──┼─→│  GDT-File      │←─┼──│  GDT-Reader  │  │
│  │              │  │  │  (txt, BvitG)  │  │  │  + Pseudonym │  │
│  └──────────────┘  │  └────────────────┘  │  └──────────────┘  │
│         ↑          │                      │         ↓          │
│  ┌──────────────┐  │  ┌────────────────┐  │  ┌──────────────┐  │
│  │  Befund-     │←─┼──│  GDT-Result    │──┼─→│  Anamnese    │  │
│  │  Eingang     │  │  │  (txt)         │  │  │  abgeschl.   │  │
│  └──────────────┘  │  └────────────────┘  │  └──────────────┘  │
└────────────────────┘                      └────────────────────┘

         Pseudonymisierung-Schritt (analog Tomedo):
         server/services/encryption.ts (AES-256-GCM)
         server/services/pseudonymize.ts (NEU)
```

## 5. Vorgesehene Files (Phase 1 — GDT)

```
server/agents/medatixx-bridge/                       NEU
├── README.md                                        Doku
├── gdt-reader.ts                                    GDT-Parsing
├── gdt-writer.ts                                    GDT-Erzeugung
├── pseudonymize.service.ts                          gemeinsamer Service
└── medatixx.service.ts                              Orchestration

server/routes/medatixx-import.routes.ts              NEU
server/routes/medatixx-export.routes.ts              NEU
docs/MEDATIXX_BRIDGE.md                              NEU (analog TOMEDO_BRIDGE.md)

scripts/medatixx-watch.ps1                           NEU (Watcher für GDT-Verzeichnis auf Praxis-PC)
```

## 6. Pseudonymisierungs-Pipeline

Klapproth: „pseudonymisieren — sonst zu umständlich". Konkret:

| Schritt | Datenfeld | Behandlung |
|---------|-----------|------------|
| 1 | Patient-ID Medatixx | SHA-256-Hash mit Praxis-Salt → wird zu DiggAi-internem `patient_pseudonym` |
| 2 | Name, Vorname | AES-256-GCM-encrypt mit Praxis-Schlüssel, im Klartext nur lokal (Browser/Tablet) sichtbar |
| 3 | Geburtsdatum | bleibt nötig (Anamnese-Logik braucht Alter); separate verschlüsselte Spalte |
| 4 | Versicherung, Adresse | encrypted at rest |
| 5 | Vorerkrankungen | encrypted, nur sessionbezogen entschlüsselt |
| 6 | Diagnosen aus Medatixx (ICD-10) | bewusst NICHT importieren — DiggAi soll keine Diagnose-Sicht haben (Spur-A-Konsistenz) |

→ Die Pseudonymisierung läuft **vor** dem ersten Schreibvorgang in die DiggAi-DB. Die Praxis behält die Re-Identifizierungs-Map; DiggAi hat keinen Zugriff darauf.

## 7. Zeitplan

| Phase | Inhalt | Aufwand | Wann |
|-------|--------|---------|------|
| 0 | Tech-Brief Friedrich + 2–3 Pilot-Praxen | 1 Tag | nach Spur-A-Roll-Out |
| 1 | GDT-Reader + Writer + Pseudonymize-Service | 2 Wochen | Q3/2026 |
| 2 | medatixx-API-Partneranfrage + Eval | 4 Wochen parallel | Q3/2026 |
| 3 | KIM-Integration (eHBA) | 6 Wochen | Q4/2026 |
| 4 | Pilot-Roll-Out 3 Praxen | 4 Wochen | Q4/2026 |

## 8. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|--------|---------------|
| GDT-Datei-Format pro PVS leicht abweichend | Beispiel-Files aus den 3 Pilot-Praxen vorab einsammeln, Test-Suite gegen reale Files |
| medatixx-Partner-Programm dauert Monate | GDT-only ausliefern, Partnerschaft parallel verfolgen |
| Pseudonymisierungs-Konflikt mit Praxis-Workflow (Personal will Klarnamen sehen) | Klartext nur clientseitig nach Login mit Praxis-Schlüssel, Server hat nie Klartext |
| DSGVO-Verfahrensverzeichnis muss erweitert werden | `docs/VERFAHRENSVERZEICHNIS.md` für jeden Pilot ergänzen, AVV-Anhang Medatixx-Subprocessor |

## 9. Sign-off & Kontakte

- **Friedrich** (Vertrieb) — bringt Kontakte zu Pilot-Praxen
- **Klapproth** — fachlich-medizinische Anforderungen
- **medatixx GmbH** ([medatixx.de](https://www.medatixx.de)) — Partner-Anfrage
- **BVitG / KBV** — GDT-Spec-Compliance

## 10. Verknüpfung mit Spur A („Kein Medizinprodukt")

Der Medatixx-Adapter ist **administrativ** (Stammdaten-Sync) — bewegt sich nicht in MDR-Klasse-IIa-Bereich, weil keine medizinischen Entscheidungen getroffen werden. Konsistent mit der Hersteller-Position aus [`INTENDED_USE.md`](./INTENDED_USE.md).
