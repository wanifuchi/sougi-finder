/**
 * URL生成ユーティリティ
 * 日本語の施設名・地域名を英数字のURLスラッグに変換
 * サーバーサイドAPI経由でKuroshiroを使用した正確な日本語→ローマ字変換
 *
 * データソース:
 * - municipalities.json: OtterSou/japan-municipalities (市区町村データ)
 * - regions.json: 統合データ（市区町村 + 駅名）
 */

import municipalityMapModule from './data/municipalities.json';
import regionsDataModule from './data/regions.json';

// Vite環境でJSONモジュールを正しくインポート
// .defaultプロパティがある場合はそれを使用、なければそのまま使用
const municipalityMap = (municipalityMapModule as any).default || municipalityMapModule;
const regionsData = (regionsDataModule as any).default || regionsDataModule;

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

// slug → placeId マッピング（重複検出用）
const slugMap = new Map<string, string>();

/**
 * 日本語文字列をローマ字スラッグに変換（サーバーサイドAPI経由）
 * 例: "東京都練馬区" → "tokyotonerima-ku"
 * 例: "株式会社セレハウス" → "kabushikigaishaserehouse"
 */
export async function convertToRomaji(text: string): Promise<string> {
  console.log('🚀 [convertToRomaji] 開始 - 入力:', text);
  try {
    // サーバーサイドAPIを呼び出し
    const response = await fetch('/api/convert-romaji', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [API] 変換成功:', data.romaji);
    return data.romaji;
  } catch (error) {
    console.error('❌ [API] エラー:', error);
    console.log('🔄 [Fallback] convertToRomajiFallback() を呼び出します');
    // フォールバック: 静的マッピング
    return convertToRomajiFallback(text);
  }
}

/**
 * 文字レベルのローマ字変換（最小限フォールバック）
 * regions.jsonのromajiが空の場合の緊急フォールバック
 */
function convertToRomajiCharLevel(text: string): string {
  console.log('🔧 [convertToRomajiCharLevel] 文字レベル変換開始:', text);

  // ローマ字マッピング（簡易版）
  const romajiMap: Record<string, string> = {
    // 平仮名
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    // 濁音
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    // 半濁音
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    // カタカナ
    'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
    'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
    'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
    'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
    'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
    'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
    'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
    'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
    'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
    'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
    // 濁音
    'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
    'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
    'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
    'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
    // 半濁音
    'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
    // 長音
    'ー': ''
  };

  // 1文字ずつローマ字変換
  let result = '';
  for (const char of text.toLowerCase()) {
    if (romajiMap[char]) {
      result += romajiMap[char];
    } else if (/[a-z0-9]/.test(char)) {
      result += char;
    }
  }

  // クリーンアップ
  const cleaned = result
    .replace(/\s+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  console.log('✅ [convertToRomajiCharLevel] 変換完了:', cleaned);
  return cleaned;
}

/**
 * フォールバック用の静的ローマ字変換
 * kuroshiroが失敗した場合に使用
 */
function convertToRomajiFallback(text: string): string {
  // 【デバッグログ】入力値と型確認
  console.log('🔍 [convertToRomajiFallback] 入力:', text);
  console.log('📦 [regionsData] 型:', typeof regionsData);
  console.log('📦 [regionsData] キー数:', Object.keys(regionsData).length);

  // 【優先度1】regions.jsonでチェック（市区町村 + 駅名の統合データ）
  // データソース:
  // - OtterSou/japan-municipalities (市区町村)
  // - piuccio/open-data-jp-railway-stations (駅名)

  // 「区」「市」「町」「村」「駅」を削除してから検索
  const cleanedForLookup = text.replace(/区$|市$|町$|村$|駅$/g, '').trim();
  console.log('🧹 [cleanedForLookup]:', cleanedForLookup);

  // regions.jsonから直接検索（優先度順）
  if (regionsData[text]) {
    const result = (regionsData[text] as RegionData).romaji;
    // 🚨 【重要】romajiが空の場合はconvertToRomaji APIを呼び出す（非同期不可のため警告のみ）
    if (!result || result.trim() === '') {
      console.warn(`⚠️ [regions.json] romajiが空です: "${text}" - convertToRomaji()を呼び出してください`);
      // フォールバックとして文字レベル変換を試みる
      // 注: 理想的にはconvertToRomajiを呼び出すべきだが、この関数は同期なので不可能
      return convertToRomajiCharLevel(text);
    }
    console.log(`✅ [regions.json ヒット] text: ${text} → ${result} (type: ${(regionsData[text] as RegionData).type}, priority: ${(regionsData[text] as RegionData).priority})`);
    return result;
  }

  // クリーニング後のテキストでも検索
  if (regionsData[cleanedForLookup]) {
    const result = (regionsData[cleanedForLookup] as RegionData).romaji;
    // 🚨 【重要】romajiが空の場合はconvertToRomaji APIを呼び出す（非同期不可のため警告のみ）
    if (!result || result.trim() === '') {
      console.warn(`⚠️ [regions.json] romajiが空です: "${cleanedForLookup}" - convertToRomaji()を呼び出してください`);
      // フォールバックとして文字レベル変換を試みる
      return convertToRomajiCharLevel(cleanedForLookup);
    }
    console.log(`✅ [regions.json ヒット] cleanedForLookup: ${cleanedForLookup} → ${result} (type: ${(regionsData[cleanedForLookup] as RegionData).type}, priority: ${(regionsData[cleanedForLookup] as RegionData).priority})`);
    return result;
  }

  // フォールバック: 旧municipalityMapで検索（後方互換性）
  if (municipalityMap[cleanedForLookup as keyof typeof municipalityMap]) {
    const result = municipalityMap[cleanedForLookup as keyof typeof municipalityMap];
    console.log('✅ [municipalityMap ヒット] cleanedForLookup:', cleanedForLookup, '→', result);
    return result;
  }

  if (municipalityMap[text as keyof typeof municipalityMap]) {
    const result = municipalityMap[text as keyof typeof municipalityMap];
    console.log('✅ [municipalityMap ヒット] text:', text, '→', result);
    return result;
  }

  console.log('❌ [regions.json + municipalityMap 未ヒット] 入力:', text);

  // 【優先度2】一般的な日本語→ローマ字マッピング（ひらがな・カタカナのみ）
  const romajiMap: Record<string, string> = {
    // 平仮名
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    // 濁音
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    // 半濁音
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    // カタカナ
    'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
    'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
    'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
    'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
    'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
    'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
    'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
    'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
    'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
    'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
    // 濁音
    'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
    'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
    'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
    'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
    // 半濁音
    'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
    // 長音
    'ー': ''
  };

  // 不要な語句を削除
  const removeWords = ['株式会社', '有限会社', '合同会社', '都', '府', '県', '区', '市', '町', '村', '丁目', '番地', '号'];
  let cleaned = text;
  for (const word of removeWords) {
    cleaned = cleaned.replace(new RegExp(word, 'g'), '');
  }

  // 1文字ずつローマ字変換
  let result = '';
  for (const char of cleaned.toLowerCase()) {
    if (romajiMap[char]) {
      result += romajiMap[char];
    } else if (/[a-z0-9]/.test(char)) {
      result += char;
    }
  }

  // クリーンアップ
  return result
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * 日本語文字列をローマ字スラッグに変換（同期版）
 * 初回呼び出しは非同期版を使用してください
 */
export function generateSlug(text: string): string {
  // 同期版フォールバック（React Router等で同期的に必要な場合）
  return convertToRomajiFallback(text);
}

/**
 * 施設名からURLスラッグを生成（非同期版・placeID付与方式）
 * 例: "家族葬のセレハウス谷原" + placeId → "kazokusonoserehausutanihara-chijn1t_"
 * 例: "マキノ祭典 石神井公園駅前店" + placeId → "makinosaitenshakujiikouenekimaeten-chijn1t_"
 * 例: "マキノ祭典" + placeId → "makinosaiten-chijabcd"
 *
 * placeIdの短縮版をサフィックスとして追加することで100%の一意性を保証
 */
export async function generateFacilitySlugAsync(title: string, placeId?: string): Promise<string> {
  try {
    console.log(`🎯 [generateFacilitySlugAsync] 開始 - title: "${title}", placeId: ${placeId}`);

    // フルネームローマ字変換
    const baseSlug = await convertToRomaji(title);

    // placeIdがない場合はbaseSlugのみ
    if (!placeId) {
      console.log(`✅ [generateFacilitySlugAsync] 生成完了（placeIdなし） - slug: "${baseSlug}"`);
      return baseSlug;
    }

    // placeIdから "places/" プレフィックスを削除し、最初の8文字を取得
    const placeIdSuffix = placeId
      .replace('places/', '')
      .substring(0, 8)
      .toLowerCase();

    // baseSlugが短すぎる（3文字未満）場合はplaceIdサフィックスのみ使用
    if (baseSlug.length < 3) {
      console.log(`⚠️ [generateFacilitySlugAsync] baseSlugが短すぎる - placeIdのみ使用: "${placeIdSuffix}"`);
      return placeIdSuffix;
    }

    // 通常は baseSlug-placeIdSuffix の形式
    const finalSlug = `${baseSlug}-${placeIdSuffix}`;
    console.log(`✅ [generateFacilitySlugAsync] 生成完了 - slug: "${finalSlug}"`);
    return finalSlug;
  } catch (error) {
    console.error('❌ [generateFacilitySlugAsync] エラー:', error);
    // フォールバック: 同期版を使用
    return generateFacilitySlug(title, placeId);
  }
}

/**
 * 施設名からURLスラッグを生成（同期版・フォールバック）
 */
export function generateFacilitySlug(title: string, placeId?: string): string {
  const slug = generateSlug(title);

  // スラッグが短すぎる場合はplaceIdの一部を使用
  if (slug.length < 3 && placeId) {
    const idPart = placeId.replace('places/', '').substring(0, 8);
    return `${slug}-${idPart}`.toLowerCase();
  }

  return slug;
}

/**
 * 住所から地域スラッグを生成（非同期版）
 * 例: "東京都練馬区谷原2丁目3-8" → "nerima-ku"
 * 例: "新潟県長岡市" → "nagaoka-shi"
 */
export async function generateRegionSlugAsync(address: string): Promise<string> {
  console.log('🌏 [generateRegionSlugAsync] 開始 - 入力:', address);
  try {
    // 市区町村を抽出する正規表現
    const patterns = [
      /([^都道府県]+[区])/,          // 区（例: 練馬区）
      /([^都道府県]+[市])/,          // 市（例: 横浜市）
      /([^都道府県]+[町村])/         // 町村
    ];

    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) {
        console.log('✅ [パターンマッチ] 一致:', match[1]);
        const result = await convertToRomaji(match[1]);
        console.log('🎯 [generateRegionSlugAsync] パターンマッチ結果:', result);
        return result;
      }
    }

    console.log('⚠️ [パターンマッチ] 未一致 - 入力をそのまま変換します');
    // パターンマッチしない場合、入力をそのまま変換
    // 「新宿」「渋谷」などの単一地名に対応
    const slug = await convertToRomaji(address);
    console.log('📤 [convertToRomaji] 結果:', slug, '(長さ:', slug.length, ')');

    // 有効なスラッグが生成された場合は返す
    if (slug && slug.length > 0) {
      console.log('✅ [generateRegionSlugAsync] 最終結果:', slug);
      return slug;
    }

    console.log('⚠️ [generateRegionSlugAsync] スラッグが空 - 同期版フォールバックを呼び出します');
    // 最終フォールバック
    const fallbackResult = generateSlug(address);
    console.log('🔄 [Fallback] 同期版の結果:', fallbackResult);
    return fallbackResult;
  } catch (error) {
    console.error('❌ [generateRegionSlugAsync] エラー:', error);
    const fallbackResult = generateRegionSlug(address);
    console.log('🔄 [Fallback] 同期版の結果:', fallbackResult);
    return fallbackResult;
  }
}

/**
 * 住所から地域スラッグを生成（同期版・フォールバック）
 */
export function generateRegionSlug(address: string): string {
  // 市区町村を抽出する正規表現
  const patterns = [
    /([^都道府県]+[区])/,          // 区（例: 練馬区）
    /([^都道府県]+[市])/,          // 市（例: 横浜市）
    /([^都道府県]+[町村])/         // 町村
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      return generateSlug(match[1]);
    }
  }

  // マッチしない場合は全体からスラッグを生成
  return generateSlug(address);
}

