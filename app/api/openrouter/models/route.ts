import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(_request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing OPENROUTER_API_KEY environment variable' },
      { status: 500 },
    );
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
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