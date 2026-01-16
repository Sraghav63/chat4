import { auth, currentUser } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { getChatsByUserId, syncClerkUser } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get('limit') || '10');
  const startingAfter = searchParams.get('starting_after');
  const endingBefore = searchParams.get('ending_before');

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      'bad_request:api',
      'Only one of starting_after or ending_before can be provided.',
    ).toResponse();
  }

  const { userId } = await auth();

  if (!userId) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // Sync Clerk user with database
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const dbUser = await syncClerkUser(
    userId,
    clerkUser.emailAddresses[0]?.emailAddress || '',
  );

  const chats = await getChatsByUserId({
    id: dbUser.id,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}
