# DiggAI — Interaktionsflow-Matrix & Test Coverage

> Letzte Aktualisierung: 2026-04-16  
> Seed: `prisma/seed-demo-complete.ts` (30 Patienten)  
> Scorecard: `npm run scorecard`

---

## Flow-Matrix: Welcher Patient deckt welchen Flow ab?

| Flow | Patient(en) | Tenant | Status | E2E Spec |
|------|-------------|--------|--------|----------|
| **Neupatienten – vollständige Anamnese** | P-10006 (Klein), P-20002 (Wolf), P-30002 (Al-Rashid), P-30007 (Okonkwo), P-30009 (Yilmaz), P-30014 (Arslan) | T1/T2/T3 | `ACTIVE` / `COMPLETED` | `e2e/patient-journey/new-patient-complete.spec.ts` |
| **Wiederkehrende Patienten** | P-10001 (Schmidt), P-10002 (Bauer), P-10007 (Fischer), P-20001 (Richter), P-30001 (Jung) | T1/T2/T3 | `COMPLETED` | `e2e/patient-journey/returning-patient-complete.spec.ts` |
| **KRITISCH: ACS / STEMI** | P-20001 (Richter), P-20006 (Zimmermann) | T2 | `SUBMITTED` | `e2e/patient-journey/triage-alerts.spec.ts` |
| **KRITISCH: Suizidalität** | P-30011 (Bauer, Felix) | T3 | `SUBMITTED` | `e2e/patient-journey/triage-alerts.spec.ts` |
| **WARNING: Herzinsuffizienz** | P-10003 (Weber) | T1 | `SUBMITTED` | `e2e/volltest-ziel01.spec.ts` |
| **Rezept-Verlängerung (MFA-Flow)** | P-10002 (Bauer), P-30010 (Nowak) | T1/T3 | `COMPLETED` | `e2e/patient-journey/service-selection.spec.ts` |
| **AU-Schein** | P-10009 (Hartmann), P-30003 (Petrov) | T1/T3 | `COMPLETED` | `e2e/patient-journey/service-selection.spec.ts` |
| **Überweisung** | P-30005 (García) | T3 | `COMPLETED` | `e2e/patient-journey/service-selection.spec.ts` |
| **BG-Unfall (Arbeitsunfall)** | P-10008 (Berger) | T1 | `COMPLETED` | *(geplant: e2e/bg-unfall.spec.ts)* |
| **Hausbesuch-Anforderung** | P-10005 (Hoffmann) | T1 | `COMPLETED` | *(geplant)* |
| **Telemedizin / Video-Konsultation** | P-30012 (Werner) | T3 | `COMPLETED` | `e2e/telemedicine.spec.ts` |
| **NFC Check-In** | P-30013 (Hoffmann, Lukas) | T3 | `ACTIVE` | `e2e/nfc-flow.spec.ts` |
| **Selbstzahler / IGeL** | P-30014 (Arslan) | T3 | `COMPLETED` | `e2e/kiosk-payment.spec.ts` |
| **Herzschrittmacher-Kontrolle** | P-20007 (Krämer) | T2 | `COMPLETED` | *(geplant)* |
| **Multilingual – Arabisch** | P-30002 (Al-Rashid) | T3 | `COMPLETED` | `e2e/i18n.spec.ts` |
| **Multilingual – Russisch** | P-30003 (Petrov) | T3 | `COMPLETED` | `e2e/i18n.spec.ts` |
| **Multilingual – Spanisch** | P-30005 (García) | T3 | `COMPLETED` | `e2e/i18n.spec.ts` |
| **Multilingual – Türkisch** | P-30009 (Yilmaz), P-30014 (Arslan) | T3 | `COMPLETED` | `e2e/i18n.spec.ts` |
| **Multilingual – Polnisch** | P-30010 (Nowak) | T3 | `COMPLETED` | `e2e/i18n.spec.ts` |
| **PWA Patienten-Portal Login** | P-30001 (Jung), P-30002 (Al-Rashid), P-30003 (Petrov), P-30012 (Werner), P-30014 (Arslan) | T3 | aktive Accounts | `e2e/returning-patient.spec.ts` |
| **MFA Queue-Management** | P-10006, P-20003, P-30007, P-30013 (alle ACTIVE) | T1/T2/T3 | `ACTIVE` | `e2e/mfa-dashboard/queue-management.spec.ts` |
| **MFA Patient-Checkin** | P-30013 (NFC), alle manuell | T3 | `ACTIVE` | `e2e/mfa-dashboard/patient-checkin.spec.ts` |
| **Arzt: Triage-Bestätigung** | P-20001, P-20006, P-30011 | T2/T3 | Alarme aktiv | `e2e/doctor-dashboard/triage-acknowledgment.spec.ts` |
| **Arzt: Therapieplan erstellen** | P-10001, P-20001, P-30001, P-30012 | T1/T2/T3 | `ACTIVE` | `e2e/doctor-dashboard/therapy-plans.spec.ts` |
| **Arzt: Chat / AI-Assistent** | Alle Tenants | T1/T2/T3 | — | `e2e/doctor-dashboard/chat.spec.ts` |
| **Admin: ROI-Dashboard** | Alle Tenants | T1/T2/T3 | ROI-Snapshots | `e2e/dashboard.spec.ts` |
| **Login & Authentifizierung** | Alle Staff-Accounts | T1/T2/T3 | — | `e2e/auth-flow.spec.ts` |
| **Session Management** | Alle Staff-Accounts | T1/T2/T3 | — | `e2e/doctor-dashboard/session-management.spec.ts` |

