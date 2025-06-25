import { auth } from '@/app/(auth)/auth';
import type { NextRequest } from 'next/server';
import { searchChatsByQuery } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return new ChatSDKError('bad_request:api', 'Missing query param').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const results = await searchChatsByQuery({ userId: session.user.id, query: q, limit: 20 });

  return Response.json({ results });
} 