# Stripe Development Setup

## Schnellstart

```bash
npm run stripe:dev
```

## Manuelles Setup

### 1. Stripe CLI installieren

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```bash
scoop install stripe
```

**Linux:**
```bash
snap install stripe
```

### 2. Login

```bash
stripe login
```

### 3. Webhook Forwarding starten

```bash
stripe listen --forward-to http://localhost:3001/api/webhooks/stripe
```

Kopiere das `whsec_` Secret in deine `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Test Events triggern

```bash
# Checkout erfolgreich
stripe trigger checkout.session.completed

# Zahlung erfolgreich
stripe trigger invoice.payment_succeeded

# Zahlung fehlgeschlagen
stripe trigger invoice.payment_failed

# Subscription gekündigt
stripe trigger customer.subscription.deleted
```

### 5. Testkarten

| Karte | Nummer | Ergebnis |
|-------|--------|----------|
| Erfolg | 4242 4242 4242 4242 | ✅ Erfolg |
| Ablehnung | 4000 0000 0000 0002 | ❌ Abgelehnt |
| 3D Secure | 4000 0025 0000 3155 | 🔐 Authentifizierung |

## Troubleshooting

### "stripe: command not found"
Stripe CLI ist nicht im PATH. Terminal neu starten oder manuell zum PATH hinzufügen.

### "Webhook signature verification failed"
Webhook Secret in `.env.local` prüfen. Muss mit `stripe listen` Ausgabe übereinstimmen.
