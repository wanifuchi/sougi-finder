/**
 * Next.js App Router API Route
 * slug → placeId lookup API
 * Vercel KVを使用して永続化されたマッピングを取得
 */

import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/slug-lookup?slug={slug} または ?prefix={prefix}
 * slugまたはplaceIdプレフィックスからplaceIdを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const prefix = searchParams.get('prefix');

    if (!slug && !prefix) {
      return NextResponse.json(
        { error: 'slug or prefix parameter is required' },
        { status: 400 }
      );
    }

    // プレフィックス検索（最優先）
    if (prefix) {
      console.log(`[Slug Lookup API] Request for prefix: ${prefix}`);

      try {
        const prefixKey = `prefix:${prefix.toLowerCase()}`;
        const placeId = await kv.get<string>(prefixKey);

        if (placeId) {
          console.log(`[Slug Lookup API] HIT - prefix: ${prefix} → placeId: ${placeId}`);
          return NextResponse.json({ prefix, placeId, cached: true });
        }

        console.log(`[Slug Lookup API] MISS - prefix: ${prefix} not found in cache`);
      } catch (kvError) {
        console.warn(`[Slug Lookup API] KV error for prefix lookup:`, kvError);
      }

      // prefixのみ指定でKVに見つからない場合は404
      if (!slug) {
        return NextResponse.json(
          { error: 'Prefix not found in cache' },
          { status: 404 }
        );
      }
    }

    // slug検索
    if (slug) {
      console.log(`[Slug Lookup API] Request for slug: ${slug}`);

      try {
        const cacheKey = `slug:${slug}`;
        const placeId = await kv.get<string>(cacheKey);

        if (placeId) {
          console.log(`[Slug Lookup API] HIT - slug: ${slug} → placeId: ${placeId}`);
          return NextResponse.json({ slug, placeId, cached: true });
        }

        console.log(`[Slug Lookup API] MISS - slug: ${slug} not found in cache`);
      } catch (kvError) {
        console.warn(`[Slug Lookup API] KV error for slug lookup:`, kvError);
      }
    }

    return NextResponse.json(
      { error: 'Not found in cache' },
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
 * 追加: suffix（placeIdプレフィックス8文字）→ placeId マッピングも保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, placeId, suffix } = body;

    if (!slug || !placeId) {
      return NextResponse.json(
        { error: 'slug and placeId are required' },
        { status: 400 }
      );
    }

    console.log(`[Slug Lookup API] Saving mapping: slug: ${slug} → placeId: ${placeId}`);

    // Vercel KVにslug → placeId マッピングを保存
    try {
      const cacheKey = `slug:${slug}`;
      await kv.set(cacheKey, placeId);
      console.log(`[Slug Lookup API] Successfully saved slug mapping: ${slug} → ${placeId}`);
    } catch (kvError) {
      console.warn(`[Slug Lookup API] Failed to save slug mapping:`, kvError);
    }

    // suffix（placeIdプレフィックス）→ placeId マッピングも保存
    if (suffix) {
      try {
        const prefixKey = `prefix:${suffix.toLowerCase()}`;
        await kv.set(prefixKey, placeId);
        console.log(`[Slug Lookup API] Successfully saved prefix mapping: ${suffix} → ${placeId}`);
      } catch (kvError) {
        console.warn(`[Slug Lookup API] Failed to save prefix mapping:`, kvError);
      }
    }

    return NextResponse.json({ slug, placeId, suffix, success: true });

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
