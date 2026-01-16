import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserTemperatureUnit, updateUserTemperatureUnit, syncClerkUser } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const dbUser = await syncClerkUser(
      clerkUserId,
      clerkUser.emailAddresses[0]?.emailAddress || '',
    );

    const temperatureUnit = await getUserTemperatureUnit({ id: dbUser.id });
    return Response.json({ temperatureUnit });
  } catch (error) {
    return new ChatSDKError('bad_request:api', 'Failed to get temperature unit').toResponse();
  }
}

export async function POST(request: Request) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const dbUser = await syncClerkUser(
      clerkUserId,
      clerkUser.emailAddresses[0]?.emailAddress || '',
    );

    const { temperatureUnit } = await request.json();
    
    if (temperatureUnit !== 'C' && temperatureUnit !== 'F') {
      return new ChatSDKError('bad_request:api', 'Invalid temperature unit').toResponse();
    }

    await updateUserTemperatureUnit({ 
      id: dbUser.id, 
      temperatureUnit 
    });

    return Response.json({ success: true });
  } catch (error) {
    return new ChatSDKError('bad_request:api', 'Failed to update temperature unit').toResponse();
  }
} 