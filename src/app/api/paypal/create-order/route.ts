import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import paypalClient, { checkoutNodeJssdk } from '@/lib/paypal';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/paypal/create-order - Create a PayPal order for product order shortfall or topup
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { type, amount, orderId, topUpId } = await req.json();

    if (!type || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
          description: type === 'topup'
            ? `CodeHost Balance Top-Up $${amount.toFixed(2)}`
            : `Order Payment $${amount.toFixed(2)}`,
          custom_id: JSON.stringify({ type, orderId, topUpId, userId: user.userId }),
        },
      ],
    });

    const response = await paypalClient.execute(request);
    const paypalOrderId = response.result.id;

    return NextResponse.json({ paypalOrderId });
  } catch (error: any) {
    console.error('PayPal create order error:', error);
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 });
  }
}
