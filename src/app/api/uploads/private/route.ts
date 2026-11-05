import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing file key' }, { status: 400 });
    }

    // Path traversal protection
    const normalizedKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(process.cwd(), 'storage', 'private', normalizedKey);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeMap[ext] || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
