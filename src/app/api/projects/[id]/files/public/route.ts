import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Get public project file list (no login required)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First check if project is public
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { isPrivate: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project does not exist' },
        { status: 404 }
      );
    }

    if (project.isPrivate) {
      return NextResponse.json(
        { error: 'This is a private project' },
        { status: 403 }
      );
    }

    const files = await prisma.file.findMany({
      where: {
        projectId: params.id,
        parentId: null, // Only return root directory files
      },
      select: {
        id: true,
        name: true,
        path: true,
        type: true,
      },
      orderBy: [
        { type: 'asc' }, // Folders first
        { name: 'asc' },
      ],
      take: 20, // Limit to max 20 items
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to get public project file list:', error);
    return NextResponse.json(
      { error: 'Failed to get file list' },
      { status: 500 }
    );
  }
}
