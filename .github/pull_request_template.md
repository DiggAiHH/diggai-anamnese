## Was wurde geändert?

<!-- Kurze Beschreibung der Änderung -->

## Checkliste (vor Merge abarbeiten)

### Code-Qualität
- [ ] `npm run check-all` läuft durch (lint + i18n + migrations)
- [ ] `npm run type-check` ohne Fehler
- [ ] Keine `any`-Types eingeführt

### Sicherheit (DSGVO)
- [ ] Keine Patientendaten (Name, Email, Geburtsdatum) werden geloggt
- [ ] Neue PII-Felder werden mit `encryption.ts` verschlüsselt gespeichert
- [ ] Keine Secrets in Code oder Logs

### i18n
- [ ] Alle neuen UI-Strings haben Keys in **allen 10 Locale-Dateien** (de, en, tr, ar, uk, es, fa, it, fr, pl)
- [ ] `node scripts/generate-i18n.ts` zeigt 0 fehlende Keys

### Datenbank
- [ ] `npx prisma migrate dev --name <name>` wurde ausgeführt (falls Schema geändert)
- [ ] `npx prisma generate` wurde ausgeführt

### Tests
- [ ] Bestehende E2E-Tests laufen durch
- [ ] Neue Logik hat Tests oder ist durch bestehende Tests abgedeckt

### Medizinische Sicherheit (nur bei TriageEngine / QuestionFlow)
- [ ] Klinische Review von Dr. Klapproth oder Dr. Al-Shdaifat eingeholt
- [ ] Änderungen in `docs/TRIAGE_RULES.md` dokumentiert

### Changelog
- [ ] PR hat Label: `feature`, `fix`, `security`, `breaking`, `docs` oder `chore`
- [ ] Conventional Commits verwendet (`feat:`, `fix:`, `docs:`, `chore:`)
- [ ] Bei Breaking Changes: `BREAKING CHANGE:` in Commit-Message

### No-Redundancy Check
- [ ] `once-guard precheck` wurde für alle neuen Tasks ausgeführt
- [ ] Neue Artefakte wurden in `shared/knowledge/knowledge-share.md` dokumentiert
