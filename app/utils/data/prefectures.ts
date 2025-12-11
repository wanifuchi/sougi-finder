/**
 * 47都道府県マスターデータ
 * JIS X 0401 (都道府県コード) に準拠
 */

export interface PrefectureData {
  code: string;
  name: string;
  romaji: string;
  region: string;
}

export const PREFECTURES: Record<string, PrefectureData> = {
  '01': { code: '01', name: '北海道', romaji: 'hokkaido', region: '北海道' },
  '02': { code: '02', name: '青森県', romaji: 'aomori', region: '東北' },
  '03': { code: '03', name: '岩手県', romaji: 'iwate', region: '東北' },
  '04': { code: '04', name: '宮城県', romaji: 'miyagi', region: '東北' },
  '05': { code: '05', name: '秋田県', romaji: 'akita', region: '東北' },
  '06': { code: '06', name: '山形県', romaji: 'yamagata', region: '東北' },
  '07': { code: '07', name: '福島県', romaji: 'fukushima', region: '東北' },
  '08': { code: '08', name: '茨城県', romaji: 'ibaraki', region: '関東' },
  '09': { code: '09', name: '栃木県', romaji: 'tochigi', region: '関東' },
  '10': { code: '10', name: '群馬県', romaji: 'gunma', region: '関東' },
  '11': { code: '11', name: '埼玉県', romaji: 'saitama', region: '関東' },
  '12': { code: '12', name: '千葉県', romaji: 'chiba', region: '関東' },
  '13': { code: '13', name: '東京都', romaji: 'tokyo', region: '関東' },
  '14': { code: '14', name: '神奈川県', romaji: 'kanagawa', region: '関東' },
  '15': { code: '15', name: '新潟県', romaji: 'niigata', region: '中部' },
  '16': { code: '16', name: '富山県', romaji: 'toyama', region: '中部' },
  '17': { code: '17', name: '石川県', romaji: 'ishikawa', region: '中部' },
  '18': { code: '18', name: '福井県', romaji: 'fukui', region: '中部' },
  '19': { code: '19', name: '山梨県', romaji: 'yamanashi', region: '中部' },
  '20': { code: '20', name: '長野県', romaji: 'nagano', region: '中部' },
  '21': { code: '21', name: '岐阜県', romaji: 'gifu', region: '中部' },
  '22': { code: '22', name: '静岡県', romaji: 'shizuoka', region: '中部' },
  '23': { code: '23', name: '愛知県', romaji: 'aichi', region: '中部' },
  '24': { code: '24', name: '三重県', romaji: 'mie', region: '近畿' },
  '25': { code: '25', name: '滋賀県', romaji: 'shiga', region: '近畿' },
  '26': { code: '26', name: '京都府', romaji: 'kyoto', region: '近畿' },
  '27': { code: '27', name: '大阪府', romaji: 'osaka', region: '近畿' },
  '28': { code: '28', name: '兵庫県', romaji: 'hyogo', region: '近畿' },
  '29': { code: '29', name: '奈良県', romaji: 'nara', region: '近畿' },
  '30': { code: '30', name: '和歌山県', romaji: 'wakayama', region: '近畿' },
  '31': { code: '31', name: '鳥取県', romaji: 'tottori', region: '中国' },
  '32': { code: '32', name: '島根県', romaji: 'shimane', region: '中国' },
  '33': { code: '33', name: '岡山県', romaji: 'okayama', region: '中国' },
  '34': { code: '34', name: '広島県', romaji: 'hiroshima', region: '中国' },
  '35': { code: '35', name: '山口県', romaji: 'yamaguchi', region: '中国' },
  '36': { code: '36', name: '徳島県', romaji: 'tokushima', region: '四国' },
  '37': { code: '37', name: '香川県', romaji: 'kagawa', region: '四国' },
  '38': { code: '38', name: '愛媛県', romaji: 'ehime', region: '四国' },
  '39': { code: '39', name: '高知県', romaji: 'kochi', region: '四国' },
  '40': { code: '40', name: '福岡県', romaji: 'fukuoka', region: '九州沖縄' },
  '41': { code: '41', name: '佐賀県', romaji: 'saga', region: '九州沖縄' },
  '42': { code: '42', name: '長崎県', romaji: 'nagasaki', region: '九州沖縄' },
  '43': { code: '43', name: '熊本県', romaji: 'kumamoto', region: '九州沖縄' },
  '44': { code: '44', name: '大分県', romaji: 'oita', region: '九州沖縄' },
  '45': { code: '45', name: '宮崎県', romaji: 'miyazaki', region: '九州沖縄' },
  '46': { code: '46', name: '鹿児島県', romaji: 'kagoshima', region: '九州沖縄' },
  '47': { code: '47', name: '沖縄県', romaji: 'okinawa', region: '九州沖縄' },
} as const;

