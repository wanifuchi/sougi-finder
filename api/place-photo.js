/**
 * Vercel Serverless Function
 * Google Places APIから施設の写真URLを取得
 */

export default async function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエスト（preflight）への対応
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GETメソッドのみ許可
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { placeId } = req.query;

    if (!placeId || typeof placeId !== 'string') {
      return res.status(400).json({ error: 'placeId is required' });
    }

    // Vercelのサーバーレス関数では VITE_ プレフィックスなしでアクセス
    // フロントエンドとの互換性のため両方を試す
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Place IDから "places/" プレフィックスを除去
    const cleanPlaceId = placeId.replace('places/', '');

    // Place Details APIで写真情報を取得
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cleanPlaceId}&fields=photos&key=${apiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK') {
      console.warn(`Place Details API error: ${detailsData.status}`, detailsData.error_message);
      return res.status(404).json({
        error: 'Place not found or no photos available',
        status: detailsData.status
      });
    }

    const photos = detailsData.result && detailsData.result.photos;

    if (!photos || photos.length === 0) {
      return res.status(404).json({
        error: 'No photos available for this place'
      });
    }

    // 最初の写真のphoto_referenceを使用
    const photoReference = photos[0].photo_reference;

    // Place Photos APIのURLを生成
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;

    // 成功レスポンス
    return res.status(200).json({
      photoUrl,
      photosCount: photos.length,
      placeId: cleanPlaceId
    });

  } catch (error) {
    console.error('Error fetching place photo:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
