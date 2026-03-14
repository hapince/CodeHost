import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Update project (admin review, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const body = await req.json();
    const { status, rejectReason, name, description, isPrivate, isArchived, price, language } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (rejectReason !== undefined) updateData.rejectReason = rejectReason;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (language !== undefined) updateData.language = language;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // If it's a review operation, send notification to project owner
    if (status === 'APPROVED' || status === 'REJECTED') {
      await prisma.notification.create({
        data: {
          type: 'REVIEW',
          title: status === 'APPROVED' ? 'Project approved' : 'Project review rejected',
          content: status === 'APPROVED'
            ? `Your project "${project.name}" has been approved and can now be viewed on the explore page.`
            : `Your project "${project.name}" review was rejected. Reason: ${rejectReason || 'Not specified'}`,
          link: `/project/${project.slug}`,
          userId: project.ownerId,
        },
      });
    }

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// Delete project (admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Project deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
