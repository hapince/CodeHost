import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// Get all projects (admin)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isPrivate: true,
          isArchived: true,
          price: true,
          language: true,
          status: true,
          rejectReason: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          _count: {
            select: { members: true, files: true, commits: true, comments: true, purchases: true, stars: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get project list' }, { status: 500 });
  }
}
