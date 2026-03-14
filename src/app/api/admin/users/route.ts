import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Get all users (admin)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          balance: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ownedProjects: true,
              purchases: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Failed to get user list:', error);
    return NextResponse.json({ error: 'Failed to get user list' }, { status: 500 });
  }
}
