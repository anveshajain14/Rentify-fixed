import { stripe } from '../lib/stripe.js';
import dbConnect from '../lib/mongodb.js';
import Rental from '../models/Rental.js';

export async function stripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      try {
        await dbConnect();
        const rentalIdsRaw = session.metadata?.rentalIds;
        const rentalIds = rentalIdsRaw
          ? rentalIdsRaw.split(',').map((id) => id.trim()).filter(Boolean)
          : session.metadata?.rentalId
            ? [session.metadata.rentalId]
            : [];

        for (const rentalId of rentalIds) {
          await Rental.findByIdAndUpdate(rentalId, {
            paymentStatus: 'paid',
            rentalStatus: 'upcoming',
            stripeSessionId: session.id,
          });
          console.log(`Rental ${rentalId} payment completed`);
        }
      } catch (dbError) {
        console.error('Database update error:', dbError.message);
      }
    }
  }

  return res.json({ received: true });
}
