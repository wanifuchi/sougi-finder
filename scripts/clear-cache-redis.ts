/**
 * Redis直接接続版キャッシュクリアスクリプト
 *
 * Vercel KVのREST API制限を回避し、確実な削除を実現
 * - ioredisでRedis直接接続
 * - ストリーミング削除でメモリ効率的
 * - エラーハンドリング＋リトライ
 * - 進捗モニタリング
 */

import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// 環境変数読み込み
dotenv.config({ path: '.env.local' });

interface DeletionStats {
  totalScanned: number;
  totalDeleted: number;
  failedKeys: string[];
  startTime: number;
  endTime?: number;
}

const PROGRESS_FILE = '/tmp/cache-clear-progress.json';
const BATCH_SIZE = 1000;
const MAX_RETRIES = 3;

async function main() {
  const args = process.argv.slice(2);
  const limitFlag = args.find(arg => arg.startsWith('--limit='));
  const limit = limitFlag ? parseInt(limitFlag.split('=')[1], 10) : undefined;

  console.log('=== Vercel KV キャッシュクリア（Redis直接接続版）===\n');

  // KV_URL取得
  const kvUrl = process.env.KV_URL;

  if (!kvUrl) {
    console.error('❌ エラー: KV_URL環境変数が設定されていません');
    console.error('');
    console.error('以下のコマンドで環境変数を取得してください：');
    console.error('  vercel env pull .env.local --yes');
    console.error('');
    console.error('または、Vercel Dashboard → Storage → easy-mammoth-21343 → .env で確認');
    process.exit(1);
  }

  console.log(`✅ KV_URL: ${kvUrl.substring(0, 30)}...`);

  if (limit) {
    console.log(`⚠️  テストモード: 最大${limit}件のみ削除\n`);
  } else {
    console.log(`🚀 本番モード: 全件削除\n`);
  }

  // Redis接続
  let redis: Redis;
  try {
    redis = new Redis(kvUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      connectTimeout: 10000,
    });

    // 接続確認
    await redis.ping();
    console.log('✅ Redis接続成功\n');
  } catch (error) {
    console.error('❌ Redis接続失敗:', error);
    process.exit(1);
  }

  const stats: DeletionStats = {
    totalScanned: 0,
    totalDeleted: 0,
    failedKeys: [],
    startTime: Date.now(),
  };

  try {
    console.log('🔍 キーをスキャン中...\n');

    // SCANストリームで効率的に削除
    const stream = redis.scanStream({
      match: 'description:*',
      count: BATCH_SIZE,
    });

    let batch: string[] = [];
    let processedInBatch = 0;

    for await (const keys of stream) {
      stats.totalScanned += keys.length;

      // キーをバッチに追加
      batch.push(...keys);

      // バッチサイズまたはlimitに達したら削除実行
      while (batch.length >= BATCH_SIZE || (limit && stats.totalDeleted + batch.length >= limit)) {
        const keysToDelete = limit
          ? batch.splice(0, Math.min(BATCH_SIZE, limit - stats.totalDeleted))
          : batch.splice(0, BATCH_SIZE);

        if (keysToDelete.length === 0) break;

        // UNLINKで非同期削除（DELより高速）
        const deleted = await deleteWithRetry(redis, keysToDelete);
        stats.totalDeleted += deleted;
        processedInBatch += deleted;

        // 100件ごとに進捗表示
        if (stats.totalDeleted % 100 === 0 || stats.totalDeleted >= (limit || Infinity)) {
          const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
          const rate = (stats.totalDeleted / (Date.now() - stats.startTime) * 1000).toFixed(0);
          console.log(`📊 進捗: ${stats.totalDeleted}件削除 | ${stats.totalScanned}件スキャン | ${rate}件/秒 | ${elapsed}秒経過`);
        }

        // 進捗保存
        await saveProgress(stats);

        // limit達成で終了
        if (limit && stats.totalDeleted >= limit) {
          console.log(`\n✅ テストlimit（${limit}件）に達しました`);
          stream.destroy();
          break;
        }
      }

      // limit達成で終了
      if (limit && stats.totalDeleted >= limit) {
        break;
      }
    }

    // 残りのバッチを処理
    if (batch.length > 0 && (!limit || stats.totalDeleted < limit)) {
      const keysToDelete = limit
        ? batch.slice(0, limit - stats.totalDeleted)
        : batch;

      const deleted = await deleteWithRetry(redis, keysToDelete);
      stats.totalDeleted += deleted;
      await saveProgress(stats);
    }

    stats.endTime = Date.now();
    const totalTime = ((stats.endTime - stats.startTime) / 1000).toFixed(1);
    const avgRate = (stats.totalDeleted / (stats.endTime - stats.startTime) * 1000).toFixed(0);

    console.log('\n=== 削除完了 ===');
    console.log(`✅ スキャン: ${stats.totalScanned}件`);
    console.log(`✅ 削除成功: ${stats.totalDeleted}件`);
    console.log(`❌ 削除失敗: ${stats.failedKeys.length}件`);
    console.log(`⏱️  実行時間: ${totalTime}秒`);
    console.log(`⚡ 平均速度: ${avgRate}件/秒`);

    if (stats.failedKeys.length > 0) {
      console.log('\n❌ 削除失敗キー:');
      stats.failedKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
      if (stats.failedKeys.length > 10) {
        console.log(`  ... 他${stats.failedKeys.length - 10}件`);
      }
    }

    // 最終進捗保存
    await saveProgress(stats);

  } catch (error) {
    console.error('\n❌ エラー発生:', error);
    await saveProgress(stats);
    process.exit(1);
  } finally {
    await redis.quit();
    console.log('\n✅ Redis接続をクローズしました');
  }
}

/**
 * リトライ付き削除
 */
async function deleteWithRetry(redis: Redis, keys: string[], retries = 0): Promise<number> {
  try {
    // UNLINKコマンド（非同期削除、より高速）
    const deleted = await redis.unlink(...keys);
    return deleted;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.warn(`⚠️  削除失敗、リトライ中... (${retries + 1}/${MAX_RETRIES})`);
      await sleep(1000 * (retries + 1));
      return deleteWithRetry(redis, keys, retries + 1);
    } else {
      console.error(`❌ 削除失敗（最大リトライ超過）:`, error);
      return 0;
    }
  }
}

/**
 * 進捗保存
 */
async function saveProgress(stats: DeletionStats): Promise<void> {
  try {
    await fs.promises.writeFile(PROGRESS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.warn('⚠️  進捗保存失敗:', error);
  }
}

/**
 * スリープ
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 実行
main().catch(error => {
  console.error('致命的エラー:', error);
  process.exit(1);
});
