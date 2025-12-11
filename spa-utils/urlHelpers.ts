/**
 * URL生成ユーティリティ
 * 日本語の施設名・地域名を英数字のURLスラッグに変換
 * kuroshiroを使用した正確な日本語→ローマ字変換
 */

import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import municipalityMapModule from './data/municipalities.json';

// Vite環境でJSONモジュールを正しくインポート
// .defaultプロパティがある場合はそれを使用、なければそのまま使用
const municipalityMap = (municipalityMapModule as any).default || municipalityMapModule;

// Kuroshiroインスタンス（シングルトン）
let kuroshiroInstance: Kuroshiro | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Kuroshiroを初期化（初回のみ実行）
 */
async function initKuroshiro(): Promise<void> {
  if (kuroshiroInstance) return;

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      kuroshiroInstance = new Kuroshiro();
      await kuroshiroInstance.init(new KuromojiAnalyzer());
    } catch (error) {
      console.error('Kuroshiro初期化エラー:', error);
      kuroshiroInstance = null;
      initPromise = null;
      throw error;
    }
  })();

  await initPromise;
}

/**
 * 日本語文字列をローマ字スラッグに変換（kuroshiro使用）
 * 例: "東京都練馬区" → "tokyo-to-nerima-ku"
 * 例: "株式会社セレハウス" → "kabushikigaisha-cerehouse"
 */
export async function convertToRomaji(text: string): Promise<string> {
  console.log('🚀 [convertToRomaji] 開始 - 入力:', text);
  try {
    await initKuroshiro();

    if (!kuroshiroInstance) {
      throw new Error('Kuroshiroが初期化されていません');
    }

    // kuroshiroでローマ字変換
    console.log('📝 [Kuroshiro] 変換開始...');
    const romaji = await kuroshiroInstance.convert(text, {
      mode: 'normal',
      to: 'romaji',
      romajiSystem: 'hepburn'
    });
    console.log('✅ [Kuroshiro] 変換成功:', romaji);

    // クリーンアップ
    const cleaned = romaji
      .toLowerCase()
      .replace(/\s+/g, '-')        // スペースをハイフンに
      .replace(/[^a-z0-9-]/g, '')  // 英数字とハイフン以外を削除
      .replace(/-+/g, '-')         // 連続するハイフンを1つに
      .replace(/^-+|-+$/g, '');    // 前後のハイフンを削除
    console.log('🧹 [Kuroshiro] クリーンアップ後:', cleaned);
    return cleaned;
  } catch (error) {
    console.error('❌ [Kuroshiro] エラー:', error);
    console.log('🔄 [Fallback] convertToRomajiFallback() を呼び出します');
    // フォールバック: 静的マッピング
    return convertToRomajiFallback(text);
  }
}

/**
 * フォールバック用の静的ローマ字変換
 * kuroshiroが失敗した場合に使用
 */
function convertToRomajiFallback(text: string): string {
  // 【デバッグログ】入力値と型確認
  console.log('🔍 [convertToRomajiFallback] 入力:', text);
  console.log('📦 [municipalityMap] 型:', typeof municipalityMap);
  console.log('📦 [municipalityMap] 最初の5キー:', Object.keys(municipalityMap).slice(0, 5));
  console.log('📦 [municipalityMap] キー数:', Object.keys(municipalityMap).length);

  // 【優先度1】市区町村マップでチェック
  // OtterSou/japan-municipalities (2025年3月版) の公式データを使用
  // ライセンス: CC0 1.0 Universal

  // 「区」「市」「町」「村」を削除してから検索
  const cleanedForLookup = text.replace(/区$|市$|町$|村$/g, '').trim();
  console.log('🧹 [cleanedForLookup]:', cleanedForLookup);

  // マップに存在する場合は即座に返す
  if (municipalityMap[cleanedForLookup as keyof typeof municipalityMap]) {
    const result = municipalityMap[cleanedForLookup as keyof typeof municipalityMap];
    console.log('✅ [市区町村マップヒット] cleanedForLookup:', cleanedForLookup, '→', result);
    return result;
  }

  // 元のテキストでも検索（念のため）
  if (municipalityMap[text as keyof typeof municipalityMap]) {
    const result = municipalityMap[text as keyof typeof municipalityMap];
    console.log('✅ [市区町村マップヒット] text:', text, '→', result);
    return result;
  }

  console.log('❌ [市区町村マップ未ヒット] 入力:', text);

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
 * 施設名からURLスラッグを生成（非同期版）
 * 例: "家族葬のセレハウス谷原" → "kazokuso-no-cerehouse-tanihara"
 * 例: "マキノ祭典 石神井公園駅前店" → "makinosaiten-shakujiikouenekimaeten"
 */
export async function generateFacilitySlugAsync(title: string, placeId?: string): Promise<string> {
  try {
    const slug = await convertToRomaji(title);

    // スラッグが短すぎる場合はplaceIdの一部を使用
    if (slug.length < 3 && placeId) {
      const idPart = placeId.replace('places/', '').substring(0, 8);
      return `${slug}-${idPart}`.toLowerCase();
    }

    return slug;
  } catch (error) {
    console.error('施設スラッグ生成エラー:', error);
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
