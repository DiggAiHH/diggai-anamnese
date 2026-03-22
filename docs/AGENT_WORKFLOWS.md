# AGENT_WORKFLOWS.md — Autonomous Agent Operation Guide

This document provides step-by-step workflows for AI agents and developers working
on the DiggAI Anamnese Platform. Each workflow is designed to be safe, repeatable,
and DSGVO-compliant.

**SCOPE**: All workflows operate EXCLUSIVELY within `anamnese-app/`.

---

## Workflow A: Add a New Medical Question

**When to use**: Adding a new question to an existing specialty module or creating a new service flow.

### Pre-check
- Read `docs/QUESTION_CATALOG.md` to find the next available question ID for the target section.
- Confirm the question does not already exist (search `src/data/questions.ts`).

### Steps

1. **Assign question ID**
   - Follow the numbering pattern of the target section (e.g., next after `1080` would be `1081`)
   - Never reuse or skip IDs — they are canonical routing keys

2. **Add QuestionAtom to `src/data/questions.ts`**
   ```typescript
   {
     id: '1081',
     type: 'multiselect',          // see QuestionType enum in src/types/question.ts
     question: 'Welche Symptome?', // German source text
     section: 'Neurologie',
     order: 82,
     options: [...],
     validation: { required: true },
     logic: {
       next: ['1082'],             // default next question
       conditional: [...]          // branching rules
     }
   }
   ```

3. **Add routing in `logic.conditional`** (if conditional branching needed)
   - Reference existing patterns in `src/data/questions.ts` for syntax
   - Document each condition with a comment

4. **Add German text to i18n** (if question text uses `t()` keys)
   - Edit `public/locales/de/translation.json`

5. **Add to all 9 other language files**
   - Files: `public/locales/{en,tr,ar,uk,es,fa,it,fr,pl}/translation.json`
   - Use `[TODO-TRANSLATE]` prefix for languages you cannot translate

6. **Verify i18n completeness**
   ```bash
   node scripts/generate-i18n.ts
   ```
   Must show 0 missing keys.

7. **Run build + tests**
   ```bash
   npm run build
   npx playwright test e2e/questionnaire-flow.spec.ts
   ```

---

## Workflow B: Add a New API Endpoint

**When to use**: Creating a new backend feature or data endpoint.

### Steps

1. **Create route file** `server/routes/<domain>.ts`
   ```typescript
   import { Router } from 'express';
   import { verifyToken, requireRole } from '../middleware/auth';
   import { auditLogger } from '../middleware/audit';
   import { sanitizeBody } from '../services/sanitize';
   const router = Router();
   export default router;
   ```

2. **Add JWT auth middleware** for all non-public routes
   ```typescript
   router.get('/data', verifyToken, requireRole(['ARZT', 'ADMIN']), async (req, res) => { ... });
   ```

3. **Add HIPAA audit log** for any patient data access
   ```typescript
   // Inside handler:
   await auditLog({ userId: req.user.id, action: 'READ_PATIENT_DATA', resourceId: sessionId });
   ```

4. **Add input sanitization + Zod validation**
   ```typescript
   import { z } from 'zod';
   const schema = z.object({ sessionId: z.string().cuid() });
   const data = schema.parse(req.body); // throws ZodError on invalid input
   ```

5. **Add JSDoc annotation**
   ```typescript
   /**
    * @route GET /api/<domain>/endpoint
    * @auth ARZT, ADMIN
    * @returns {Object} Description of response
    */
   ```

6. **Register route in `server/index.ts`**
   ```typescript
   import domainRoutes from './routes/<domain>';
   app.use('/api/<domain>', authLimiter, domainRoutes);
   ```

7. **Add React Query hook in `src/hooks/useApi.ts`** (or new domain hook file)
   ```typescript
   export const useMyData = (id: string) => useQuery({
     queryKey: ['myData', id],
     queryFn: () => apiClient.get(`/api/<domain>/${id}`).then(r => r.data),
   });
   ```

8. **Run build + E2E tests**
   ```bash
   npm run build
   npx playwright test
   ```

---

## Workflow C: Fix a DSGVO Compliance Issue

**When to use**: Discovered PII data exposure, missing encryption, or missing audit trail.

### Steps

1. **Identify PII data exposure point**
   - Search for direct patient field access: `Grep for "encryptedName|email|phone|address" in server/routes/`
   - Check if response includes unencrypted patient data

2. **Apply AES-256-GCM encryption** via `server/services/encryption.ts`
   ```typescript
   import { encrypt, decrypt } from '../services/encryption';
   // Store:
   const encryptedName = encrypt(patientName);
   // Retrieve:
   const name = decrypt(patient.encryptedName);
   ```

3. **Add audit log entry** via `server/middleware/audit.ts`
   ```typescript
   await auditLog({
     userId: req.user?.id,
     action: 'ACCESS_PII',
     resourceId: patient.id,
     resourceType: 'Patient',
     ipHash: hashIp(req.ip),
   });
   ```

4. **Add/update to COMPREHENSIVE_AUDIT.md** — document what was fixed and how

5. **Update `docs/TOM_DOKUMENTATION.md`** — technical and organizational measures list

---

## Workflow D: Add a New Translation Language

**When to use**: Adding support for a new language (e.g., Russian to public/locales).

### Steps

1. **Create translation file**
   ```bash
   cp public/locales/de/translation.json public/locales/<code>/translation.json
   ```

2. **Translate all ~1812 keys** (or use `[TODO-<CODE>]` prefix for untranslated)

3. **Add locale to `src/i18n.ts`**
   ```typescript
   // Add to supportedLngs array and resources object
   supportedLngs: ['de', 'en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl', '<code>']
   ```

