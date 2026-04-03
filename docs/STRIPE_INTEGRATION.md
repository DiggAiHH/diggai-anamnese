# Stripe Integration v3 - Real Payment Processing

Diese Dokumentation beschreibt die vollständige Stripe Integration für das DiggAI Anamnese Platform Subscription Management.

## Übersicht

Die Stripe Integration verwendet **Stripe Elements** und **Stripe Checkout** für PCI-Compliance Level 1. Das bedeutet:

- ✅ Keine Kreditkarten-Daten werden in unserem Backend gespeichert
- ✅ Keine eigene PCI-DSS Compliance notwendig
- ✅ Sichere Zahlungsabwicklung durch Stripe
- ✅ Unterstützung für Apple Pay, Google Pay, SEPA-Lastschrift
- ✅ Echte Stripe Payment Intents für Patientenzahlungen
- ✅ Stripe Checkout Sessions für Subscription Sign-up

## Architektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  Stripe.js SDK  │────▶│  Stripe API     │
│  (Components)   │     │  (Elements)     │     │  (PCI-Compliant)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         │                                               │
         ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│  Express API    │◄──────────────────────────│  Webhooks       │
│  (Billing       │  (Subscription Events)    │  (Signatures)   │
│   Service)      │                           └─────────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Prisma/DB      │
│  (Subscriptions)│
└─────────────────┘
```

## Konfiguration

### Environment Variables

```bash
# Backend (server-side only!)
STRIPE_SECRET_KEY=sk_test_...           # NEVER expose to frontend
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signature verification

# Price IDs (from Stripe Dashboard)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Frontend (public)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Stripe Dashboard Setup

1. **API Keys**: Kopieren Sie den Secret Key und Publishable Key
2. **Webhook Endpoint**: 
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: 
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
     - `customer.subscription.updated`
     - `customer.subscription.trial_will_end`
     - `checkout.session.completed`
3. **Products & Prices**: Erstellen Sie 3 Produkte mit Preisen für die Tiers
   - Starter: €79/Monat
   - Professional: €179/Monat
   - Enterprise: €399/Monat

## API Endpoints

### Billing Routes

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/billing/setup-intent` | Setup Intent für Payment Method erstellen |
| POST | `/api/billing/subscription` | Neue Subscription erstellen |
| GET | `/api/billing/subscription` | Subscription Status abrufen |
| DELETE | `/api/billing/subscription` | Subscription kündigen |
| GET | `/api/billing/payment-methods` | Gespeicherte Zahlungsmethoden |
| DELETE | `/api/billing/payment-methods/:id` | Zahlungsmethode entfernen |
| GET | `/api/billing/invoices` | Rechnungen abrufen |

### Checkout Routes

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/checkout/session` | Stripe Checkout Session erstellen |
| GET | `/api/checkout/session/:id` | Checkout Session Status |
| POST | `/api/checkout/verify` | Checkout verifizieren & sync to DB |
| POST | `/api/checkout/portal` | Stripe Customer Portal URL |

### Payment Routes (Patient Payments)

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/payment/intent` | Payment Intent erstellen (echte Stripe API) |
| POST | `/api/payment/nfc-charge` | NFC Tap-to-Pay |
| GET | `/api/payment/receipt/:id` | Quittung abrufen |
| POST | `/api/payment/refund/:id` | Transaktion erstatten |

### Webhooks

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/webhooks/stripe` | Stripe Webhook Events (raw body) |
| POST | `/api/billing/webhook` | Billing Webhook Events (raw body) |
| POST | `/api/payment/webhook` | Payment Webhook Events |

## Frontend Komponenten

### StripeProvider

```tsx
import { StripeProvider } from './components/billing';

function App() {
  return (
    <StripeProvider>
      <YourApp />
    </StripeProvider>
  );
}
```

### CheckoutFlow (Stripe Checkout)

```tsx
// In PricingSection.tsx
async function startCheckout(planId: string) {
  const res = await fetch('/api/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, email }),
  });
  const data = await res.json();
  window.location.href = data.url; // Redirect to Stripe
}
```

### PaymentMethods

```tsx
import { PaymentMethods } from './components/billing';

function BillingPage() {
  return <PaymentMethods />;
}
```

### InvoiceList

```tsx
import { InvoiceList } from './components/billing';

function BillingPage() {
  return <InvoiceList />;
}
```

### CheckoutForm (Stripe Elements)

```tsx
import { StripeProvider, CheckoutForm } from './components/billing';

function PaymentPage() {
  return (
    <StripeProvider>
      <CheckoutForm 
        onSuccess={() => navigate('/success')}
        onError={(err) => console.error(err)}
        returnUrl={`${window.location.origin}/success`}
      />
    </StripeProvider>
  );
}
```

## React Hooks

### useBilling

```tsx
import { useBilling } from './hooks/useBilling';

function SubscriptionManager() {
  const {
    subscription,
    paymentMethods,
    invoices,
    createSubscription,
    cancelSubscription,
    hasActiveSubscription,
    isInTrial,
    canUseAi,
  } = useBilling();

  if (subscription.isLoading) return <Spinner />;

  return (
    <div>
      <p>Status: {subscription.data?.subscription?.status}</p>
      <p>AI Quota: {subscription.data?.subscription?.aiQuotaUsed} / {subscription.data?.subscription?.aiQuotaTotal}</p>
    </div>
  );
}
```

