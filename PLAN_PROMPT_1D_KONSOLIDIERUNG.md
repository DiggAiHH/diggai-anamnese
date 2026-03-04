# PLAN Prompt 1d — Konsolidierung Module 1–8 & Master-Roadmap für Prompt 2+

> **Erstellt:** 2026-03-04  
> **Status:** FINAL  
> **Input-Dokumente:**
> - `PLAN_MODUL_1_2.md`
> - `PLAN_MODUL_3_4.md`
> - `PLAN_MODUL_5_6.md`
> - `PLAN_MODUL_7_8.md`

---

## Ziel von Prompt 1d

Dieses Dokument konsolidiert alle geplanten Module in eine **einheitliche Architektur**, definiert Abhängigkeiten, priorisiert die Umsetzung und legt die **verbindliche Implementierungsreihenfolge für Prompt 2+** fest.

---

## 1) Gesamtarchitektur (konsolidiert)

### Domänen
1. **Patient Journey Core** (Module 1, 7)
   - Queue, Wartezimmer, NFC Checkpoints, TreatmentFlow
2. **Clinical Core** (Module 3, 4)
   - PVS/FHIR/GDT/KIM, Therapieplan, Arzt-Assistenz
3. **Patient Digital Layer** (Module 5, 8)
   - PWA, Tagebuch, Reminder, Messaging, Avatar, Telemedizin
4. **Platform & Ops** (Module 2, 6)
   - Admin/Permissions, Lokaler Modus, TI/ePA, Backup, Monitoring

### Technische Schichten
- **Frontend:** React + Router + TanStack Query + Zustand
- **Backend:** Express + Prisma + Socket.IO
- **Storage:** PostgreSQL + Redis + uploads
- **Security:** JWT, AES-256-GCM, Audit Log, role/permission middleware
- **Deployment:** Cloud/Hybrid/Local

---

## 2) Modul-Abhängigkeiten (entscheidend)

| Modul | Depends on | Grund |
|------|------------|-------|
| 2 | 1 | Admin braucht echte Queue/Flow-Daten |
| 3 | 2 | PVS/Exports benötigen Rechte- und Mapping-Verwaltung |
| 4 | 2, 3 | Therapieplan braucht Rollen + FHIR/PVS Kontext |
| 5 | 1, 2 | PWA nutzt Queue/Session + Permissions |
| 6 | 2, 3 | Lokaler Betrieb + TI/ePA/KIM baut auf Admin + Integrationslayer |
| 7 | 1, 2, 5 | NFC/Flow nutzt Queue, Rechte, PWA UI |
| 8 | 2, 4, 5, 7 | Avatar/Formulare/Telemedizin brauchen bestehende Workflows |

**Kritischer Pfad:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

---

## 3) Konflikt-/Duplikat-Auflösung zwischen Plänen

### A) Chat-Modelle
- `ChatMessage` (bestehend) bleibt für Core-Sessionchat
- `SecureMessage` (Modul 5) für persistentes PWA-Messaging
- `PraxisChatMessage` (Modul 7) wird **nicht als drittes Parallelmodell** geführt, sondern als Erweiterung von `SecureMessage` + `messageType`

**Entscheidung:** Ein Messaging-Backbone (`SecureMessage`) + Adapter zu Socket.IO

### B) ePA Begriffe
- Modul 6: gematik/ePA (`EPADocument`)
- Modul 8: private ePA (`PrivateEPA`, `EpaDocument`)

**Entscheidung:** Beide bleiben getrennt, da Rechts-/Betriebsmodell unterschiedlich.

### C) Queue vs Flow
- Modul 1 Queue-Logik
- Modul 7 TreatmentFlow

**Entscheidung:** Queue bleibt globales Aufrufsystem; Flow nutzt Queue als WAITING-Step.

### D) Voice
- Bestehend: Browser Speech APIs
- Modul 8: optionales Voice-Cloning

**Entscheidung:** V1 ohne Voice-Cloning produktiv; V2 Feature-Flag.

---

## 4) Verbindliche Umsetzung für Prompt 2+

## Wave 1 — Stabilisierung & Datenfundament (Must-Have)
1. Persistente Queue + Admin Live Data (Modul 1+2)
2. Permissions komplett (Modul 2)
3. PVS/FHIR Basisadapter + Exporte (Modul 3)
4. Therapieplan Basis (Modul 4)

**Exit-Kriterien Wave 1:**
- Session→Queue→Arzt-Ende stabil
- Admin komplett API-driven
- erste PVS/FHIR Roundtrips mit Testdaten

## Wave 2 — Patient Layer & Local Ops (Must-Have)
5. PWA Auth + Offline + Diary + Reminder + Messages (Modul 5)
6. Lokaler Modus + Backup + TI-Basisstatus (Modul 6)

**Exit-Kriterien Wave 2:**
- Patient kann sich dauerhaft anmelden
- offline data sync funktioniert
- On-Premise Basis mit Backup/Restore grün

## Wave 3 — Experience & Praxisautomatisierung (Should-Have)
7. NFC Checkpoints + Flow Engine + Checkout + anonymes Feedback (Modul 7)
8. Kiosk + Payment real

