# BugTracker — DiggAI.de Volltest

> **Projekt:** DiggAI Anamnese Platform  
> **URL:** https://diggai-drklaproth.netlify.app  
> **Erstellt:** 2026-04-15  
> **Methodik:** Cascade Testing Protocol (Ziel → Test → Bug-Liste → Fix → Re-Test → Nächstes Ziel)

---

## Status-Legende

| Symbol | Status | Beschreibung |
|--------|--------|-------------|
| 🔴 | OFFEN | Bug identifiziert, noch nicht bearbeitet |
| 🟡 | IN ARBEIT | Fix wird aktiv entwickelt |
| 🟢 | GEFIXT | Repariert, wartet auf Re-Test |
| ✅ | VERIFIZIERT | Re-Test bestanden, Bug geschlossen |
| ⚪ | WONT-FIX | Akzeptiert, kein Fix nötig / Edge-Case |

## Prioritäten

| Prio | Label | Beschreibung | SLA |
|------|-------|-------------|-----|
| **P0** | KRITISCH | App bricht, Datenverlust, Sicherheitslücke | Sofort |
| **P1** | HOCH | Kernfunktion gestört, Patient-Flow blockiert | < 24h |
| **P2** | MITTEL | UI-Fehler sichtbar, Workaround existiert | < 1 Woche |
| **P3** | NIEDRIG | Kosmetisch, Edge-Case, Nice-to-have | Backlog |

---

## Bug-Liste

### Ziel 01: Erreichbarkeit & Ladezeiten

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| B001 | P2 | Patient-Seite zeigt "Patienten-Service Hub" statt LandingPage | 🔴 | `/patient` | Die `/patient` Route zeigt jetzt einen neuen "Patienten-Service Hub" mit 10 Anliegen-Karten (Termin, Rezepte, AU, etc.) statt der erwarteten Marketing-LandingPage mit "Digitale Anamnese" Headline. Die LandingPage-Komponente wird möglicherweise nicht mehr genutzt. | Navigiere zu `diggai.de/patient` → h1 zeigt "Anliegen wählen" statt "Digitale Anamnese" | — |
| B002 | P2 | Legacy Redirect `/mfa` timeout (networkidle) | 🔴 | `/mfa` | Navigation zu `/mfa` erreicht nie den `networkidle` Status innerhalb von 15s. Der Redirect zu `/verwaltung/mfa` funktioniert, aber die Seite bleibt im Loading-Zustand (vermutlich wegen API-Calls die gegen das nicht erreichbare Backend laufen). | `page.goto('/mfa', { waitUntil: 'networkidle', timeout: 15000 })` → Timeout | — |
| B003 | P3 | Error Boundary auf `/nfc` | 🔴 | `/nfc` | Die NFC Landing-Seite zeigt einen Error Boundary. Die Seite lädt trotzdem (Test bestanden), aber ein Fehler-Indikator ist sichtbar. | Navigiere zu `diggai.de/nfc` → Error/Fehler Text sichtbar | — |
| B004 | P3 | Error Boundary auf `/settings/security` | 🔴 | `/settings/security` | Die Security Settings-Seite zeigt einen Error Boundary. Die Seite lädt trotzdem, aber ein Fehler-Indikator ist sichtbar. | Navigiere zu `diggai.de/settings/security` → Error/Fehler Text sichtbar | — |
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

### Ziel 02: Navigation & Routing

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

### Ziel 03: Patient Flow

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

### Ziel 04: Authentifizierung

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| B005 | P2 | Fehlende Validierungs-Nachrichten bei leerem Submit | 🟢 | `/verwaltung/login` | Ein Klick auf "Anmelden" mit leeren Eingabefeldern gibt kein visuelles Feedback. Der Button reagiert, aber es werden keine Fehlertexte unter den Feldern eingeblendet. | 1. Navigiere zu `/verwaltung/login` 2. Felder leeren 3. "Anmelden" klicken | `required` Attribut entfernt, Fallback zu Custom UI Error in `StaffLogin.tsx` |
| B006 | P2 | Demo-User Cards fehlen in Produktion | 🟢 | `/verwaltung/login` | Im Gegensatz zur Dokumentation (AGENTS.md) fehlen auf der Produktivseite die anklickbaren Demo-User-Karten zum Auto-Ausfüllen von Credentials. | 1. Navigiere zu `/verwaltung/login` auf Livestatus 2. Suche nach Demo-User-Karten | 1-Klick Demo Karten inkl. Credentials zu `StaffLogin.tsx` hinzugefügt |

### Ziel 05: Dashboards

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

### Ziel 06: PWA

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| B007 | P3 | Mehrfache Netzwerkfehler-Toasts | 🔴 | `/pwa/login` | Beim Absenden des Logins ohne Backend ploppen sofort 3 identische Fehler-Toasts ("Verbindungsfehler") übereinander auf. | 1. Navigiere zu `/pwa/login` 2. Fülle Felder aus 3. "Anmelden" klicken | — |

### Ziel 07: Sicherheit & DSGVO

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

### Ziel 08: i18n

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| B008 | P2 | Hero-Text ist nicht übersetzt | 🔴 | `/` | Wenn man die Sprache via Header Switcher ändert (z.B. auf `en` oder `ar`), bleiben die Hauptüberschriften ("Wie können wir Ihnen helfen?") auf Deutsch in der Ansicht. | 1. Gehe zu `/` 2. Wechsle zu "English" 3. Prüfe Hero Text | — |

### Ziel 09: Performance

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

### Ziel 10: Responsive Design

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

### Ziel 11: Accessibility

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

### Ziel 12: E2E-Integrität

| ID | Prio | Titel | Status | Route | Beschreibung | Reproduktion | Fix |
|----|------|-------|--------|-------|-------------|-------------|-----|
| — | — | *Noch keine Tests durchgeführt* | — | — | — | — | — |

---

## Statistik

| Kategorie | Offen | In Arbeit | Gefixt | Verifiziert | Won't Fix | Gesamt |
|-----------|-------|-----------|--------|-------------|-----------|--------|
| P0 Kritisch | 0 | 0 | 0 | 0 | 0 | 0 |
| P1 Hoch | 0 | 0 | 0 | 0 | 0 | 0 |
| P2 Mittel | 3 | 0 | 2 | 0 | 0 | 5 |
| P3 Niedrig | 3 | 0 | 0 | 0 | 0 | 3 |
| **Gesamt** | **6** | **0** | **2** | **0** | **0** | **8** |

---

## Änderungsprotokoll

| Datum | Änderung |
|-------|---------|
| 2026-04-15 | Initiale Erstellung, Struktur für 12 Testziele |
