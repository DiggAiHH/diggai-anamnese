import { Router, Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service.js';
import { billingNotifications } from '../services/billingNotifications.js';
import { billingMonitor } from '../services/billingMonitor.js';
import { stripe } from '../config/stripe.js';
import { getPrismaClientForDomain } from '../db.js';

const router = Router();
const prisma = getPrismaClientForDomain('company');

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * IMPORTANT: This route must be registered BEFORE express.json() middleware
 * to receive the raw body for signature verification
 */
router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    console.error('[Webhook] Missing stripe signature or webhook secret');
    return res.status(400).send('Missing signature or secret');
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Webhook] Signature verification failed: ${errorMessage}`);
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  // Handle the event
  console.log(`[Webhook] Processing: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        console.log(`[Webhook] Checkout completed: ${session.id}`);

        // Send Welcome Email
        if (session.customer_email) {
          await billingNotifications.sendWelcomeEmail(
            {
              email: session.customer_email,
              name: session.customer_details?.name,
            },
            {
              tier: session.metadata?.planId?.toUpperCase() || 'STARTER',
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            }
          );
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await subscriptionService.handleInvoicePaid(invoice.subscription);
          console.log(`[Webhook] Invoice paid: ${invoice.subscription}`);

          // Send Invoice Email
          if (invoice.customer_email && invoice.amount_due > 0) {
            await billingNotifications.sendInvoiceAvailable(
              { email: invoice.customer_email },
              {
                amount: invoice.amount_due / 100,
                pdfUrl: invoice.invoice_pdf,
                period: `${new Date(invoice.period_start * 1000).toLocaleDateString('de-DE')} - ${new Date(invoice.period_end * 1000).toLocaleDateString('de-DE')}`,
              }
            );
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await subscriptionService.handleInvoicePaymentFailed(invoice.subscription);
          console.log(`[Webhook] Invoice payment failed: ${invoice.subscription}`);

          // Get subscription details for notification
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const customer = await stripe.customers.retrieve(invoice.customer as string);

          if (!customer.deleted && customer.email) {
            await billingNotifications.sendPaymentFailed(
              {
                email: customer.email,
                name: customer.name || undefined,
              },
              {
                tier: subscription.metadata?.planId?.toUpperCase() || 'STARTER',
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                amount: invoice.amount_due / 100,
              },
              invoice.attempt_count || 1
            );
          }

          // Alert monitoring
          await billingMonitor.checkAndAlert();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await subscriptionService.handleSubscriptionDeleted(subscription.id);
        console.log(`[Webhook] Subscription deleted: ${subscription.id}`);

        // Send cancellation email
        const customer = await stripe.customers.retrieve(subscription.customer);
        if (!customer.deleted && customer.email) {
          await billingNotifications.sendSubscriptionCancelled(
            {
              email: customer.email,
              name: customer.name || undefined,
            },
            {
              tier: subscription.metadata?.planId?.toUpperCase() || 'STARTER',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await subscriptionService.handleSubscriptionUpdated(subscription.id, subscription.status);
        console.log(`[Webhook] Subscription updated: ${subscription.id}, status: ${subscription.status}`);

        // Update local subscription data
        await prisma.subscription.updateMany({
          where: { stripeSubId: subscription.id },
          data: {
            status: mapStripeStatus(subscription.status) as any,
            endsAt: subscription.cancel_at_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
          },
        });
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as any;
        console.log(`[Webhook] Trial ending soon: ${subscription.id}`);

        // Send trial ending notification (3 Tage vorher)
        const customer = await stripe.customers.retrieve(subscription.customer);
        if (!customer.deleted && customer.email) {
          await billingNotifications.sendTrialEndingSoon(
            {
              email: customer.email,
              name: customer.name || undefined,
            },
            {
              tier: subscription.metadata?.planId?.toUpperCase() || 'STARTER',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              trialEndsAt: new Date(subscription.trial_end * 1000),
            }
          );
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        console.log(`[Webhook] Payment intent failed: ${paymentIntent.id}`);

        // Update payment transaction status
        await (prisma as any).paymentTransaction.updateMany({
          where: { providerIntentId: paymentIntent.id },
          data: {
            status: 'FAILED',
            metadata: {
              failureMessage: paymentIntent.last_payment_error?.message,
              failedAt: new Date().toISOString(),
            },
          },
        });

        // Check for alerts
        await billingMonitor.checkAndAlert();
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        console.log(`[Webhook] Payment intent succeeded: ${paymentIntent.id}`);

        // Update payment transaction status
        await (prisma as any).paymentTransaction.updateMany({
          where: { providerIntentId: paymentIntent.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as any;
        console.log(`[Webhook] Charge refunded: ${charge.id}`);

        // Update payment transaction status
        await (prisma as any).paymentTransaction.updateMany({
          where: { providerIntentId: charge.payment_intent },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
          },
        });
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Webhook] Error handling ${event.type}:`, errorMessage);

    // Log to monitoring
    // @ts-ignore
    await billingMonitor.sendAlert({
      type: 'WEBHOOK_ERROR',
      severity: 'WARNING',
      message: `Webhook ${event.type} failed: ${errorMessage}`,
      metrics: await billingMonitor.getPaymentMetrics(1),
    });

    // Return 500 to trigger Stripe retry
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Helper function to map Stripe status to internal status
function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'ACTIVE',
    'canceled': 'CANCELLED',
    'incomplete': 'PAST_DUE',
    'incomplete_expired': 'CANCELLED',
    'past_due': 'PAST_DUE',
    'paused': 'PAST_DUE',
    'trialing': 'TRIAL',
    'unpaid': 'PAST_DUE',
  };
  return statusMap[stripeStatus] || 'PAST_DUE';
}

export default router;
