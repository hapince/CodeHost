import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/products/[id] - Get product detail (by id or slug)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Try to find by slug first, then by id
    let product = await prisma.product.findUnique({
      where: { slug: params.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
    });

    if (!product) {
      product = await prisma.product.findUnique({
        where: { id: params.id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
        },
      });
    }

    if (!product || product.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return NextResponse.json({ error: 'Failed to get product' }, { status: 500 });
  }
}
