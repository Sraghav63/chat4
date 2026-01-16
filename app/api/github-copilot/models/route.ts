import { auth } from '@clerk/nextjs/server';
import { client } from '@/lib/db/convex-client';
import { api } from '@/convex/_generated/api';
import { ChatSDKError } from '@/lib/errors';

// GitHub Copilot Models API
// Fetches the list of models enabled for the user's GitHub Copilot subscription
export async function GET() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const dbUser = await client.query(api.queries.getUserByClerkId, {
      clerkId: clerkUserId,
    });

    if (!dbUser?.githubCopilotToken) {
      return Response.json({
        models: [],
        error: 'not_connected',
      });
    }

    // First, get a Copilot token from the GitHub access token
    const copilotTokenResponse = await fetch(
      'https://api.github.com/copilot_internal/v2/token',
      {
        headers: {
          Authorization: `token ${dbUser.githubCopilotToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'GitHubCopilotChat/0.11.1',
          'Editor-Version': 'vscode/1.85.1',
          'Editor-Plugin-Version': 'copilot-chat/0.11.1',
        },
      },
    );

    if (!copilotTokenResponse.ok) {
      // Token might be expired or invalid
      const errorText = await copilotTokenResponse.text();
      console.error(
        'Failed to get Copilot token:',
        copilotTokenResponse.status,
        errorText,
      );
      
      // If it's a 401, the token is definitely expired/invalid
      if (copilotTokenResponse.status === 401) {
        return Response.json({
          models: [],
          error: 'token_expired',
        });
      }
      
      // For other errors, return a more specific error
      return Response.json({
        models: [],
        error: `token_error_${copilotTokenResponse.status}`,
      });
    }

    const copilotTokenData = await copilotTokenResponse.json();
    const copilotToken = copilotTokenData.token;

    if (!copilotToken) {
      return Response.json({
        models: [],
        error: 'token_missing',
      });
    }

    // Now fetch models from the Copilot API
    const modelsResponse = await fetch('https://api.githubcopilot.com/models', {
      headers: {
        Authorization: `Bearer ${copilotToken}`,
        Accept: 'application/json',
        'User-Agent': 'GitHubCopilotChat/0.11.1',
        'Copilot-Integration-Id': 'vscode-chat',
        'Editor-Version': 'vscode/1.85.1',
        'Editor-Plugin-Version': 'copilot-chat/0.11.1',
      },
    });

    if (!modelsResponse.ok) {
      console.error(
        'Failed to fetch Copilot models:',
        modelsResponse.status,
        await modelsResponse.text(),
      );
      return Response.json({
        models: [],
        error: 'failed_to_fetch_models',
      });
    }

    const modelsData = await modelsResponse.json();

    // Transform the models to a consistent format
    const models = (modelsData.models || modelsData.data || []).map(
      (model: any) => ({
        id: model.id || model.name,
        name: model.name || model.id,
        version: model.version,
        capabilities: model.capabilities,
        vendor: model.vendor || model.provider,
        family: model.family || model.model_family,
        isDefault: model.is_default,
        // Include policy info if available
        policy: model.policy,
      }),
    );

    return Response.json({
      models,
    });
  } catch (error: any) {
    console.error('Error fetching Copilot models:', error);
    return Response.json({
      models: [],
      error: error.message || 'unknown_error',
    });
  }
}