---

## Patientenliste (30 Patienten)

### Tenant 1 — Hausarztpraxis (9 Patienten)

| Nr | Name | Geb. | Service | Flow | Triage |
|----|------|------|---------|------|--------|
| P-10001 | Schmidt, Max | 1965 | TERMIN | Wiederkehrend – LWS/Ischialgie | ✅ Normal |
| P-10002 | Bauer, Anna | 1978 | REZEPT | Rezept-Verlängerung (Schilddrüse) | ✅ Normal |
| P-10003 | Weber, Thomas | 1945 | TERMIN | Wiederkehrend – Herzinsuffizienz | ⚠️ WARNING |
| P-10004 | Müller, Maria | 1989 | TERMIN | Kontroll-Termin Diabetes | ✅ Normal |
| P-10005 | Hoffmann, Franz | 1952 | HAUSBESUCH | Hausbesuch Rollstuhl | ✅ Normal |
| P-10006 | Klein, Petra | 1983 | TERMIN | Erstvorstellung (ACTIVE) | — |
| P-10007 | Fischer, Hans | 1938 | TERMIN | Multimorbid Komplex | ✅ Normal |
| **P-10008** | **Berger, Klaus** | **1980** | **BG** | **BG-Unfall Arbeitsunfall ← NEU** | ✅ Normal |
| **P-10009** | **Hartmann, Emma** | **1995** | **AU** | **AU-Schein Erkältung ← NEU** | ✅ Normal |

### Tenant 2 — Kardiologie (7 Patienten)

| Nr | Name | Geb. | Service | Flow | Triage |
|----|------|------|---------|------|--------|
| P-20001 | Richter, Walter | 1951 | TERMIN | KHK Angina – Notfall | 🔴 KRITISCH |
| P-20002 | Wolf, Ingrid | 1963 | TERMIN | Neupatient Palpitationen | ✅ Normal |
| P-20003 | Schröder, Dietmar | 1948 | TERMIN | KHK Kontrolle (ACTIVE) | — |
| P-20004 | Neumann, Renate | 1955 | TERMIN | Vorhofflimmern Kontrolle | ✅ Normal |
| P-20005 | Braun, Gerhard | 1957 | TERMIN | Post-Bypass Kontrolle | ✅ Normal |
| **P-20006** | **Zimmermann, Heinz** | **1956** | **NOTFALL** | **STEMI-Notfall Walk-in ← NEU** | 🔴 KRITISCH |
| **P-20007** | **Krämer, Hildegard** | **1949** | **TERMIN** | **Herzschrittmacher-Kontrolle ← NEU** | ✅ Normal |

### Tenant 3 — MVZ DiggAI Digital Health Center (14 Patienten)

