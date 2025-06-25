import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(_request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Build headers conditionally – OpenRouter allows unauthenticated requests for
  // public (free) model metadata, so we only send the Authorization header when
  // an API key is actually provided. This prevents a 500 response when the app
  // is running without a key and ensures the model selector can still display
  // free models.

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers,
      // cache for 1 hour at the edge
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch models from OpenRouter' },
        { status: res.status },
      );
    }

    const data = await res.json();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('OpenRouter models fetch error', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching models' },
      { status: 500 },
    );
  }
} 