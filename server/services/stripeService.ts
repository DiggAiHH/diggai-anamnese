/**
 * @module stripeService
 * @description DiggAI SaaS-Abonnement-Verwaltung via Stripe
 *
 * Drei Preisstufen für Arztpraxen:
 *   STARTER      €79/Monat  — 1 Arzt, 200 Patienten/Monat
 *   PROFESSIONAL €189/Monat — 3 Ärzte, unbegrenzte Patienten + KI-Triage
 *   ENTERPRISE   €399/Monat — Alles + gematik TI + persönliches Onboarding
 *
 * Stripe Checkout Flow:
 *   1. POST /api/subscriptions/checkout → Checkout Session erstellen
 *   2. Redirect zu Stripe gehosteter Checkout-Seite
 *   3. Webhook: subscription.created → Praxis freischalten
 *   4. POST /api/subscriptions/portal → Kundportal für Kündigung/Änderung
 *
 * @env STRIPE_SECRET_KEY     Stripe Secret API Key (sk_live_* oder sk_test_*)
 * @env STRIPE_WEBHOOK_SECRET Stripe Webhook Signing Secret (whsec_*)
 * @env STRIPE_PRICE_STARTER        Stripe Price ID für Starter-Plan
 * @env STRIPE_PRICE_PROFESSIONAL   Stripe Price ID für Professional-Plan
 * @env STRIPE_PRICE_ENTERPRISE     Stripe Price ID für Enterprise-Plan
 * @env FRONTEND_URL          Basis-URL für Success/Cancel Redirects
 */

import Stripe from 'stripe';

// ─── Stripe Client ───────────────────────────────────────────
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY ist nicht konfiguriert');
        _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
    }
    return _stripe;
}

// ─── Preispläne ──────────────────────────────────────────────

export interface PricingPlan {
    id: 'starter' | 'professional' | 'enterprise';
    name: string;
    priceMonthly: number; // EUR, in Cent für Stripe
    description: string;
    features: string[];
    limits: {
        aerzte: number | 'unlimited';
        patienten: number | 'unlimited';
        ki: boolean;
        triage: boolean;
        gematikTI: boolean;
        telemedizin: boolean;
        support: string;
        onboarding: string;
        aiBerater: boolean;
    };
    highlighted: boolean;
    badge?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'starter',
        name: 'Starter',
        priceMonthly: 7900, // €79 in Cent
        description: 'Ideal für Einzelpraxen und Hausarztpraxen mit bis zu 200 Patienten pro Monat.',
        features: [
            '1 Arzt / 1 MFA',
            'Bis zu 200 Patienten/Monat',
            '270+ Anamnese-Fragen (13 Fachgebiete)',
            'DSGVO-konforme Datenspeicherung (AES-256)',
            'PDF-Export & eIDAS-Signatur',
            'PWA-Patientenportal',
            'E-Mail-Support (48h)',
        ],
        limits: {
            aerzte: 1,
            patienten: 200,
            ki: false,
            triage: false,
            gematikTI: false,
            telemedizin: false,
            support: 'E-Mail (48h)',
            onboarding: 'Selbst-Setup mit Dokumentation',
            aiBerater: false,
        },
        highlighted: false,
    },
    {
        id: 'professional',
        name: 'Professional',
        priceMonthly: 18900, // €189 in Cent
        description: 'Für wachsende Praxen mit KI-gestützter Triage und unbegrenzten Patienten.',
        features: [
            'Bis zu 3 Ärzte + unbegrenzt MFA',
            'Unbegrenzte Patienten/Monat',
            'KI-Triage (10 CRITICAL/WARNING Regeln)',
            'KI-Therapievorschläge (ICD-10-GM)',
            'Echtzeit-Dashboard (Socket.IO)',
            'Telemedizin-Modul',
            'DiggAI 5-Agenten-System',
            'Prioritäts-Support (24h)',
            'Geführtes Onboarding (Video-Call)',
        ],
        limits: {
            aerzte: 3,
            patienten: 'unlimited',
            ki: true,
            triage: true,
            gematikTI: false,
            telemedizin: true,
            support: 'Priorität (24h)',
            onboarding: 'Geführter Video-Call (60 Min)',
            aiBerater: true,
        },
        highlighted: true,
        badge: 'Empfohlen',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        priceMonthly: 39900, // €399 in Cent
        description: 'Für Facharztpraxen, MVZ und Klinikambulanzen mit vollem Funktionsumfang.',
        features: [
            'Unbegrenzte Ärzte + MFA',
            'Unbegrenzte Patienten/Monat',
            'Alles aus Professional',
            'gematik TI + ePA-Anbindung',
            'PVS-Integration (GDT/HL7)',
            'NFC Tap-to-Pay Kiosk',
            'Weißes Label (eigenes Logo)',
            'Persönlicher Implementierungsberater',
            'AI Berater (automatisierte Praxisoptimierung)',
            '24/7 Phone-Support + SLA 4h',
            'Persönliches Onboarding vor Ort (1 Tag)',
        ],
        limits: {
            aerzte: 'unlimited',
            patienten: 'unlimited',
            ki: true,
            triage: true,
            gematikTI: true,
            telemedizin: true,
            support: '24/7 Phone + SLA 4h',
            onboarding: 'Vor-Ort-Onboarding (1 Tag)',
            aiBerater: true,
        },
        highlighted: false,
        badge: 'Full-Stack',
    },
];

// ─── Stripe Checkout ─────────────────────────────────────────

