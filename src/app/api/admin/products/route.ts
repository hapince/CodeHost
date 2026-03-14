import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// GET /api/admin/products - List all products (admin)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          _count: { select: { orderItems: true, cartItems: true } },
        },
        orderBy: { createdAt: 'desc' },
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
    return NextResponse.json({ error: 'Failed to get product list' }, { status: 500 });
  }
}

// POST /api/admin/products - Create product
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const body = await req.json();
    const { title, slug, shortDescription, description, price, mainImage, images, variants, status } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        title,
        slug,
        shortDescription: shortDescription || null,
        description: description || null,
        price: parseFloat(price) || 0,
        mainImage: mainImage || null,
        status: status || 'ACTIVE',
        images: images?.length ? {
          create: images.map((img: { url: string }, i: number) => ({
            url: img.url,
            sortOrder: i,
          })),
        } : undefined,
        variants: variants?.length ? {
          create: variants.map((v: { name: string; price: number; stock: number }) => ({
            name: v.name,
            price: parseFloat(String(v.price)) || 0,
            stock: parseInt(String(v.stock)) ?? -1,
          })),
        } : undefined,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
