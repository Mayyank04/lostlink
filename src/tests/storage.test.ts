import { describe, it, expect } from 'vitest';
import { uploadFile } from '@/lib/storage/objectStorage';

describe('Object Storage Security & Uploads', () => {
  it('accepts valid JPEG and PNG buffers within size limits', async () => {
    const dummyBuffer = Buffer.from('fake-image-bytes-header');
    const result = await uploadFile({
      buffer: dummyBuffer,
      filename: 'sample_macbook_photo.jpg',
      contentType: 'image/jpeg',
    });

    expect(result.url).toBeDefined();
    expect(result.key).toContain('sample_macbook_photo.jpg');
    expect(result.size).toBe(dummyBuffer.length);
  });

  it('rejects disallowed file types such as executables and scripts', async () => {
    const scriptBuffer = Buffer.from('malicious-payload');
    await expect(
      uploadFile({
        buffer: scriptBuffer,
        filename: 'malware.sh',
        contentType: 'application/x-sh',
      })
    ).rejects.toThrow(/Unsupported file type/);

    await expect(
      uploadFile({
        buffer: scriptBuffer,
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      })
    ).rejects.toThrow(/Unsupported file type/);
  });

  it('rejects files exceeding the 10MB size threshold', async () => {
    // 11 MB buffer
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    await expect(
      uploadFile({
        buffer: largeBuffer,
        filename: 'huge_camera_raw.png',
        contentType: 'image/png',
      })
    ).rejects.toThrow(/exceeds 10MB limit/);
  });

  it('sanitizes dangerous characters and prevents path traversal in filenames', async () => {
    const buffer = Buffer.from('clean-bytes');
    const result = await uploadFile({
      buffer,
      filename: '../../../../secret_config.jpg',
      contentType: 'image/jpeg',
    });

    // Slashes and dots in basename should be neutralized
    expect(result.key).not.toContain('../');
    expect(result.key).toContain('secret_config.jpg');
  });
});

