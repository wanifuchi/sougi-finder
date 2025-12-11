/**
 * Next.js App Router API Route
 * slug → placeId lookup API
 * Vercel KVを使用して永続化されたマッピングを取得
 */

import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/slug-lookup?slug={slug}
 * slugからplaceIdを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'slug parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Slug Lookup API] Request for slug: ${slug}`);

    // Vercel KVからslug → placeId マッピングを取得
    const cacheKey = `slug:${slug}`;
    const placeId = await kv.get<string>(cacheKey);

    if (placeId) {
      console.log(`[Slug Lookup API] HIT - slug: ${slug} → placeId: ${placeId}`);
      return NextResponse.json({ slug, placeId, cached: true });
    }

    console.log(`[Slug Lookup API] MISS - slug: ${slug} not found in cache`);
    return NextResponse.json(
      { error: 'Slug not found in cache' },
      { status: 404 }
    );

  } catch (error) {
    console.error('[Slug Lookup API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/slug-lookup
 * slug → placeId マッピングを保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, placeId } = body;

    if (!slug || !placeId) {
      return NextResponse.json(
        { error: 'slug and placeId are required' },
        { status: 400 }
      );
    }

    console.log(`[Slug Lookup API] Saving mapping: slug: ${slug} → placeId: ${placeId}`);

    // Vercel KVにslug → placeId マッピングを保存
    const cacheKey = `slug:${slug}`;
    await kv.set(cacheKey, placeId);

    console.log(`[Slug Lookup API] Successfully saved mapping: ${slug} → ${placeId}`);

    return NextResponse.json({ slug, placeId, success: true });

  } catch (error) {
    console.error('[Slug Lookup API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save mapping',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONSリクエスト対応（CORS preflight）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
