/**
 * Pages Router API Route (Next.js 互換性対応)
 * Google Places APIから施設の詳細情報を取得
 * キャッシュ機能付き（Vercel KV）
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@vercel/kv';

// Vercel KVクライアントを明示的に作成
const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// キャッシュ用の型定義
interface CachedPlaceDetails {
  data: any;
  timestamp: number;
}

// キャッシュTTL: 7日間（秒）
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800秒

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { placeId } = req.query;

    if (!placeId || typeof placeId !== 'string') {
      return res.status(400).json({ error: 'placeId is required' });
    }

    // Place IDから "places/" プレフィックスを除去
    const cleanPlaceId = placeId.replace('places/', '');

    // === キャッシュチェック ===
    const cacheKey = `place:${cleanPlaceId}`;
    let cacheReadError: string | null = null;
    try {
      const cached = await kv.get<CachedPlaceDetails>(cacheKey);
      if (cached) {
        console.log(`✅ [Place Cache HIT] key=${cacheKey}, age=${Math.round((Date.now() - cached.timestamp) / 1000 / 60)}分`);
        return res.status(200).json({
          ...cached.data,
          cached: true,
          cacheAge: Date.now() - cached.timestamp
        });
      }
      console.log(`⏳ [Place Cache MISS] key=${cacheKey}`);
    } catch (cacheError: any) {
      console.warn('[Place Cache Read Error]', cacheError);
      cacheReadError = cacheError?.message || 'Unknown cache read error';
      // キャッシュエラーは無視してAPI呼び出しを続行
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Place Details APIで写真とレビュー情報を取得
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cleanPlaceId}&fields=name,formatted_address,formatted_phone_number,photos,reviews,website,business_status,price_level,opening_hours,wheelchair_accessible_entrance,rating,user_ratings_total&language=ja&key=${apiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK') {
      console.warn(`Place Details API error: ${detailsData.status}`, detailsData.error_message);
      return res.status(404).json({
        error: 'Place not found or no data available',
        status: detailsData.status
      });
    }

    const place = detailsData.result;

    // 写真URLの配列を取得
    const photoUrls: string[] = place.photos
      ? place.photos.map((photo: any) => {
          const photoReference = photo.photo_reference;
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
        })
      : [];

    // レビュー情報を取得
    const reviews = place.reviews || [];

    // レスポンスデータを構築
    const responseData = {
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number,
      website: place.website,
      businessStatus: place.business_status,
      priceLevel: place.price_level,
      openingHours: place.opening_hours,
      wheelchairAccessible: place.wheelchair_accessible_entrance,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      photoUrls,
      photosCount: photoUrls.length,
      reviews,
      reviewsCount: reviews.length,
      placeId,
      // Google Maps URLs API形式（スマホアプリ互換）
      // 参考: https://developers.google.com/maps/documentation/urls/get-started
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || '')}&query_place_id=${cleanPlaceId}`
    };

    // === キャッシュ保存 ===
    try {
      const cacheData: CachedPlaceDetails = {
        data: responseData,
        timestamp: Date.now()
      };
      await kv.set(cacheKey, cacheData, { ex: CACHE_TTL_SECONDS });
      console.log(`💾 [Place Cache SAVE] key=${cacheKey}, TTL=${CACHE_TTL_SECONDS}秒`);
    } catch (cacheError: any) {
      console.warn('[Place Cache Write Error]', cacheError);
      // キャッシュエラーは無視して結果を返す
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error fetching place details:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
