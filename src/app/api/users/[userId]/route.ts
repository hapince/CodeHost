import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Get user public profile and their public projects
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        createdAt: true,
        ownedProjects: {
          where: {
            isPrivate: false,
            isArchived: false,
          },
          include: {
            _count: {
              select: {
                members: true,
                files: true,
                commits: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: {
            ownedProjects: {
              where: { isPrivate: false, isArchived: false },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User does not exist' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
  }
}
