/**
 * 写真プロキシAPI
 * photo_referenceを受け取り、サーバー側でAPIキーを付与してGoogle Places Photoにリダイレクト
 * これによりAPIキーがクライアントに露出しない
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
    const { ref, maxwidth = '800' } = req.query;

    if (!ref || typeof ref !== 'string') {
      return res.status(400).json({ error: 'photo reference is required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Google Places Photo APIにリダイレクト
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${ref}&key=${apiKey}`;

    // 画像を取得してストリームとして返す
    const photoResponse = await fetch(photoUrl);

    if (!photoResponse.ok) {
      console.error(`Photo fetch failed: ${photoResponse.status}`);
      return res.status(photoResponse.status).json({ error: 'Failed to fetch photo' });
    }

    // Content-Typeをコピー
    const contentType = photoResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // キャッシュヘッダーを設定（1日）
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

    // 画像データをストリームとして返す
    const buffer = await photoResponse.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error in photo proxy:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
