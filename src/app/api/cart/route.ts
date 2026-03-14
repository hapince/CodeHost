import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/cart - Get current user's cart
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: user.userId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            mainImage: true,
            status: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = items.reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.product.price;
      return sum + price * item.quantity;
    }, 0);

    return NextResponse.json({ items, totalAmount, count: items.length });
  } catch (error) {
    console.error('Failed to fetch cart:', error);
    return NextResponse.json({ error: 'Failed to get cart' }, { status: 500 });
  }
}

// POST /api/cart - Add item to cart
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { productId, variantId, quantity } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check product exists and is active
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
    }

    // Check if already in cart
    const existing = await prisma.cartItem.findUnique({
      where: {
        userId_productId_variantId: {
          userId: user.userId,
          productId,
          variantId: variantId || null,
        },
      },
    });

    if (existing) {
      // Update quantity
      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (quantity || 1) },
        include: {
          product: { select: { id: true, title: true, slug: true, price: true, mainImage: true, status: true } },
          variant: { select: { id: true, name: true, price: true } },
        },
      });
      return NextResponse.json(updated);
    }

    const item = await prisma.cartItem.create({
      data: {
        userId: user.userId,
        productId,
        variantId: variantId || null,
        quantity: quantity || 1,
      },
      include: {
        product: { select: { id: true, title: true, slug: true, price: true, mainImage: true, status: true } },
        variant: { select: { id: true, name: true, price: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to add to cart:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}
