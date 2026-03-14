import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Star/Unstar project
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const projectId = params.id;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    // Check if already starred
    const existingStar = await prisma.star.findUnique({
      where: { userId_projectId: { userId: user.userId, projectId } },
    });

    if (existingStar) {
      // Remove star
      await prisma.star.delete({
        where: { id: existingStar.id },
      });
      const count = await prisma.star.count({ where: { projectId } });
      return NextResponse.json({ starred: false, starCount: count });
    } else {
      // Add star
      await prisma.star.create({
        data: { userId: user.userId, projectId },
      });
      const count = await prisma.star.count({ where: { projectId } });
      return NextResponse.json({ starred: true, starCount: count });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

// Get star status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const starCount = await prisma.star.count({ where: { projectId } });

    // Check if current user has starred 
    let starred = false;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const user = await getAuthUser(req);
      if (user) {
        const existing = await prisma.star.findUnique({
          where: { userId_projectId: { userId: user.userId, projectId } },
        });
        starred = !!existing;
      }
    }

    return NextResponse.json({ starred, starCount });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
