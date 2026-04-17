# fhir-webhook-signature-hardening

## 2026-04-17 04:40:29 | in_progress

- Agent: copilot
- Session: 2026-04-17-fhir-webhook-hardening
- Batch: 2
- Summary: Implemented HMAC signature verification for FHIR webhooks and added route tests for valid, missing, invalid, and base64/hex signature handling.

### Done
- Replaced placeholder verifySignature implementation with real HMAC-SHA256 validation and timing-safe compare.
- Added signature header extraction for x-hub-signature-256, x-hub-signature, and x-signature.
- Enforced missing-signature rejection when FHIR_WEBHOOK_SECRET is configured.
- Added server/routes/fhir-webhook.routes.test.ts with 5 focused tests.
- Validated with vitest server run for the new test file.

### Next
- Integrate persistent audit storage for PVS audit logger (replace console-only flush path).
- Complete credential decryption path in Tomedo FHIR API client.

### Artifacts
- server/routes/fhir-webhook.routes.ts
- server/routes/fhir-webhook.routes.test.ts

## 2026-04-17 11:22:16 | completed

- Agent: copilot
- Session: 2026-04-17-fhir-webhook-hardening
- Batch: 3
- Summary: Completed the two remaining hardening tasks by adding persistent PVS audit-log storage and implementing encrypted credential decryption in the Tomedo FHIR API client.

### Done
- Replaced the console-only flush path in `PvsAuditLogger` with Prisma `AuditLog` persistence.
- Added resilient fallback behavior for audit persistence (`createMany` -> per-entry `create`) and requeue-on-failure.
- Added bounded in-memory buffering and serialized flush execution to avoid race conditions and data loss.
- Added focused tests for audit persistence success, fallback, and full-failure requeue behavior.
- Implemented AES-256-GCM credential decryption path in `TomedoApiClient` for encrypted credential payloads.
- Kept backward compatibility for existing plaintext JSON credential payloads.
- Extended Tomedo API client tests with encrypted credential success/failure scenarios and aligned stale assertions with current behavior.
- Validated with focused server test run: 3 files, 26 tests, all green.

### Next
- Roll the same encrypted-credential parsing logic into other FHIR adapters (`tomedo.adapter.ts`, `fhir-generic.adapter.ts`, `t2med.adapter.ts`) to remove remaining plaintext-only paths.

### Artifacts
- server/routes/fhir-webhook.routes.ts
- server/routes/fhir-webhook.routes.test.ts
- server/services/pvs/security/audit-logger.ts
- server/services/pvs/security/audit-logger.test.ts
- server/services/pvs/tomedo-api.client.ts
- server/services/pvs/__tests__/tomedo-api.client.test.ts

## 2026-04-17 11:32:18 | completed

- Agent: copilot
- Session: 2026-04-17-fhir-webhook-hardening
- Batch: 4
- Summary: Completed encrypted credential parsing rollout for remaining FHIR adapters with a shared parser utility and validated the full focused regression gate.

### Done
- Added shared credential parser utility with encrypted payload detection and AES-256-GCM decryption support.
- Wired shared parser into `TomedoApiClient`, `TomedoAdapter`, `T2MedAdapter`, and `FhirGenericAdapter`.
- Added focused parser unit tests for plaintext parsing, encrypted decryption, missing-key failure, and payload-shape detection.
- Stabilized adapter test suites by fixing hoisted mock initialization and stale expectations.
- Validated focused gate across webhook hardening, audit persistence, parser, API client, and adapter suites.

### Next
- Apply the same parser path to any remaining plaintext credential code paths outside adapters (for example, integration service legacy placeholders).

### Artifacts
- server/services/pvs/security/credentials-parser.ts
- server/services/pvs/security/credentials-parser.test.ts
- server/services/pvs/tomedo-api.client.ts
- server/services/pvs/adapters/tomedo.adapter.ts
- server/services/pvs/adapters/t2med.adapter.ts
- server/services/pvs/adapters/fhir-generic.adapter.ts
- server/services/pvs/adapters/__tests__/tomedo.adapter.test.ts
- server/services/pvs/adapters/__tests__/t2med.adapter.test.ts

## 2026-04-17 11:58:00 | completed

- Agent: copilot
- Session: 2026-04-17-fhir-webhook-hardening
- Batch: 5
- Summary: Hardened the remaining legacy plaintext credential path in the integration orchestration layer by encrypting credentials at rest and parsing/decrypting at runtime.

### Done
- Replaced placeholder plaintext `encryptCredentials` behavior in `PVSIntegrationService` with shared encrypted credential serialization.
- Added runtime credential parsing/decryption in `exportAnamnese` and `importPatients` before forwarding credentials downstream.
- Updated integration mapping to read credentials from `fhirCredentials` and normalize legacy DB field names.
- Extended shared parser key resolution to support `PVS_ENCRYPTION_KEY` with fallback to `ENCRYPTION_KEY` for consistent encrypted payload handling.
- Added focused tests for integration-service encrypted storage/decryption flow and parser key fallback behavior.
- Verified no remaining runtime matches for plaintext credential TODOs or direct `fhirCredentials as any` credential passing in `server/services/pvs`.
- Validated with isolated focused gate: 2 files, 8 tests, all green.

### Next
- Continue scanning runtime PVS surfaces for any new direct credential deserialization bypassing shared parser utilities as future code lands.

### Artifacts
- server/services/pvs/pvs-integration.service.ts
- server/services/pvs/pvs-integration.service.test.ts
- server/services/pvs/security/credentials-parser.ts
- server/services/pvs/security/credentials-parser.test.ts

