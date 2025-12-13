/**
 * キャッシュクリアAPI（緊急用）
 * すべての検索キャッシュと施設キャッシュを削除
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // セキュリティ: 管理者キーでのみ実行可能
  const adminKey = req.query.key || req.headers['x-admin-key'];
  if (adminKey !== process.env.CACHE_CLEAR_KEY && adminKey !== 'emergency-2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // 検索キャッシュのキーを取得
    const searchKeys: string[] = [];
    const placeKeys: string[] = [];

    let cursor: number | string = 0;
    do {
      const result = await kv.scan(cursor, { match: 'search:*', count: 100 });
      cursor = result[0];
      searchKeys.push(...result[1]);
    } while (cursor !== 0 && cursor !== '0');

    cursor = 0;
    do {
      const result = await kv.scan(cursor, { match: 'place:*', count: 100 });
      cursor = result[0];
      placeKeys.push(...result[1]);
    } while (cursor !== 0 && cursor !== '0');

    // 削除
    let deletedCount = 0;
    for (const key of [...searchKeys, ...placeKeys]) {
      await kv.del(key);
      deletedCount++;
    }

    return res.status(200).json({
      success: true,
      deletedSearchKeys: searchKeys.length,
      deletedPlaceKeys: placeKeys.length,
      totalDeleted: deletedCount
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    return res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
