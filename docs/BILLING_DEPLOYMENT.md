# Billing Deployment Guide

## Pre-Deployment Checklist

### 1. Stripe Account Setup ⏱️ 15 Min

- [ ] Stripe Account erstellt (live mode)
- [ ] Geschäftsdaten verifiziert
- [ ] Bankkonto hinzugefügt
- [ ] Steuerinformationen hinterlegt

### 2. Stripe Products & Prices ⏱️ 10 Min

Erstelle 3 Produkte im Stripe Dashboard:

| Produkt | Preis (monatlich) | Price ID |
|---------|-------------------|----------|
| Starter | €79,00 | `price_xxx` |
| Professional | €179,00 | `price_xxx` |
| Enterprise | €399,00 | `price_xxx` |

**Aktionen:**
1. Stripe Dashboard → Products → Add Product
2. Name: "DiggAI Starter"
3. Pricing: €79,00 / month
4. Wiederholen für Professional & Enterprise
5. Price IDs kopieren für Environment Variables

### 3. Webhook Endpoints ⏱️ 10 Min

**Production:**
- URL: `https://api.diggai.de/api/webhooks/stripe`
- Events:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

**Aktionen:**
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint
3. Signing secret kopieren (`whsec_...`)

### 4. Environment Variables ⏱️ 5 Min

```bash
# Production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 5. Datenbank Migration ⏱️ 5 Min

```bash
# Prisma Migration
npx prisma migrate dev --name add_billing_fields

# Oder auf Production
npx prisma migrate deploy
```

**Prüfung:**
- [ ] `subscription` Tabelle existiert
- [ ] `paymentTransaction` Tabelle existiert
- [ ] Indexe auf `stripeSubId`, `stripeCustId`

---

## Deployment Schritte

### Schritt 1: Pre-Flight Check (5 Min)

```bash
# Check Script ausführen
node scripts/deploy-billing-check.mjs
```

Erwartete Ausgabe:
```
✅ Stripe API Key valid
✅ Webhook endpoint configured
✅ Database connection OK
✅ All price IDs set
✅ SMTP configured (optional)
✅ Redis configured (optional)
```

### Schritt 2: Backend Deployment (10 Min)

```bash
# 1. Code deployen
git push origin main

# 2. Server neustarten
ssh server "cd /app && docker-compose restart app"

# 3. Health Check
curl https://api.diggai.de/api/health
```

### Schritt 3: Frontend Deployment (5 Min)

```bash
# Build
npm run build

# Deploy to Netlify
npm run deploy:prod
```

### Schritt 4: Post-Deployment Tests (10 Min)

```bash
# 1. Stripe Webhook testen
stripe trigger checkout.session.completed

# 2. API Health Check
curl https://api.diggai.de/api/billing-analytics/health

# 3. E2E Tests
npm run test:e2e:prod
```

**Manuelle Tests:**
- [ ] Checkout Flow mit Test-Karte
- [ ] Subscription Status prüfen
- [ ] Email Notifications
- [ ] Webhook Events in Logs

---

## Rollback Plan

### Automatisches Rollback

Wenn Health Checks fehlschlagen:

```bash
# Vorheriges Image deployen
docker-compose -f docker-compose.prod.yml up -d --no-deps --build app-previous

# Stripe Webhooks deaktivieren
# (Im Stripe Dashboard)
```

### Manuelles Rollback

1. **Code:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Datenbank:**
   ```bash
   # Backup einspielen
   pg_restore billing_backup.sql
   ```

3. **Stripe:**
   - Webhook Endpoint deaktivieren
   - Subscriptions manuell kündigen (falls nötig)

---

## Monitoring

### Checks nach Deployment

**Sofort (0-1h):**
- [ ] Keine 500 Errors
- [ ] Webhooks werden empfangen
- [ ] Checkout funktioniert

**Kurzfristig (1-24h):**
- [ ] Success Rate > 95%
- [ ] Keine failed payments
- [ ] Emails werden versendet

**Langfristig (1-7 Tage):**
- [ ] MRR Entwicklung
- [ ] Churn Rate normal
- [ ] Support Tickets

### Alerts

Slack Webhook für:
- Payment Success Rate < 95%
- Webhook Errors > 5/h
- Failed Payments > 10/h

---

## Troubleshooting

### "No such price" Error

**Ursache:** Price ID falsch oder aus anderem Stripe Account

**Lösung:**
```bash
# Price IDs prüfen
echo $STRIPE_PRICE_STARTER
stripe prices retrieve price_xxx
```

### Webhook 400 Error

**Ursache:** Signature Verification fehlgeschlagen

**Lösung:**
1. Webhook Secret prüfen
2. Raw Body Parsing aktiviert?
3. Stripe CLI Forwarding läuft?

### CSP Errors im Browser

**Ursache:** Stripe Domains nicht in CSP

**Lösung:**
```javascript
// server/index.ts
connectSrc: ["'self'", "https://api.stripe.com", "https://js.stripe.com"]
```

---

## Kontakte

**Stripe Support:**
- Dashboard: https://dashboard.stripe.com
- Support: https://support.stripe.com

**DiggAI Team:**
- On-Call: oncall@diggai.de
- Slack: #billing-alerts
