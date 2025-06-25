import { auth } from '@/app/(auth)/auth';
import { getUserTemperatureUnit, updateUserTemperatureUnit } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const temperatureUnit = await getUserTemperatureUnit({ id: session.user.id });
    return Response.json({ temperatureUnit });
  } catch (error) {
    return new ChatSDKError('bad_request:api', 'Failed to get temperature unit').toResponse();
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const { temperatureUnit } = await request.json();
    
    if (temperatureUnit !== 'C' && temperatureUnit !== 'F') {
      return new ChatSDKError('bad_request:api', 'Invalid temperature unit').toResponse();
    }

    await updateUserTemperatureUnit({ 
      id: session.user.id, 
      temperatureUnit 
    });

    return Response.json({ success: true });
  } catch (error) {
    return new ChatSDKError('bad_request:api', 'Failed to update temperature unit').toResponse();
  }
} 