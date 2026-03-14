import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Get admin dashboard statistics
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const url = new URL(req.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30') || 30, 1), 90);

    const [
      totalUsers,
      totalProjects,
      pendingProjects,
      totalOrders,
      totalComments,
      totalRevenue,
      recentUsers,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.project.count({ where: { status: 'PENDING' } }),
      prisma.purchase.count(),
      prisma.comment.count(),
      prisma.purchase.aggregate({ _sum: { amount: true } }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.purchase.findMany({
        select: {
          id: true,
          amount: true,
          createdAt: true,
          buyer: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Revenue statistics (by day, supports dynamic day count)
    const now = new Date();
    const daysAgoRevenue = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const dailyOrders = await prisma.purchase.findMany({
      where: { createdAt: { gte: daysAgoRevenue } },
      select: { amount: true, createdAt: true },
    });

    const revenueByDay: { date: string; amount: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const amount = dailyOrders
        .filter(o => {
          const od = new Date(o.createdAt);
          return od >= dayStart && od < dayEnd;
        })
        .reduce((sum, o) => sum + o.amount, 0);
      revenueByDay.push({ date: dateStr, amount });
    }

    // Active user statistics (by day, supports dynamic day count)
    const thirtyDaysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const [recentPurchases, recentCommentsData, recentCommitsData] = await Promise.all([
      prisma.purchase.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { buyerId: true, createdAt: true },
      }),
      prisma.comment.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { authorId: true, createdAt: true },
      }),
      prisma.commit.findMany({
        where: { timestamp: { gte: thirtyDaysAgo } },
        select: { authorId: true, timestamp: true },
      }),
    ]);

    const activeByDay: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

      const userIds = new Set<string>();
      recentPurchases.forEach(p => {
        const pd = new Date(p.createdAt);
        if (pd >= dayStart && pd < dayEnd) userIds.add(p.buyerId);
      });
      recentCommentsData.forEach(c => {
        const cd = new Date(c.createdAt);
        if (cd >= dayStart && cd < dayEnd) userIds.add(c.authorId);
      });
      recentCommitsData.forEach(c => {
        const cd = new Date(c.timestamp);
        if (cd >= dayStart && cd < dayEnd) userIds.add(c.authorId);
      });
      activeByDay.push({ date: dateStr, count: userIds.size });
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        totalProjects,
        pendingProjects,
        totalOrders,
        totalComments,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
      recentUsers,
      recentOrders,
      revenueByDay,
      activeByDay,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get statistics' }, { status: 500 });
  }
}
