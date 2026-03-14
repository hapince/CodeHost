import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import getStripe from '@/lib/stripe';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Verify a Stripe checkout session and credit balance if not already done
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Retrieve the session from Stripe
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed', status: session.payment_status }, { status: 400 });
    }

    // Verify this session belongs to the authenticated user
    if (session.client_reference_id !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const topUpId = session.metadata?.topUpId;
    const amount = parseFloat(session.metadata?.amount || '0');

    if (!topUpId || !amount) {
      return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 });
    }

    // Check the top-up record
    const topUp = await prisma.topUp.findUnique({
      where: { id: topUpId },
    });

    if (!topUp) {
      return NextResponse.json({ error: 'Top-up record not found' }, { status: 404 });
    }

    // If already completed (by webhook), just return success
    if (topUp.status === 'COMPLETED') {
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { balance: true },
      });
      return NextResponse.json({
        success: true,
        message: 'Balance already credited',
        amount,
        balance: updatedUser?.balance || 0,
      });
    }

    // Credit the balance (webhook might not have fired yet)
    await prisma.$transaction([
      prisma.topUp.update({
        where: { id: topUpId },
        data: {
          status: 'COMPLETED',
          stripePaymentId: session.payment_intent as string,
        },
      }),
      prisma.user.update({
        where: { id: user.userId },
        data: {
          balance: { increment: amount },
        },
      }),
    ]);

    // Send notification
    await prisma.notification.create({
      data: {
        type: 'SYSTEM',
        title: 'Top-up successful',
        content: `$${amount.toFixed(2)} has been added to your balance.`,
        userId: user.userId,
        link: '/profile',
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { balance: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Balance credited successfully',
      amount,
      balance: updatedUser?.balance || 0,
    });
  } catch (error) {
    console.error('Verify session error:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}
