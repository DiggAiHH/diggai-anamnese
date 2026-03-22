import { Router, Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service.js';
import { stripe } from '../config/stripe.js';

const router = Router();

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
    console.error('Missing stripe signature or webhook secret');
    return res.status(400).send('Missing signature or secret');
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  // Handle the event
  console.log(`Processing Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await subscriptionService.handleInvoicePaid(invoice.subscription);
          console.log(`Invoice paid for subscription: ${invoice.subscription}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await subscriptionService.handleInvoicePaymentFailed(invoice.subscription);
          console.log(`Invoice payment failed for subscription: ${invoice.subscription}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await subscriptionService.handleSubscriptionDeleted(subscription.id);
        console.log(`Subscription deleted: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await subscriptionService.handleSubscriptionUpdated(subscription.id, subscription.status);
        console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as any;
        console.log(`Trial ending soon for subscription: ${subscription.id}`);
        // TODO: Send notification email to customer
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error handling webhook: ${errorMessage}`);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
