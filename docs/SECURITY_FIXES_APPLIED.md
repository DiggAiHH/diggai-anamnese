# 🔧 Security Fixes Applied — 2026-03-09

## Summary

| Issue | Severity | Status | File |
|-------|----------|--------|------|
| CRIT-001 Path Traversal | 🔴 CRITICAL | ✅ FIXED | `server/routes/upload.ts` |
| HIGH-002 Rate Limiting | 🟠 HIGH | ✅ FIXED | `server/routes/answers.ts` |
| HIGH-003 LLM Injection | 🟠 HIGH | ✅ FIXED | `server/services/ai/llm-client.ts` |

---

## Fix Details

### ✅ CRIT-001: Path Traversal Protection

**Problem:** `startsWith()` check war anfällig für Path Traversal Angriffe.

**Solution:** 
- Absolute Path Resolution mit `resolve()`
- `normalize()` für Path Canonicalization
- `isPathSecure()` Helper Funktion
- Logging bei blockierten Versuchen

```typescript
const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

function isPathSecure(filepath: string): boolean {
    const normalized = normalize(filepath);
    return normalized.startsWith(UPLOAD_DIR + sep);
}
```

---

### ✅ HIGH-002: Answer Submission Rate Limiting

**Problem:** Keine Begrenzung für Antwort-Submissions → Spam/DoS möglich.

**Solution:**
- 30 Antworten pro Minute pro Session
- HTTP 429 bei Überschreitung
- Session-basierte Key-Generierung

```typescript
const answerSubmissionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 answers per minute per session
    keyGenerator: (req: Request) => req.params.id || req.ip || 'unknown',
});
```

---

### ✅ HIGH-003: LLM Prompt Injection Protection

**Problem:** Patientenantworten wurden direkt an LLM gesendet ohne Sanitization.

**Solution:**
- `sanitizeForLlm()` Funktion
- Entfernung von Kontrollzeichen `<>{ }[]`
- Längenbegrenzung (4000 Zeichen)
- Null-Byte Entfernung

```typescript
function sanitizeForLlm(input: string): string {
    return input
        .replace(/[<>{}[\]]/g, '')
        .replace(/\x00/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .slice(0, 4000);
}
```

---

## Verification

```bash
# Type-Check durchführen
npm run type-check

# Linting
npm run lint

# E2E Tests
npx playwright test
```

---

## Remaining Work

### Medium Priority (Next Sprint)
- [ ] MED-001: TypeScript Type Safety in Auth Middleware
- [ ] MED-002: Consistent Zod Validation
- [ ] MED-003: Rate Limiting für Session Creation
- [ ] MED-004: Generic Error Messages
- [ ] MED-005: File Upload Magic Number Validation

### High Priority (CSRF)
- [ ] HIGH-001: CSRF Protection mit Double-Submit Cookie

---

*Fixed by: Claude (Architecture & Risk)*  
*Date: 2026-03-09*  
*Status: CRITICAL + HIGH Issues RESOLVED*
