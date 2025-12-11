/**
 * Google Places API サービス
 * Place IDを使用して施設の詳細情報を取得
 */

import type { Review } from '../types';

interface PlaceDetailsResponse {
  name?: string; // 公式な日本語名
  photoUrls?: string[];
  reviews?: Review[];
  photosCount?: number;
  reviewsCount?: number;
  placeId?: string;
  error?: string;
  // 新規フィールド
  website?: string;
  businessStatus?: string;
  priceLevel?: number;
  openingHours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  wheelchairAccessible?: boolean;
}

/**
 * Vercel Serverless Function経由でGoogle Mapsの施設詳細情報を取得
 *
 * @param placeId - Google Places API の Place ID
 * @param address - 施設の住所（フォールバック用）
 * @returns 詳細情報（写真URL配列、レビュー配列）
 */
export const getPlaceDetails = async (
  placeId: string,
  address?: string
): Promise<{
  name?: string; // 公式な日本語名
  photoUrls: string[];
  photoUrl?: string;
  detailedReviews: Review[];
  website?: string;
  businessStatus?: string;
  priceLevel?: number;
  openingHours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  wheelchairAccessible?: boolean;
}> => {
  try {
    // Vercel Serverless Functionエンドポイントを呼び出し
    const response = await fetch(`/api/places?placeId=${encodeURIComponent(placeId)}`);

    if (!response.ok) {
      console.warn(`Failed to fetch details for place ${placeId}: ${response.status}`);
      return { photoUrls: [], detailedReviews: [] };
    }

    const data: PlaceDetailsResponse = await response.json();

    const photoUrls = data.photoUrls || [];
    const detailedReviews = data.reviews || [];

    console.log(`✓ Place details fetched for ${placeId}: ${photoUrls.length} photos, ${detailedReviews.length} reviews`);

    return {
      name: data.name, // 公式な日本語名
      photoUrls,
      photoUrl: photoUrls[0], // 後方互換性のため最初の写真を設定
      detailedReviews,
      website: data.website,
      businessStatus: data.businessStatus,
      priceLevel: data.priceLevel,
      openingHours: data.openingHours,
      wheelchairAccessible: data.wheelchairAccessible,
    };

  } catch (error) {
    console.error(`Error fetching details for place ${placeId}:`, error);
    return { photoUrls: [], detailedReviews: [] };
  }
};

/**
 * 後方互換性のための関数（非推奨）
 * @deprecated getPlaceDetails を使用してください
 */
export const getPlacePhotoUrl = async (
  placeId: string,
  address?: string
): Promise<string | undefined> => {
  const details = await getPlaceDetails(placeId, address);
  return details.photoUrl;
};

