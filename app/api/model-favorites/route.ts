import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getFavouriteModelIdsByUserId,
  toggleFavouriteModel,
} from '@/lib/db/queries';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ids = await getFavouriteModelIdsByUserId({ userId: session.user.id });
  return NextResponse.json({ favorites: ids });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { modelId } = await request.json();
    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json({ error: 'Invalid modelId' }, { status: 400 });
    }

    await toggleFavouriteModel({ userId: session.user.id, modelId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('toggle favourite error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
} 