// ─── Stripe Retry Utility ─────────────────────────────────
// Exponential Backoff für Stripe API Calls
// Handhabt Rate Limits und temporäre Fehler

import Stripe from 'stripe';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 Sekunde
  maxDelay: 10000,    // 10 Sekunden
  retryableErrors: [
    'rate_limit',
    'idempotency_key_in_use',
    'payment_intent_action_required',
    'stripe_connection_error',
  ],
};

export async function withStripeRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Prüfe ob Fehler retryable ist
      const stripeError = error as Stripe.errors.StripeError;
      const isRetryable = opts.retryableErrors?.includes(stripeError.code || '') ||
        (stripeError as any).type === 'idempotency_error' ||
        (stripeError as any).type === 'rate_limit_error' ||
        ((stripeError as any).httpStatus && (stripeError as any).httpStatus >= 500);

      if (!isRetryable || attempt === opts.maxRetries) {
        throw error;
      }

      // Exponential Backoff mit Jitter
      const delay = Math.min(
        opts.initialDelay! * Math.pow(2, attempt),
        opts.maxDelay!
      );
      const jitter = Math.random() * 1000; // Zufälliger Jitter bis 1s
      const waitTime = delay + jitter;

      console.log(`[StripeRetry] Attempt ${attempt + 1}/${opts.maxRetries!} failed, retrying in ${Math.round(waitTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// Spezifische Wrapper für häufige Operationen
export async function createPaymentIntentWithRetry(
  stripe: Stripe,
  params: Stripe.PaymentIntentCreateParams,
  idempotencyKey?: string
): Promise<Stripe.PaymentIntent> {
  return withStripeRetry(() =>
    stripe.paymentIntents.create(params, idempotencyKey ? { idempotencyKey } : undefined)
  );
}

export async function createCustomerWithRetry(
  stripe: Stripe,
  params: Stripe.CustomerCreateParams
): Promise<Stripe.Customer> {
  return withStripeRetry(() => stripe.customers.create(params));
}

export async function retrieveSubscriptionWithRetry(
  stripe: Stripe,
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return withStripeRetry(() =>
    stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'default_payment_method']
    })
  );
}
