import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Get project details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id);
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
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
      return NextResponse.json(
        { error: 'Project does not exist' },
        { status: 404 }
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

// Update project
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'OWNER');
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const { name, description, isPrivate, isArchived, price, language } = await req.json();

    // If project changes from private to public, requires re-review
    const currentProject = await prisma.project.findUnique({
      where: { id: params.id },
      select: { isPrivate: true, status: true },
    });

    const statusUpdate: any = {};
    if (isPrivate === false && currentProject?.isPrivate === true) {
      statusUpdate.status = 'PENDING';
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPrivate !== undefined && { isPrivate }),
        ...(isArchived !== undefined && { isArchived }),
        ...(price !== undefined && { price: Math.max(0, parseFloat(price) || 0) }),
        ...(language !== undefined && { language: language || null }),
        ...statusUpdate,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// Delete project
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'OWNER');
    
    if (isNextResponse(auth)) {
      return auth;
    }

    await prisma.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
