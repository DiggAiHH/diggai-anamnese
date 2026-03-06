# PLANNING MODE — DiggAI Phase 12: Datenschutz-Erweiterungen

Du bist ein erfahrener Software-Architekt für das DiggAI-Projekt.
Lies zuerst die gesamte CLAUDE.md. Erstelle AUSSCHLIESSLICH einen 
detaillierten Plan — KEINEN Code, keine Implementierung.

## Projekt-Kontext (aus CLAUDE.md)
- Stack: React 19 + TypeScript strict, Express 5, Prisma 6, PostgreSQL 16
- Bestehend: DatenschutzGame-Komponente (Phase 10 ✅)
- Deployment: Netlify (Frontend) + Docker VPS (Backend)
- DSGVO Section 2 bereits implementiert ✅
- Regeln: i18n PFLICHT (10 Sprachen), Tailwind only, React Query, 
  Zod-Validation, AES-256-GCM für PII, kein externes AI/LLM

---

## FEATURE 1 — 3D-Animationen im DatenschutzGame

**Aufgabe:** Plane die Erweiterung der bestehenden 
`src/components/DatenschutzGame.tsx` um:
- Giftige Pflanzen & Tiere als 3D-Animationen 
- Vogel-Animationen
- Ansprechende, medizinisch passende Bildsprache

**Plane folgendes:**
- Welche Bibliothek? (Three.js r128 bereits im Stack via CDN, 
  Lottie, Rive, Spline — Begründung + Performance-Vergleich)
- Asset-Strategie: Wo liegen 3D-Assets? (public/ oder CDN?)
- Performance auf mobilen Geräten (Praxis-Tablets)
- Lazy Loading Strategie (bestehend: React.lazy in App.tsx)
- Barrierefreiheit & prefers-reduced-motion
- i18n für Beschriftungen (alle 10 Sprachen)

---

## FEATURE 2 — Digitale Unterschrift im Datenschutzformular

**Aufgabe:** Plane eine DSGVO-konforme digitale Unterschrift für:
- Patienten (Hauptfall)
- Ärzte / Lieferanten (Sekundärfall)
- Formulare müssen rechtssicher unterschrieben werden
  (NICHT nur Checkbox-Klick — das reicht rechtlich nicht!)

**Plane folgendes:**

### Technisch:
- Canvas-basiertes Signatur-Pad (z.B. signature_pad library)
  → Passt zum bestehenden PatternLock.tsx (Canvas-Ansatz)
- Datenformat der Signatur: Base64 PNG → AES-256-GCM verschlüsselt
  (konsistent mit bestehender encryption.ts)
- Neues Prisma-Model: `Signature` (patientId, formType, 
  signatureData encrypted, timestamp, ipHash, userAgent)
- Neue API-Route: `server/routes/signatures.ts`
- Audit-Log-Eintrag automatisch via bestehenden auditLogger

### Rechtlich (DSGVO + §630f BGB + eIDAS):
- Was macht eine digitale Unterschrift rechtsgültig in Deutschland?
- Qualifizierte vs. fortgeschrittene elektronische Signatur — 
  was brauchen wir für eine Arztpraxis?
- Zeitstempel-Anforderungen (RFC 3161?)
- Wie lange muss die Signatur aufbewahrt werden?
- Wie verhält sich das zum bestehenden MFA/CertificationModal?

### Sicherheit:
- Unveränderlichkeitsnachweise (Hash der signierten Dokument-Version)
- Verknüpfung: Signatur ↔ Patientennummer (P-XXXXX) ↔ Session-JWT
- Audit-Trail: wer, was, wann, von welcher IP

---

## FEATURE 3 — DSGVO-konforme Videosprechstunde

**Aufgabe:** Recherchiere und plane die vollständige Integration 
einer Videosprechstunde in DiggAI.

### Teil A — Rechtliche Recherche (Deutschland 2024/2025):
Plane basierend auf:
- § 291g SGB V (Telematikinfrastruktur)
- KBV-Richtlinie zur Videosprechstunde (KBV 2023)
- BSI TR-03161 Anforderungen
- DSGVO Art. 9 (besondere Kategorien — Gesundheitsdaten!)
- Welche KBV-zugelassenen Anbieter existieren bereits?
- Was darf man selbst bauen vs. was muss zertifiziert sein?

### Teil B — Technische Architektur:
- WebRTC mit Ende-zu-Ende-Verschlüsselung (DTLS-SRTP)
- Signaling-Server: Wo hosten? (Bestehender VPS in Docker?)
- STUN/TURN-Server: Eigener (coturn auf VPS) vs. gemanagt?
- Server-Standort: MUSS EU/Deutschland sein — plane Hosting
- Raumkonzept: Warteraum (passt zu PatientWartezimmer.tsx!) 
  → Videocall-Raum
- Aufzeichnung: VERBOTEN ohne explizite Einwilligung 
  → plane Consent-Flow

### Teil C — Integration in DiggAI:
- Neue Komponente: `VideoSprechstunde.tsx`
- Verbindung zu bestehendem `PatientWartezimmer.tsx`
- Socket.IO bereits im Stack → für Signaling nutzbar!
- Neue Prisma-Models: `VideoSession`, `VideoConsent`
- Wie passt das in den bestehenden Auth-Flow (JWT)?

### Teil D — Dokumentation (eigener Abschnitt):
Erstelle einen Dokumentationsplan für:
1. Warum ist diese Lösung DSGVO-konform? (technisch + rechtlich)
2. Performance-Metriken: Latenz, Bandbreite, max. Teilnehmer
3. Praxis-Leitfaden: Wie richtet eine Arztpraxis das ein?
4. Datenschutz-Folgeabschätzung (DSFA nach Art. 35 DSGVO) — 
   Gliederung erstellen

---

## GEWÜNSCHTES OUTPUT-FORMAT:

### 1. Executive Summary (kurz, für Dr. Klaproth verständlich)
### 2. Architektur-Delta (Was ändert sich an der bestehenden Architektur?)
### 3. Neue Prisma-Models (nur Skizze, kein Code)
### 4. Neue Komponenten & Routes (Liste mit Zweck)
### 5. Pro Feature:
   - Technologie-Entscheidung + Begründung
   - Schritt-für-Schritt Implementierungsreihenfolge
   - Abhängigkeiten zu bestehenden Komponenten (Phase 10/11)
   - Risiken & offene Rechtsfragen
   - Zeitschätzung in Stunden
### 6. DSGVO-Dokumentationsstruktur
### 7. Empfohlene Implementierungsreihenfolge (Phase 12 Roadmap)
### 8. Offene Entscheidungspunkte (was muss Dr. Klaproth entscheiden?)

WICHTIG: Kein Code. Nur der Plan.