import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Get current user's received invitations list
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return unauthorizedResponse();
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        receiverId: user.userId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Get invitations list error:', error);
    return NextResponse.json(
      { error: 'Failed to get pending invitations' },
      { status: 500 }
    );
  }
}
