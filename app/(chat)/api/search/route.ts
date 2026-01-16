import { auth, currentUser } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { searchChatsByQuery, syncClerkUser } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return new ChatSDKError('bad_request:api', 'Missing query param').toResponse();
  }

  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const dbUser = await syncClerkUser(
    clerkUserId,
    clerkUser.emailAddresses[0]?.emailAddress || '',
  );

  const results = await searchChatsByQuery({ userId: dbUser.id, query: q, limit: 20 });

  return Response.json({ results });
} 