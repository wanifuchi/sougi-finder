/**
 * 駅名データ取得・regions.json生成スクリプト
 *
 * データソース: piuccio/open-data-jp-railway-stations
 * https://github.com/piuccio/open-data-jp-railway-stations
 *
 * ライセンス: ekidata.jp利用規約準拠（商用利用可能）
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES moduleで__dirnameを使用するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 駅データのGitHub URL
const STATIONS_DATA_URL = 'https://raw.githubusercontent.com/piuccio/open-data-jp-railway-stations/master/stations.json';

// 既存のmunicipalities.jsonのパス
const MUNICIPALITIES_PATH = path.join(__dirname, '../app/utils/data/municipalities.json');

// 出力先のregions.jsonのパス
const OUTPUT_PATH = path.join(__dirname, '../app/utils/data/regions.json');

// RegionData型定義
interface RegionData {
  romaji: string;
  type: 'municipality' | 'station' | 'area';
  priority: 1 | 2 | 3 | 4 | 5;
  prefecture?: string;
  lat?: number;
  lon?: number;
  lineIds?: string[];
}

// StationData型定義（piuccio/open-data-jp-railway-stations形式）
interface StationInfo {
  code: string;
  ekidata_id: string;
  ekidata_group_id: string;
  name_kanji: string;
  alternative_names: string[];
  ekidata_line_id: string;
  line_code: string;
  short_code: string;
  prefecture: string;
  lat: number;
  lon: number;
}

interface Station {
  name_kanji: string;
  name_kana: string;
  name_romaji: string;
  alternative_names: string[];
  group_code: string;
  ekidata_line_ids: string[];
  line_codes: string[];
  stations: StationInfo[];
  prefecture: string;
}

/**
 * Kuroshiro初期化（グローバルインスタンス）
 */
let kuroshiroInstance: any | null = null;

async function initializeKuroshiro(): Promise<any> {
  if (kuroshiroInstance) {
    return kuroshiroInstance;
  }

  console.log('📚 [Kuroshiro] 初期化中...');

  // Dynamic import for Kuroshiro
  const KuroshiroModule = await import('kuroshiro');
  const KuromojiModule = await import('kuroshiro-analyzer-kuromoji');

  const Kuroshiro = KuroshiroModule.default;
  const KuromojiAnalyzer = KuromojiModule.default;

  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
  kuroshiroInstance = kuroshiro;
  console.log('✅ [Kuroshiro] 初期化完了');
  return kuroshiro;
}

/**
 * Kuroshiroで駅名をローマ字に変換
 */
async function convertToRomajiWithKuroshiro(text: string): Promise<string> {
  try {
    const kuroshiro = await initializeKuroshiro();
    const romaji = await kuroshiro.convert(text, {
      mode: 'normal',
      to: 'romaji',
      romajiSystem: 'hepburn'
    });

    // クリーニング処理
    const cleaned = romaji
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');

    return cleaned;
  } catch (error) {
    console.error(`❌ [Kuroshiro] 変換エラー: ${text}`, error);
    // フォールバック: convertToRomajiSimpleを使用
    return convertToRomajiSimple(text);
  }
}

/**
 * HTTPSでJSONデータを取得
 */
