import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireProjectAccess, isNextResponse } from '@/lib/auth';

// Get commit history
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectAccess(req, params.id);
    
    if (isNextResponse(auth)) {
      return auth;
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = {
      projectId: params.id,
      ...(branchId && { branchId }),
    };

    const [commits, total] = await Promise.all([
      prisma.commit.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          fileVersions: {
            select: {
              id: true,
              file: {
                select: {
                  id: true,
                  name: true,
                  path: true,
                },
              },
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.commit.count({ where }),
    ]);

    return NextResponse.json({
      commits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get commit history error:', error);
    return NextResponse.json(
      { error: 'Failed to get commit history' },
      { status: 500 }
    );
  }
}