**Exit-Kriterien Wave 3:**
- echter NFC-Flow Eingang→Checkout
- Payment Ende-zu-Ende mit Tokenisierung

## Wave 4 — Advanced Features (Could-Have/Flagged)
9. Avatar/TTS-Erweiterung, Telemedizin, Gamification, Form-AI, Private ePA, Anon Export (Modul 8)

**Exit-Kriterien Wave 4:**
- Feature Flags steuerbar
- KPI-Steigerung gegenüber Wave 1/2 messbar

---

## 5) Datenmodell-Merge-Plan (Prisma)

### Migration Bundles
- **M1:** Queue + Admin + Permissions + ROI + Wunschbox
- **M2:** PVS/FHIR/Therapieplan
- **M3:** PWA + Local/TI/ePA/KIM
- **M4:** NFC/Flow + Payment + Feedback
- **M5:** Avatar/Telemedizin/Gamification/Forms/PrivateEPA/AnonExport

### Regeln
- Keine Breaking Renames ohne Backfill
- Jede Migration rückrollbar dokumentieren
- Indizes vor API-GoLive prüfen (read/write hot paths)

---

## 6) API Konsolidierung

### Routing-Konvention
- `/api/admin/*`
- `/api/queue/*`
- `/api/flows/*`
- `/api/pwa/*`
- `/api/ti/*`
- `/api/system/*`
- `/api/payment/*`
- `/api/forms/*`
- `/api/telemedicine/*`
- `/api/private-epa/*`

### Querschnitt
- `requireAuth` + `requirePermission`
- Zod Validation für alle payloads
- Audit middleware auf write endpoints
- Feature gates für riskante Features (`AVATAR_ENABLED`, `PAYMENT_ENABLED`, `TELEMED_ENABLED`)

---

## 7) Frontend Konsolidierung

### Zielstruktur
- `src/pages/admin/*`
- `src/pages/pwa/*`
- `src/pages/nfc/*`
- `src/components/shared/*`
- `src/components/feature/*`

### UX-Normalisierung
- einheitliche Statuschips (ACTIVE/PAUSED/COMPLETED)
- gleiche Toast/Alert Mechanik
- konsistente i18n keys und namespaces

---

## 8) Security/Compliance Masterregeln

1. Kein KI-Diagnosemodus ohne Arztbestätigung
2. Threat Detection lokal, kein unsicherer Cloud-Forward
3. Payment nur tokenisiert, keine Karten-PAN Speicherung
4. Voice Clone nur mit schriftlicher Einwilligung Mitarbeiter
5. Recording Telemedizin nur mit separatem Consent
6. DSGVO Löschpfade testen (soft/hard delete)
7. Vollständige Auditierbarkeit bei Eskalation und Overrides

---

## 9) KPI Framework (übergreifend)

### Betriebs-KPIs
- mediane Wartezeit
- Durchlaufzeit pro Flow
- No-show/Abbruchrate
- Queue->Behandlung Conversion

### Qualitäts-KPIs
- Formular-Completion
- Fehlzuweisungsrate
- Eskalationsquote Feedback
- Therapieplan-Follow-up Rate

### Patienten-KPIs
- PWA DAU/WAU
- Reminder Adhärenz
- Message Response Time
- NPS/Rating Durchschnitt

---

## 10) Prompt 2+ Startpunkt (konkret)

Für Prompt 2 starten wir **nicht bei Modul 7/8**, sondern mit dem kritischen Pfad:

1. **2a:** Modul 1 Queue Persistenz + Socket reliability
2. **2b:** Modul 2 Admin live data + permissions
3. **2c:** Modul 3 PVS/FHIR Adapter minimal viable
4. **2d:** Modul 4 Therapieplan core
5. **2e:** Modul 5 PWA core
6. **2f:** Modul 6 local ops + backup + TI health
7. **2g–2n:** Modul 7/8 in Wellen

---

## 11) Risiken & Gegenmaßnahmen

| Risiko | Auswirkung | Gegenmaßnahme |
|------|------------|---------------|
| Zu viele Features parallel | Instabilität | Wellenmodell + Feature Flags |
| TI/ePA Abhängigkeiten extern | Verzögerung | Mock-Simulator + Adapter-Schicht |
| Payment Compliance | Rechtliches Risiko | Provider SDK + PCI Scope minimieren |
| WebRTC Komplexität | QA-Aufwand | zuerst MVP ohne Recording |
| Datenmodell-Explosion | Performance | Indizes + Archivierungsstrategie |

---

## 12) Abschlussentscheidung Prompt 1d

### Ergebnis
- Module 1–8 sind konsolidiert
- Konflikte aufgelöst
- Implementierungsreihenfolge für Prompt 2+ verbindlich festgelegt

### Ready-for-Implementation
✅ Ja.  
Empfohlener nächster Schritt: **Prompt 2a sofort starten** (Queue Persistenz + Admin Live Data vorbereiten).

---

> **Ende PLAN_PROMPT_1D_KONSOLIDIERUNG.md**