4. **Add to `LanguageSelector.tsx`** component — add new language option

5. **If RTL language** (Arabic, Farsi, Hebrew, Urdu, etc.):
   - Add language code to RTL detection list in `src/i18n.ts`
   - Test layout: apply `document.dir = 'rtl'` and check all major pages
   - Run `npx playwright test e2e/i18n.spec.ts`

6. **Add to server locales** `server/locales/<code>/` for backend translations

7. **Verify**
   ```bash
   node scripts/generate-i18n.ts
   npx playwright test e2e/i18n.spec.ts
   ```

---

## Workflow E: Update the LLM Provider

**When to use**: Switching from Ollama to OpenAI (or vice versa), or configuring a new LLM endpoint.

### Steps

No code changes needed. The LLM provider is runtime-configurable via the database.

1. **Connect to the database** (via Prisma Studio or direct SQL)
   ```bash
   npx prisma studio
   ```

2. **Update the SystemSetting record**
   ```sql
   UPDATE "SystemSetting" SET value = 'openai' WHERE key = 'llm_provider';
   -- Options: 'ollama' | 'openai' | 'none'
   ```

3. **Set the corresponding env var** (if switching to OpenAI-compatible):
   ```bash
   OPENAI_API_KEY="sk-..."          # OpenAI or compatible
   LLM_ENDPOINT="http://..."        # Ollama endpoint (if using Ollama)
   ```

4. **If using Ollama**: Start the Docker profile
   ```bash
   docker-compose -f docker-compose.local.yml --profile llm up -d
   ```

5. **Verify the change**
   ```bash
   curl http://localhost:3001/api/agents/health
   # Should return: { "llmProvider": "openai", "status": "ok" }
   ```

---

## Workflow F: Deploy to Production

**When to use**: After all tests pass and changes are ready for production.

### Pre-deploy checklist

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npx playwright test` — all 22 specs pass
- [ ] `node scripts/generate-i18n.ts` — zero missing translation keys
- [ ] No `.env` or `anamnese.db` in git staging area
- [ ] All new Prisma migrations are committed
- [ ] `IMPLEMENTIERUNGS_CHANGELOG.md` updated

### Frontend Deploy (Netlify — automatic)

Push to `main` branch → Netlify auto-deploys from `dist/`:
```bash
git push origin main
# Monitor: https://app.netlify.com
```

### Backend Deploy (Docker VPS)

```bash
# On VPS:
cd /opt/anamnese-app
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Run pending migrations:
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Verify:
curl https://api.your-domain.de/api/system/health
```

### Post-deploy verification

```bash
# Health check
curl https://api.your-domain.de/api/system/health
# Expected: { "status": "ok", "db": "connected", "version": "3.0.0" }

# Check triage engine is operational
curl -H "Authorization: Bearer <token>" https://api.your-domain.de/api/arzt/sessions

# Smoke test via Playwright (from local)
PLAYWRIGHT_BASE_URL=https://diggai-drklaproth.netlify.app npx playwright test e2e/anamnese.spec.ts
```

---

## Common Pitfalls

| Workflow | Common Mistake | Prevention |
|---|---|---|
| A (New Question) | Renumbering existing question IDs | Only append — never renumber |
| A (New Question) | Missing i18n keys in some languages | Always run `node scripts/generate-i18n.ts` |
| B (New Endpoint) | Forgetting auth middleware | Use `verifyToken` on ALL patient data routes |
| B (New Endpoint) | Missing audit log | Every PII access needs `auditLog()` call |
| C (DSGVO Fix) | Logging PII in error messages | Use patient ID in logs, never names/emails |
| D (New Language) | Missing RTL layout test | Test AR/FA pages after any UI change |
| E (LLM Update) | Forgetting to set env var | Verify with `/api/agents/health` endpoint |
| F (Deploy) | Running `migrate dev` in production | Use `migrate deploy` in production only |

---

## Workflow G: Agent Society Governance Review (Phase 0)

**When to use**: Any task that affects agent decision-making, escalation behavior, auditability, or compliance posture.

### Governance Pre-check

- Read `docs/AGENT_SOCIETY_GOVERNANCE_BLUEPRINT.md`.
- Classify the change type:
  - Operativ Normal
  - Sensitiv
  - Klinisch Kritisch
  - Compliance Kritisch

### Governance Steps

1. **Decision type classification**
   - Document classification in task notes before implementation.
   - If uncertain, classify upward (toward higher criticality).

2. **Apply required review path**
   - Operativ Normal: Majority/standard review
   - Sensitiv: include Compliance Ombud review
   - Klinisch Kritisch: mandatory Clinical Safety Twin + human review
   - Compliance Kritisch: mandatory Compliance Ombud + Escalation Judge + human review

3. **Check hard-stop conditions**
   - Potential PHI leakage in governance evidence
   - Clinical high-risk decision without human sign-off
   - Missing audit trace for decision-relevant agent actions
   - If any hard-stop triggers: stop rollout and escalate immediately.

4. **Produce governance evidence (PII-safe)**
   - Use decision IDs, session IDs, and hashed references.
   - Do not include patient names, emails, diagnoses, or birthdates in governance notes.

5. **Record KPI impact (E/S/G)**
   - E: compute/cost/retry impact
   - S: human override/explainability/conflict impact
   - G: audit completeness/escalation SLA/policy compliance impact

6. **Run governance recap**
   - Add summary to compliance/governance review notes.
   - List residual risks and next required checkpoint (Sunrise/Morning/Noon/Afternoon/Moon).

### Governance Deliverables

- Decision classification
- Review approvals (as required by decision class)
- PII-safe evidence note
- ESG KPI delta (qualitative or quantitative)
- Escalation record if applicable
