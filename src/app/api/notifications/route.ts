import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Get current user's notification list
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { userId: user.userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: user.userId, isRead: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get notifications' }, { status: 500 });
  }
}

// Mark all notifications as read
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true },
      });
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: user.userId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ message: 'Marked as read' });
  } catch (error) {
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
