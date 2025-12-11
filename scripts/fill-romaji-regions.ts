/**
 * regions.jsonの空romajiフィールドを補完するスクリプト
 *
 * 目的: 北長岡駅など1,837駅のromaji欠損を解消
 *
 * 処理フロー:
 * 1. regions.jsonを読み込み
 * 2. romajiが空のエントリを検出
 * 3. station.stations[0].codeからromaji抽出（既存ロジックと同じ）
 * 4. フォールバック: シンプルなローマ字変換
 * 5. 更新されたregions.jsonを保存
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES moduleで__dirnameを使用するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// regions.jsonのパス
const REGIONS_PATH = path.join(__dirname, '../app/utils/data/regions.json');

// 駅データのGitHub URL（元データ取得用）
const STATIONS_DATA_URL = 'https://raw.githubusercontent.com/piuccio/open-data-jp-railway-stations/master/stations.json';

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
 * シンプルなローマ字変換（フォールバック用）
 */
function convertToRomajiSimple(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * station.stations[0].codeからromajiを抽出
 */
function extractRomajiFromStationCode(station: Station): string {
  let romaji = station.name_romaji;

  if (!romaji || romaji.trim() === '') {
    const firstStation = station.stations[0];
    if (firstStation?.code) {
      // codeフォーマット例: "JR-East.Yamanote.Ikebukuro"
      const parts = firstStation.code.split('.');
      romaji = parts[parts.length - 1]; // 最後の部分を取得
    } else {
      // それでも取得できない場合は、駅名をそのまま使用
      romaji = convertToRomajiSimple(station.name_kanji);
    }
  }

  // ローマ字をクリーニング
  romaji = romaji.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

  return romaji;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 regions.json のromaji補完を開始します...\n');

  // Step 1: 既存のregions.jsonを読み込み
  console.log('📂 regions.jsonを読み込み中...');
  const regionsData: Record<string, RegionData> = JSON.parse(
    fs.readFileSync(REGIONS_PATH, 'utf-8')
  );
  console.log(`✅ regions.json読み込み完了: ${Object.keys(regionsData).length}エントリ\n`);

  // Step 2: romajiが空のエントリを検出
  console.log('🔍 romajiが空のエントリを検出中...');
  const emptyRomajiEntries: string[] = [];
  const stationEmptyRomajiEntries: string[] = [];

  for (const [name, data] of Object.entries(regionsData)) {
    if (!data.romaji || data.romaji.trim() === '') {
      emptyRomajiEntries.push(name);
      if (data.type === 'station') {
        stationEmptyRomajiEntries.push(name);
      }
    }
  }

  console.log(`📊 検出結果:`);
  console.log(`   - romajiが空のエントリ: ${emptyRomajiEntries.length}件`);
  console.log(`   - うち駅データ: ${stationEmptyRomajiEntries.length}件`);
  console.log(`   - うち市区町村: ${emptyRomajiEntries.length - stationEmptyRomajiEntries.length}件\n`);

  if (emptyRomajiEntries.length === 0) {
    console.log('✅ すべてのエントリにromajiが設定されています！');
    return;
  }

  // Step 3: 駅データを再取得
  console.log('📡 駅データをダウンロード中...');
  const stationsData: Station[] = await fetchJSON(STATIONS_DATA_URL);
  console.log(`✅ 駅データ取得完了: ${stationsData.length}駅\n`);

  // Step 4: 駅名→Stationデータのマップを作成
  const stationMap = new Map<string, Station>();
  for (const station of stationsData) {
    stationMap.set(station.name_kanji, station);
  }

  // Step 5: romajiを補完
  console.log('🔧 romajiを補完中...');
  let updatedCount = 0;
  let stationUpdatedCount = 0;
  let municipalityUpdatedCount = 0;

  for (const name of emptyRomajiEntries) {
    const entry = regionsData[name];

    if (entry.type === 'station') {
      // 駅データの場合: 元データから再抽出
      const station = stationMap.get(name);
      if (station) {
        entry.romaji = extractRomajiFromStationCode(station);
        stationUpdatedCount++;
      } else {
        // マップに存在しない場合はシンプル変換
        entry.romaji = convertToRomajiSimple(name);
        console.warn(`⚠️  駅データ未検出: ${name} → ${entry.romaji}`);
      }
    } else {
      // 市区町村の場合: シンプル変換（既存データは正しい前提）
      entry.romaji = convertToRomajiSimple(name);
      municipalityUpdatedCount++;
    }

    updatedCount++;

    // 進捗表示（100件ごと）
    if (updatedCount % 100 === 0) {
      console.log(`   処理済み: ${updatedCount}/${emptyRomajiEntries.length}件`);
    }
  }

  console.log(`\n✅ romaji補完完了:`);
  console.log(`   - 更新総数: ${updatedCount}件`);
  console.log(`   - 駅データ: ${stationUpdatedCount}件`);
  console.log(`   - 市区町村: ${municipalityUpdatedCount}件\n`);

  // Step 6: regions.jsonを保存
  console.log('💾 regions.jsonを保存中...');
  fs.writeFileSync(
    REGIONS_PATH,
    JSON.stringify(regionsData, null, 2),
    'utf-8'
  );

  console.log(`✅ regions.json保存完了: ${REGIONS_PATH}\n`);

  // Step 7: 検証（北長岡駅を確認）
  console.log('🔍 検証: 北長岡駅の存在確認...');
  const kitanagaoka = regionsData['北長岡'];
  if (kitanagaoka) {
    console.log(`✅ 北長岡駅が見つかりました:`);
    console.log(`   - romaji: "${kitanagaoka.romaji}"`);
    console.log(`   - type: ${kitanagaoka.type}`);
    console.log(`   - priority: ${kitanagaoka.priority}`);
  } else {
    console.warn(`⚠️  北長岡駅が見つかりません（駅データに含まれていない可能性）`);
  }

  console.log('\n🎉 romaji補完が完了しました！');
}

// スクリプト実行
main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
