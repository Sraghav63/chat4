import { auth, currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/db/convex-client';
import { api } from '@/convex/_generated/api';
import { ChatSDKError } from '@/lib/errors';

export async function POST(request: Request) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const { deviceCode } = await request.json();

    if (!deviceCode) {
      return new ChatSDKError(
        'bad_request:api',
        'Device code required',
      ).toResponse();
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new ChatSDKError(
        'bad_request:api',
        'GitHub OAuth not configured',
      ).toResponse();
    }

    // Poll GitHub for access token
    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      },
    );

    const data = await response.json();

    if (data.error) {
      // Still pending
      if (
        data.error === 'authorization_pending' ||
        data.error === 'slow_down'
      ) {
        return Response.json({ pending: true });
      }
      // Error
      return Response.json({ error: data.error_description || data.error });
    }

    if (data.access_token) {
      // Success - store the token
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

      // Encrypt and store the token (in production, use proper encryption)
      await client.mutation(api.mutations.updateUserGitHubCopilotToken, {
        userId: userId,
        token: data.access_token, // TODO: Encrypt this
      });

      return Response.json({ accessToken: data.access_token });
    }

    return Response.json({ pending: true });
  } catch (error) {
    return new ChatSDKError(
      'bad_request:api',
      'Failed to poll for token',
    ).toResponse();
  }
}
