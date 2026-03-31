# Secure Transport and Tomedo Strategy

Date: 2026-03-31
Purpose: define the recommended secure path from patient phone -> DiggAI service -> Tomedo patient file.

## 1. Patient phone to DiggAI service

Recommended baseline:
- TLS 1.3 only for production traffic
- HSTS enabled
- no PHI in URLs
- short-lived access tokens
- CSRF protection for browser write operations
- audit by IDs only, never raw patient content

Important transport note:
- Do not enable TLS 1.3 0-RTT on state-changing or medical-write endpoints.
- RFC 8446 explicitly warns that 0-RTT has weaker properties and replay risk.

Recommended browser model:
- same-site deployment where possible
- bearer tokens in memory for active sessions
- HttpOnly cookies only when deployment topology actually supports them safely
- CSRF token bootstrap via response header, which is now implemented in this repo

Recommended public-client hardening for future mobile/browser app launches:
- OAuth 2.0 Authorization Code + PKCE for public clients
- DPoP for sender-constrained tokens if refresh/access tokens must live outside same-site cookies

Why DPoP:
- it binds the token to a client key
- it reduces the value of leaked bearer tokens
- RFC 9449 explicitly supports public clients and sender-constrained refresh tokens

For backend-to-backend service credentials:
- prefer mTLS or `private_key_jwt`
- if the partner ecosystem supports it, adopt UDAP for cross-organization healthcare trust

## 2. DiggAI service to Tomedo

Current repo state:
- there is already a Tomedo adapter in `server/services/pvs/adapters/tomedo.adapter.ts`
- it uses FHIR R4-style exchange and OAuth2
- it already builds transaction bundles from:
  - Patient
  - Encounter
  - QuestionnaireResponse
  - Flag
  - RiskAssessment
  - MedicationStatement
  - Procedure
  - Observation

Recommended target standard:
- SMART on FHIR 2.2 discovery and authorization flow for interactive integrations
- FHIR REST with `application/fhir+json`
- OAuth2 with PKCE for user-facing launches
- client credentials plus mTLS or asymmetric client auth for server-to-server

## 3. What to write into the Tomedo patient file

Primary structured export:
- `QuestionnaireResponse` for the anamnesis answers
- `Encounter` for the visit context
- `Flag` and `RiskAssessment` for triage/safety signals
- `MedicationStatement` for current medication
- `Procedure` for relevant surgery history
- `Observation` for vital signs and quantifiable findings

Secondary fallback:
- `DocumentReference` plus `Binary` or PDF/A export when a site cannot yet consume the full structured bundle

## 4. Standards delta to address next

The local mapper still references older KBV base profile versions in some places.

Next recommended alignment work:
- review and update patient/encounter/observation mappings against current KBV Basis profiles
- specifically review KBV Basis v1.8.0 changes before live Tomedo onboarding
- keep the bundle transaction idempotent by carrying a stable export identifier per session
- return `OperationOutcome` on FHIR-side validation failures and persist the full transfer log
- attach explicit consent and provenance handling around external exports

Inference from local code:
- the code is already structurally close to a standards-based Tomedo handoff
- the next real work is profile-version alignment, partner auth specifics, and site-by-site capability testing

## 5. Recommended phased delivery

Phase A:
- go live with Supabase pilot and internal dashboards
- pass smoke E2E on the real pilot DB

Phase B:
- validate one Tomedo pilot tenant end-to-end with synthetic data
- confirm auth method, scopes, and FHIR capability statement

Phase C:
- align exported resources to the latest KBV/german profiles required by the target practice workflow
- add fallback PDF/A + DocumentReference path if structured import is incomplete

Phase D:
- only then move the full production stack to Hetzner and execute the final DSGVO/data-residency hardening

## Source references

- TLS 1.3 RFC 8446: https://datatracker.ietf.org/doc/html/rfc8446
- OAuth DPoP RFC 9449: https://datatracker.ietf.org/doc/rfc9449/
- OAuth mTLS RFC 8705: https://datatracker.ietf.org/doc/html/rfc8705
- SMART App Launch 2.2: https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html
- HL7 FHIR Security: https://www.hl7.org/fhir/security.html
- HL7 FHIR HTTP guidance: https://www.hl7.org/fhir/R4/http.html
- HL7 Deutschland FHIR committee: https://hl7.de/technische-komitees/fhir/
- KBV Basis Profile v1.8.0: https://hub.kbv.de/spaces/BASE1X0/pages/378508923/V1.8.0
- KBV Base Patient profile: https://hub.kbv.de/spaces/BASE1X0/pages/378507443/Patient
- gematik interoperability overview: https://www.gematik.de/telematikinfrastruktur/iop
- gematik Interoperabilitaet 2025: https://www.gematik.de/media/gematik/Medien/Newsroom/Publikationen/Informationsmaterialien/Interoperabilitaet_2025_Teil_A_v16.pdf
- MDN third-party cookies / SameSite guidance: https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies
