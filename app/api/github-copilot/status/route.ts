import { auth } from '@clerk/nextjs/server';
import { client } from '@/lib/db/convex-client';
import { api } from '@/convex/_generated/api';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const dbUser = await client.query(api.queries.getUserByClerkId, {
      clerkId: clerkUserId,
    });

    if (!dbUser) {
      return Response.json({ connected: false });
    }

    return Response.json({
      connected: !!dbUser.githubCopilotToken,
    });
  } catch (error) {
    return new ChatSDKError(
      'bad_request:api',
      'Failed to check connection',
    ).toResponse();
  }
}
