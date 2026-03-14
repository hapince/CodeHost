import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Get user orders (purchased and sold)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all'; // "bought" | "sold" | "all"
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    let purchases: any[] = [];
    let sales: any[] = [];
    let totalBought = 0;
    let totalSold = 0;

    if (type === 'bought' || type === 'all') {
      [purchases, totalBought] = await Promise.all([
        prisma.purchase.findMany({
          where: { buyerId: user.userId },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                owner: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          ...(type === 'bought' ? { skip, take: limit } : {}),
        }),
        prisma.purchase.count({ where: { buyerId: user.userId } }),
      ]);
    }

    if (type === 'sold' || type === 'all') {
      [sales, totalSold] = await Promise.all([
        prisma.purchase.findMany({
          where: { project: { ownerId: user.userId } },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            buyer: { select: { id: true, name: true, avatar: true } },
            project: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          ...(type === 'sold' ? { skip, take: limit } : {}),
        }),
        prisma.purchase.count({ where: { project: { ownerId: user.userId } } }),
      ]);
    }

    // Calculate total amounts
    const [boughtAmount, soldAmount] = await Promise.all([
      prisma.purchase.aggregate({
        where: { buyerId: user.userId },
        _sum: { amount: true },
      }),
      prisma.purchase.aggregate({
        where: { project: { ownerId: user.userId } },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      purchases,
      sales,
      stats: {
        totalBought,
        totalSold,
        totalSpent: boughtAmount._sum.amount || 0,
        totalEarned: soldAmount._sum.amount || 0,
      },
      pagination: {
        page,
        limit,
        total: type === 'bought' ? totalBought : type === 'sold' ? totalSold : totalBought + totalSold,
        totalPages: Math.ceil((type === 'bought' ? totalBought : type === 'sold' ? totalSold : Math.max(totalBought, totalSold)) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get user orders' }, { status: 500 });
  }
}
