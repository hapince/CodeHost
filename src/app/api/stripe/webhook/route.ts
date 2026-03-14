import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import getStripe from '@/lib/stripe';
import Stripe from 'stripe';

// Stripe webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    // If webhook secret is configured, verify signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 400 }
        );
      }
    } else {
      // If no webhook secret, parse the event directly (for local development)
      event = JSON.parse(body) as Stripe.Event;
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const paymentType = session.metadata?.type;

      if (paymentType === 'product_order') {
        // Handle product order payment
        const orderId = session.metadata?.orderId;
        const userId = session.metadata?.userId;
        const shortfall = parseFloat(session.metadata?.shortfall || '0');

        if (orderId && userId) {
          const order = await prisma.productOrder.findUnique({ where: { id: orderId } });
          if (order && order.status === 'PENDING_PAYMENT') {
            await prisma.$transaction([
              prisma.productOrder.update({
                where: { id: orderId },
                data: {
                  status: 'PAID',
                  paidAmount: order.totalAmount,
                  stripeSessionId: session.id,
                },
              }),
            ]);

            await prisma.notification.create({
              data: {
                type: 'SYSTEM',
                title: 'Order Payment Confirmed',
                content: `Your order ${order.orderNo} has been paid successfully. Total: $${order.totalAmount.toFixed(2)}.`,
                userId: userId,
                link: '/orders',
              },
            });

            console.log(`Product order paid: orderId=${orderId}, user=${userId}, shortfall=$${shortfall}`);
          }
        }
      } else {
        // Handle top-up payment (original logic)
        const topUpId = session.metadata?.topUpId;
        const userId = session.metadata?.userId;
        const amount = parseFloat(session.metadata?.amount || '0');

        if (!topUpId || !userId || !amount) {
          console.error('Missing metadata in checkout session:', session.id);
          return NextResponse.json({ received: true });
        }

        const topUp = await prisma.topUp.findUnique({ where: { id: topUpId } });
        if (!topUp) {
          console.error('TopUp record not found:', topUpId);
          return NextResponse.json({ received: true });
        }

        if (topUp.status === 'COMPLETED') {
          return NextResponse.json({ received: true });
        }

        await prisma.$transaction([
          prisma.topUp.update({
            where: { id: topUpId },
            data: {
              status: 'COMPLETED',
              stripePaymentId: session.payment_intent as string,
            },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { balance: { increment: amount } },
          }),
        ]);

        await prisma.notification.create({
          data: {
            type: 'SYSTEM',
            title: 'Top-up successful',
            content: `$${amount.toFixed(2)} has been added to your balance.`,
            userId: userId,
            link: '/profile',
          },
        });

        console.log(`Top-up completed: user=${userId}, amount=$${amount}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
