import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { uploadFile } from '@/lib/storage/objectStorage';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isPrivate = formData.get('isPrivate') === 'true';
    const prefix = (formData.get('prefix') as string) || 'items';

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
