# Live Deploy — 2026-04-22 Attempt Report

Status: **code shipped to GitHub master, two external blockers prevent
live cutover.**

---

## What worked

- All 8 local commits pushed to `origin/master` (a439c3c → 08489b2).
- CI pipeline unblocked after ~10 days of silent failure. Root cause was
  `npm ci` with no `--legacy-peer-deps` vs `rollup-plugin-visualizer`
  peerOptional on `rolldown@1.x`. Fix in commit 08489b2.
- GitHub Actions `CI` build/type-check/lint/unit-tests — **green**.
- GitHub Actions `Deploy to VPS` → internal `build` job **green**.

## What is blocked

### Blocker 1 — VPS git permission

```
deploy via SSH:
  error: cannot open '.git/FETCH_HEAD': Permission denied
  Process completed with exit code 1.
```

The SSH deploy step runs `git -C /opt/diggai/repo pull origin master`
but the deploy user cannot write to `.git/`. This has been failing on
every push since at least 2026-04-19. Likely the repo was cloned as
`root` and the deploy user differs.

**Fix (requires human SSH access, one-time):**

```bash
ssh diggai@<HETZNER_IP>
sudo chown -R diggai:diggai /opt/diggai/repo
# or whatever user VPS_USER GitHub secret maps to
```

After this chown, every future push auto-deploys.

### Blocker 2 — Netlify auto-deploy not firing

```
diggai.de ETag unchanged across the push cycle:
  f184a53f5b0aed4ec3f05b2f6bfd0daa-ssl
Live bundle: assets/index-CEa7cYBO.js
Built locally: assets/index-BGIBQ2Sa.js
```

Netlify is not rebuilding on master push. Either:
- The GitHub ↔ Netlify integration is disconnected, or
- The site is wired to a different branch (check Netlify Dashboard →
  Site configuration → Build & deploy → Continuous deployment).

**Fix options (either path unblocks go-live):**

A. **Re-link GitHub in the Netlify Dashboard.** One click,
   after-which every master push rebuilds + publishes automatically.

B. **Set `NETLIFY_AUTH_TOKEN` in this machine's env** (User env var on
   Windows). Then run:
   ```
   cd Ananmese/diggai-anamnese-master
   npm run deploy
   ```
   `scripts/deploy-guided.mjs` will build and ship to the site ID
   `d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90`.

## Unblocked side-effects of the current state

- `api.diggai.de` is still running the 2026-04-12 backend build
  (uptime 840,610 s ≈ 9.7 days). Fine — Run 1 added no API-breaking
  changes; session-summary writer and PatientConnection schema aren't
  yet called by any frontend code path.
- `diggai.de` is still serving the April-12 frontend bundle. The
  Run 1 UI changes (auth-token persistence, collaborative error-tone,
  admin bundle split) are **not yet visible to users**.
- The PatientConnection table **does not exist** in Supabase and the
  manual SQL migration `prisma/migrations_manual/20260421_add_patient_connections.sql`
  must still be applied via psql or via the `Migrate Production DB`
  workflow (manual-dispatch only).

## Next concrete step

Fix Blocker 1 (`ssh` + `chown`) and Blocker 2 (either re-link Netlify
in the dashboard or export `NETLIFY_AUTH_TOKEN` locally). Everything
else is wired and ready — the next push will publish.