| Nr | Name | Geb. | Sprache | Service | Flow | Triage |
|----|------|------|---------|---------|------|--------|
| P-30001 | Jung, Stefan | 1990 | 🇩🇪 DE | TERMIN | Burnout/Schilddrüse + PWA | ✅ Normal |
| P-30002 | Al-Rashid, Fatima | 1986 | 🇸🇦 AR | TERMIN | Neupatient Multilingual | ✅ Normal |
| P-30003 | Petrov, Ivan | 1975 | 🇷🇺 RU | AU | AU Multilingual | ✅ Normal |
| P-30004 | Nguyen, Thi Lan | 1993 | 🇬🇧 EN | TERMIN | Neupatient Migräne | ✅ Normal |
| P-30005 | García, Carlos | 1968 | 🇪🇸 ES | UEBERWEISUNG | Überweisung Orthopädie | ✅ Normal |
| P-30006 | Kovács, Elena | 1981 | 🇬🇧 EN | TERMIN | Diabetes CGM Review | ✅ Normal |
| P-30007 | Okonkwo, James | 1979 | 🇬🇧 EN | TERMIN | Neupatient ACTIVE | — |
| P-30008 | Tanaka, Yuki | 1995 | 🇬🇧 EN | TERMIN | Schwangerschafts-Vorsorge | ✅ Normal |
| **P-30009** | **Yilmaz, Ahmet** | **1985** | **🇹🇷 TR** | **TERMIN** | **Neupatient Türkisch ← NEU** | ✅ Normal |
| **P-30010** | **Nowak, Katarzyna** | **1971** | **🇵🇱 PL** | **REZEPT** | **Rezept Polnisch ← NEU** | ✅ Normal |
| **P-30011** | **Bauer, Felix** | **2000** | **🇩🇪 DE** | **TERMIN** | **Suizidalität KRITISCH ← NEU** | 🔴 KRITISCH |
| **P-30012** | **Werner, Sabine** | **1978** | **🇩🇪 DE** | **TELEMEDIZIN** | **Telemedizin-Only ← NEU** | ✅ Normal |
| **P-30013** | **Hoffmann, Lukas** | **1988** | **🇩🇪 DE** | **TERMIN** | **NFC Check-In ← NEU** | — |
| **P-30014** | **Arslan, Zeynep** | **1994** | **🇹🇷 TR** | **IGEL** | **Selbstzahler IGeL ← NEU** | ✅ Normal |

---

## Iterativer Test-Zyklus

```
┌─────────────────────────────────────────────────────┐
│  ITERATIVER QUALITÄTS-ZYKLUS (Ziel: 7× Score)      │
└─────────────────────────────────────────────────────┘

Iteration 0 (Baseline setzen):
  npm run scorecard:baseline
  → Speichert aktuellen Score als Referenz

Iteration N (Regelmäßig):
  1. TEST:    npm run scorecard:fast      # Schnell-Check (~30s)
  2. CHECK:   Fehler aus Scorecard lesen
  3. FIX:     TypeScript / Tests / Security fixen
  4. TEST:    npm run scorecard           # Vollständiger Check
  5. COMPARE: npm run scorecard:compare  # Vergleich mit Baseline
  6. COMMIT:  git commit + push
  7. DEPLOY:  Netlify/Railway automatisch
  8. REPEAT

Ziel: Scorecard-Score von Baseline × 7
```

---

## Scorecard-Kategorien (1000 Punkte gesamt)

| Kategorie | Max Punkte | Messung |
|-----------|-----------|---------|
| TypeScript Quality | 200 | `tsc --noEmit` → -10 pts/Fehler |
| Unit Tests | 250 | Vitest pass-rate × 150 + Coverage |
| E2E Flow Coverage | 250 | Spec-Files vorhanden × Domains |
| Security & DSGVO | 200 | npm audit → -40 critical / -20 high |
| i18n & Code Quality | 100 | Avg. Translation Coverage + ESLint |
| **Total** | **1000** | |

### Schnellbefehle

```bash
# Scorecard starten
npm run scorecard           # Vollständig (~3-5 Min)
npm run scorecard:fast      # Schnell ohne Tests (~30 Sek)
npm run scorecard:baseline  # Aktuellen Stand als Baseline speichern
npm run scorecard:compare   # Vergleich zum letzten Baseline

# Demo-Daten neu laden (30 Patienten)
npm run db:seed:demo:complete

# Einzelne Flows testen
npx playwright test e2e/patient-journey/
npx playwright test e2e/doctor-dashboard/
npx playwright test e2e/mfa-dashboard/
```

---

## Bekannte Lücken (noch nicht abgedeckte Flows)

| Flow | Fehlender Test | Prio |
|------|---------------|------|
| BG-Unfall komplett | `e2e/bg-unfall.spec.ts` fehlt | Mittel |
| Herzschrittmacher-Gerät | `e2e/device-check.spec.ts` fehlt | Niedrig |
| Hausbesuch-Koordination | `e2e/hausbesuch.spec.ts` fehlt | Mittel |
| ePA-Export | `e2e/private-epa-export.spec.ts` vorhanden | ✅ |
| TI-Connector | TI deaktiviert in Demo | Niedrig |