// Romajiから都道府県コードへの逆マッピング
export const PREFECTURE_ROMAJI_TO_CODE: Record<string, string> = {
  hokkaido: '01',
  aomori: '02',
  iwate: '03',
  miyagi: '04',
  akita: '05',
  yamagata: '06',
  fukushima: '07',
  ibaraki: '08',
  tochigi: '09',
  gunma: '10',
  saitama: '11',
  chiba: '12',
  tokyo: '13',
  kanagawa: '14',
  niigata: '15',
  toyama: '16',
  ishikawa: '17',
  fukui: '18',
  yamanashi: '19',
  nagano: '20',
  gifu: '21',
  shizuoka: '22',
  aichi: '23',
  mie: '24',
  shiga: '25',
  kyoto: '26',
  osaka: '27',
  hyogo: '28',
  nara: '29',
  wakayama: '30',
  tottori: '31',
  shimane: '32',
  okayama: '33',
  hiroshima: '34',
  yamaguchi: '35',
  tokushima: '36',
  kagawa: '37',
  ehime: '38',
  kochi: '39',
  fukuoka: '40',
  saga: '41',
  nagasaki: '42',
  kumamoto: '43',
  oita: '44',
  miyazaki: '45',
  kagoshima: '46',
  okinawa: '47',
};

export interface RegionBlockData {
  id: string;
  name: string;
  prefCodes: string[];
  icon: string;
  color: string;
}

// 8地方区分データ
export const REGIONS: RegionBlockData[] = [
  {
    id: 'hokkaido',
    name: '北海道',
    prefCodes: ['01'],
    icon: '🗻',
    color: 'from-sky-400 to-blue-600',
  },
  {
    id: 'tohoku',
    name: '東北',
    prefCodes: ['02', '03', '04', '05', '06', '07'],
    icon: '🌾',
    color: 'from-green-400 to-emerald-600',
  },
  {
    id: 'kanto',
    name: '関東',
    prefCodes: ['08', '09', '10', '11', '12', '13', '14'],
    icon: '🏙️',
    color: 'from-red-400 to-rose-600',
  },
  {
    id: 'chubu',
    name: '中部',
    prefCodes: ['15', '16', '17', '18', '19', '20', '21', '22', '23'],
    icon: '⛰️',
    color: 'from-orange-400 to-amber-600',
  },
  {
    id: 'kinki',
    name: '近畿',
    prefCodes: ['24', '25', '26', '27', '28', '29', '30'],
    icon: '🏛️',
    color: 'from-purple-400 to-violet-600',
  },
  {
    id: 'chugoku',
    name: '中国',
    prefCodes: ['31', '32', '33', '34', '35'],
    icon: '🌉',
    color: 'from-teal-400 to-cyan-600',
  },
  {
    id: 'shikoku',
    name: '四国',
    prefCodes: ['36', '37', '38', '39'],
    icon: '🏝️',
    color: 'from-lime-400 to-green-600',
  },
  {
    id: 'kyushu',
    name: '九州沖縄',
    prefCodes: ['40', '41', '42', '43', '44', '45', '46', '47'],
    icon: '🌺',
    color: 'from-pink-400 to-fuchsia-600',
  },
];

/**
 * 都道府県コードから都道府県名を取得
 */
export function getPrefectureName(code: string): string {
  return PREFECTURES[code]?.name || '';
}

/**
 * 都道府県コードからロマ字を取得
 */
export function getPrefectureRomaji(code: string): string {
  return PREFECTURES[code]?.romaji || '';
}

/**
 * ロマ字から都道府県コードを取得
 */
export function getPrefectureCode(romaji: string): string {
  return PREFECTURE_ROMAJI_TO_CODE[romaji] || '';
}

/**
 * 都道府県コードから地方区分を取得
 */
export function getRegionByPrefCode(prefCode: string): RegionBlockData | undefined {
  return REGIONS.find((region) => region.prefCodes.includes(prefCode));
}
