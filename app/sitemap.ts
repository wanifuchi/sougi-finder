import { MetadataRoute } from 'next';
import regionsDataModule from './utils/data/regions.json';

// regions.jsonのインポート
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

// 都道府県コードから名前へのマッピング
const prefectureCodeToName: Record<string, string> = {
  '01': 'hokkaido',
  '02': 'aomori',
  '03': 'iwate',
  '04': 'miyagi',
  '05': 'akita',
  '06': 'yamagata',
  '07': 'fukushima',
  '08': 'ibaraki',
  '09': 'tochigi',
  '10': 'gunma',
  '11': 'saitama',
  '12': 'chiba',
  '13': 'tokyo',
  '14': 'kanagawa',
  '15': 'niigata',
  '16': 'toyama',
  '17': 'ishikawa',
  '18': 'fukui',
  '19': 'yamanashi',
  '20': 'nagano',
  '21': 'gifu',
  '22': 'shizuoka',
  '23': 'aichi',
  '24': 'mie',
  '25': 'shiga',
  '26': 'kyoto',
  '27': 'osaka',
  '28': 'hyogo',
  '29': 'nara',
  '30': 'wakayama',
  '31': 'tottori',
  '32': 'shimane',
  '33': 'okayama',
  '34': 'hiroshima',
  '35': 'yamaguchi',
  '36': 'tokushima',
  '37': 'kagawa',
  '38': 'ehime',
  '39': 'kochi',
  '40': 'fukuoka',
  '41': 'saga',
  '42': 'nagasaki',
  '43': 'kumamoto',
  '44': 'oita',
  '45': 'miyazaki',
  '46': 'kagoshima',
  '47': 'okinawa',
};

/**
 * サイトマップ生成
 * 検索エンジンがサイト構造を理解するために使用
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sougifinder.vercel.app';
  const currentDate = new Date();

  // 基本ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/list/current`,
      lastModified: currentDate,
      changeFrequency: 'always',
      priority: 0.8,
    },
  ];

  // 都道府県ページ（全47都道府県）
  const prefecturePages: MetadataRoute.Sitemap = Object.values(prefectureCodeToName).map(
    (prefectureSlug) => ({
      url: `${baseUrl}/list/${prefectureSlug}`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })
  );

  // regions.jsonから優先度1-3の地域ページを追加
  const regionPages: MetadataRoute.Sitemap = [];
  const addedSlugs = new Set<string>();

  // 都道府県スラッグを既存セットに追加（重複防止）
  Object.values(prefectureCodeToName).forEach((slug) => addedSlugs.add(slug));
  addedSlugs.add('current');

  for (const [name, data] of Object.entries(regionsData)) {
    const regionData = data as RegionData;

    // 優先度1-3のみ（主要駅、市区町村）
    if (regionData.priority <= 3 && regionData.romaji && !addedSlugs.has(regionData.romaji)) {
      addedSlugs.add(regionData.romaji);

      // 優先度に応じてpriority値を設定
      let priority: number;
      switch (regionData.priority) {
        case 1:
          priority = 0.8;
          break;
        case 2:
          priority = 0.7;
          break;
        case 3:
          priority = 0.6;
          break;
        default:
          priority = 0.5;
      }

      regionPages.push({
        url: `${baseUrl}/list/${regionData.romaji}`,
        lastModified: currentDate,
        changeFrequency: 'weekly' as const,
        priority,
      });
    }
  }

  // 全ページを結合して返す
  return [...staticPages, ...prefecturePages, ...regionPages];
}
