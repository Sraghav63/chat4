import { auth, currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/db/convex-client';
import { api } from '@/convex/_generated/api';
import { ChatSDKError } from '@/lib/errors';

export async function POST() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const dbUser = await client.mutation(api.mutations.syncClerkUser, {
      clerkId: clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
    });

    if (!dbUser) {
      return new ChatSDKError(
        'bad_request:api',
        'Failed to sync user',
      ).toResponse();
    }

    // Extract userId - handle both ID and object cases
    const userId =
      typeof dbUser === 'object' && '_id' in dbUser
        ? (dbUser as any)._id
        : dbUser;

    await client.mutation(api.mutations.updateUserGitHubCopilotToken, {
      userId: userId,
      token: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    return new ChatSDKError(
      'bad_request:api',
      'Failed to disconnect',
    ).toResponse();
  }
}
