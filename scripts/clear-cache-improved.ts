/**
 * REST API改善版キャッシュクリアスクリプト
 *
 * Redis直接接続が利用できない場合の代替案
 * - @vercel/kv REST APIを使用
 * - 個別削除＋削除確認で確実性を担保
 * - エラーハンドリング＋リトライ
 * - 進捗モニタリング
 */

import { kv } from '@vercel/kv';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// 環境変数読み込み
dotenv.config({ path: '.env.local' });

interface DeletionStats {
  totalScanned: number;
  totalDeleted: number;
  failedKeys: string[];
  verifiedDeleted: number;
  startTime: number;
  endTime?: number;
}

const PROGRESS_FILE = '/tmp/cache-clear-progress.json';
const BATCH_SIZE = 10; // 小さいバッチで確実性を重視
const MAX_RETRIES = 3;
const VERIFY_INTERVAL = 5; // 5件ごとに削除確認

async function main() {
  const args = process.argv.slice(2);
  const limitFlag = args.find(arg => arg.startsWith('--limit='));
  const limit = limitFlag ? parseInt(limitFlag.split('=')[1], 10) : undefined;

  console.log('=== Vercel KV キャッシュクリア（REST API改善版）===\n');

  // 環境変数確認
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    console.error('❌ エラー: KV_REST_API_URL または KV_REST_API_TOKEN が設定されていません');
    console.error('');
    console.error('以下のコマンドで環境変数を取得してください：');
    console.error('  vercel env pull .env.local --yes');
    process.exit(1);
  }

  console.log(`✅ KV REST API: ${kvUrl}`);

  if (limit) {
    console.log(`⚠️  テストモード: 最大${limit}件のみ削除\n`);
  } else {
    console.log(`🚀 本番モード: 全件削除\n`);
  }

  const stats: DeletionStats = {
    totalScanned: 0,
    totalDeleted: 0,
    failedKeys: [],
    verifiedDeleted: 0,
    startTime: Date.now(),
  };

  try {
    console.log('🔍 キーをスキャン中...\n');

    // 全キーを収集
    const allKeys: string[] = [];
    let cursor = 0;

    do {
      const [nextCursor, keys] = await kv.scan(cursor, {
        match: 'description:*',
        count: 1000,
      });

      cursor = nextCursor;
      allKeys.push(...keys);
      stats.totalScanned += keys.length;

      if (stats.totalScanned % 1000 === 0 && stats.totalScanned > 0) {
        console.log(`  スキャン中... ${stats.totalScanned}件発見`);
      }
    } while (cursor !== 0);

    console.log(`\n✅ スキャン完了: ${stats.totalScanned}件のキーを発見\n`);

    if (allKeys.length === 0) {
      console.log('✅ 削除対象のキーはありません');
      return;
    }

    // limit適用
    const keysToDelete = limit ? allKeys.slice(0, limit) : allKeys;
    console.log(`🗑️  削除開始: ${keysToDelete.length}件\n`);

    // バッチ削除（10件ごと）
    for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
      const batch = keysToDelete.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(keysToDelete.length / BATCH_SIZE);

      console.log(`📦 バッチ ${batchNumber}/${totalBatches} (${batch.length}件)`);

      // 個別削除（確実性重視）
      for (const key of batch) {
        const success = await deleteKeyWithVerify(key, stats);
        if (success) {
          stats.totalDeleted++;
          stats.verifiedDeleted++;
        } else {
          stats.failedKeys.push(key);
        }
      }

      // 進捗表示
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
      const rate = (stats.totalDeleted / (Date.now() - stats.startTime) * 1000).toFixed(1);
      const progress = ((stats.totalDeleted / keysToDelete.length) * 100).toFixed(1);

      console.log(`  ✅ 削除: ${stats.totalDeleted}/${keysToDelete.length}件 (${progress}%) | ${rate}件/秒 | ${elapsed}秒経過\n`);

      // 進捗保存
      await saveProgress(stats);

      // レート制限対策（小休止）
      await sleep(100);
    }

    stats.endTime = Date.now();
    const totalTime = ((stats.endTime - stats.startTime) / 1000).toFixed(1);
    const avgRate = (stats.totalDeleted / (stats.endTime - stats.startTime) * 1000).toFixed(1);

    console.log('\n=== 削除完了 ===');
    console.log(`✅ スキャン: ${stats.totalScanned}件`);
    console.log(`✅ 削除成功: ${stats.totalDeleted}件`);
    console.log(`✅ 検証済み: ${stats.verifiedDeleted}件`);
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
  }
}

/**
 * 削除＋検証
 */
async function deleteKeyWithVerify(key: string, stats: DeletionStats, retries = 0): Promise<boolean> {
  try {
    // 削除実行
    const deleted = await kv.del(key);

    // 削除確認（5件に1回）
    if (stats.totalDeleted % VERIFY_INTERVAL === 0) {
      const exists = await kv.exists(key);
      if (exists) {
        console.warn(`  ⚠️  削除確認失敗: ${key}`);

        // リトライ
        if (retries < MAX_RETRIES) {
          await sleep(500 * (retries + 1));
          return deleteKeyWithVerify(key, stats, retries + 1);
        }
        return false;
      }
    }

    return deleted === 1;
  } catch (error) {
    console.error(`  ❌ 削除エラー: ${key}`, error);

    // リトライ
    if (retries < MAX_RETRIES) {
      console.warn(`  🔄 リトライ中... (${retries + 1}/${MAX_RETRIES})`);
      await sleep(1000 * (retries + 1));
      return deleteKeyWithVerify(key, stats, retries + 1);
    }

    return false;
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
