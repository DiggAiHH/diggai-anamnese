# Billing API Documentation

## Base URL
```
https://api.diggai.de/api
```

## Authentication
Alle Endpoints erfordern JWT Authentication via HttpOnly Cookie oder Header:
```
Authorization: Bearer <jwt-token>
```

---

## Endpoints

### Subscriptions

#### GET /billing/subscription
Aktuellen Subscription-Status abrufen.

**Response:**
```json
{
  "hasSubscription": true,
  "subscription": {
    "id": "sub_123",
    "tier": "PROFESSIONAL",
    "status": "ACTIVE",
    "stripeStatus": "active",
    "currentPeriodEnd": 1712345678,
    "cancelAtPeriodEnd": false,
    "aiQuotaUsed": 45,
    "aiQuotaTotal": 500,
    "startedAt": "2024-01-01T00:00:00Z",
    "endsAt": null
  }
}
```

**Status Codes:**
- `200` - Erfolg
- `401` - Nicht authentifiziert
- `404` - Keine Subscription gefunden

---

#### POST /billing/subscription
Neue Subscription erstellen.

**Request Body:**
```json
{
  "tier": "PROFESSIONAL",
  "trial": true
}
```

**Response:**
```json
{
  "subscriptionId": "sub_123",
  "clientSecret": "pi_123_secret_456",
  "status": "incomplete"
}
```

**Errors:**
- `400` - Ungültiger Tarif
- `409` - Bereits aktive Subscription

---

#### POST /billing/subscription/upgrade
Subscription upgraden.

**Request Body:**
```json
{
  "tier": "ENTERPRISE"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_123",
    "tier": "ENTERPRISE",
    "status": "ACTIVE"
  },
  "prorationInvoice": {
    "amount": 50.00,
    "currency": "EUR"
  }
}
```

---

#### DELETE /billing/subscription
Subscription kündigen (am Period-Ende).

**Response:**
```json
{
  "success": true,
  "cancelAtPeriodEnd": true,
  "currentPeriodEnd": 1712345678
}
```

---

### Checkout

#### POST /checkout/session
Stripe Checkout Session erstellen.

**Request Body:**
```json
{
  "planId": "professional",
  "email": "arzt@praxis.de",
  "successUrl": "https://app.diggai.de/checkout/success",
  "cancelUrl": "https://app.diggai.de/pricing"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_123",
  "url": "https://checkout.stripe.com/pay/cs_test_123"
}
```

---

#### POST /checkout/verify
Checkout Session verifizieren (nach Redirect).

**Request Body:**
```json
{
  "sessionId": "cs_test_123"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_123",
    "tier": "PROFESSIONAL",
    "status": "TRIAL",
    "trialEndsAt": "2024-02-01T00:00:00Z"
  }
}
```

---

#### POST /checkout/portal
Stripe Customer Portal URL erstellen.

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/test_123"
}
```

---

### Payment Methods

#### GET /billing/payment-methods
Gespeicherte Zahlungsmethoden abrufen.

**Response:**
```json
{
  "methods": [
    {
      "id": "pm_123",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "expMonth": 12,
        "expYear": 2025
      }
    }
  ]
}
```

---

#### POST /billing/setup-intent
Setup Intent für neue Zahlungsmethode erstellen.

**Response:**
```json
{
  "clientSecret": "seti_123_secret_456",
  "customerId": "cus_123"
}
```

---

#### DELETE /billing/payment-methods/:id
Zahlungsmethode entfernen.

**Response:**
```json
{
  "success": true,
  "message": "Payment method removed"
}
```

---

### Invoices

#### GET /billing/invoices
Rechnungen abrufen.

**Response:**
```json
{
  "invoices": [
    {
      "id": "in_123",
      "number": "A1B2C3D4",
      "status": "paid",
      "amountDue": 17900,
      "amountPaid": 17900,
      "currency": "eur",
      "created": 1712345678,
      "periodStart": 1709251200,
      "periodEnd": 1711929600,
      "pdfUrl": "https://pay.stripe.com/invoice/..."
    }
  ],
  "upcoming": {
    "amountDue": 17900,
    "currency": "eur",
    "periodStart": 1714521600,
    "periodEnd": 1717200000
  }
}
```

---

### Payment (Patient Payments)

#### POST /payment/intent
Payment Intent für Patientenzahlung erstellen.

**Request Body:**
```json
{
  "sessionId": "sess_123",
  "patientId": "pat_456",
  "amount": 29.99,
  "currency": "EUR",
  "type": "IGEL",
  "description": "IGeL-Leistung: Laborwerte"
}
```

**Response:**
```json
{
  "id": "tx_123",
  "clientSecret": "pi_123_secret_456",
  "providerIntentId": "pi_123",
  "status": "PENDING"
}
```

---

#### GET /payment/receipt/:id
Zahlungsquittung abrufen.

**Response:**
```json
{
  "id": "tx_123",
  "transactionId": "tx_123",
  "amount": 29.99,
  "currency": "EUR",
  "type": "IGEL",
  "status": "COMPLETED",
  "receiptUrl": "https://pay.stripe.com/receipts/...",
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:31:00Z"
}
```

---

## Webhooks

Stripe sendet Events an:
```
POST /webhooks/stripe
POST /billing/webhook
```

**Wichtig:** Raw Body Parsing (nicht JSON!) für Signature Verification.

**Events:**
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

---

## Error Codes

| Code | Bedeutung |
|------|-----------|
| `BILLING_001` | Keine aktive Subscription |
| `BILLING_002` | Upgrade nicht möglich |
| `BILLING_003` | Zahlung abgelehnt |
| `BILLING_004` | Stripe API Fehler |
| `BILLING_005` | Ungültiger Tarif |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Alle Billing Endpoints | 20 Requests / 15 Min |
| Webhooks | 100 Requests / Min |

---

## Testmodus

**Test Cards:**
- `4242 4242 4242 4242` - Erfolgreich
- `4000 0000 0000 0002` - Abgelehnt
- `4000 0025 0000 3155` - 3D Secure

**Test Webhook Secret:**
```
whsec_test_...
```

---

## Changelog

### v3.0.0 (2026-04-02)
- Initial release mit Stripe Integration
- Checkout Sessions
- Subscription Management
- Payment Methods
