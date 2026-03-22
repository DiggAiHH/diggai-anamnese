# Stripe Integration Konfiguration

## Umgebungsvariablen

Füge folgende Variablen zu deiner `.env` Datei hinzu:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (für jeden Tarif)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Frontend URL für Redirects
FRONTEND_URL=http://localhost:5173
```

## Stripe CLI für lokale Entwicklung

Um Webhooks lokal zu testen:

```bash
# Stripe CLI installieren
npm install -g stripe

# Login
stripe login

# Webhook forwarding starten
stripe listen --forward-to http://localhost:3001/api/webhooks/stripe
```

Die CLI gibt dir das Webhook-Secret aus, das du als `STRIPE_WEBHOOK_SECRET` verwenden kannst.

## Tarifpläne

| Tarif | Preis | KI-Quota | Stripe Price ID |
|-------|-------|----------|-----------------|
| Starter | 49€/Monat | 100 Anfragen | `STRIPE_PRICE_STARTER` |
| Professional | 99€/Monat | Unbegrenzt | `STRIPE_PRICE_PROFESSIONAL` |
| Enterprise | 199€/Monat | Unbegrenzt | `STRIPE_PRICE_ENTERPRISE` |

## Webhook Events

Die folgenden Stripe-Events werden verarbeitet:

- `invoice.paid` — Zahlung erfolgreich, Quota wird zurückgesetzt
- `invoice.payment_failed` — Zahlung fehlgeschlagen, Status → PAST_DUE
- `customer.subscription.deleted` — Subscription gekündigt
- `customer.subscription.updated` — Subscription aktualisiert
- `customer.subscription.trial_will_end` — Trial endet bald
