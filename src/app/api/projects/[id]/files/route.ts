import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Get project file list
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id);
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const files = await prisma.file.findMany({
      where: { projectId: params.id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            size: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { type: 'asc' }, // Folders first
        { name: 'asc' },
      ],
    });

    // Build file tree structure
    const fileMap = new Map(files.map(f => [f.id, { ...f, children: [] as typeof files }]));
    const rootFiles: typeof files = [];

    files.forEach(file => {
      if (file.parentId) {
        const parent = fileMap.get(file.parentId);
        if (parent) {
          (parent as any).children.push(fileMap.get(file.id));
        }
      } else {
        rootFiles.push(fileMap.get(file.id) as any);
      }
    });

    return NextResponse.json(rootFiles);
  } catch (error) {
    console.error('Get file list error:', error);
    return NextResponse.json(
      { error: 'Failed to get file list' },
      { status: 500 }
    );
  }
}

// Create file
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'EDITOR');
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const { name, path, type, content = '', parentId, commitMessage } = await req.json();

    if (!name || !path || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if file already exists
    const existingFile = await prisma.file.findUnique({
      where: {
        projectId_path: {
          projectId: params.id,
          path,
        },
      },
    });

    if (existingFile) {
      return NextResponse.json(
        { error: 'File already exists' },
        { status: 400 }
      );
    }

    // Get default branch
    const defaultBranch = await prisma.branch.findFirst({
      where: {
        projectId: params.id,
        isDefault: true,
      },
    });

    if (!defaultBranch) {
      return NextResponse.json(
        { error: 'Project has no default branch' },
        { status: 400 }
      );
    }

    // Get latest commit
    const latestCommit = await prisma.commit.findFirst({
      where: {
        projectId: params.id,
        branchId: defaultBranch.id,
      },
      orderBy: { timestamp: 'desc' },
    });

    // Create new commit
    const commit = await prisma.commit.create({
      data: {
        message: commitMessage || `Created ${name}`,
        hash: crypto.createHash('sha256').update(`create-${path}-${Date.now()}`).digest('hex'),
        authorId: auth.userId,
        projectId: params.id,
        branchId: defaultBranch.id,
        parentId: latestCommit?.id,
      },
    });

    // Create file
    const file = await prisma.file.create({
      data: {
        name,
        path,
        type,
        projectId: params.id,
        parentId,
        versions: type === 'FILE' ? {
          create: {
            content,
            size: content.length,
            hash: crypto.createHash('sha256').update(content).digest('hex'),
            authorId: auth.userId,
            commitId: commit.id,
          },
        } : undefined,
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('Create file error:', error);
    return NextResponse.json(
      { error: 'Failed to create file' },
      { status: 500 }
    );
  }
}
