import { MetadataRoute } from 'next';

/**
 * サイトマップ生成
 * 検索エンジンがサイト構造を理解するために使用
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sougifinder.vercel.app';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/list/current`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.8,
    },
    // 動的ページは実際の検索結果に基づいて追加される
    // 例: /list/tokyo, /list/osaka など
    // 施設詳細ページも動的に生成される
  ];
}