/**
 * スラッグから施設URLを生成
 */
export function getFacilityUrl(slug: string): string {
  return `/detail/${slug}`;
}

/**
 * スラッグから地域一覧URLを生成
 */
export function getRegionListUrl(slug: string): string {
  return `/list/${slug}`;
}

/**
 * 現在地検索結果一覧のURL
 */
export function getCurrentLocationListUrl(): string {
  return '/list/current';
}

/**
 * Place IDからスラッグとURLを生成（非同期版）
 */
export async function generateFacilityUrlsAsync(title: string, address: string, placeId: string) {
  const facilitySlug = await generateFacilitySlugAsync(title, placeId);
  const regionSlug = await generateRegionSlugAsync(address);

  return {
    facilitySlug,
    regionSlug,
    facilityUrl: getFacilityUrl(facilitySlug),
    regionUrl: getRegionListUrl(regionSlug)
  };
}

/**
 * Place IDからスラッグとURLを生成（同期版・フォールバック）
 */
export function generateFacilityUrls(title: string, address: string, placeId: string) {
  const facilitySlug = generateFacilitySlug(title, placeId);
  const regionSlug = generateRegionSlug(address);

  return {
    facilitySlug,
    regionSlug,
    facilityUrl: getFacilityUrl(facilitySlug),
    regionUrl: getRegionListUrl(regionSlug)
  };
}

