import { auth, currentUser } from '@clerk/nextjs/server';
import { getSuggestionsByDocumentId, syncClerkUser } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter documentId is required.',
    ).toResponse();
  }

  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:suggestions').toResponse();
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return new ChatSDKError('unauthorized:suggestions').toResponse();
  }

  const dbUser = await syncClerkUser(
    clerkUserId,
    clerkUser.emailAddresses[0]?.emailAddress || '',
  );

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== dbUser.id) {
    return new ChatSDKError('forbidden:api').toResponse();
  }

  return Response.json(suggestions, { status: 200 });
}
