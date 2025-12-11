#!/usr/bin/env ts-node

/**
 * 市区町村データのビルドスクリプト
 *
 * OtterSou/japan-municipalities (2025年3月版) から最新の市区町村データをダウンロードし、
 * 日本語名→ローマ字名のマッピングJSONを生成します。
 *
 * データソース: https://github.com/OtterSou/japan-municipalities
 * ライセンス: CC0 1.0 Universal (パブリックドメイン相当)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES moduleで __dirname を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// データソースURL
const TSV_URL = 'https://raw.githubusercontent.com/OtterSou/japan-municipalities/main/3-muni.tsv';

// 出力先
const OUTPUT_DIR = path.join(__dirname, '../utils/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'municipalities.json');

interface MunicipalityData {
  code: string;
  fullJa: string;
  fullJaHira: string;
  fullEn: string;
  baseJa: string;
  baseJaHira: string;
  baseEn: string;
  type: string;
  pref: string;
}

/**
 * HTTPSでファイルをダウンロード
 */
function downloadFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * TSVデータをパースしてマッピングを生成
 */
function parseTSV(tsvData: string): Record<string, string> {
  const lines = tsvData.split('\n');
  const header = lines[0].split('\t');

  // カラムインデックスを取得
  const baseJaIndex = header.indexOf('base-ja');
  const baseEnIndex = header.indexOf('base-en');

  if (baseJaIndex === -1 || baseEnIndex === -1) {
    throw new Error('必要なカラムが見つかりません');
  }

  const mapping: Record<string, string> = {};

  // データ行を処理（ヘッダーをスキップ）
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split('\t');
    const baseJa = columns[baseJaIndex];
    const baseEn = columns[baseEnIndex];

    if (baseJa && baseEn) {
      // 「区」「市」「町」「村」を削除したバージョンをキーとして登録
      const cleanedJa = baseJa.replace(/区$|市$|町$|村$/g, '').trim();

      // ローマ字を小文字に変換
      const romajiLower = baseEn.toLowerCase();

      // 元の名前も登録
      mapping[baseJa] = romajiLower;

      // 接尾語なしの名前も登録
      if (cleanedJa !== baseJa) {
        mapping[cleanedJa] = romajiLower;
      }
    }
  }

  return mapping;
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('市区町村データのダウンロードを開始...');
    console.log(`データソース: ${TSV_URL}`);

    // TSVファイルをダウンロード
    const tsvData = await downloadFile(TSV_URL);
    console.log(`✓ ダウンロード完了 (${tsvData.length} bytes)`);

    // TSVをパースしてマッピングを生成
    const mapping = parseTSV(tsvData);
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
    const sampleKeys = ['新宿', '渋谷', '練馬', '横浜', '大阪'];
    for (const key of sampleKeys) {
      if (mapping[key]) {
        console.log(`  ${key} → ${mapping[key]}`);
      }
    }

    console.log('\n✅ ビルド完了!');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();
