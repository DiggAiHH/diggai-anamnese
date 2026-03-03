# Translation Audit Report — `src/` Directory

**Generated:** Comprehensive audit of all translation key usages, hardcoded German text, and i18n issues.

---

## Table of Contents

1. [Translation Key Inventory (by namespace)](#1-translation-key-inventory)
2. [Hardcoded German Text (NOT wrapped in `t()`)](#2-hardcoded-german-text)
3. ["Min" Abbreviation Locations](#3-min-abbreviation-locations)
4. [Pflichtfeld / Required Field References](#4-pflichtfeld--required-field-references)
5. [Translation Issues & Recommendations](#5-translation-issues--recommendations)

---

## 1. Translation Key Inventory

### Namespaced Keys (well-structured)

#### `mfa.*` — MFADashboard.tsx
| Key | Fallback |
|-----|----------|
| `mfa.portal` | — |
| `mfa.generateQr` | — |
| `mfa.systemOnline` | — |
| `mfa.logout` | — |
| `mfa.currentRequests` | — |
| `mfa.qrTitle` | — |
| `mfa.qrSubtitle` | — |
| `mfa.selectConcern` | — |
| `mfa.generating` | — |
| `mfa.createQr` | — |
| `mfa.scanWithPhone` | — |
| `mfa.validFor24h` | — |
| `mfa.newCode` | — |
| `mfa.patientChat` | — |
| `mfa.unassigned` | — |
| `mfa.needAssignment` | — |
| `mfa.redFlags` | — |
| `mfa.criticalSymptoms` | — |
| `mfa.inFlow` | — |
| `mfa.patientsAnswering` | — |
| `mfa.loadingData` | — |
| `mfa.completed` | — |
| `mfa.active` | — |
| `mfa.noFindings` | — |
| `mfa.selectDoctor` | — |
| `mfa.notAssigned` | — |
| `mfa.noSessions` | — |
| `mfa.subtitle` | — |
| `mfa.username` | — |
| `mfa.password` | — |
| `mfa.authenticating` | — |
| `mfa.enterPortal` | — |
| `mfa.loginError` | — |

#### `arzt.*` — ArztDashboard.tsx
| Key | Fallback |
|-----|----------|
| `arzt.completed` | — |
| `arzt.sessionCompleteMsg` | — |
| `arzt.newMessage` | — |
| `arzt.dashboard` | — |
| `arzt.overview` | — |
| `arzt.logout` | — |
| `arzt.emergencyAlert` | — |
| `arzt.login.title` | — |
| `arzt.login.subtitle` | — |
| `arzt.login.username` | — |
| `arzt.login.password` | — |
| `arzt.login.submit` | — |
| `arzt.login.error` | — |
| `arzt.loading` | — |
| `arzt.stats.active` | — |
| `arzt.stats.completed` | — |
| `arzt.stats.redflags` | — |
| `arzt.editedBy` | — |
| `arzt.answers` | — |
| `arzt.colleague` | — |
| `arzt.doctor` | — |
| `arzt.loadingDetail` | — |
| `arzt.backToOverview` | — |
| `arzt.patientData` | — |
| `arzt.patient` | — |
| `arzt.sessionId` | — |
| `arzt.selectedService` | — |
| `arzt.status` | — |
| `arzt.createdAt` | — |
| `arzt.pdfReport` | — |
| `arzt.csvExport` | — |
| `arzt.confirmComplete` | — |
| `arzt.completeCase` | — |
| `arzt.aiAnalysis` | — |
| `arzt.analyzing` | — |
| `arzt.icdCodes` | — |
| `arzt.triageAlarms` | — |
| `arzt.question` | — |
| `arzt.triageAckedBy` | — |
| `arzt.triageAck` | — |
| `arzt.answersBySection` | — |
| `arzt.viewDocument` | — |
| `arzt.liveChat` | — |
| `arzt.patientConnected` | — |
| `arzt.noMessages` | — |
| `arzt.sendHint` | — |
| `arzt.incoming` | — |
| `arzt.sent` | — |
| `arzt.patientTyping` | — |
| `arzt.messagePlaceholder` | — |
| `arzt.sendMessage` | — |
| `arzt.pushInfo` | — |

#### `docs.*` — DokumentationPage.tsx / HandbuchPage.tsx
| Key | Fallback |
|-----|----------|
| `docs.back` | — |
| `docs.badge` | — |
| `docs.title` | — |
| `docs.subtitle` | — |
| `docs.features.title` | — |
| `docs.arch.title` | — |
| `docs.arch.security` | — |
| `docs.arch.infra` | — |
| `docs.faq.title` | — |
| `docs.cta.handbuch` | — |
| `docs.cta.demo` | — |
| `docs.footer` | — |

#### `handbuch.*` — HandbuchPage.tsx
| Key | Fallback |
|-----|----------|
| `handbuch.to_docs` | — |
| `handbuch.badge` | — |
| `handbuch.title` | — |
| `handbuch.subtitle` | — |
| `handbuch.steps` | — |
| `handbuch.cta.docs` | — |

#### `admin.*` — AdminDashboard.tsx
| Key | Fallback |
|-----|----------|
| `admin.title` | — |
| `admin.subtitle` | — |
| `admin.back` | — |
| `admin.footerVersion` | — |
| `admin.footerCompliance` | — |

#### `unfallbg.*` — UnfallBGFlow.tsx
| Key | Fallback |
|-----|----------|
| `unfallbg.title` | — |
| `unfallbg.subtitle` | — |
| `unfallbg.bgName` | — |
| `unfallbg.bgNamePlaceholder` | — |
| `unfallbg.bgNameError` | — |
| `unfallbg.datetime` | — |
| `unfallbg.datetimeError` | — |
| `unfallbg.location` | — |
| `unfallbg.locationPlaceholder` | — |
| `unfallbg.locationError` | — |
| `unfallbg.description` | — |
| `unfallbg.descriptionPlaceholder` | — |
| `unfallbg.descriptionError` | — |
| `unfallbg.employerNotified` | — |
| `unfallbg.yes` | — |
| `unfallbg.no` | — |
| `unfallbg.firstAid` | — |
| `unfallbg.firstAidPlaceholder` | — |
| `unfallbg.witness` | — |
| `unfallbg.witnessPlaceholder` | — |
| `unfallbg.injuries` | — |
| `unfallbg.injuriesPlaceholder` | — |
| `unfallbg.submit` | — |
| `unfallbg.back` | — |
| `unfallbg.success` | — |

#### `navigation.*` — Navigation.tsx
| Key | Fallback |
|-----|----------|
| `navigation.back` | — |
| `navigation.sending` | — |
| `navigation.submit` | — |
| `navigation.next` | — |

#### `shortcut.*` — KeyboardShortcutsHelp.tsx
| Key | Fallback |
|-----|----------|
| `shortcut.next` | — |
| `shortcut.back` | — |
| `shortcut.selectOption` | — |
| `shortcut.help` | — |
| `shortcut.focusNext` | — |
| `shortcut.title` | — |
| `shortcut.hint` | — |

#### `queue.*` — WartezimmerPanel.tsx
| Key | Fallback |
|-----|----------|
| `queue.title` | — |
| `queue.waiting` | — |
| `queue.called` | — |
| `queue.inTreatment` | — |
| `queue.empty` | — |
| `queue.waitingSince` | `{{minutes}}` interpolation |
| `queue.status_${status}` | dynamic key |
| `queue.callPatient` | — |
| `queue.startTreatment` | — |
| `queue.markDone` | — |
| `queue.remove` | — |
| `queue.emergencyHint` | — |

#### `validation.*` — utils/questionLogic.ts
| Key | Fallback |
|-----|----------|
| `validation.required` | — |
| `validation.minValue` | `{{min}}` interpolation |
| `validation.maxValue` | `{{max}}` interpolation |
| `validation.invalidFormat` | — |
| `validation.ageOver` | — |

#### `errorBoundary.*` — ErrorBoundary.tsx
| Key | Fallback |
|-----|----------|
| `errorBoundary.title` | — |
| `errorBoundary.description` | — |
| `errorBoundary.reload` | — |

#### `camera.*` — CameraScanner.tsx
| Key | Fallback |
|-----|----------|
| `camera.error` | — |
| `camera.scanTitle` | — |
| `camera.starting` | — |
| `camera.positionCard` | — |

#### `autosave.*` — AutoSaveIndicator.tsx
| Key | Fallback |
|-----|----------|
| `autosave.offline` | 'Offline' |
| `autosave.saving` | 'Speichert...' |
| `autosave.saved` | 'Gespeichert' |
| `autosave.lastSaved` | 'Zuletzt gespeichert: {{time}}' |

#### `fontsize.*` — FontSizeControl.tsx
| Key | Fallback |
|-----|----------|
| `fontsize.group_label` | 'Schriftgröße anpassen' |
| `fontsize.decrease` | 'Schrift verkleinern' |
| `fontsize.reset` | 'Schriftgröße zurücksetzen' |
| `fontsize.reset_short` | 'Zurücksetzen' |
| `fontsize.increase` | 'Schrift vergrößern' |

#### `kiosk.*` — KioskToggle.tsx
| Key | Fallback |
|-----|----------|
| `kiosk.exit` | 'Vollbild beenden' |
| `kiosk.enter` | 'Vollbild (Kiosk-Modus)' |
| `kiosk.exit_aria` | 'Exit fullscreen' |
| `kiosk.enter_aria` | 'Enter fullscreen' |

#### `chat.*` — ChatBubble.tsx
| Key | Fallback |
|-----|----------|
| `chat.faq_fallback` | 'Das konnte ich leider nicht zuordnen...' |
| `chat.assistant` | 'Assistent' |
| `chat.praxis_chat` | 'Praxis-Chat' |
| `chat.tab_faq` | 'FAQ & Hilfe' |
| `chat.tab_team` | 'Team-Chat' |
| `chat.teamTyping` | 'Praxis-Team tippt...' |

#### `dsgvo.*` — DSGVOConsent.tsx
| Key | Fallback |
|-----|----------|
| `dsgvoSubtitle` | 'Gemäß DSGVO Art. 6, Art. 9' |
| `dsgvoIntro` | 'Sehr geehrte Patientin, sehr geehrter Patient,' |
| `dsgvoIntroBody` | (long consent intro text) |
| `dsgvoConsent1Title` | 'Einwilligung in die Datenverarbeitung' |
| `dsgvoConsent1Desc` | (consent 1 description with {{praxisName}}) |
| `dsgvoConsent2Title` | 'Verarbeitung besonderer Kategorien (Gesundheitsdaten)' |
| `dsgvoConsent2Desc` | (consent 2 description) |
| `dsgvoConsent3Title` | 'Widerrufsrecht & Datenlöschung' |
| `dsgvoConsent3Desc` | (consent 3 description) |
| `dsgvoFullPolicy` | 'Vollständige Datenschutzerklärung' |
| `dsgvoAccept` | 'Einwilligen & Fortfahren' |
| `dsgvoPleaseConfirm` | 'Bitte alle Punkte bestätigen' |

#### `redFlag*` — RedFlagOverlay.tsx
| Key | Fallback |
|-----|----------|
| `redFlagReadWarning` | 'Bitte lesen Sie die Warnung sorgfältig.' |
| `redFlagWait` | 'Bitte warten...' |
| `redFlagAck` | 'Ich habe die Warnung gelesen' |
| `redFlagConfirm` | 'Sind Sie sicher, dass Sie ohne sofortige medizinische Hilfe fortfahren möchten?' |
| `redFlagCall112` | 'Doch 112 anrufen' |
| `redFlagContinue` | 'Trotzdem fortfahren' |
| `redFlagDisclaimer` | 'Diese Warnung wird automatisch an das Praxispersonal übermittelt...' |

#### `recovery*` — SessionRecoveryDialog.tsx
| Key | Fallback |
|-----|----------|
| `recoveryTitle` | 'Sitzung fortsetzen?' |
| `recoveryMessage` | 'Sie haben eine unvollständige Sitzung mit {{count}} beantworteten Fragen...' |

#### `igel.*` — IGelServices.tsx
| Key | Fallback |
|-----|----------|
| `igel.unknownError` | 'Unbekannter Fehler' |
| `igel.disclaimer` | 'Hinweis: Dies sind Privatleistungen nach GOÄ...' |
| `igelSubtitle` | 'Optionale Leistungen...' |
| `checkoutRedirect` | 'Sie werden nun zum sicheren Zahlungsanbieter weitergeleitet.' |

#### `schwangerschaft*` — SchwangerschaftCheck.tsx
| Key | Fallback |
|-----|----------|
| `schwangerschaftRelevant` | 'Diese Information ist medizinisch relevant' |
| `schwangerschaftHinweis` | 'Bestimmte Medikamente und Untersuchungen...' |
| `schwangerschaftJa` | 'Bitte informieren Sie Ihren Arzt VOR einer Untersuchung...' |
| `schwangerschaftWeissNicht` | 'Es wird empfohlen, vor bestimmten Untersuchungen...' |

#### `summary*` — AnswerSummary.tsx
| Key | Fallback |
|-----|----------|
| `summary.createdAt` | 'Erstellt am' |
| `summaryPrintFooter` | 'Diese Zusammenfassung wurde digital durch den Patienten erstellt.' |

#### Misc namespaced keys
| Key | Location | Fallback |
|-----|----------|----------|
| `sessionTimeoutTitle` | SessionTimeoutWarning.tsx | — |
| `sessionTimeoutMessage` | SessionTimeoutWarning.tsx | `{{time}}` interpolation |
| `qrTitle` | QRCodeDisplay.tsx | — |
| `qrDescription` | QRCodeDisplay.tsx | — |
| `pdfSubtitle` | PDFExport.tsx | — |
| `pdfDatum` | PDFExport.tsx | — |
| `pdfUhrzeit` | PDFExport.tsx | — |
| `pdfDokumentId` | PDFExport.tsx | — |
| `pdfPatientConfirm` | PDFExport.tsx | — |
| `pdfConfirmText` | PDFExport.tsx | — |
| `pdfSignHere` | PDFExport.tsx | — |
| `pdfSignatureCanvas` | PDFExport.tsx | — |
| `pdfOrtDatum` | PDFExport.tsx | — |
| `pdfUnterschriftPatient` | PDFExport.tsx | — |
| `pdfSignCaptured` | PDFExport.tsx | — |
| `pdfFooter` | PDFExport.tsx | — |
| `medInputHint` | Questionnaire.tsx | — |
| `medFreetextLabel` | Questionnaire.tsx | — |
| `cameraExplanation` | Questionnaire.tsx | — |
| `dataProtectionDetail` | Questionnaire.tsx | — |
| `medListEmpty` | MedicationManager.tsx | — |
| `medListCount` | MedicationManager.tsx | — |
| `medPolyWarning` | MedicationManager.tsx | — |
| `opListEmpty` | SurgeryManager.tsx | — |
| `opListCount` | SurgeryManager.tsx | — |
| `landingDescription` | LandingPage.tsx | — |
| `landing.serviceHub` | LandingPage.tsx | — |
| `landing.docs` | LandingPage.tsx | — |
| `landing.handbuch` | LandingPage.tsx | — |
| `aesFooter` | LandingPage.tsx | — |
| `languageSelect` | LanguageSelector.tsx | 'Sprache wählen' |
| `security` | HistorySidebar.tsx | 'Sicherheit' |
| `encryptionActive` | HistorySidebar.tsx | 'Verschlüsselte Übertragung aktiv' |
| `botGreeting` | ChatBubble.tsx | 'Hallo! Ich bin Ihr digitaler Assistent...' |
| `botHelpPrompt` | ChatBubble.tsx | 'Brauchen Sie Hilfe bei einer Frage?...' |
| `chatBubbleOpen` | ChatBubble.tsx | 'Chat öffnen' |
| `chatBubbleClose` | ChatBubble.tsx | 'Chat schließen' |
| `chatExplanation` | ChatBubble.tsx | 'Hier können Sie direkt mit unserem Praxis-Team...' |
| `botTyping` | ChatBubble.tsx | 'Assistent tippt...' |

---

### Bare German Word Keys (problematic — used as both key AND display text)

These keys use raw German text as the i18n key, which makes them fragile and hard to maintain:

| Key (= German text) | Location(s) |
|---------------------|-------------|
| `'Bitte beantworten Sie die Frage'` | Questionnaire.tsx |
| `'Fehler beim Speichern der Medikamente.'` | Questionnaire.tsx |
| `'Fehler beim Speichern der OP-Historie.'` | Questionnaire.tsx |
| `'Verlauf anzeigen'` | Questionnaire.tsx |
| `'Frage'` | Questionnaire.tsx, ProgressBar.tsx |
| `'Dauer'` | Questionnaire.tsx |
| `'Sicher'` | Questionnaire.tsx |
| `'Abbrechen & Home'` | Questionnaire.tsx |
| `'Kamera'` | Questionnaire.tsx |
| `'Kamera scannen'` | Questionnaire.tsx |
| `'Zurück'` | Questionnaire.tsx |
| `'Absenden'` | Questionnaire.tsx |
| `'Weiter'` | Questionnaire.tsx |
| `'Fortschritt'` | ProgressBar.tsx, HistorySidebar.tsx |
| `'von'` | ProgressBar.tsx |
| `'Anliegen wählen'` | LandingPage.tsx |
| `'Initialisiere sichere Verbindung...'` | LandingPage.tsx |
| `'Jetzt starten'` | LandingPage.tsx |
| `'System Online'` | LandingPage.tsx, DokumentationPage.tsx, HandbuchPage.tsx |
| `'DSGVO Konform'` | DokumentationPage.tsx, HandbuchPage.tsx |
| `'Vielen Dank!'` | SubmittedPage.tsx |
| `'Ihre Angaben wurden erfolgreich übermittelt.'` | SubmittedPage.tsx |
| `'Patient:'` | SubmittedPage.tsx, PDFExport.tsx |
| `'Anliegen:'` | SubmittedPage.tsx |
| `'Referenz:'` | SubmittedPage.tsx |
| `'Was passiert als Nächstes?'` | SubmittedPage.tsx |
| `'Ihre Angaben werden vom Praxisteam geprüft'` | SubmittedPage.tsx |
| `'Bei Rückfragen werden wir Sie kontaktieren'` | SubmittedPage.tsx |
| `'Sie können diese Seite nun schließen'` | SubmittedPage.tsx |
| `'Bericht herunterladen'` | SubmittedPage.tsx |
| `'Zurück zum Start'` | SubmittedPage.tsx |
| `'Alle Daten sind Ende-zu-Ende verschlüsselt gespeichert'` | SubmittedPage.tsx |
| `'Fortfahren'` | SessionTimeoutWarning.tsx, SessionRecoveryDialog.tsx |
| `'Sitzung beenden'` | SessionTimeoutWarning.tsx |
| `'Modus wechseln'` | ModeToggle.tsx |
| `'Demo-Modus'` | ModeToggle.tsx |
| `'Zum hellen Modus wechseln'` | ThemeToggle.tsx |
| `'Zum dunklen Modus wechseln'` | ThemeToggle.tsx |
| `'Kopiert!'` | QRCodeDisplay.tsx |
| `'Link kopieren'` | QRCodeDisplay.tsx |
| `'Hinweis schließen'` | KeyboardShortcutsHelp.tsx, RedFlagOverlay.tsx |
| `'Hinweis'` | MedicationManager.tsx, RedFlagOverlay.tsx |
| `'MEDIZINISCHER NOTFALL'` | RedFlagOverlay.tsx |
| `'Notruf 112 anrufen'` | RedFlagOverlay.tsx |
| `'Datenschutz-Einwilligung'` | DSGVOConsent.tsx |
| `'Ablehnen'` | DSGVOConsent.tsx |
| `'Fortsetzen'` | SessionRecoveryDialog.tsx |
| `'Verwerfen'` | SessionRecoveryDialog.tsx |
| `'Verlauf'` | HistorySidebar.tsx |
| `'Toggle sidebar'` | HistorySidebar.tsx |
| `'Checkout bereit'` | IGelServices.tsx |
| `'Zahlung starten'` | IGelServices.tsx |
| `'Zusatzleistungen (IGeL)'` | IGelServices.tsx |
| `'Sichere Verbindung...'` | IGelServices.tsx |
| `'Sicher bezahlen'` | IGelServices.tsx |
| `'Ja, möglicherweise'` | SchwangerschaftCheck.tsx |
| `'Nein'` | SchwangerschaftCheck.tsx |
| `'Weiß nicht'` | SchwangerschaftCheck.tsx |
| `'Schwangerschafts-Abfrage'` | SchwangerschaftCheck.tsx |
| `'Wichtiger Hinweis'` | SchwangerschaftCheck.tsx |
| `'Personalien & Kontakt'` | AnswerSummary.tsx |
| `'Aktuelles Anliegen'` | AnswerSummary.tsx |
| `'Medizinische Vorgeschichte'` | AnswerSummary.tsx |
| `'Risikofaktoren & Chronik'` | AnswerSummary.tsx |
| `'Allergien & Implantate'` | AnswerSummary.tsx |
| `'Medizinische Anamnese - Zusammenfassung'` | AnswerSummary.tsx |
| `'Ihre Angaben im Überblick'` | AnswerSummary.tsx |
| `'Drucken / PDF'` | AnswerSummary.tsx |
| `'Bearbeiten'` | AnswerSummary.tsx |
| `'Patient Unterschrift'` | AnswerSummary.tsx |
| `'Arzt Unterschrift / Datum'` | AnswerSummary.tsx |
| `'Nachricht...'` | ChatBubble.tsx |
| `'Nachricht senden'` | ChatBubble.tsx |
| `'Online'` | ChatBubble.tsx |
| `'Medikamenten-Liste'` | MedicationManager.tsx |
| `'Neues Medikament'` | MedicationManager.tsx |
| `'Medikament entfernen'` | MedicationManager.tsx |
| `'Medikament / Wirkstoff'` | MedicationManager.tsx |
| `'Dosierung'` | MedicationManager.tsx |
| `'Einnahmeschema'` | MedicationManager.tsx |
| `'Seit wann?'` | MedicationManager.tsx |
| `'Manuell hinzufügen'` | MedicationManager.tsx |
| `'Scannen'` | MedicationManager.tsx |
| `'Operations-Historie'` | SurgeryManager.tsx |
| `'Unbenannte OP'` | SurgeryManager.tsx |
| `'Operation entfernen'` | SurgeryManager.tsx |
| `'Art der Operation'` | SurgeryManager.tsx |
| `'Wann?'` | SurgeryManager.tsx |
| `'Komplikationen?'` | SurgeryManager.tsx |
| `'Sonstige Anmerkungen'` | SurgeryManager.tsx |
| `'Operation hinzufügen'` | SurgeryManager.tsx |
| `'Persönliche Daten'` | PDFExport.tsx |
| `'Versicherung'` | PDFExport.tsx |
| `'Adressdaten'` | PDFExport.tsx |
| `'Kontaktdaten'` | PDFExport.tsx |
| `'Aktuelle Beschwerden'` | PDFExport.tsx |
| `'Körpermaße'` | PDFExport.tsx |
| `'Raucherstatus'` | PDFExport.tsx |
| `'Familienanamnese'` | PDFExport.tsx |
| `'Diabetes'` | PDFExport.tsx |
| `'Beeinträchtigungen'` | PDFExport.tsx |
| `'Blutverdünner'` | PDFExport.tsx |
| `'Gesundheitsstörungen'` | PDFExport.tsx |
| `'Vorerkrankungen'` | PDFExport.tsx |
| `'Medikamente'` | PDFExport.tsx |
| `'Unfallmeldung (BG)'` | PDFExport.tsx |
| `'Überweisung'` | PDFExport.tsx |
| `'Terminabsage'` | PDFExport.tsx |
| `'Anamnese-Bericht'` | PDFExport.tsx |
| `'Drucken'` | PDFExport.tsx |
| `'Als PDF speichern'` | PDFExport.tsx |
| `'Schließen'` | PDFExport.tsx |
| `'Löschen'` | PDFExport.tsx |

---

## 2. Hardcoded German Text (NOT wrapped in `t()`)

### CRITICAL: AdminDashboard.tsx — Massive hardcoded German content

This file has ~5 `t()` calls but **hundreds of hardcoded German strings** in data arrays:

| Line Range | Content Type | Examples |
|------------|-------------|----------|
| ~44-50 | Tab labels | `'Übersicht'`, `'Leistungen'`, `'Triage-Engine'`, `'Ablauf'`, `'Changelog'`, `'Performance'` |
| ~56-63 | Stats | `'Aktive Sitzungen'`, `'Heute abgeschlossen'`, `'Ø Dauer'`, `'Red-Flags'` |
| ~67-74 | Security items | `'AES-256-GCM Encryption'`, `'DSGVO/HIPAA Audit-Log'`, `'JWT Role Auth'`, `'Rate Limiting'` |
| ~78-87 | Service names/descriptions | `'Termin / Anamnese'`, `'Rezeptanfrage'`, `'Überweisung'`, etc. with `'5-8 Min'` durations |
| ~91-103 | Body module names | `'Kopf'`, `'Brust/Herz'`, `'Bauch'`, `'Rücken'`, `'Beine'`, `'Haut'`, `'Metabolismus'`, etc. |
| ~107-116 | Triage rules | `'rule'` and `'action'` fields all German |
| ~133-213 | Changelog entries | All `title`, `description`, `tag` strings |
| ~317-321 | Productivity table | `'Anamnese'`, `'Rezept'`, `'Überweisung'` rows with `'Min'` durations |
| ~1036-1042 | Progress bars | `'Vollständigkeit (Pflichtfelder)'`, `'Patienten-Zufriedenheit'` |
| throughout | Chart labels | `'Dauer (Min)'`, various axis labels |

### CRITICAL: LandingPage.tsx — Service card data (L34-124)

All service `title` and `description` fields are hardcoded German:
- `'Termin / Anamnese'` / `'Intelligente Vorbereitung für Ihren nächsten Behandlungstermin.'`
- `'Rezeptanfrage'` / `'Schnelle und sichere Nachbestellung Ihrer Dauermedikation.'`
- `'Überweisung'` / `'Digital Facharzt-Überweisungen anfragen.'`
- `'Unfallmeldung (BG)'` / `'Berufsgenossenschaftliche Unfallmeldung digital einreichen.'`
- `'AU-Verlängerung'` / `'Arbeitsunfähigkeitsbescheinigung digital verlängern.'`
- `'Terminabsage'` / `'Einfach und schnell einen bestehenden Termin absagen.'`
- `'Befundanfrage'` / `'Laborergebnisse und Befunde digital einsehen.'`
- `'Bescheinigungen'` / `'Ärztliche Bescheinigungen digital anfragen.'`
- `'Impfstatus prüfen'` / `'Aktuellen Impfstatus überprüfen und Impflücken identifizieren.'`
- `'Recall & Vorsorge'` / `'Erinnerung an anstehende Vorsorge-Untersuchungen.'`

### CRITICAL: DSGVOConsent.tsx — Legal text sections (L98-116)

Hardcoded German legal paragraphs NOT wrapped in t():
- `'Die Daten werden zur Vorbereitung und Durchführung Ihrer medizinischen Behandlung erhoben...'`
- `'Ihre Daten werden gemäß den ärztlichen Aufbewahrungsfristen...'`
- Security measures list (`'Verschlüsselte Übertragung (TLS 1.3)'`, etc.)
- Patient rights paragraph
- Data protection officer text

### HIGH: MedicationScanner.tsx — All UI text hardcoded (L276-434)

| Line | Hardcoded Text |
|------|---------------|
| 276 | `'Medikament scannen'` |
| 277 | `'PZN, Barcode, QR-Code oder Foto'` |
| 318 | `'Medikament erkannt'` |
| 322 | `'Name'` |
| 327 | `'Dosierung'` |
| 333 | `'PZN'` |
| 372 | `'Oder PZN manuell eingeben:'` |
| 402 | `'Foto der Medikamenten-Verpackung'` |
| 403 | `'Tippen zum Aufnehmen / Auswählen'` |
| 420 | `'Texterkennung läuft...'` |
| 434 | `'Oder PZN manuell eingeben:'` |

### HIGH: FileInput.tsx — All UI text hardcoded

| Line | Hardcoded Text |
|------|---------------|
| 84 | `'Erfolgreich hochgeladen'` |
| 129 | `'Lädt hoch...'` |
| 141 | `'Klicken, um ein Dokument hochzuladen'` |
| 142 | `'PDF, JPG oder PNG (Max. 10MB)'` |

### HIGH: BgAccidentForm.tsx — All labels hardcoded (L50-109)

| Line | Hardcoded Text |
|------|---------------|
| 50 | `'Zuständige Berufsgenossenschaft'` |
| 66 | `'Unfallzeitpunkt'` |
| 75 | `'Unfallort'` |
| 86 | `'Unfallhergang (Beschreibung)'` |
| 96 | `'Wurde der Arbeitgeber bereits informiert?'` |
| 100 | `'Ja'` |
| 104 | `'Nein'` |
| 109 | `'Erste Hilfe durch (Name Ersthelfer/in)'` |

### HIGH: CameraScanner.tsx
| Line | Hardcoded Text |
|------|---------------|
| 179 | `'Wird übernommen!'` |

### HIGH: SelectInput.tsx
| Line | Hardcoded Text |
|------|---------------|
| 20 | `'Bitte wählen...'` |

### MEDIUM: Hardcoded German `aria-label` attributes (21 instances)

| File | Line | aria-label Value |
|------|------|-----------------|
| MFADashboard.tsx | 7 locations | `'Zum MFA-Portal'`, `'QR generieren'`, `'Suchen...'` (placeholder), `'Nachricht senden...'` (placeholder), etc. |
| AdminDashboard.tsx | 1 location | `'Admin Dashboard Diagramm'` |
| MedicationScanner.tsx | 7 locations | `'Kamera umschalten'`, `'Foto aufnehmen'`, `'Scanner schließen'`, `'Scanmodus: ...'`, `'PZN eingeben'`, `'PZN suchen'`, `'Übernehmen'` |
| FileInput.tsx | 1 location | `'Datei-Upload'` |
| DateInput.tsx | 1 location | German aria-label |
| CameraScanner.tsx | 1 location | `'Scanner schließen'` |
| BgAccidentForm.tsx | 1 location | `'BG Unfallformular'` |
| RedFlagOverlay.tsx | 1 location | `'Notfall-Warnung'` |

### MEDIUM: Hardcoded German `placeholder` attributes (16+ instances)

Found across MFADashboard.tsx (`'Suchen...'`, `'Nachricht senden...'`), MedicationScanner.tsx (`'z.B. 12345678'`), and others.

### MEDIUM: Data files — questions.ts & new-questions.ts

All ~2700+ lines of question data contain hardcoded German:
- `question:` field (the question text)
- `label:` field (option labels)
- `placeholder:` field
- `section:` names

These are loaded dynamically and rendered via `t(question.question)` and `t(opt.label)` in QuestionRenderer.tsx, meaning they work AS KEYS — but only if corresponding entries exist in locale files.

---

## 3. "Min" Abbreviation Locations

### Questionnaire.tsx — ESTIMATED_TIME map
```
'Termin / Anamnese': '5-8 Min'
'Rezeptanfrage': '2 Min'
'Überweisung': '3 Min'
'Unfallmeldung (BG)': '5 Min'
'AU-Verlängerung': '1 Min'
'Terminabsage': '1 Min'
'Befundanfrage': '2 Min'
'Bescheinigungen': '2 Min'
'Impfstatus prüfen': '2 Min'
'Recall & Vorsorge': '3 Min'
```

### LandingPage.tsx — Service `duration` field (L42-124)
Same values as above, displayed directly without `t()`:
- `'5-8 Min'`, `'2 Min'`, `'3 Min'`, `'5 Min'`, `'1 Min'`

### AdminDashboard.tsx — Multiple locations
- **Service list** (~L78-87): `'5-8 Min'`, `'2 Min'`, `'3 Min'`
- **Productivity table** (~L317-321): `'12 Min → 4 Min'`, `'8 Min → 2 Min'`, `'6 Min → 1 Min'`
- **Chart axis label**: `'Dauer (Min)'`
- **Total calculations**: `'{totalPaper} Min'`, `'{totalDigital} Min'`

### new-questions.ts
- L641: `'Druckgefühl > 20 Minuten'` (full word, not abbreviation)

**Issue:** "Min" is used as an abbreviation for "Minuten" and is hardcoded everywhere. It is **never** wrapped in `t()`. For multilingual support, this should use a translation key like `t('time.minutes_short', {count: N})`.

---

## 4. Pflichtfeld / Required Field References

| File | Line | Usage |
|------|------|-------|
| `utils/questionLogic.ts` | various | `i18n.t('validation.required')` — proper key |
| `data/questions.ts` | throughout | `validation: { required: true }` — used in ~40+ questions as a boolean flag (NOT a display string) |
| `data/new-questions.ts` | throughout | `validation: { required: true }` — used in ~30+ questions |
| `AdminDashboard.tsx` | ~1036 | Hardcoded: `'Vollständigkeit (Pflichtfelder)'` |
| `UnfallBGFlow.tsx` | 4 locations | Error messages: `'unfallbg.bgNameError'`, `'unfallbg.datetimeError'`, `'unfallbg.locationError'`, `'unfallbg.descriptionError'` — these are proper keys that likely resolve to "Pflichtfeld" text in locale files |

---

## 5. Translation Issues & Recommendations

### CRITICAL Issues

1. **AdminDashboard.tsx is ~95% untranslated**
   - Only 5 keys use `t()`, the rest (~200+ strings) are hardcoded German
   - This is the largest i18n gap in the entire codebase
   - **Action:** Wrap all display strings in `t()` with proper namespaced keys (`admin.tabs.*`, `admin.stats.*`, `admin.services.*`, etc.)

2. **LandingPage.tsx service data is hardcoded**
   - Service `title`, `description`, `duration`, and `badge` fields are not translated
   - The `title` and `description` are rendered with `t(service.title)` and `t(service.description)` — meaning they work as keys, but the `duration` field is rendered directly (`{service.duration}`)
   - **Action:** Use `t()` for duration display; ensure all service text keys exist in locale files

3. **DSGVOConsent.tsx has untranslated legal text blocks**
   - The expandable "Vollständige Datenschutzerklärung" section (L98-116) is entirely hardcoded German
   - Legal consent text MUST be translated for non-German-speaking patients
   - **Action:** Wrap all legal text sections in `t()` calls

4. **MedicationScanner.tsx, FileInput.tsx, BgAccidentForm.tsx have zero i18n**
   - These input components contain no `t()` calls at all
   - All UI text is hardcoded German
   - **Action:** Add `useTranslation()` hook and wrap all strings

5. **SelectInput.tsx: hardcoded "Bitte wählen..."**
   - L20: `<option value="" disabled>Bitte wählen...</option>`
   - **Action:** Replace with `t('selectPlaceholder', 'Bitte wählen...')`

### HIGH Priority Issues

6. **~90 bare German word keys are fragile**
   - Keys like `t('Zurück')`, `t('Weiter')`, `t('Absenden')` use the German text as the key
   - If someone changes the German translation, the key breaks
   - **Action:** Migrate to namespaced keys (e.g., `t('button.back')`, `t('button.next')`, `t('button.submit')`)

7. **Data files (questions.ts, new-questions.ts) use German text as keys**
   - QuestionRenderer renders them as `t(question.question)` and `t(opt.label)`
   - This requires every German question/label to be present as a key in ALL locale files
   - With ~500+ unique question/option strings, this is a maintenance burden
   - **Action:** Consider using stable IDs as keys (e.g., `q.1000.text`, `q.1000.opt.ja`) instead of German sentences

8. **CameraScanner.tsx: "Wird übernommen!" hardcoded** (L179)

### MEDIUM Priority Issues

9. **21 hardcoded German `aria-label` values**
   - Accessibility labels are not translatable
   - Screen readers for non-German users will hear German
   - **Action:** Wrap all `aria-label` values in `t()`

10. **16+ hardcoded German `placeholder` values**
    - Input placeholders won't translate
    - **Action:** Wrap in `t()` or use placeholder keys from question data

11. **Inconsistent key naming patterns**
    - Some use `camelCase` (`sessionTimeoutTitle`), some use `dot.notation` (`arzt.login.title`), some use bare German
    - **Action:** Standardize on `dot.notation` with consistent namespacing

12. **KioskToggle.tsx: English aria-labels** (L38)
    - `kiosk.exit_aria` defaults to `'Exit fullscreen'` and `kiosk.enter_aria` to `'Enter fullscreen'`
    - Inconsistent with other German fallbacks
    - **Action:** Use German fallbacks or ensure locale files have proper translations for all languages

### LOW Priority Issues

13. **SessionTimer.tsx has no t() calls** — displays only formatted time (`minutes:seconds`), which is locale-neutral

14. **HistorySidebar.tsx**: `'Toggle sidebar'` is English (L58) — should be localized

15. **`new Date().toLocaleString('de-DE')` hardcoded locale**
    - AnswerSummary.tsx L81: Always formats dates in German
    - **Action:** Use `i18n.language` instead of `'de-DE'`

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total `t()` calls found** | ~300+ |
| **Total `i18n.t()` calls found** | 8 |
| **Unique namespaced keys** | ~190 |
| **Bare German word keys** | ~90 |
| **Files with zero i18n** | 4 (MedicationScanner, FileInput, BgAccidentForm, SelectInput) |
| **Hardcoded German strings (not in `t()`)** | ~350+ |
| **Hardcoded aria-labels** | 21 |
| **Hardcoded placeholders** | 16+ |
| **"Min" abbreviation occurrences** | ~25 |
| **Data file German strings (questions.ts + new-questions.ts)** | ~500+ |
