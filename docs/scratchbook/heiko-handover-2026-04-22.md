# Heiko — Live-Deploy Unblock Handover

Date: 2026-04-22
Goal: unblock auto-deploy of `diggai.de` (frontend via Netlify) and
`api.diggai.de` (backend via Hetzner) so every push to `master` ships.
Estimated effort: **~10 minutes**, two isolated steps, no coding.

After you finish, write back "done" and the agent will verify live
state and ship Run 1.

---

## Step 1 — Fix VPS git permission (Hetzner, 3 minutes)

**Why:** GitHub Actions "Deploy to VPS" fails with
`error: cannot open '.git/FETCH_HEAD': Permission denied`.
The `.git/` directory in `/opt/diggai/repo` is owned by a user the
deploy SSH user cannot write as. This has been failing silently on
every push since 2026-04-12.

**Evidence:** https://github.com/DiggAiHH/diggai-anamnese/actions/runs/24766104924
(job "deploy" → step "Deploy via SSH")

**Do this:**

```bash
# 1. SSH to the production VPS
#    Host/user/key matches the GitHub repo secrets VPS_HOST / VPS_USER / VPS_SSH_KEY.
ssh diggai@api.diggai.de

# 2. Check current ownership
ls -la /opt/diggai/repo/.git/FETCH_HEAD  2>/dev/null || echo "no FETCH_HEAD yet — OK"
stat /opt/diggai/repo/.git | grep -i 'access\|uid\|gid'

# 3. Make diggai the owner of the whole repo
sudo chown -R diggai:diggai /opt/diggai/repo

# 4. Verify
ls -la /opt/diggai/repo/ | head -3
# → all entries should show `diggai diggai`

# 5. Test that git pull now works as diggai
cd /opt/diggai/repo
git pull origin master
# → should print "Updating ..." or "Already up to date."

exit
```

**Definition of done for Step 1:**
- `git pull origin master` inside `/opt/diggai/repo` succeeds **as the
  `diggai` user** (no sudo, no permission error).
- No more "Permission denied" in the next GitHub Actions deploy run.

---

## Step 2 — Wire Netlify auto-deploy (Dashboard, 5 minutes)

**Why:** The master push happened, but Netlify did not rebuild.
Live `diggai.de` bundle is still `index-CEa7cYBO.js` (April 12 build);
the freshly-built `index-BGIBQ2Sa.js` is not served anywhere. Netlify's
GitHub integration is either disconnected or wired to a non-master
branch.

**Do this:**

1. Open https://app.netlify.com/ and log in as the DiggAi account.
2. Pick the site that serves `https://diggai.de`.
   - If two sites both claim diggai.de, the one with domain
     "diggai.de" in *Domain management* is the live one.
3. Go to **Site configuration → Build & deploy → Continuous
   deployment**.
4. Under *Build settings*, confirm:
   - Repository: `DiggAiHH/diggai-anamnese`
   - Production branch: **`master`**
   - Build command: `npm run build`
   - Publish directory: `dist`
5. If the repository link says "no repository linked" or points to the
   wrong branch → click **Link repository** → choose GitHub →
   `DiggAiHH/diggai-anamnese` → branch `master`.
6. Scroll down to *Deploy contexts* and confirm:
   - Production: `master`
   - Branch deploys: *None* (per netlify.toml safety)
7. Click **Trigger deploy → Deploy site** once, manually, to confirm
   the wiring.

**Definition of done for Step 2:**
- Netlify Dashboard → *Deploys* shows a **new** deploy kicking off
  within ~30 s of your manual trigger.
- That deploy completes with state **Published**.
- `curl -sI https://diggai.de | grep -i etag` returns an ETag
  **different from** `f184a53f5b0aed4ec3f05b2f6bfd0daa-ssl`.

---

## Step 3 — Report back (30 seconds)

Reply with:

> **done** — VPS chown applied, Netlify relinked + test-deploy
> published. New Netlify ETag: `<etag from diggai.de>`.

Or, if one of the steps was not possible:

> **blocked on step N** — `<what stopped you>`.

---

## What the agent will do the moment you reply "done"

1. Re-probe `diggai.de` ETag + bundle hash → confirm it matches the
   freshly-built local hash.
2. Trigger / watch the next `Deploy to VPS` run → confirm green.
3. Re-probe `api.diggai.de` uptime → confirm restart (uptime resets
   from ~840k s to < 60 s).
4. Apply the one manual SQL migration
   `prisma/migrations_manual/20260421_add_patient_connections.sql`
   against Supabase (you'll need `SUPABASE_DB_PASS` set, or trigger the
   `Migrate Production DB` workflow manually).
5. Post the Run 1 → live scorecard delta.

---

## What is **not** being touched in this handover

- No secrets, passwords, or Supabase credentials need to leave the
  Netlify / Hetzner environments. Everything Heiko does is in UI
  dashboards and one SSH chown.
- The code changes are already on GitHub master (commits
  `a51d54a`, `0ea0d78`, `9ea0966`, `08489b2`, `d07573e`).
  Nothing to merge, rebase, or redo.
- TriageEngine, encryption keys, JWT secrets — untouched.
