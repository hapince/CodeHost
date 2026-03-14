import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Batch upload files (supports entire project upload)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id, 'EDITOR');

    if (isNextResponse(auth)) {
      return auth;
    }

    const { files, commitMessage } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files to upload' },
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

    // Create commit
    const commit = await prisma.commit.create({
      data: {
        message: commitMessage || `Upload ${files.length} files`,
        hash: crypto.createHash('sha256').update(`upload-${Date.now()}-${files.length}`).digest('hex'),
        authorId: auth.userId,
        projectId: params.id,
        branchId: defaultBranch.id,
        parentId: latestCommit?.id,
      },
    });

    // Collect all directory paths that need to be created
    const folderPaths = new Set<string>();
    for (const file of files) {
      const parts = file.path.split('/');
      // Collect all parent directory paths
      for (let i = 1; i < parts.length; i++) {
        folderPaths.add(parts.slice(0, i).join('/'));
      }
    }

    // Get existing files and folders in the project
    const existingFiles = await prisma.file.findMany({
      where: { projectId: params.id },
      select: { id: true, path: true, type: true },
    });
    const existingPathMap = new Map(existingFiles.map(f => [f.path, f]));

    // Sort by path depth, create shallow directories first
    const sortedFolderPaths = Array.from(folderPaths).sort(
      (a, b) => a.split('/').length - b.split('/').length
    );

    // Create folders (record newly created folder IDs)
    const pathToIdMap = new Map<string, string>();
    // First add existing file mappings
    existingFiles.forEach(f => pathToIdMap.set(f.path, f.id));

    for (const folderPath of sortedFolderPaths) {
      if (existingPathMap.has(folderPath)) {
        continue; // Folder already exists
      }

      const parts = folderPath.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const parentId = parentPath ? pathToIdMap.get(parentPath) : undefined;

      const folder = await prisma.file.create({
        data: {
          name,
          path: folderPath,
          type: 'FOLDER',
          projectId: params.id,
          parentId: parentId || null,
        },
      });

      pathToIdMap.set(folderPath, folder.id);
    }

    // Create files
    let createdCount = 0;
    let updatedCount = 0;

    for (const file of files) {
      if (file.type === 'FOLDER') continue; // Folders already created

      const parts = file.path.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const parentId = parentPath ? pathToIdMap.get(parentPath) : undefined;
      // Binary files store base64 dataURL, text files store original content
      const content = file.content || '';
      const contentSize = file.isBinary ? Math.round(content.length * 0.75) : content.length;

      const existing = existingPathMap.get(file.path);

      if (existing) {
        // Update existing file
        await prisma.fileVersion.create({
          data: {
            content,
            size: contentSize,
            hash: crypto.createHash('sha256').update(content).digest('hex'),
            fileId: existing.id,
            authorId: auth.userId,
            commitId: commit.id,
          },
        });
        await prisma.file.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        });
        updatedCount++;
      } else {
        // Create new file
        const newFile = await prisma.file.create({
          data: {
            name,
            path: file.path,
            type: 'FILE',
            projectId: params.id,
            parentId: parentId || null,
            versions: {
              create: {
                content,
                size: contentSize,
                hash: crypto.createHash('sha256').update(content).digest('hex'),
                authorId: auth.userId,
                commitId: commit.id,
              },
            },
          },
        });
        pathToIdMap.set(file.path, newFile.id);
        createdCount++;
      }
    }

    return NextResponse.json({
      message: `Upload complete: created ${createdCount} files, updated ${updatedCount} files`,
      createdCount,
      updatedCount,
      commitId: commit.id,
    }, { status: 201 });
  } catch (error) {
    console.error('Batch upload files error:', error);
    return NextResponse.json(
      { error: 'Failed to batch upload files' },
      { status: 500 }
    );
  }
}
