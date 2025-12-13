import type { SearchResult } from '../types';
import { getPlaceDetails } from './placesService';

interface Position {
  latitude: number;
  longitude: number;
}

export const searchFuneralHomes = async (
  query: string,
  position: Position | null
): Promise<SearchResult[]> => {
  // Call the Vercel Serverless Function instead of directly calling Gemini
  const response = await fetch('/api/search-funeral-homes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, position }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to search funeral homes');
  }

  const { places: placesFromApi, cached } = await response.json();

  // キャッシュヒット時は詳細情報が含まれているのでそのまま返す
  // photoRefs（セキュア版）またはphotoUrls（レガシー）をチェック
  if (cached && placesFromApi.length > 0 && (placesFromApi[0].photoRefs || placesFromApi[0].photoUrls)) {
    console.log(`[Cache HIT] Returning ${placesFromApi.length} places with details (no additional API calls)`);
    return placesFromApi as SearchResult[];
  }

  // キャッシュミス時のみ詳細情報を取得
  console.log(`[Cache MISS] Fetching details for ${placesFromApi.length} places...`);

  // 全施設の詳細情報（写真URL・レビュー）を並列で取得
  const places: SearchResult[] = await Promise.all(
    placesFromApi.map(async (place: any) => {
      // すでに詳細が含まれている場合（キャッシュヒット時）はスキップ
      if ((place.photoRefs && place.photoRefs.length > 0) || (place.photoUrls && place.photoUrls.length > 0)) {
        return place;
      }

      if (!place.placeId) {
        return place;
      }

      const details = await getPlaceDetails(place.placeId, place.address);

      // Places APIの公式名で上書き（ローマ字 → 日本語）
      const finalTitle = details.name || place.title;
      console.log(`[Title Override] "${place.title}" → "${finalTitle}"`, details.name ? '✓' : '✗');

      return {
        ...place,
        title: finalTitle,
        photoUrl: details.photoUrl,
        photoUrls: details.photoUrls,
        detailedReviews: details.detailedReviews,
        // 新規フィールド
        website: details.website,
        businessStatus: details.businessStatus,
        priceLevel: details.priceLevel,
        openingHours: details.openingHours,
        wheelchairAccessible: details.wheelchairAccessible,
      };
    })
  );

  console.log(`[Details] Fetched details for ${places.length} places`);
  console.log(`[Photos] ${places.filter(p => p.photoUrls && p.photoUrls.length > 0).length} places have photos`);
  console.log(`[Reviews] ${places.filter(p => p.detailedReviews && p.detailedReviews.length > 0).length} places have reviews`);

  return places;
};
