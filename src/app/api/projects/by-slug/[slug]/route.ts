import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Get project details by slug
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getAuthUser(req);

    // First find project by slug
    const project = await prisma.project.findUnique({
      where: { slug: params.slug },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        branches: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            files: true,
            commits: true,
          },
        },
      },
    });

    if (!project) {
      // Compatibility: if slug is actually a project ID, try to find by ID and return correct slug
      const projectById = await prisma.project.findUnique({
        where: { id: params.slug },
        select: { slug: true },
      });
      if (projectById) {
        return NextResponse.json(
          { redirect: `/explore/${projectById.slug}` },
          { status: 301 }
        );
      }
      return NextResponse.json(
        { error: 'Project does not exist' },
        { status: 404 }
      );
    }

    // Public projects allow anyone to access; private projects require login and membership
    const isPublic = !project.isPrivate;
    const isMember = user ? project.members.some(m => m.user.id === user.userId) : false;

    if (!isPublic && !isMember) {
      if (!user) {
        return unauthorizedResponse();
      }
      return NextResponse.json(
        { error: 'No permission to access this project' },
        { status: 403 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Get project details error:', error);
    return NextResponse.json(
      { error: 'Failed to get project details' },
      { status: 500 }
    );
  }
}
