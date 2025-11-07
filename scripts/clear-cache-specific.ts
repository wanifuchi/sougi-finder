/**
 * 特定キー削除スクリプト
 *
 * 指定したPlace IDまたはパターンに一致するキャッシュのみを削除
 */

import { kv } from '@vercel/kv';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// 環境変数読み込み
dotenv.config({ path: '.env.local' });

interface DeletionStats {
  totalDeleted: number;
  failedKeys: string[];
  startTime: number;
  endTime?: number;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('=== 特定キャッシュ削除スクリプト ===\n');
    console.log('使用方法:');
    console.log('  1. Place IDを指定:');
    console.log('     npx tsx scripts/clear-cache-specific.ts ChIJAQAAAOyLGGART3xN2NXYSys');
    console.log('');
    console.log('  2. 複数のPlace IDを指定（スペース区切り）:');
    console.log('     npx tsx scripts/clear-cache-specific.ts ChIJxxxx ChIJyyyy ChIJzzzz');
    console.log('');
    console.log('  3. ファイルから読み込み:');
    console.log('     npx tsx scripts/clear-cache-specific.ts --file place_ids.txt');
    console.log('     （ファイル形式: 1行に1つのPlace ID）');
    console.log('');
    console.log('  4. パターン指定（危険！要注意）:');
    console.log('     npx tsx scripts/clear-cache-specific.ts --pattern "description:ChIJ*"');
    console.log('');
    process.exit(0);
  }

  const stats: DeletionStats = {
    totalDeleted: 0,
    failedKeys: [],
    startTime: Date.now(),
  };

  try {
    let placeIds: string[] = [];

    // ファイルから読み込み
    if (args[0] === '--file' && args[1]) {
      const filePath = args[1];
      console.log(`📄 ファイルから読み込み: ${filePath}\n`);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      placeIds = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      console.log(`✅ ${placeIds.length}件のPlace IDを読み込みました\n`);
    }
    // パターン指定
    else if (args[0] === '--pattern' && args[1]) {
      const pattern = args[1];
      console.log(`🔍 パターン削除モード: ${pattern}`);
      console.log(`⚠️  警告: パターンに一致するすべてのキーが削除されます\n`);

      // 確認
      console.log('本当に削除しますか？ (y/N)');
      // 注意: 実際の実装では readline等で確認する必要あり
      console.log('⚠️  対話型確認は未実装のため、パターン削除はスキップします');
      console.log('   直接Place IDを指定して実行してください\n');
      process.exit(0);
    }
    // 直接指定
    else {
      placeIds = args;
      console.log(`=== 特定キャッシュ削除 ===`);
      console.log(`削除対象: ${placeIds.length}件\n`);
    }

    if (placeIds.length === 0) {
      console.log('❌ 削除対象のPlace IDがありません');
      process.exit(1);
    }

    // 削除実行
    console.log('🗑️  削除を開始します...\n');

    for (let i = 0; i < placeIds.length; i++) {
      const placeId = placeIds[i];
      const cacheKey = `description:${placeId}`;

      try {
        // 削除前に存在確認
        const exists = await kv.exists(cacheKey);

        if (!exists) {
          console.log(`  ⚠️  [${i + 1}/${placeIds.length}] キーが存在しません: ${cacheKey}`);
          continue;
        }

        // 削除実行
        const deleted = await kv.del(cacheKey);

        if (deleted === 1) {
          // 削除確認
          const stillExists = await kv.exists(cacheKey);

          if (stillExists) {
            console.log(`  ❌ [${i + 1}/${placeIds.length}] 削除失敗（確認エラー）: ${cacheKey}`);
            stats.failedKeys.push(cacheKey);
          } else {
            console.log(`  ✅ [${i + 1}/${placeIds.length}] 削除成功: ${cacheKey}`);
            stats.totalDeleted++;
          }
        } else {
          console.log(`  ❌ [${i + 1}/${placeIds.length}] 削除失敗: ${cacheKey}`);
          stats.failedKeys.push(cacheKey);
        }

        // レート制限対策
        await sleep(100);

      } catch (error) {
        console.error(`  ❌ [${i + 1}/${placeIds.length}] エラー: ${cacheKey}`, error);
        stats.failedKeys.push(cacheKey);
      }
    }

    stats.endTime = Date.now();
    const totalTime = ((stats.endTime - stats.startTime) / 1000).toFixed(1);

    console.log('\n=== 削除完了 ===');
    console.log(`✅ 削除成功: ${stats.totalDeleted}件`);
    console.log(`❌ 削除失敗: ${stats.failedKeys.length}件`);
    console.log(`⏱️  実行時間: ${totalTime}秒`);

    if (stats.failedKeys.length > 0) {
      console.log('\n❌ 削除失敗キー:');
      stats.failedKeys.forEach(key => console.log(`  - ${key}`));
    }

  } catch (error) {
    console.error('\n❌ エラー発生:', error);
    process.exit(1);
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
