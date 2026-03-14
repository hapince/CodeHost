import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return unauthorizedResponse();
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        balance: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            ownedProjects: true,
            projectMembers: true,
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'User does not exist' },
        { status: 404 }
      );
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
