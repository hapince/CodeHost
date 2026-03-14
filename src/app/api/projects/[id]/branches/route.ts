import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Get project branch list
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id);

    if (isNextResponse(auth)) {
      return auth;
    }

    const branches = await prisma.branch.findMany({
      where: { projectId: params.id },
      include: {
        _count: {
          select: {
            commits: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(branches);
  } catch (error) {
    console.error('Get branch list error:', error);
    return NextResponse.json(
      { error: 'Failed to get branches' },
      { status: 500 }
    );
  }
}

// Create new branch
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'EDITOR');

    if (isNextResponse(auth)) {
      return auth;
    }

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Branch name cannot be empty' },
        { status: 400 }
      );
    }

    // Check if branch name already exists
    const existing = await prisma.branch.findUnique({
      where: {
        projectId_name: {
          projectId: params.id,
          name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This branch already exists' },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        projectId: params.id,
      },
      include: {
        _count: {
          select: {
            commits: true,
          },
        },
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error('Create branch error:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}
