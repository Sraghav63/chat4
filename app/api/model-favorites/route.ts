import { type NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  getFavouriteModelIdsByUserId,
  toggleFavouriteModel,
  syncClerkUser,
} from '@/lib/db/queries';

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await syncClerkUser(
    clerkUserId,
    clerkUser.emailAddresses[0]?.emailAddress || '',
  );

  const ids = await getFavouriteModelIdsByUserId({ userId: dbUser.id });
  return NextResponse.json({ favorites: ids });
}

export async function POST(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await syncClerkUser(
    clerkUserId,
    clerkUser.emailAddresses[0]?.emailAddress || '',
  );

  try {
    const { modelId } = await request.json();
    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json({ error: 'Invalid modelId' }, { status: 400 });
    }

    await toggleFavouriteModel({ userId: dbUser.id, modelId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('toggle favourite error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
} 