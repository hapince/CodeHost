import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// Dynamically read and return avatar files (fixes next start not serving runtime uploaded files)
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const fileName = params.path.join('/');

    // Security check: prevent path traversal
    if (fileName.includes('..') || fileName.includes('\\')) {
      return new NextResponse('Bad request', { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'avatars', fileName);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const file = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Read avatar file error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
