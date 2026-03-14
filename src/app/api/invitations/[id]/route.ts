import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Accept or reject invitation
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return unauthorizedResponse();
    }

    const { action } = await req.json(); // 'accept' | 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid operation' },
        { status: 400 }
      );
    }

    // Get invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation does not exist' },
        { status: 404 }
      );
    }

    // Check if user is the receiver
    if (invitation.receiverId !== user.userId) {
      return NextResponse.json(
        { error: 'No permission to handle this invitation' },
        { status: 403 }
      );
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check invitation status
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation already processed' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Accept invitation: add as project member
      await prisma.$transaction([
        prisma.invitation.update({
          where: { id: params.id },
          data: { status: 'ACCEPTED' },
        }),
        prisma.projectMember.create({
          data: {
            userId: user.userId,
            projectId: invitation.projectId,
            role: invitation.role,
          },
        }),
      ]);

      return NextResponse.json({
        message: 'Joined project',
        projectSlug: invitation.project.slug,
      });
    } else {
      // Reject invitation
      await prisma.invitation.update({
        where: { id: params.id },
        data: { status: 'REJECTED' },
      });

      return NextResponse.json({ message: 'Invitation declined' });
    }
  } catch (error) {
    console.error('Handle invitation error:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}

// Delete invitation (sender can withdraw)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return unauthorizedResponse();
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation does not exist' },
        { status: 404 }
      );
    }

    // Only sender can withdraw invitation
    if (invitation.senderId !== user.userId) {
      return NextResponse.json(
        { error: 'No permission to withdraw this invitation' },
        { status: 403 }
      );
    }

    await prisma.invitation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Invitation withdrawn' });
  } catch (error) {
    console.error('Withdraw invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw invitation' },
      { status: 500 }
    );
  }
}
