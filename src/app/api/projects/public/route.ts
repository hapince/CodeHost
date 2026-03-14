import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Get all public projects (no login required)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const language = searchParams.get('language') || '';
    const sort = searchParams.get('sort') || 'latest'; // "latest" | "stars"
    const skip = (page - 1) * limit;

    const where: any = {
      isPrivate: false,
      isArchived: false,
      status: 'APPROVED',
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (language) {
      where.language = language;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          price: true,
          language: true,
          createdAt: true,
          updatedAt: true,
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
              stars: true,
            },
          },
        },
        orderBy: sort === 'stars' ? { stars: { _count: 'desc' } } : { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to get public projects:', error);
    return NextResponse.json(
      { error: 'Failed to get public projects' },
      { status: 500 }
    );
  }
}
