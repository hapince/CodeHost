import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Delete announcement
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    await prisma.announcement.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Announcement deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}

// Update announcement
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const body = await req.json();
    const { title, content, isActive } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isActive !== undefined) updateData.isActive = isActive;

    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(announcement);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}
