import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Remove project member
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'OWNER');

    if (isNextResponse(auth)) {
      return auth;
    }

    const member = await prisma.projectMember.findUnique({
      where: { id: params.memberId },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member does not exist' },
        { status: 404 }
      );
    }

    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove project owner' },
        { status: 400 }
      );
    }

    await prisma.projectMember.delete({
      where: { id: params.memberId },
    });

    return NextResponse.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
