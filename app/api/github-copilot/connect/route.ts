import { auth } from '@clerk/nextjs/server';
import { ChatSDKError } from '@/lib/errors';

// GitHub OAuth Device Flow
// This initiates the device flow for GitHub Copilot authentication
export async function POST() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    // Initiate GitHub device flow
    // GitHub OAuth App credentials should be in environment variables
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
      return new Response(
        JSON.stringify({
          error:
            'GITHUB_CLIENT_ID environment variable is not set. Please add it to your .env.local file.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: 'copilot',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error:
            data.error_description ||
            data.error ||
            'Failed to initiate device flow with GitHub',
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return Response.json({
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to initiate connection',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
