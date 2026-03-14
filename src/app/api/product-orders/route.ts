import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import getStripe from '@/lib/stripe';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

function generateOrderNo() {
  const now = new Date();
  const parts = [
    'PO',
    now.getFullYear().toString(),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0'),
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
    Math.random().toString(36).slice(2, 6).toUpperCase(),
  ];
  return parts.join('');
}

// POST /api/product-orders - Create order with payment flow
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { items, fromCart, shipping, paymentMethod } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order items are required' }, { status: 400 });
    }

    // Validate shipping info
    if (!shipping || !shipping.name || !shipping.phone || !shipping.address || !shipping.city || !shipping.zip || !shipping.country) {
      return NextResponse.json({ error: 'Shipping information is required' }, { status: 400 });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });
      if (!product || product.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Product not found or unavailable' }, { status: 400 });
      }

      let price = product.price;
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) {
          return NextResponse.json({ error: 'Variant not found' }, { status: 400 });
        }
        price = variant.price;
      }

      const qty = item.quantity || 1;
      totalAmount += price * qty;
      orderItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: qty,
        price,
      });
    }

    // Get user balance
    const userData = await prisma.user.findUnique({ where: { id: user.userId }, select: { balance: true, email: true, name: true } });
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    const balance = userData.balance;

    if (balance >= totalAmount) {
      // Sufficient balance - pay immediately
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.productOrder.create({
          data: {
            orderNo: generateOrderNo(),
            totalAmount,
            paidAmount: totalAmount,
            status: 'PAID',
            userId: user.userId,
            shippingName: shipping.name,
            shippingPhone: shipping.phone,
            shippingAddress: shipping.address,
            shippingCity: shipping.city,
            shippingState: shipping.state || null,
            shippingZip: shipping.zip,
            shippingCountry: shipping.country,
            items: { create: orderItems },
          },
          include: { items: { include: { product: true, variant: true } } },
        });

        await tx.user.update({
          where: { id: user.userId },
          data: { balance: { decrement: totalAmount } },
        });

        if (fromCart) {
          await tx.cartItem.deleteMany({ where: { userId: user.userId } });
        }

        return newOrder;
      });

      // Create notification for successful balance payment
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: 'Order Placed Successfully',
          content: `Your order ${order.orderNo} has been paid. Total: $${totalAmount.toFixed(2)}.`,
          userId: user.userId,
          link: '/orders',
        },
      });

      return NextResponse.json({ order, paid: true }, { status: 201 });
    } else {
      // Insufficient balance - create pending order, deduct available balance, go to Stripe for shortfall
      const shortfall = Math.round((totalAmount - balance) * 100) / 100;
      const paidFromBalance = balance;

      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.productOrder.create({
          data: {
            orderNo: generateOrderNo(),
            totalAmount,
            paidAmount: paidFromBalance,
            status: 'PENDING_PAYMENT',
            userId: user.userId,
            shippingName: shipping.name,
            shippingPhone: shipping.phone,
            shippingAddress: shipping.address,
            shippingCity: shipping.city,
            shippingState: shipping.state || null,
            shippingZip: shipping.zip,
            shippingCountry: shipping.country,
            items: { create: orderItems },
          },
          include: { items: { include: { product: true, variant: true } } },
        });

        if (paidFromBalance > 0) {
          await tx.user.update({
            where: { id: user.userId },
            data: { balance: { decrement: paidFromBalance } },
          });
        }

        if (fromCart) {
          await tx.cartItem.deleteMany({ where: { userId: user.userId } });
        }

        return newOrder;
      });

      // Create Stripe checkout session for the shortfall (only if not paypal)
      if (paymentMethod === 'paypal') {
        // For PayPal, return order info so client can trigger PayPal flow
        return NextResponse.json({
          order,
          paid: false,
          paymentMethod: 'paypal',
          shortfall,
          balanceUsed: paidFromBalance,
        }, { status: 201 });
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Order Payment - ${order.orderNo}`,
                description: `Pay remaining $${shortfall.toFixed(2)} for your order`,
              },
              unit_amount: Math.round(shortfall * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${appUrl}/orders?payment=success&orderId=${order.id}`,
        cancel_url: `${appUrl}/orders?payment=cancelled&orderId=${order.id}`,
        metadata: {
          type: 'product_order',
          orderId: order.id,
          userId: user.userId,
          shortfall: shortfall.toString(),
        },
        client_reference_id: user.userId,
        customer_email: userData.email,
      });

      await prisma.productOrder.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });

      return NextResponse.json({
        order,
        paid: false,
        stripeUrl: session.url,
        shortfall,
        balanceUsed: paidFromBalance,
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Failed to create order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

// GET /api/product-orders - Get user's product orders
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.productOrder.findMany({
        where: { userId: user.userId },
        include: {
          items: {
            include: {
              product: { select: { id: true, title: true, slug: true, mainImage: true } },
              variant: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.productOrder.count({ where: { userId: user.userId } }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Failed to get orders' }, { status: 500 });
  }
}
