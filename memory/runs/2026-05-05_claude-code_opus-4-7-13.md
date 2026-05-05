2026-05-05T23:59+02:00 | Lauf claude-code-13 | i18n-Nachzug 11 Keys × 9 Sprachen + LandingPage Code-Sanity
---
- Aktion: Tote `CLASSIC_SERVICE_IDS`-Konstante + `showClassicLayout`-State + 3 ternäre Render-Pfade aus LandingPage.tsx entfernt (toter Code seit D1-Edit); 11 neue i18n-Keys (service.start_cta_short, service.dsgvo_tooltip, service.encrypted_tooltip, service.error_{title,body,retry}, ui.services.{commGroup,docsGroup}.{title,description}) in en/fr/it/es/tr/ar/fa/uk/pl ergänzt — DE+EN+FR+IT+ES native, TR+AR+FA+UK+PL übersetzt mit Native-Speaker-Review-TODO; Run-Log
- Blocker: —
- Fix: —
- Ergebnis: 1 EDIT (LandingPage.tsx Code-Sanity) + 9 EDITs (locales/{en,fr,it,es,tr,ar,fa,uk,pl}/translation.json) + Run-Log
- Out: alle 10 Sprachen vollständig + tote Code-Pfade in LandingPage entfernt; CLAUDE.md-i18n-Regel „neue Keys in alle 10 Sprachfiles" eingehalten; Klapproth-UX-Refactor (Items A1-D2) ist jetzt durchgängig in allen 10 Sprachen verfügbar
