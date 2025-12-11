#!/usr/bin/env ts-node

/**
 * 特定のplaceIdのキャッシュをクリアするスクリプト
 */

import { kv } from '@vercel/kv';

async function main() {
  const placeId = process.argv[2];
  
  if (!placeId) {
    console.error('Usage: npx tsx scripts/clear-specific-cache.ts <placeId>');
    process.exit(1);
  }

  const cacheKey = `description:${placeId}`;
  
  try {
    await kv.del(cacheKey);
    console.log(`✅ キャッシュクリア完了: ${cacheKey}`);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
