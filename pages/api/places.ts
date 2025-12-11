/**
 * Pages Router API Route (Next.js 互換性対応)
 * Google Places APIから施設の詳細情報を取得
 */

import type { NextApiRequest, NextApiResponse } from 'next';

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

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Place IDから "places/" プレフィックスを除去
    const cleanPlaceId = placeId.replace('places/', '');

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

    return res.status(200).json({
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
      url: `https://www.google.com/maps/place/?q=place_id:${cleanPlaceId}`
    });

  } catch (error) {
    console.error('Error fetching place details:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
