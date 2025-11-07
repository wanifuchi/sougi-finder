/**
 * Vercel Serverless Function
 * Google Places APIから施設の詳細情報を取得
 * - 複数の写真URL
 * - レビュー情報
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
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Place IDから "places/" プレフィックスを除去
    const cleanPlaceId = placeId.replace('places/', '');

    // Place Details APIで写真とレビュー情報を取得 (日本語でレビューを取得)
    // 新規追加: name, website, business_status, price_level, opening_hours, wheelchair_accessible_entrance
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cleanPlaceId}&fields=name,photos,reviews,website,business_status,price_level,opening_hours,wheelchair_accessible_entrance&language=ja&key=${apiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK') {
      console.warn(`Place Details API error: ${detailsData.status}`, detailsData.error_message);
      return res.status(404).json({
        error: 'Place not found or no data available',
        status: detailsData.status
      });
    }

    const result = detailsData.result;
    const photos = result && result.photos;
    const reviews = result && result.reviews;

    // 新規フィールドの取得
    const name = result && result.name; // 公式な日本語名
    const website = result && result.website;
    const businessStatus = result && result.business_status;
    const priceLevel = result && result.price_level;
    const openingHours = result && result.opening_hours;
    const wheelchairAccessible = result && result.wheelchair_accessible_entrance;

    // 複数の写真URLを生成（最大5枚）
    const photoUrls = [];
    if (photos && photos.length > 0) {
      const maxPhotos = Math.min(photos.length, 5);
      for (let i = 0; i < maxPhotos; i++) {
        const photoReference = photos[i].photo_reference;
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${apiKey}`;
        photoUrls.push(photoUrl);
      }
    }

    // レビュー情報を整形（最大5件）
    const formattedReviews = [];
    if (reviews && reviews.length > 0) {
      const maxReviews = Math.min(reviews.length, 5);
      for (let i = 0; i < maxReviews; i++) {
        const review = reviews[i];
        formattedReviews.push({
          author_name: review.author_name || '匿名',
          rating: review.rating || 0,
          text: review.text || '',
          time: review.time || 0
        });
      }
    }

    // 成功レスポンス
    return res.status(200).json({
      name: name || undefined, // 公式な日本語名
      photoUrls,
      reviews: formattedReviews,
      photosCount: photos ? photos.length : 0,
      reviewsCount: reviews ? reviews.length : 0,
      placeId: cleanPlaceId,
      // 新規フィールド
      website: website || undefined,
      businessStatus: businessStatus || undefined,
      priceLevel: priceLevel !== undefined ? priceLevel : undefined,
      openingHours: openingHours ? {
        open_now: openingHours.open_now,
        weekday_text: openingHours.weekday_text || []
      } : undefined,
      wheelchairAccessible: wheelchairAccessible !== undefined ? wheelchairAccessible : undefined
    });

  } catch (error) {
    console.error('Error fetching place details:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
