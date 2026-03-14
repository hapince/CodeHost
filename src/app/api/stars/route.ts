import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Get current user's star list
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [stars, total] = await Promise.all([
      prisma.star.findMany({
        where: { userId: user.userId },
        select: {
          id: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              isPrivate: true,
              price: true,
              language: true,
              updatedAt: true,
              owner: {
                select: { id: true, name: true, avatar: true },
              },
              _count: {
                select: { stars: true, files: true, commits: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.star.count({ where: { userId: user.userId } }),
    ]);

    return NextResponse.json({
      stars,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get favorites' }, { status: 500 });
  }
}
