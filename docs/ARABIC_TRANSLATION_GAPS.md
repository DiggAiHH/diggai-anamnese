# Arabic Translation Gaps

Last updated: 2026-04-19
Source: `node scripts/generate-i18n.ts` + `translation-comparison.txt`

## Summary
- German keys: 2563
- Arabic keys: 2447
- Missing in Arabic vs German: 125 keys

## Missing Keys (AR)

```text
episodes.title
episodes.subtitle
episodes.empty
episodes.selectPatient
episodes.create
episodes.createTitle
episodes.editTitle
episodes.close
episodes.reopen
episodes.titleLabel
episodes.titlePlaceholder
episodes.description
episodes.descriptionPlaceholder
episodes.type
episodes.status
episodes.icdCodes
episodes.primaryDiagnosis
episodes.patientGoals
episodes.patientGoalsPlaceholder
episodes.patientWishes
episodes.patientWishesPlaceholder
episodes.communicationPref
episodes.languagePref
episodes.preferredArzt
episodes.customNotes
episodes.summaryArzt
episodes.nextAppointment
episodes.openedAt
episodes.lastActivity
episodes.closedAt
episodes.sessions
episodes.sessionsCount
episodes.notes
episodes.notesEmpty
episodes.addNote
episodes.preferences
episodes.preferencesEmpty
episodes.addPreference
episodes.linkSession
episodes.unlinkSession
episodes.timeline
episodes.type.AKUT
episodes.type.CHRONISCH
episodes.type.VORSORGE
episodes.type.NACHSORGE
episodes.type.REZEPT
episodes.type.AU
episodes.type.UEBERWEISUNG
episodes.type.BERATUNG
episodes.status.OPEN
episodes.status.ACTIVE
episodes.status.FOLLOW_UP
episodes.status.PAUSED
episodes.status.CLOSED
episodes.status.CANCELLED
episodes.note.ARZT_NOTIZ
episodes.note.MFA_NOTIZ
episodes.note.PATIENT_FEEDBACK
episodes.note.SYSTEM
episodes.note.AI_SUMMARY
episodes.pref.BEHANDLUNG
episodes.pref.KOMMUNIKATION
episodes.pref.TERMINPLANUNG
episodes.pref.MEDIKATION
episodes.pref.LEBENSSTIL
episodes.pref.SONSTIGES
episodes.comm.app
episodes.comm.telefon
episodes.comm.email
episodes.comm.persoenlich
a11y.title
a11y.subtitle
a11y.close
a11y.helpText
a11y.settingsGroup
a11y.wcagNote
a11y.simpleMode.label
a11y.simpleMode.desc
a11y.cognitiveMode.label
a11y.cognitiveMode.desc
a11y.highContrast.label
a11y.highContrast.desc
a11y.fontSize.label
a11y.fontSize.desc
a11y.fontSize.small
a11y.fontSize.normal
a11y.fontSize.large
a11y.fontSize.xlarge
a11y.reducedMotion.label
a11y.reducedMotion.desc
a11y.extendedTimeout.label
a11y.extendedTimeout.desc
progress.chapters
settings.security.title
settings.security.subtitle
settings.security.score.title
settings.security.score.good
settings.security.score.improve
settings.security.password.title
settings.security.password.lastChanged
settings.security.password.current
settings.security.password.new
settings.security.password.change
settings.security.password.reqLength
settings.security.mfa.title
settings.security.mfa.enabled
settings.security.mfa.disabled
settings.security.mfa.active.title
settings.security.mfa.active.description
settings.security.mfa.inactive.title
settings.security.mfa.inactive.description
settings.security.mfa.backupCodes
settings.security.mfa.disable
settings.security.mfa.setup
settings.security.sessions.title
settings.security.sessions.count
settings.security.sessions.current
settings.security.sessions.trusted
settings.security.sessions.terminate
settings.security.sessions.terminateAll
settings.security.devices.title
settings.security.devices.count
settings.security.devices.manage
common.active
common.inactive
```

## Notes
- This is the machine-generated baseline list.
- Next step is a live Arabic UI pass to catch hardcoded German text and RTL layout issues not visible in key-diff output.

## Live UI Findings (Arabic)

The following items were observed on live pages (`https://diggai.de` and `/patient`) while language was set to Arabic:

1. `languageSelect` falls back to German text (`Sprache waehlen`) in at least two places.
2. `landing.serviceHub` falls back to German/English mixed text (`Patienten-Service Hub`).
3. `landing.details` falls back to German (`Mehr erfahren`) on service cards.
4. Footer still shows German labels for legal/staff links in patient area:
	- `Datenschutz`
	- `Impressum`
	- `Arzt`
	- `MFA`
	- `Admin`
5. QR helper panel contains German hardcoded text:
	- `QR-Code scannen`
	- `Scannen Sie diesen Code mit Ihrem Smartphone, um den Fragebogen auf Ihrem Geraet auszufuellen.`
	- `Link kopieren`

## Backend Reachability Check (Live)

- `https://diggai.de` -> HTTP 200
- `https://api.diggai.de/api/health` -> reachable (status payload returned)
- `https://api.diggai.de/api/system/ready` -> HTTP 403 (likely intentionally protected endpoint)
- `https://api.diggai.de/api/system/live` -> HTTP 403 (likely intentionally protected endpoint)
