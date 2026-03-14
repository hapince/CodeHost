import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';

// PATCH /api/admin/products/[id] - Update product
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const body = await req.json();
    const { title, slug, shortDescription, description, price, mainImage, images, variants, status } = body;

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.product.findUnique({ where: { slug } });
      if (slugExists) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
    }

    // Update product
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price) || 0;
    if (mainImage !== undefined) updateData.mainImage = mainImage;
    if (status !== undefined) updateData.status = status;

    // Update images if provided
    if (images !== undefined) {
      await prisma.productImage.deleteMany({ where: { productId: params.id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: { url: string }, i: number) => ({
            url: img.url,
            sortOrder: i,
            productId: params.id,
          })),
        });
      }
    }

    // Update variants if provided
    if (variants !== undefined) {
      await prisma.productVariant.deleteMany({ where: { productId: params.id } });
      if (variants.length > 0) {
        await prisma.productVariant.createMany({
          data: variants.map((v: { name: string; price: number; stock: number }) => ({
            name: v.name,
            price: parseFloat(String(v.price)) || 0,
            stock: parseInt(String(v.stock)) ?? -1,
            productId: params.id,
          })),
        });
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
