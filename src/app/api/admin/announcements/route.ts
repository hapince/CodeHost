import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Get system announcement list
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(announcements);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get announcements' }, { status: 500 });
  }
}

// Publish system announcement (optionally send notifications to all users or specific users)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const { title, content, targetUserIds } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content cannot be empty' }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: { title, content },
    });

    // If targetUserIds is specified, send only to selected users; otherwise send to all users
    let targetUsers: { id: string }[];
    if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      targetUsers = targetUserIds.map((id: string) => ({ id }));
    } else {
      targetUsers = await prisma.user.findMany({ select: { id: true } });
    }

    if (targetUsers.length > 0) {
      await prisma.notification.createMany({
        data: targetUsers.map((u) => ({
          type: 'SYSTEM',
          title,
          content,
          userId: u.id,
        })),
      });
    }

    return NextResponse.json({ ...announcement, notifiedCount: targetUsers.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to publish announcement' }, { status: 500 });
  }
}
