import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { uploadFile } from '@/lib/storage/objectStorage';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const ip = getClientIp(req);

    // Rate limit: 30 uploads per 10 minutes per user/IP
    const rate = checkRateLimit(`upload:${user.id}:${ip}`, 30, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Upload rate limit exceeded. Please wait a few minutes before uploading more files.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isPrivate = formData.get('isPrivate') === 'true';
    const rawPrefix = (formData.get('prefix') as string) || 'items';

    // Sanitize prefix to prevent directory traversal
    const prefix = rawPrefix.replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadFile({
      buffer,
      filename: file.name,
      contentType: file.type,
      isPrivate,
      prefix: isPrivate ? 'evidence' : prefix,
    });

    return NextResponse.json(
      {
        message: 'File uploaded successfully',
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
