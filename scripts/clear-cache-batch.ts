/**
 * Upstash Redis キャッシュクリアスクリプト（バッチ削除版）
 * description:* パターンのキーを高速で全削除
 */

import * as dotenv from 'dotenv';
import { kv } from '@vercel/kv';

// .env.local を読み込む
dotenv.config({ path: '.env.local' });

async function clearCacheBatch() {
  console.log('🔍 Scanning for description:* keys...');

  try {
    // Step 1: 全キーをスキャン
    let cursor = 0;
    const keysToDelete: string[] = [];

    do {
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

    // Step 2: バッチ削除（100キーごと）
    console.log('🗑️  Deleting keys in batches...');
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batch = keysToDelete.slice(i, i + batchSize);

      // pipelineを使用してバッチ削除
      const pipeline = kv.pipeline();
      for (const key of batch) {
        pipeline.del(key);
      }

      await pipeline.exec();
      deletedCount += batch.length;

      const progress = Math.round((deletedCount / keysToDelete.length) * 100);
      console.log(`   Progress: ${deletedCount}/${keysToDelete.length} (${progress}%)`);
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} keys!`);
    console.log('🎉 Cache cleared!');

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    throw error;
  }
}

// 実行
clearCacheBatch().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Failed:', error);
  process.exit(1);
});
