import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// PATCH /api/cart/[id] - Update cart item quantity
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { quantity } = await req.json();

    const item = await prisma.cartItem.findUnique({ where: { id: params.id } });
    if (!item || item.userId !== user.userId) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: params.id } });
      return NextResponse.json({ deleted: true });
    }

    const updated = await prisma.cartItem.update({
      where: { id: params.id },
      data: { quantity },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update cart item:', error);
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
  }
}

// DELETE /api/cart/[id] - Remove cart item
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const item = await prisma.cartItem.findUnique({ where: { id: params.id } });
    if (!item || item.userId !== user.userId) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete cart item:', error);
    return NextResponse.json({ error: 'Failed to delete cart item' }, { status: 500 });
  }
}
