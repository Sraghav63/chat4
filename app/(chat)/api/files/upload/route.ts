import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { client } from '@/lib/db/convex-client';
import { generateUploadUrl } from '../../../../convex/files';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type), {
      message: 'File type should be JPEG, PNG, or PDF',
    }),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      // Generate upload URL from Convex
      const uploadUrl = await client.mutation(generateUploadUrl);
      
      // Upload file to Convex
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: fileBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to Convex');
      }

      const { storageId } = await uploadResponse.json();

      // Get the file URL from Convex
      const fileUrl = await client.query(
        (await import('../../../../convex/files')).getFileUrl,
        { storageId: storageId as any },
      );

      // Return file info compatible with Vercel Blob format
      return NextResponse.json({
        url: fileUrl || `${process.env.NEXT_PUBLIC_CONVEX_URL || 'https://dapper-hawk-31.convex.cloud'}/api/storage/${storageId}`,
        pathname: storageId,
        size: file.size,
        contentType: file.type,
      });
    } catch (error) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
