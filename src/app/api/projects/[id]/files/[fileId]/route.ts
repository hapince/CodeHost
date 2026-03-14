import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Get file details (with content)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id);
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const file = await prisma.file.findUnique({
      where: { id: params.fileId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File does not exist' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...file,
      content: file.versions[0]?.content || '',
    });
  } catch (error) {
    console.error('Get file details error:', error);
    return NextResponse.json(
      { error: 'Failed to get file details' },
      { status: 500 }
    );
  }
}

// Update file content
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'EDITOR');
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const { content, commitMessage } = await req.json();

    if (content === undefined) {
      return NextResponse.json(
        { error: 'Missing file content' },
        { status: 400 }
      );
    }

    const file = await prisma.file.findUnique({
      where: { id: params.fileId },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File does not exist' },
        { status: 404 }
      );
    }

    if (file.type === 'FOLDER') {
      return NextResponse.json(
        { error: 'Cannot update folder content' },
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
        message: commitMessage || `Updated ${file.name}`,
        hash: crypto.createHash('sha256').update(`update-${file.path}-${Date.now()}`).digest('hex'),
        authorId: auth.userId,
        projectId: params.id,
        branchId: defaultBranch.id,
        parentId: latestCommit?.id,
      },
    });

    // Create new version
    await prisma.fileVersion.create({
      data: {
        content,
        size: content.length,
        hash: crypto.createHash('sha256').update(content).digest('hex'),
        fileId: file.id,
        authorId: auth.userId,
        commitId: commit.id,
      },
    });

    // Update file timestamp
    await prisma.file.update({
      where: { id: file.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message: 'File updated' });
  } catch (error) {
    console.error('Update file error:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}

// Delete file
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'EDITOR');
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const file = await prisma.file.findUnique({
      where: { id: params.fileId },
      include: {
        children: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File does not exist' },
        { status: 404 }
      );
    }

    // If it's a folder with children, deletion is not allowed
    if (file.type === 'FOLDER' && file.children.length > 0) {
      return NextResponse.json(
        { error: 'Folder is not empty, cannot delete' },
        { status: 400 }
      );
    }

    await prisma.file.delete({
      where: { id: params.fileId },
    });

    return NextResponse.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
