import Stripe from 'stripe';

let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

export default getStripe;
