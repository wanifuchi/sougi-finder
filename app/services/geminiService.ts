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

  const { places: placesWithoutPhotos } = await response.json();

  // 全施設の詳細情報（写真URL・レビュー）を並列で取得
  const places: SearchResult[] = await Promise.all(
    placesWithoutPhotos.map(async (place: any) => {
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
