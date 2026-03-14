import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Get all comments (admin)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusFilter = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (statusFilter) where.status = statusFilter;

    const [comments, total, pendingCount] = await Promise.all([
      prisma.comment.findMany({
        where,
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          project: {
            select: { id: true, name: true, slug: true },
          },
          parentId: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
      prisma.comment.count({ where: { status: 'PENDING' } }),
    ]);

    return NextResponse.json({
      comments,
      pendingCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get comment list' }, { status: 500 });
  }
}