## Flows

### 1. Neue Subscription mit Stripe Checkout

```
1. User wählt Tier auf Pricing Page
2. Frontend erstellt Checkout Session (POST /api/checkout/session)
3. Redirect zu Stripe Checkout URL
4. User gibt Zahlungsdaten auf Stripe ein
5. Stripe redirectet zu /checkout/success?session_id=xxx
6. Frontend verifiziert Checkout (POST /api/checkout/verify)
7. Subscription wird in DB erstellt/aktualisiert
8. 14-tägige Testphase beginnt
```

### 2. Payment Intent für Patientenzahlungen

```
1. Patient wählt Zahlung im Kiosk
2. Frontend erstellt Payment Intent (POST /api/payment/intent)
3. Backend erstellt echten Stripe PaymentIntent
4. Frontend erhält clientSecret
5. Stripe.js bestätigt Zahlung client-side
6. Webhook aktualisiert Transaktionsstatus in DB
```

### 3. Webhook Event Handling

```
1. Stripe sendet Event an /api/webhooks/stripe
2. Signature wird verifiziert (HMAC-SHA256)
3. Event wird verarbeitet:
   - checkout.session.completed → Subscription in DB erstellen
   - invoice.paid → Status ACTIVE, Reset Quota
   - invoice.payment_failed → Status PAST_DUE
   - subscription.deleted → Status CANCELLED
```

### 4. Subscription Kündigen

```
1. User klickt "Kündigen" im Portal
2. DELETE /api/billing/subscription
3. Stripe: cancel_at_period_end = true
4. User kann bis Periodende weiter nutzen
```

## Sicherheit

### Content Security Policy (CSP)

```typescript
// In server/index.ts
contentSecurityPolicy: {
  directives: {
    scriptSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    connectSrc: ["'self'", "https://api.stripe.com", "https://js.stripe.com"],
    frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    formAction: ["'self'", "https://*.stripe.com"],
  },
}
```

### Webhook Signature Verification

```typescript
const event = stripe.webhooks.constructEvent(
  payload,      // Raw body
  signature,    // stripe-signature header
  secret        // STRIPE_WEBHOOK_SECRET
);
```

### Rate Limiting

```typescript
// Payment endpoints haben strikte Limits
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 20, // 20 Requests pro 15 Minuten
});
```

### Wichtige Sicherheitsregeln

1. **Niemals** den Secret Key im Frontend verwenden
2. **Immer** Webhook Signatures verifizieren
3. **Niemals** Kreditkarten-Daten loggen
4. **Immer** HTTPS in Produktion verwenden
5. **IDempotency Keys** bei wiederholbaren Requests verwenden
6. **Raw body parsing** für Webhooks vor express.json()

## Testing

### Stripe Test Cards

| Karte | Nummer | Verhalten |
|-------|--------|-----------|
| Visa | `4242 4242 4242 4242` | Erfolgreich |
| Declined | `4000 0000 0000 0002` | Abgelehnt |
| 3D Secure | `4000 0025 0000 3155` | Authentifizierung erforderlich |
| SEPA | `DE89 3704 0044 0532 0130 00` | Erfolgreich |

### Webhook Testing (lokal)

```bash
# Stripe CLI installieren
stripe login

# Webhook forwarding starten
stripe listen --forward-to localhost:3001/api/webhooks

# Event triggern
stripe trigger invoice.payment_succeeded
stripe trigger checkout.session.completed
```

### E2E Tests

```bash
# Checkout Flow testen
npx playwright test e2e/stripe-checkout.spec.ts
```

## Troubleshooting

### "No such price"

- Price ID in Environment Variables prüfen
- Staging vs. Production API Keys
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_ENTERPRISE`

### Webhook 400 Error

- Webhook Secret prüfen (`STRIPE_WEBHOOK_SECRET`)
- Raw body parsing (vor express.json())
- Signature Header vorhanden?

### "Payment method not attached"

- Setup Intent vor Subscription erstellen
- Customer ID korrekt übergeben?

### CSP Errors

- CSP Headers prüfen (js.stripe.com, api.stripe.com erlaubt?)
- `connectSrc` und `frameSrc` konfiguriert?

## Deployment Checklist

- [ ] Stripe Account eingerichtet
- [ ] API Keys in Environment Variables
- [ ] Webhook Endpoint konfiguriert
- [ ] Products & Prices in Stripe erstellt
- [ ] Price IDs in Environment Variables
- [ ] Webhook Secret in Environment Variables
- [ ] HTTPS in Produktion
- [ ] CSP Headers aktualisiert
- [ ] Rate Limiting aktiviert
- [ ] E2E Tests durchgeführt

## Support

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Docs: https://stripe.com/docs
- PCI Compliance: https://stripe.com/guides/pci-compliance
- DiggAI Support: support@diggai.de
