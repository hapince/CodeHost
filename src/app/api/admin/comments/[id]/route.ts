import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Review comment (admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const { status } = await req.json();
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const comment = await prisma.comment.update({
      where: { id: params.id },
      data: { status },
      include: {
        author: { select: { id: true, name: true } },
        project: { select: { name: true } },
      },
    });

    // Notify comment author
    await prisma.notification.create({
      data: {
        type: 'SYSTEM',
        title: status === 'APPROVED' ? 'Comment approved' : 'Comment did not pass review',
        content: status === 'APPROVED'
          ? `Your comment on project "${comment.project.name}" has been approved.`
          : `Your comment on project "${comment.project.name}" did not pass review and has been removed.`,
        userId: comment.authorId,
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to review comment' }, { status: 500 });
  }
}

// Delete comment (admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    await prisma.comment.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Comment deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
