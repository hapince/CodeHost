import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import getStripe from '@/lib/stripe';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Predefined top-up amounts (in dollars)
const ALLOWED_AMOUNTS = [5, 10, 20, 50, 100, 200];

// Create Stripe Checkout session for balance top-up
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { amount } = body;

    if (!amount || !ALLOWED_AMOUNTS.includes(amount)) {
      return NextResponse.json(
        { error: `Invalid amount. Allowed amounts: ${ALLOWED_AMOUNTS.join(', ')}` },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create a top-up record
    const topUp = await prisma.topUp.create({
      data: {
        amount,
        currency: 'usd',
        status: 'PENDING',
        userId: user.userId,
      },
    });

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `CodeHost Balance Top-Up`,
              description: `Add $${amount} to your CodeHost wallet`,
            },
            unit_amount: amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/profile?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/profile?topup=cancelled`,
      metadata: {
        topUpId: topUp.id,
        userId: user.userId,
        amount: amount.toString(),
      },
      client_reference_id: user.userId,
    });

    // Update top-up record with Stripe session ID
    await prisma.topUp.update({
      where: { id: topUp.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Get user's top-up history
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const topUps = await prisma.topUp.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(topUps);
  } catch (error) {
    console.error('Get top-up history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top-up history' },
      { status: 500 }
    );
  }
}
