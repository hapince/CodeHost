import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import paypalClient, { checkoutNodeJssdk } from '@/lib/paypal';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/paypal/capture-order - Capture (confirm) a PayPal order after user approval
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { paypalOrderId, type, orderId, topUpId, amount } = await req.json();

    if (!paypalOrderId) {
      return NextResponse.json({ error: 'PayPal order ID is required' }, { status: 400 });
    }

    // Capture the order
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});
    const captureResponse = await paypalClient.execute(request);

    if (captureResponse.result.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Payment was not completed' }, { status: 400 });
    }

    if (type === 'product_order' && orderId) {
      // Update product order status to PAID
      const order = await prisma.productOrder.findUnique({ where: { id: orderId } });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (order.status === 'PAID') {
        return NextResponse.json({ message: 'Order already paid' });
      }

      await prisma.productOrder.update({
        where: { id: orderId },
        data: { status: 'PAID', paidAmount: order.totalAmount },
      });

      // Send notification
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: 'Order Payment Confirmed',
          content: `Your order ${order.orderNo} has been paid via PayPal. Total: $${order.totalAmount.toFixed(2)}.`,
          userId: user.userId,
          link: '/orders',
        },
      });

      return NextResponse.json({ success: true, message: 'Order payment confirmed' });
    } else if (type === 'topup' && topUpId) {
      // Handle top-up
      const topUp = await prisma.topUp.findUnique({ where: { id: topUpId } });
      if (!topUp) {
        return NextResponse.json({ error: 'Top-up record not found' }, { status: 404 });
      }

      if (topUp.status === 'COMPLETED') {
        return NextResponse.json({ message: 'Top-up already completed' });
      }

      await prisma.$transaction([
        prisma.topUp.update({
          where: { id: topUpId },
          data: { status: 'COMPLETED', stripeSessionId: `paypal_${paypalOrderId}` },
        }),
        prisma.user.update({
          where: { id: user.userId },
          data: { balance: { increment: topUp.amount } },
        }),
      ]);

      // Send notification
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: 'Top-Up Successful',
          content: `$${topUp.amount.toFixed(2)} has been added to your balance via PayPal.`,
          userId: user.userId,
          link: '/profile',
        },
      });

      return NextResponse.json({ success: true, message: 'Top-up successful', amount: topUp.amount });
    } else {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('PayPal capture order error:', error);
    return NextResponse.json({ error: 'Failed to capture PayPal payment' }, { status: 500 });
  }
}
