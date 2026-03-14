import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Search users (for invitations)
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const projectId = searchParams.get('projectId');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search users (exclude self)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          },
          { id: { not: user.userId } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
      take: 10,
    });

    // If projectId is provided, filter out users who are already members
    if (projectId) {
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        select: { userId: true },
      });
      const memberIds = new Set(members.map(m => m.userId));
      
      // Also filter out users with pending invitations
      const pendingInvitations = await prisma.invitation.findMany({
        where: {
          projectId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        select: { receiverId: true },
      });
      const pendingIds = new Set(pendingInvitations.map(i => i.receiverId));

      return NextResponse.json(
        users.filter(u => !memberIds.has(u.id) && !pendingIds.has(u.id))
      );
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