function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`JSON parse error: ${error}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 都道府県コードから優先度を決定
 * 東京(13)、神奈川(14)、埼玉(11)、千葉(12)、大阪(27)、愛知(23) → 高優先度
 */
function calculatePriority(prefecture: string, lineCount: number): 1 | 2 | 3 | 4 | 5 {
  const majorPrefectures = ['13', '14', '11', '12', '27', '23']; // 東京、神奈川、埼玉、千葉、大阪、愛知
  const isMajorPrefecture = majorPrefectures.includes(prefecture);

  // 路線数が多い主要駅は優先度1
  if (isMajorPrefecture && lineCount >= 3) {
    return 1;
  }

  // 主要都市の一般駅は優先度2
  if (isMajorPrefecture && lineCount >= 2) {
    return 2;
  }

  // 主要都市の小規模駅は優先度3
  if (isMajorPrefecture) {
    return 3;
  }

  // 地方の主要駅（路線数2以上）は優先度3
  if (lineCount >= 2) {
    return 3;
  }

  // 地方の一般駅は優先度4
  if (lineCount >= 1) {
    return 4;
  }

  // それ以外は優先度5
  return 5;
}

/**
 * 駅名からローマ字を生成（フォールバック用）
 * 既存のname_romajiが存在しない場合のみ使用
 */
function convertToRomajiSimple(text: string): string {
  // シンプルなローマ字変換（フォールバック）
  // 実際にはname_romajiフィールドを優先的に使用するため、ほとんど呼ばれない
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 駅名データ取得・regions.json生成を開始します...\n');

  // Step 1: 駅データ取得
  console.log('📡 駅データをダウンロード中...');
  console.log(`   URL: ${STATIONS_DATA_URL}`);
  const stationsData: Station[] = await fetchJSON(STATIONS_DATA_URL);
  console.log(`✅ 駅データ取得完了: ${stationsData.length}駅\n`);

  // Step 3: 既存のmunicipalities.jsonを読み込み
  console.log('📂 municipalities.jsonを読み込み中...');
  const municipalitiesData: Record<string, string> = JSON.parse(
    fs.readFileSync(MUNICIPALITIES_PATH, 'utf-8')
  );
  console.log(`✅ municipalities.json読み込み完了: ${Object.keys(municipalitiesData).length}エントリ\n`);

  // Step 4: regions.jsonの初期データを作成（municipalities.jsonから）
  console.log('🏗️ regions.jsonの初期データを作成中...');
  const regionsData: Record<string, RegionData> = {};

  for (const [name, romaji] of Object.entries(municipalitiesData)) {
    regionsData[name] = {
      romaji,
      type: 'municipality',
      priority: 2, // 市区町村は優先度2
    };
  }
  console.log(`✅ 市区町村データ追加完了: ${Object.keys(regionsData).length}エントリ\n`);

  // Step 5: 駅データを追加
  console.log('🚉 駅データを処理中...');
  let stationCount = 0;
  let skippedCount = 0;
  let kuromojiConvertedCount = 0;

  // Kuroshiro初期化（最初の1回のみ）
  await initializeKuroshiro();

  for (const station of stationsData) {
    const stationName = station.name_kanji;

    // 駅名が空の場合はスキップ
    if (!stationName) {
      skippedCount++;
      continue;
    }

    // ローマ字を取得または生成（厳格化）
    let romaji = station.name_romaji || '';
    romaji = romaji.trim();

    // 空の場合、station.stations[0].codeから抽出を試みる
    if (romaji === '') {
      const firstStation = station.stations[0];
      if (firstStation?.code) {
        // codeフォーマット例: "JR-East.Yamanote.Ikebukuro"
        const parts = firstStation.code.split('.');
        romaji = parts[parts.length - 1] || '';
        romaji = romaji.trim();
      }
    }

    // 【強化】空の場合は必ずKuroshiro変換
    if (romaji === '') {
      romaji = await convertToRomajiWithKuroshiro(stationName);
      kuromojiConvertedCount++;
      console.log(`🔄 [Kuroshiro変換] ${stationName} → ${romaji}`);
    }

    // ローマ字をクリーニング
    romaji = romaji.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

    // 【最終確認】変換後も空なら警告とフォールバック
    if (romaji === '') {
      console.warn(`⚠️ [空romaji] 変換失敗: ${stationName}`);
      romaji = 'unknown'; // フォールバック値
    }

    // 優先度を計算
    const lineCount = station.ekidata_line_ids?.length || 0;
    const priority = calculatePriority(station.prefecture, lineCount);

    // 【変更】優先度4-5も含める（北長岡駅などマイナー駅も対応）
    // データ量増加を許容して全駅を追加

    // 緯度経度を取得（最初のstation情報から）
    const firstStation = station.stations[0];
    const lat = firstStation?.lat;
    const lon = firstStation?.lon;

    // regions.jsonに追加
    regionsData[stationName] = {
      romaji,
      type: 'station',
      priority,
      prefecture: station.prefecture,
      lat,
      lon,
      lineIds: station.ekidata_line_ids,
    };

    stationCount++;

    // 進捗表示（100駅ごと）
    if (stationCount % 100 === 0) {
      console.log(`   処理済み: ${stationCount}駅（スキップ: ${skippedCount}駅）`);
    }
  }

  console.log(`✅ 駅データ追加完了: ${stationCount}駅追加（${skippedCount}駅スキップ）`);
  console.log(`   - Kuroshiro変換: ${kuromojiConvertedCount}駅\n`);

  // Step 6: regions.jsonを出力
  console.log('💾 regions.jsonを保存中...');
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(regionsData, null, 2),
    'utf-8'
  );

  console.log(`✅ regions.json保存完了: ${OUTPUT_PATH}`);
  console.log(`   総エントリ数: ${Object.keys(regionsData).length}\n`);

  // Step 7: 統計情報を表示
  console.log('📊 統計情報:');
  const stats = {
    municipality: 0,
    station: 0,
    priority1: 0,
    priority2: 0,
    priority3: 0,
  };

  for (const data of Object.values(regionsData)) {
    if (data.type === 'municipality') stats.municipality++;
    if (data.type === 'station') stats.station++;
    if (data.priority === 1) stats.priority1++;
    if (data.priority === 2) stats.priority2++;
    if (data.priority === 3) stats.priority3++;
  }

  console.log(`   市区町村: ${stats.municipality}件`);
  console.log(`   駅: ${stats.station}件`);
  console.log(`   優先度1（主要駅）: ${stats.priority1}件`);
  console.log(`   優先度2（市区町村・一般駅）: ${stats.priority2}件`);
  console.log(`   優先度3（その他）: ${stats.priority3}件`);
  console.log('\n🎉 regions.json生成が完了しました！');
}

// スクリプト実行
main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
