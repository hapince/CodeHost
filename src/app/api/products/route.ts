import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/products - List active products (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'latest';
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'title') orderBy = { title: 'asc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          shortDescription: true,
          price: true,
          mainImage: true,
          createdAt: true,
          variants: { select: { id: true, name: true, price: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to get products' }, { status: 500 });
  }
}
