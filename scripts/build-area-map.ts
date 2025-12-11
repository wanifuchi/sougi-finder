#!/usr/bin/env ts-node

/**
 * 町域名データのビルドスクリプト
 *
 * 日本郵便の郵便番号データ（ローマ字版）から町域名のマッピングを生成します。
 * 「池袋」「秋葉原」などの地域名を含む約12万件のデータから、
 * 日本語名→ローマ字名のマッピングJSONを生成します。
 *
 * データソース: https://www.post.japanpost.jp/zipcode/dl/roman-zip.html
 * ライセンス: 日本郵便は著作権を主張せず、自由に利用・配布可能
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES moduleで __dirname を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// データソースURL（日本郵便 郵便番号データ ローマ字版）
const ZIP_URL = 'https://www.post.japanpost.jp/zipcode/dl/roman/KEN_ALL_ROME.zip';

// 出力先
const OUTPUT_DIR = path.join(__dirname, '../utils/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'area-names.json');
const TEMP_DIR = path.join(__dirname, '../temp');
const TEMP_ZIP = path.join(TEMP_DIR, 'KEN_ALL_ROME.zip');

/**
 * HTTPSでファイルをダウンロード
 */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // リダイレクト対応
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          console.log(`リダイレクト: ${redirectUrl}`);
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

/**
 * CSVデータをパースして町域名マッピングを生成
 *
 * データ構造:
 * 1. 郵便番号
 * 2. 都道府県名（漢字）
 * 3. 市区町村名（漢字）
 * 4. 町域名（漢字） ← 抽出対象
 * 5. 都道府県名（ローマ字）
 * 6. 市区町村名（ローマ字）
 * 7. 町域名（ローマ字） ← 抽出対象
 */
function parseCSV(csvData: string): Record<string, string> {
  const lines = csvData.split('\n');
  const mapping: Record<string, string> = {};
  let processedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSVパース（ダブルクォートで囲まれている可能性あり）
    const columns = line.split(',').map(col => col.replace(/^"|"$/g, '').trim());

    if (columns.length < 7) {
      skippedCount++;
      continue;
    }

    const areaNameJa = columns[3]; // 町域名（漢字）
    const areaNameEn = columns[6]; // 町域名（ローマ字）

    if (areaNameJa && areaNameEn) {
      // ローマ字を小文字に変換
      const romajiLower = areaNameEn.toLowerCase();

      // 既存のエントリがない場合のみ追加（重複回避）
      if (!mapping[areaNameJa]) {
        mapping[areaNameJa] = romajiLower;
        processedCount++;
      }

      // 接尾語（「町」「村」など）を削除したバージョンも登録
      const cleanedJa = areaNameJa.replace(/町$|村$|字$/g, '').trim();
      if (cleanedJa !== areaNameJa && !mapping[cleanedJa]) {
        mapping[cleanedJa] = romajiLower;
      }
    } else {
      skippedCount++;
    }
  }

  console.log(`✓ 処理完了: ${processedCount} エントリ生成 (スキップ: ${skippedCount})`);
  return mapping;
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('町域名データのビルドを開始...');
    console.log(`データソース: ${ZIP_URL}`);

    // 一時ディレクトリを作成
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
      console.log(`✓ 一時ディレクトリ作成: ${TEMP_DIR}`);
    }

    // ZIPファイルをダウンロード
    console.log('ZIPファイルをダウンロード中...');
    console.log('⚠️ 注意: 日本郵便のサーバーは直接ダウンロードをサポートしていない可能性があります');
    console.log('⚠️ 代替方法: 手動でダウンロードして temp/ ディレクトリに配置してください');
    console.log(`⚠️ ダウンロード先: ${ZIP_URL}`);

    // 実際には、日本郵便のデータは手動ダウンロードが必要な場合が多い
    // そのため、ZIPファイルが既に存在するかチェック
    if (!fs.existsSync(TEMP_ZIP)) {
      console.error('❌ ZIPファイルが見つかりません');
      console.log('');
      console.log('【解決策】');
      console.log('1. ブラウザで以下のURLにアクセス:');
      console.log('   https://www.post.japanpost.jp/zipcode/dl/roman-zip.html');
      console.log('2. "KEN_ALL_ROME.zip" をダウンロード');
      console.log(`3. ダウンロードしたファイルを以下に配置: ${TEMP_ZIP}`);
      console.log('4. このスクリプトを再実行');
      process.exit(1);
    }

    console.log(`✓ ZIPファイル発見: ${TEMP_ZIP}`);

    // ZIPを解凍（Node.jsにはビルトインzip機能がないため、外部ライブラリが必要）
    // 今回は簡易的に、解凍済みCSVファイルがあることを前提とする
    const csvPath = path.join(TEMP_DIR, 'KEN_ALL_ROME.CSV');

    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSVファイルが見つかりません');
      console.log('');
      console.log('【解決策】');
      console.log('1. KEN_ALL_ROME.zip を手動で解凍');
      console.log(`2. KEN_ALL_ROME.CSV を以下に配置: ${csvPath}`);
      console.log('3. このスクリプトを再実行');
      process.exit(1);
    }

    // CSVファイルを読み込み
    console.log('CSVファイルを読み込み中...');
    const csvData = fs.readFileSync(csvPath, 'shift_jis'); // 日本郵便のデータはShift_JIS
    console.log(`✓ 読み込み完了 (${csvData.length} bytes)`);

    // CSVをパースしてマッピングを生成
    console.log('CSVをパース中...');
    const mapping = parseCSV(csvData.toString());
    console.log(`✓ パース完了 (${Object.keys(mapping).length} エントリ)`);

    // 出力ディレクトリを作成
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`✓ 出力ディレクトリ作成: ${OUTPUT_DIR}`);
    }

    // JSONファイルに書き込み
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(mapping, null, 2),
      'utf-8'
    );
    console.log(`✓ マッピングファイル生成: ${OUTPUT_FILE}`);

    // サンプルデータを表示
    console.log('\n生成されたマッピングの例:');
    const sampleKeys = ['池袋', '秋葉原', '新宿', '渋谷', '銀座', '六本木'];
    for (const key of sampleKeys) {
      if (mapping[key]) {
        console.log(`  ${key} → ${mapping[key]}`);
      }
    }

    console.log('\n✅ ビルド完了!');
    console.log(`\n【次のステップ】`);
    console.log(`1. utils/urlHelpers.ts に area-names.json をインポート`);
    console.log(`2. convertToRomajiFallback() で町域名マップを優先的にチェック`);
    console.log(`3. npm run build でビルド`);
    console.log(`4. Vercel にデプロイ`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();
