# Carotis-AI Demo Deploy

This deploy path is for the Rohde demo only. It must use synthetic cases only.
Do not upload patient data, research DICOM exports, or clinic identifiers.

## Architecture

- Single demo image: FastAPI backend plus static frontend served by nginx.
- SQLite persists under `/data`.
- Caddy terminates HTTPS with Let's Encrypt on Hetzner or any Docker host.
  The Compose stack builds Caddy with `github.com/mholt/caddy-ratelimit`.
- Fly.io is configured for region `fra`; Hetzner remains the preferred EU VM fallback.
- Demo access uses `X-Demo-Token`; only SHA-256 token hashes are stored in SQLite.

## Local Build

```powershell
cd "c:\Users\tubbeTEC\OneDrive\z\Documents\Claude\Projects\Carotis AI"
docker build -f deploy/Dockerfile.demo -t carotis-ai-demo:latest .
```

## Hetzner Docker Host

1. Create an Ubuntu 24.04 VM in Germany.
2. Point `app.carotis.diggai.de` to the VM IPv4 address.
3. Install Docker and Docker Compose.
4. Copy the repository to `/opt/carotis-ai`.
5. Create `/opt/carotis-ai/deploy/.env`:

```env
ACME_EMAIL=admin@example.org
API_KEY=replace-with-32-plus-character-secret
ADMIN_API_KEY=replace-with-32-plus-character-admin-secret
```

6. Start the stack:

```bash
cd /opt/carotis-ai/deploy
docker compose -f docker-compose.demo.yml --env-file .env up -d --build
```

7. Seed demo tokens with W-06 `code/scripts/generate_rohde_token.py`.
8. Verify:

```bash
curl -i https://app.carotis.diggai.de/robots.txt
curl -i -H "X-Demo-Token: <raw-token>" https://app.carotis.diggai.de/api/v1/demo/whoami
```

## Fly.io

1. Install and login:

```bash
fly auth login
```

2. Create the app and volume in Frankfurt:

```bash
fly apps create carotis-ai-demo
fly volumes create carotis_demo_data --region fra --size 1
```

3. Set secrets:

```bash
fly secrets set API_KEY=<32-plus-character-secret>
fly secrets set ADMIN_API_KEY=<32-plus-character-admin-secret>
```

4. Deploy:

```bash
fly deploy --config deploy/fly.toml
```

5. Attach `app.carotis.diggai.de` in Fly DNS/certificates, then verify `/robots.txt`.

## Token Gate

Demo tokens are raw random strings handed to invited reviewers. The database stores
only `sha256(raw_token)`. Tokens expire after 30 days and carry a quota via
`requests_used` and `max_requests`.

The demo endpoints are:

- `GET /api/v1/demo/whoami`
- `POST /api/v1/demo/log-walkthrough-step`

Each accepted demo request writes or consumes quota. Walkthrough logs write an
append-only audit event with:

```json
{"metadata": {"demo_token_label": "rohde-2026-04-30"}}
```

## Operational Notes

- `robots.txt` returns `Disallow: /`.
- `X-Robots-Tag` is emitted by nginx and Caddy.
- The production edge-server remains local-first and offline; this cloud demo is
  for synthetic data only.
