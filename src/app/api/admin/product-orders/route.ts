import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Get all product orders (admin)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const status = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.productOrder.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
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
      prisma.productOrder.count({ where }),
    ]);

    const totalAmount = await prisma.productOrder.aggregate({
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
    });

    return NextResponse.json({
      orders,
      totalRevenue: totalAmount._sum.totalAmount || 0,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Failed to get product orders:', error);
    return NextResponse.json({ error: 'Failed to get product orders' }, { status: 500 });
  }
}
