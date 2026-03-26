// ─── Stripe Provider ───────────────────────────────────────
// Wraps application with Stripe Elements context
// PCI-Compliant: No card data touches our servers

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { type ReactNode, useMemo } from 'react';

// Load Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeProviderProps {
  children: ReactNode;
  options?: StripeElementsOptions;
}

/**
 * Stripe Elements Provider
 * 
 * Usage:
 * ```tsx
 * <StripeProvider>
 *   <CheckoutForm />
 * </StripeProvider>
 * ```
 */
export function StripeProvider({ children, options }: StripeProviderProps) {
  const defaultOptions: StripeElementsOptions = useMemo(() => ({
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#4A90E2',
        colorBackground: '#FFFFFF',
        colorText: '#2C5F8A',
        colorDanger: '#E07A5F',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          border: '1px solid #D9D9D9',
          padding: '12px',
        },
        '.Input:focus': {
          border: '2px solid #4A90E2',
          outline: 'none',
        },
      },
    },
    loader: 'auto',
  }), []);

  return (
    <Elements stripe={stripePromise} options={options || defaultOptions}>
      {children}
    </Elements>
  );
}

/**
 * Stripe Provider with Setup Intent
 * Use this when collecting payment method before creating subscription
 */
export function StripeSetupIntentProvider({ 
  children, 
  clientSecret 
}: { 
  children: ReactNode; 
  clientSecret: string;
}) {
  const options: StripeElementsOptions = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#4A90E2',
        colorBackground: '#FFFFFF',
        colorText: '#2C5F8A',
        colorDanger: '#E07A5F',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  }), [clientSecret]);

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}

export default StripeProvider;
