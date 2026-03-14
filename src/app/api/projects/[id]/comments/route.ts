import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';

// Get project comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, isPrivate: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    // Private projects require authentication
    if (project.isPrivate) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const token = authHeader.replace('Bearer ', '');
      const payload = await verifyJWT(token);
      if (!payload) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Get current user ID (if logged in)
    let currentUserId: string | null = null;
    const authHeader2 = request.headers.get('authorization');
    if (authHeader2) {
      const token2 = authHeader2.replace('Bearer ', '');
      const payload2 = await verifyJWT(token2);
      if (payload2) currentUserId = payload2.userId as string;
    }

    const comments = await prisma.comment.findMany({
      where: {
        projectId,
        parentId: null,
        OR: [
          { status: 'APPROVED' },
          ...(currentUserId ? [{ authorId: currentUserId }] : []),
        ],
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        replies: {
          where: {
            OR: [
              { status: 'APPROVED' },
              ...(currentUserId ? [{ authorId: currentUserId }] : []),
            ],
          },
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Failed to get comments:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Post comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Please login first' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const projectId = params.id;
    const { content, parentId } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment content cannot exceed 2000 characters' }, { status: 400 });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    // If it's a reply, check if parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.projectId !== projectId) {
        return NextResponse.json({ error: 'Parent comment does not exist' }, { status: 404 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        status: 'PENDING',
        authorId: payload.userId as string,
        projectId,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Failed to post comment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
