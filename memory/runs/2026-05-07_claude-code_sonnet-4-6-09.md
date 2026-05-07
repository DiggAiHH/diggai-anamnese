2026-05-07T18:15+02:00 | Lauf claude-code-09 | RegulatoryFooter.tsx MDR §11.2 implementiert (13 Sprachen)

---
- Aktion: Neues `src/components/legal/RegulatoryFooter.tsx` (80 Zeilen) erstellt nach Spec aus TECH_DOC v0.2 §11.2: MDR Anh. I Nr. 23.2+23.4 Pflichtangaben, VITE_APP_VERSION (aus package.json via Vite define), Hersteller-Link (/impressum), IFU-Link (/ifu), Datenschutz-Link, CE+UDI-DI-Platzhalter-Kommentar für D4/D5. `vite.config.ts`: `define: { 'import.meta.env.VITE_APP_VERSION': pkg.version }` ergänzt. `src/App.tsx`: PatientApp-Wrapper auf `flex flex-col min-h-screen` umgestellt, `<RegulatoryFooter />` am Ende eingefügt (nur Capture-Patientenfluss, nicht Admin/Staff). `public/locales/de/translation.json`: 6 `regulatory.*`-Keys ergänzt. Node.js-Skript für alle 12 weiteren Sprachen (en/tr/ar/uk/es/fa/it/fr/pl/ro/ru/bg): 12/12 OK.
- Blocker: git push — erstes Mal Paging-File-Fehler ("Die Auslagerungsdatei ist zu klein"), zweites Mal Credential-Prompt-Fehler. Fix: `GIT_TERMINAL_PROMPT=0` + dritter Versuch erfolgreich.
- Fix: `GIT_TERMINAL_PROMPT=0` verhindert interaktiven Credential-Prompt und lässt Windows Credential Manager greifen.
- Ergebnis: Commit e6032f2 auf restructure/phase-1-workspace. 16 Dateien, 200 Insertions. RegulatoryFooter ist live in PatientApp.
- Out: RegulatoryFooter.tsx ✅ implementiert + committed + pushed (e6032f2). CE+UDI-DI-Slots offen (D4/D5). Nächster Item: E1 IT-Sicherheits-Konzept (BSI-Grundschutz) oder D2 §8 Post-Market-Surveillance.
