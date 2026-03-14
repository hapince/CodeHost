import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// POST /api/admin/products/upload - Upload product image
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only jpg/png/webp/gif images are allowed' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const url = `/uploads/products/${fileName}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to upload image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
