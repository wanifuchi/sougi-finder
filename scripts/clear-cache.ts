/**
 * Upstash Redisのキャッシュクリアスクリプト
 * description:* パターンのキーを全削除
 */

import * as dotenv from 'dotenv';
import { kv } from '@vercel/kv';

// .env.local を読み込む
dotenv.config({ path: '.env.local' });

async function clearCache() {
  console.log('🔍 Scanning for description:* keys...');

  try {
    // description:で始まるキーを全て取得
    let cursor = 0;
    let deletedCount = 0;
    const keysToDelete: string[] = [];

    do {
      // SCAN コマンドでキーを取得
      const result = await kv.scan(cursor, {
        match: 'description:*',
        count: 100
      });

      cursor = result[0];
      const keys = result[1] as string[];

      if (keys.length > 0) {
        keysToDelete.push(...keys);
        console.log(`📦 Found ${keys.length} keys (Total: ${keysToDelete.length})`);
      }
    } while (cursor !== 0);

    console.log(`\n📊 Total keys to delete: ${keysToDelete.length}`);

    if (keysToDelete.length === 0) {
      console.log('✅ No keys found. Cache is already empty.');
      return;
    }

    // 全てのキーを削除
    console.log('🗑️  Deleting keys...');
    for (const key of keysToDelete) {
      await kv.del(key);
      deletedCount++;
      if (deletedCount % 10 === 0) {
        console.log(`   Deleted ${deletedCount}/${keysToDelete.length} keys...`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} keys!`);
    console.log('🎉 Cache cleared!');

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    throw error;
  }
}

// 実行
clearCache().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Failed:', error);
  process.exit(1);
});