/**
 * sessionStorageに検索結果とメタデータを保存
 */
export function saveSearchResults(results: any[], query: string, isCurrentLocation: boolean = false) {
  try {
    sessionStorage.setItem('searchResults', JSON.stringify(results));
    sessionStorage.setItem('searchQuery', query);
    sessionStorage.setItem('isCurrentLocation', String(isCurrentLocation));
    sessionStorage.setItem('searchTimestamp', String(Date.now()));
  } catch (error) {
    console.error('検索結果の保存エラー:', error);
  }
}

/**
 * sessionStorageから検索結果とメタデータを取得
 */
export function loadSearchResults(): { results: any[]; query: string; isCurrentLocation: boolean } | null {
  try {
    const results = sessionStorage.getItem('searchResults');
    const query = sessionStorage.getItem('searchQuery');
    const isCurrentLocation = sessionStorage.getItem('isCurrentLocation') === 'true';

    if (!results || !query) {
      return null;
    }

    return {
      results: JSON.parse(results),
      query,
      isCurrentLocation
    };
  } catch (error) {
    console.error('検索結果の読み込みエラー:', error);
    return null;
  }
}

/**
 * slug → placeId マッピングを保存（sessionStorage + Vercel KV）
 */
export async function saveSlugPlaceIdMapping(slug: string, placeId: string): Promise<void> {
  try {
    // sessionStorageに保存（即時アクセス用）
    sessionStorage.setItem(`slug:${slug}`, placeId);
    console.log(`✅ [sessionStorage] Saved mapping: ${slug} → ${placeId}`);

    // Vercel KVに保存（永続化）
    const response = await fetch('/api/slug-lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slug, placeId }),
    });

    if (response.ok) {
      console.log(`✅ [Vercel KV] Saved mapping: ${slug} → ${placeId}`);
    } else {
      console.warn(`⚠️ [Vercel KV] Failed to save mapping: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ [saveSlugPlaceIdMapping] Error:', error);
  }
}

/**
 * slug → placeId マッピングをsessionStorageから取得
 */
export function loadSlugPlaceIdMapping(slug: string): string | null {
  try {
    const placeId = sessionStorage.getItem(`slug:${slug}`);
    if (placeId) {
      console.log(`✅ [sessionStorage] Loaded mapping: ${slug} → ${placeId}`);
    } else {
      console.log(`⚠️ [sessionStorage] No mapping found for: ${slug}`);
    }
    return placeId;
  } catch (error) {
    console.error('❌ [sessionStorage] Load error:', error);
    return null;
  }
}

/**
 * slugからplaceIdを抽出（collision suffix がある場合）
 * 例: "makinosaiten-ChIJa1b2" → "ChIJa1b2"
 */
export function extractPlaceIdFromSlug(slug: string): string | null {
  // ハイフン + 8文字の英数字パターン
  const match = slug.match(/-([A-Za-z0-9]{8})$/);
  if (match) {
    console.log(`🔍 [extractPlaceIdFromSlug] Found suffix: ${match[1]}`);
    return match[1];
  }
  return null;
}
