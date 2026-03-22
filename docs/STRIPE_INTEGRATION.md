# Stripe Integration v2 - PCI-Compliant Billing

Diese Dokumentation beschreibt die Stripe Integration für das DiggAI Anamnese Platform Subscription Management.

## Übersicht

Die Stripe Integration verwendet **Stripe Elements** für PCI-Compliance Level 1. Das bedeutet:

- ✅ Keine Kreditkarten-Daten werden in unserem Backend gespeichert
- ✅ Keine eigene PCI-DSS Compliance notwendig
- ✅ Sichere Zahlungsabwicklung durch Stripe
- ✅ Unterstützung für Apple Pay, Google Pay, SEPA-Lastschrift

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
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

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
   - URL: `https://your-domain.com/api/webhooks`
   - Events: 
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
     - `customer.subscription.updated`
     - `customer.subscription.trial_will_end`
3. **Products & Prices**: Erstellen Sie 3 Produkte mit Preisen für die Tiers

## API Endpoints

### Billing Routes

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/billing/setup-intent` | Setup Intent für Payment Method erstellen |
| POST | `/api/billing/subscription` | Neue Subscription erstellen |
| GET | `/api/billing/subscription` | Subscription Status abrufen |
| DELETE | `/api/billing/subscription` | Subscription kündigen |
| GET | `/api/billing/payment-methods` | Gespeicherte Zahlungsmethoden |
| GET | `/api/billing/invoices` | Rechnungen abrufen |

### Webhook

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/webhooks` | Stripe Webhook Events (raw body) |

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

### PricingTable

```tsx
import { PricingTable } from './components/billing';

function SubscriptionPage() {
  return (
    <PricingTable 
      onSubscribe={(tier) => console.log('Selected:', tier)}
      currentTier={currentSubscription?.tier}
    />
  );
}
```

### CheckoutForm

```tsx
import { StripeProvider, CheckoutForm } from './components/billing';

function CheckoutPage() {
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

### 1. Neue Subscription mit Trial

```
1. User wählt Tier auf Pricing Page
2. Frontend erstellt Setup Intent (POST /api/billing/setup-intent)
3. Stripe Elements zeigt Payment Form
4. User gibt Kartendaten ein
5. Stripe bestätigt Setup Intent
6. Frontend erstellt Subscription (POST /api/billing/subscription)
7. Subscription wird mit 14-tägiger Testphase aktiviert
```

### 2. Webhook Event Handling

```
1. Stripe sendet Event an /api/webhooks
2. Signature wird verifiziert (HMAC-SHA256)
3. Event wird verarbeitet:
   - invoice.paid → Status ACTIVE, Reset Quota
   - invoice.payment_failed → Status PAST_DUE
   - subscription.deleted → Status CANCELLED
```

### 3. Subscription Kündigen

```
1. User klickt "Kündigen"
2. DELETE /api/billing/subscription
3. Stripe: cancel_at_period_end = true
4. User kann bis Periodende weiter nutzen
```

## Sicherheit

### Webhook Signature Verification

```typescript
const event = stripe.webhooks.constructEvent(
  payload,      // Raw body
  signature,    // stripe-signature header
  secret        // STRIPE_WEBHOOK_SECRET
);
```

### Wichtige Sicherheitsregeln

1. **Niemals** den Secret Key im Frontend verwenden
2. **Immer** Webhook Signatures verifizieren
3. **Niemals** Kreditkarten-Daten loggen
4. **Immer** HTTPS in Produktion verwenden
5. **IDempotency Keys** bei wiederholbaren Requests verwenden

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
```

## Troubleshooting

### "No such price"

- Price ID in Environment Variables prüfen
- Staging vs. Production API Keys

### Webhook 400 Error

- Webhook Secret prüfen
- Raw body parsing (vor express.json())
- Signature Header vorhanden?

### "Payment method not attached"

- Setup Intent vor Subscription erstellen
- Customer ID korrekt übergeben?

## Support

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Docs: https://stripe.com/docs
- PCI Compliance: https://stripe.com/guides/pci-compliance
