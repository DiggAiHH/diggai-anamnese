# Supabase Pilot Rollout

Date: 2026-03-31
Scope: DiggAI Anamnese Platform pilot stack with Supabase as the PostgreSQL backend only.

## Decision

For this codebase, Supabase should be used as managed Postgres for the pilot, not as an application-side auth rewrite.

Reasons:
- Prisma is already the canonical database access layer.
- The backend is a persistent Express server, so the correct pilot change is the connection string, not a client SDK migration.
- This keeps the later Hetzner move simple: same app code, different Postgres host.

## Code readiness delivered

The following online-readiness fixes are now in place:
- Staff auth is tenant-aware at login and token issuance.
- MFA and doctor dashboards are tenant-scoped for session reads and writes.
- Patient JWTs now carry `tenantId`.
- Socket.IO now authenticates from either bearer token or `access_token` cookie.
- Frontend realtime clients now support credentialed socket connections.
- CSRF can now bootstrap from `X-CSRF-Token` response headers via `/api/csrf-token`, which removes the split-origin dependency on `document.cookie`.
- Patient session creation now keeps the returned session token in memory for the active visit.

## Supabase connection model

Use the Supabase connection that matches the runtime shape:

1. Persistent backend on VM/container:
   - Prefer direct Postgres `:5432` if IPv6/networking allows it.
   - Otherwise use the Supavisor session pooler `:5432`.

2. Serverless or highly elastic runtime:
   - Use the transaction pooler `:6543`.
   - This repo is not primarily designed for that path.

Important:
- The current backend is a long-lived Express server, so the direct connection or session pooler path is the correct pilot choice.
- Do not use the transaction pooler for Prisma here unless you also adjust prepared-statement behavior.

## Environment setup

Set these values in the pilot environment:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_KEY=...
FRONTEND_URL=https://app.example.tld
API_PUBLIC_URL=https://api.example.tld/api
VITE_API_URL=https://api.example.tld/api
ARZT_PASSWORD=...
```

Recommended Supabase-specific practice:
- Create a dedicated `prisma` DB role for migrations/app access.
- Use a separate secret from the default `postgres` user where possible.

## Migration and seed flow

Run this against the Supabase pilot project:

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

If you need a clean pilot reset, use the existing guarded script:

```bash
set SUPABASE_RESET_CONFIRM=DELETE_APP_DATA
set SUPABASE_RESET_BACKUP_ACK=I_HAVE_A_BACKUP
npm run db:reset:app-data
```

## Hosting topology

Preferred pilot topology:
- Frontend on Netlify or equivalent
- Backend on a persistent container/VM
- Supabase for Postgres

Best practice for auth and CSRF:
- Prefer one site boundary, or at least custom subdomains under the same registrable domain.
- Example: `app.example.de` and `api.example.de`

Why:
- This keeps cookie behavior predictable.
- It aligns better with the current browser auth model.
- It reduces cross-site issues during the pilot.

If you keep the frontend on a different site than the API:
- The new CSRF bootstrap path will work.
- Staff bearer-token flows will work.
- Patient cookie-only flows are still less robust than a same-site deployment.

## Deployment sequence

1. Prepare the Supabase project and create the Prisma DB user.
2. Set production secrets and URLs in backend and frontend environments.
3. Run `npm run type-check`.
4. Run `npm run build`.
5. Run `npx prisma migrate deploy`.
6. Run `npx prisma db seed`.
7. Deploy backend.
8. Deploy frontend.
9. Run the E2E smoke set.
10. Run the full E2E matrix.

## Exit criteria for pilot go-live

- Health endpoints answer successfully.
- Staff login works for `arzt`, `mfa`, and `admin`.
- Patient session creation, answer submission, submit, and dashboard visibility all work against Supabase.
- Realtime updates work in doctor and MFA dashboards.
- Export/PVS/Tomedo paths are validated on a non-production tenant.

## Source references

- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Supabase connection guidance: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase DPA: https://supabase.com/downloads/docs/Supabase%2BDPA%2B260317.pdf
- Supabase TIA: https://supabase.com/downloads/docs/Supabase%2BTIA%2B250314.pdf
