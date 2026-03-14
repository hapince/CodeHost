import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Get project member list
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id);

    if (isNextResponse(auth)) {
      return auth;
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Get project members error:', error);
    return NextResponse.json(
      { error: 'Failed to get member list' },
      { status: 500 }
    );
  }
}
