/**
 * URL生成ユーティリティ
 * 日本語の施設名・地域名を英数字のURLスラッグに変換
 */

/**
 * 日本語文字列をローマ字スラッグに変換
 * 例: "東京都練馬区" → "nerima"
 * 例: "株式会社セレハウス" → "celehouse"
 */
export function generateSlug(text: string): string {
  // 一般的な日本語→ローマ字マッピング
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

  // 漢字の一般的な読みマッピング（よく使われる地名・施設名用）
  const kanjiReadingMap: Record<string, string> = {
    // 地名
    '東京': 'tokyo', '練馬': 'nerima', '世田谷': 'setagaya', '渋谷': 'shibuya',
    '新宿': 'shinjuku', '港': 'minato', '目黒': 'meguro', '品川': 'shinagawa',
    '大田': 'ota', '中野': 'nakano', '杉並': 'suginami', '豊島': 'toshima',
    '北': 'kita', '荒川': 'arakawa', '板橋': 'itabashi', '足立': 'adachi',
    '葛飾': 'katsushika', '江戸川': 'edogawa', '横浜': 'yokohama',
    '川崎': 'kawasaki', '相模原': 'sagamihara', '大阪': 'osaka', '京都': 'kyoto',
    '神戸': 'kobe', '名古屋': 'nagoya', '福岡': 'fukuoka', '札幌': 'sapporo',
    '仙台': 'sendai', '広島': 'hiroshima',
    // 一般的な語句
    '葬儀': 'sogi', '家族': 'kazoku', '葬': 'so', '祭': 'sai',
    '株式会社': '', '有限会社': '', '合同会社': '', '社': '',
    '都': '', '府': '', '県': '', '区': '', '市': '', '町': '', '村': '',
    '丁目': '', '番地': '', '号': ''
  };

  let slug = text.toLowerCase().trim();

  // 漢字の熟語を優先的に変換
  for (const [kanji, romaji] of Object.entries(kanjiReadingMap)) {
    slug = slug.replace(new RegExp(kanji, 'g'), romaji);
  }

  // 残った文字を1文字ずつローマ字変換
  let result = '';
  for (const char of slug) {
    if (romajiMap[char]) {
      result += romajiMap[char];
    } else if (/[a-z0-9]/.test(char)) {
      // 既に英数字の場合はそのまま
      result += char;
    } else {
      // 変換できない文字は無視
      continue;
    }
  }

  // クリーンアップ: 連続するハイフンを1つに、前後の空白を削除
  slug = result
    .replace(/\s+/g, '-')        // スペースをハイフンに
    .replace(/-+/g, '-')         // 連続するハイフンを1つに
    .replace(/^-+|-+$/g, '')     // 前後のハイフンを削除
    .toLowerCase();

  // 空の場合はランダムなIDを生成
  if (!slug || slug.length < 2) {
    slug = 'facility-' + Math.random().toString(36).substring(2, 8);
  }

  return slug;
}

/**
 * 施設名からURLスラッグを生成
 * 例: "家族葬のセレハウス谷原" → "celehouse-tanihara"
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
 * 住所から地域スラッグを生成
 * 例: "東京都練馬区谷原2丁目3-8" → "nerima"
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
 * Place IDからスラッグとURLを生成
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