interface CreateCheckoutOptions {
    planId: 'starter' | 'professional' | 'enterprise';
    praxisEmail: string;
    praxisName: string;
    successUrl?: string;
    cancelUrl?: string;
}

export async function createCheckoutSession(options: CreateCheckoutOptions): Promise<{ url: string; sessionId: string }> {
    const stripe = getStripe();
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';

    const priceIdMap: Record<string, string | undefined> = {
        starter: process.env.STRIPE_PRICE_STARTER,
        professional: process.env.STRIPE_PRICE_PROFESSIONAL,
        enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };

    const priceId = priceIdMap[options.planId];
    if (!priceId) {
        throw new Error(`Stripe Price ID für Plan "${options.planId}" ist nicht konfiguriert (STRIPE_PRICE_${options.planId.toUpperCase()})`);
    }

    const plan = PRICING_PLANS.find(p => p.id === options.planId)!;

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card', 'sepa_debit'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: options.praxisEmail,
        metadata: {
            praxisName: options.praxisName,
            planId: options.planId,
        },
        subscription_data: {
            metadata: {
                praxisName: options.praxisName,
                planId: options.planId,
            },
            trial_period_days: 14, // 14 Tage kostenlos testen
        },
        success_url: options.successUrl || `${frontend}/verwaltung?subscription=success&plan=${options.planId}`,
        cancel_url: options.cancelUrl || `${frontend}/landing?checkout=cancelled`,
        locale: 'de',
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        custom_text: {
            submit: { message: `Sie erhalten 14 Tage kostenlos. Danach €${(plan.priceMonthly / 100).toFixed(0)}/Monat.` },
        },
    });

    return { url: session.url!, sessionId: session.id };
}

// ─── Stripe Customer Portal ───────────────────────────────────

export async function createPortalSession(customerId: string): Promise<{ url: string }> {
    const stripe = getStripe();
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${frontend}/verwaltung/admin`,
    });

    return { url: session.url };
}

// ─── Webhook Handler ──────────────────────────────────────────

export interface StripeWebhookResult {
    type: string;
    customerId?: string;
    subscriptionId?: string;
    planId?: string;
    praxisName?: string;
    status?: string;
}

export function constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET ist nicht konfiguriert');
    return stripe.webhooks.constructEvent(payload, signature, secret);
}

export function parseWebhookEvent(event: Stripe.Event): StripeWebhookResult {
    const result: StripeWebhookResult = { type: event.type };

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            result.customerId = session.customer as string;
            result.subscriptionId = session.subscription as string;
            result.planId = session.metadata?.planId;
            result.praxisName = session.metadata?.praxisName;
            break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            const sub = event.data.object as Stripe.Subscription;
            result.customerId = sub.customer as string;
            result.subscriptionId = sub.id;
            result.status = sub.status;
            result.planId = sub.metadata?.planId;
            break;
        }
    }

    return result;
}

// ─── Consulting Booking (E-Mail-Benachrichtigung) ─────────────

export interface ConsultationRequest {
    name: string;
    email: string;
    praxis: string;
    telefon?: string;
    planInteresse: string;
    nachricht?: string;
    terminwunsch?: string;
}

export async function sendConsultationNotification(req: ConsultationRequest): Promise<void> {
    // Nodemailer ist bereits installiert — sendet an support@diggai.de
    try {
        const { createTransport } = await import('nodemailer');
        const transport = createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transport.sendMail({
            from: `"DiggAI Beratungs-Anfrage" <${process.env.SMTP_USER}>`,
            to: process.env.CONSULTING_EMAIL || 'support@diggai.de',
            subject: `Beratungsanfrage: ${req.praxis} — ${req.planInteresse}`,
            html: `
                <h2>Neue Beratungsanfrage</h2>
                <table>
                    <tr><td><b>Name:</b></td><td>${req.name}</td></tr>
                    <tr><td><b>Praxis:</b></td><td>${req.praxis}</td></tr>
                    <tr><td><b>E-Mail:</b></td><td>${req.email}</td></tr>
                    <tr><td><b>Telefon:</b></td><td>${req.telefon || '—'}</td></tr>
                    <tr><td><b>Plan-Interesse:</b></td><td>${req.planInteresse}</td></tr>
                    <tr><td><b>Terminwunsch:</b></td><td>${req.terminwunsch || 'Flexibel'}</td></tr>
                    <tr><td><b>Nachricht:</b></td><td>${req.nachricht || '—'}</td></tr>
                </table>
            `,
        });

        // Bestätigungs-E-Mail an den Interessenten
        await transport.sendMail({
            from: `"DiggAI GmbH" <${process.env.SMTP_USER}>`,
            to: req.email,
            subject: 'Ihre Beratungsanfrage bei DiggAI — Wir melden uns innerhalb von 24h',
            html: `
                <h2>Vielen Dank, ${req.name}!</h2>
                <p>Wir haben Ihre Beratungsanfrage für die Praxis <b>${req.praxis}</b> erhalten.</p>
                <p>Unser Team meldet sich innerhalb von 24 Stunden bei Ihnen.</p>
                <p>Bei dringenden Fragen erreichen Sie uns unter <a href="mailto:support@diggai.de">support@diggai.de</a>.</p>
                <hr>
                <p><small>DiggAI GmbH | support@diggai.de</small></p>
            `,
        });
    } catch (err) {
        // E-Mail-Fehler nicht als fatalen Fehler behandeln
        console.error('[Consulting] E-Mail-Versand fehlgeschlagen:', err);
    }
}
