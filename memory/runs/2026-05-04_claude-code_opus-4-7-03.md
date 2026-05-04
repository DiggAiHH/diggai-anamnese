2026-05-04T02:00+02:00 | Lauf claude-code-03 | Live-Browser-Audit diggai.de + Root-Cause i18n '[?]' Markers gefixt
---
- Aktion: Playwright-Skill installiert + Audit-Skript gegen https://diggai.de in DE/EN/AR/Datenschutz/404; 7 Screenshots in /tmp/diggai-audit/; locale-JSONs gepulled; formatMissingKey in src/i18n.ts gefixt
- Blocker: erste Locator-Regex hatte Komma-Syntaxfehler (text=/.../i mit Komma); LandingPage zeigte '[?] Anliegen wählen' weil defaultValue===key Branch im formatMissingKey aussortiert wurde, aber Codebase nutzt German-text-as-key Konvention
- Fix: formatMissingKey rewritten — 3 Branches: (1) defaultValue präsent → silent return, (2) Key sieht menschenlesbar aus → Key als German-text-Fallback, (3) echte missing dotted-key → '[?]' nur in DEV, silent in production
- Ergebnis: Commit dd3fe33 auf fix/i18n-no-question-marks; PR #21 https://github.com/DiggAiHH/diggai-anamnese/pull/21
- Out: PR #21 offen; Audit-Findings dokumentiert: andere User-Beschwerden (TTDSG, DM-Initialen, bunte Pills, HIPAA-Erwähnungen) sind in bereits offenen PRs #10/#17 — User muss PRs mergen + deploy.yml laufen lassen damit live ankommt; /services/anamnese 404 + Google Fonts ERR_FAILED als separate TBDs notiert
