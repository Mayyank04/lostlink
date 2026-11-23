import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing file key' }, { status: 400 });
    }

    // Canonical Path Traversal Protection
    const storageRoot = path.resolve(process.cwd(), 'storage', 'private');
    // Normalize and strip any malicious path traversal sequences
    const sanitizedKey = key.replace(/(\.\.[\/\\])/g, '');
    const resolvedPath = path.resolve(storageRoot, sanitizedKey);

    // Verify resolved path resides strictly within the private storage directory
    if (!resolvedPath.startsWith(storageRoot + path.sep)) {
      return NextResponse.json(
        { error: 'Access denied: Path traversal attempt detected' },
        { status: 403 }
      );
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify the resolved path is a regular file and not a directory
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Invalid file reference' }, { status: 400 });
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();

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
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
