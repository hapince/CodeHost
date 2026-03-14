import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Get all orders (admin)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.purchase.findMany({
        select: {
          id: true,
          amount: true,
          createdAt: true,
          buyer: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          project: {
            select: { id: true, name: true, slug: true, owner: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchase.count(),
    ]);

    // Calculate total transaction amount
    const totalAmount = await prisma.purchase.aggregate({
      _sum: { amount: true },
    });

    return NextResponse.json({
      orders,
      totalAmount: totalAmount._sum.amount || 0,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get order list' }, { status: 500 });
  }
}
