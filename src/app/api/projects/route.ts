import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { generateSlug } from '@/lib/utils';

// Get project list
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const skip = (page - 1) * limit;

    const where = {
      members: {
        some: {
          userId: user.userId,
        },
      },
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
              files: true,
              commits: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get project list error:', error);
    return NextResponse.json(
      { error: 'Failed to get project list' },
      { status: 500 }
    );
  }
}

// Create new project
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return unauthorizedResponse();
    }

    const { name, description, isPrivate = true, language } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name cannot be empty' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const existingProject = await prisma.project.findUnique({
      where: { slug },
    });

    if (existingProject) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create project - public projects require review
    const project = await prisma.project.create({
      data: {
        name,
        description,
        slug,
        isPrivate,
        language: language || null,
        status: isPrivate ? 'APPROVED' : 'PENDING',
        ownerId: user.userId,
        members: {
          create: {
            userId: user.userId,
            role: 'OWNER',
          },
        },
        branches: {
          create: {
            name: 'main',
            isDefault: true,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        branches: true,
      },
    });

    // Create initial commit
    const mainBranch = project.branches[0];
    await prisma.commit.create({
      data: {
        message: 'Initialize project',
        hash: crypto.createHash('sha256').update(`initial-${project.id}-${Date.now()}`).digest('hex'),
        authorId: user.userId,
        projectId: project.id,
        branchId: mainBranch.id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
