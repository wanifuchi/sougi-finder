/**
 * キャッシュ削除検証スクリプト
 *
 * - 削除前後のキー数確認
 * - サンプルキーの存在確認
 * - 削除成功率レポート
 */

import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// 環境変数読み込み
dotenv.config({ path: '.env.local' });

async function main() {
  const args = process.argv.slice(2);
  const countOnly = args.includes('--count-only');
  const verifySample = args.includes('--verify-sample');
  const fullScan = args.includes('--full-scan');

  console.log('=== Vercel KV キャッシュ削除検証 ===\n');

  // KV_URL取得
  const kvUrl = process.env.KV_URL;

  if (!kvUrl) {
    console.error('❌ エラー: KV_URL環境変数が設定されていません');
    console.error('');
    console.error('以下のコマンドで環境変数を取得してください：');
    console.error('  vercel env pull .env.local --yes');
    process.exit(1);
  }

  // Redis接続
  let redis: Redis;
  try {
    redis = new Redis(kvUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    });

    await redis.ping();
    console.log('✅ Redis接続成功\n');
  } catch (error) {
    console.error('❌ Redis接続失敗:', error);
    process.exit(1);
  }

  try {
    // キー数カウント
    console.log('🔍 description:* キーをカウント中...\n');
    const keys = await scanAllKeys(redis, 'description:*');

    console.log('=== カウント結果 ===');
    console.log(`📊 合計キー数: ${keys.length}件`);

    if (keys.length > 0) {
      console.log(`\n📝 サンプルキー（最初の10件）:`);
      keys.slice(0, 10).forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}`);
      });

      if (keys.length > 10) {
        console.log(`  ... 他${keys.length - 10}件`);
      }
    } else {
      console.log('\n✅ description:* パターンのキーは存在しません（削除完了）');
    }

    // サンプル検証モード
    if (verifySample && keys.length > 0) {
      console.log('\n=== サンプル検証 ===');
      const sampleSize = Math.min(10, keys.length);
      const sampleKeys = keys.slice(0, sampleSize);

      for (const key of sampleKeys) {
        const exists = await redis.exists(key);
        const status = exists ? '❌ 存在' : '✅ 削除済み';
        console.log(`${status}: ${key}`);
      }
    }

    // フルスキャンモード
    if (fullScan) {
      console.log('\n=== フルスキャン検証 ===');
      console.log('すべてのキーを確認中...\n');

      let existsCount = 0;
      let deletedCount = 0;

      for (const key of keys) {
        const exists = await redis.exists(key);
        if (exists) {
          existsCount++;
          if (existsCount <= 10) {
            console.log(`❌ 残存: ${key}`);
          }
        } else {
          deletedCount++;
        }
      }

      console.log('\n=== フルスキャン結果 ===');
      console.log(`✅ 削除済み: ${deletedCount}件`);
      console.log(`❌ 残存: ${existsCount}件`);

      if (existsCount > 10) {
        console.log(`  （残存キーは上位10件のみ表示）`);
      }

      if (existsCount === 0) {
        console.log('\n🎉 完全削除成功！すべてのキーが削除されました');
      } else {
        const successRate = ((deletedCount / keys.length) * 100).toFixed(1);
        console.log(`\n⚠️  削除成功率: ${successRate}%`);
      }
    }

  } catch (error) {
    console.error('\n❌ エラー発生:', error);
    process.exit(1);
  } finally {
    await redis.quit();
    console.log('\n✅ Redis接続をクローズしました');
  }
}

/**
 * すべてのキーをスキャン
 */
async function scanAllKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      1000
    );

    cursor = nextCursor;
    keys.push(...batch);

    // 進捗表示（1000件ごと）
    if (keys.length > 0 && keys.length % 1000 === 0) {
      console.log(`  スキャン中... ${keys.length}件発見`);
    }
  } while (cursor !== '0');

  return keys;
}

// 実行
main().catch(error => {
  console.error('致命的エラー:', error);
  process.exit(1);
});
