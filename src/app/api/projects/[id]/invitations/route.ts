import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Get project invitation list
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'EDITOR');
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        projectId: params.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Get project invitation list error:', error);
    return NextResponse.json(
      { error: 'Failed to get invitation list' },
      { status: 500 }
    );
  }
}

// Send invitation
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'EDITOR');
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const { receiverId, role = 'VIEWER', message } = await req.json();

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Please select a user to invite' },
        { status: 400 }
      );
    }

    // Check if user exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'User does not exist' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: receiverId,
          projectId: params.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'This user is already a project member' },
        { status: 400 }
      );
    }

    // Check if there is already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        receiverId,
        projectId: params.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this user' },
        { status: 400 }
      );
    }

    // Create invitation (7-day validity)
    const invitation = await prisma.invitation.create({
      data: {
        senderId: auth.userId,
        receiverId,
        projectId: params.id,
        role,
        message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Send invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
