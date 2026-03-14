import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Upload avatar
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'Please select a file' }, { status: 400 });
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, GIF, WebP formats are supported' }, { status: 400 });
    }

    // Limit file size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size cannot exceed 2MB' }, { status: 400 });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const fileName = `${user.userId}_${Date.now()}.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Delete old avatar file
    const oldUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { avatar: true },
    });
    if (oldUser?.avatar) {
      const oldPath = path.join(process.cwd(), 'public', oldUser.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update database
    const avatarUrl = `/avatars/${fileName}`;
    await prisma.user.update({
      where: { id: user.userId },
      data: { avatar: avatarUrl },
    });

    return NextResponse.json({ avatar: avatarUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
