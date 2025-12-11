/**
 * Pages Router API Route
 * 施設名から葬儀社を検索
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
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Google Places API Text Searchで施設名検索
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name + ' 葬儀')}&language=ja&key=${apiKey}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      return res.status(404).json({
        error: 'No results found',
        status: searchData.status
      });
    }

    // 最初の結果を返す
    const place = searchData.results[0];

    return res.status(200).json({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total
    });

  } catch (error) {
    console.error('Error searching by name:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
