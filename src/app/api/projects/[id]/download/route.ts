import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Get all project files (with content, for download)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { name: true, slug: true, isPrivate: true, price: true, ownerId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project does not exist' },
        { status: 404 }
      );
    }

    const user = await getAuthUser(req);

    if (project.isPrivate) {
      // Private projects require membership
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
      }
      const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: user.userId, projectId: params.id } },
      });
      if (!membership) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else {
      // Public projects: free ones can be downloaded directly, paid ones require purchase check or being owner/member
      if (project.price > 0) {
        if (!user) {
          return NextResponse.json({ error: 'Please login first' }, { status: 401 });
        }
        const isOwner = project.ownerId === user.userId;
        if (!isOwner) {
          // Check if user is a project member
          const membership = await prisma.projectMember.findUnique({
            where: { userId_projectId: { userId: user.userId, projectId: params.id } },
          });
          if (!membership) {
            // Check if already purchased
            const purchase = await prisma.purchase.findUnique({
              where: { buyerId_projectId: { buyerId: user.userId, projectId: params.id } },
            });
            if (!purchase) {
              return NextResponse.json({ error: 'Please purchase this project first' }, { status: 403 });
            }
          }
        }
      }
    }

    // Get all files and their latest version content
    const files = await prisma.file.findMany({
      where: { projectId: params.id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            size: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { path: 'asc' },
      ],
    });

    const fileList = files.map(f => ({
      path: f.path,
      type: f.type,
      content: f.versions[0]?.content || '',
      size: f.versions[0]?.size || 0,
    }));

    return NextResponse.json({
      projectName: project.name,
      projectSlug: project.slug,
      files: fileList,
    });
  } catch (error) {
    console.error('Get download data error:', error);
    return NextResponse.json(
      { error: 'Failed to get download data' },
      { status: 500 }
    );
  }
}
