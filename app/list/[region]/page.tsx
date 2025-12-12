import { Metadata } from 'next';
import { ListPageClient } from './ListPageClient';
import regionsDataModule from '../../utils/data/regions.json';

// ISR設定: 1時間ごとに再生成
export const revalidate = 3600;

// Dynamic Routing設定: 静的生成されていないパスも許可（priority 4-5用）
export const dynamicParams = true;

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

// 動的パラメータの型定義 (Next.js 15+ では params は Promise)
type Props = {
  params: Promise<{ region: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * 静的パスの生成（主要な地名を事前ビルド）
 * regions.jsonから優先度1-2のエントリを使用
 */
export async function generateStaticParams() {
  // 【拡張版】regions.jsonから優先度1-2のエントリを動的に取得
  const staticPaths: string[] = [
    'current', // 現在地検索（特別値）
  ];

  // regions.jsonから優先度1-3のスラッグを抽出（拡大）
  for (const [name, data] of Object.entries(regionsData)) {
    const regionData = data as RegionData;
    // 優先度1（主要駅）+ 優先度2（市区町村・一般駅）+ 優先度3（マイナー駅）を事前ビルド
    if (regionData.priority <= 3 && regionData.romaji) {
      staticPaths.push(regionData.romaji);
    }
  }

  console.log(`📊 [generateStaticParams] 生成パス数: ${staticPaths.length}件`);
  console.log(`   - 優先度1（主要駅）+ 優先度2（市区町村・一般駅）+ 優先度3（マイナー駅）`);
  console.log(`   - 優先度4-5はdynamicParamsで初回アクセス時に生成`);
  console.log(`   - サンプル: ${staticPaths.slice(1, 6).join(', ')}...`);

  return staticPaths.map((region) => ({
    region,
  }));
}

/**
 * メタデータ生成(SEO最適化)
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sougifinder.vercel.app';

  // 地域名の判定
  let displayRegion = region;
  if (region === 'current') {
    displayRegion = '現在地周辺';
  } else {
    // URLエンコードされたスラッグから読みやすい形式に変換
    displayRegion = decodeURIComponent(region);
  }

  // タイトル最適化: 32文字以内
  const title = `${displayRegion}の葬儀社一覧`;
  // Description最適化: 120文字以内
  const description = `${displayRegion}の葬儀社を比較・検索。口コミ・料金・アクセス情報を確認して最適な葬儀社を見つけましょう。`;

  return {
    title,
    description,
    keywords: ['葬儀社', displayRegion, '葬儀', '家族葬', '一覧', '比較', '口コミ'],
    alternates: {
      canonical: `${baseUrl}/list/${region}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ja_JP',
      url: `${baseUrl}/list/${region}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

/**
 * メインページコンポーネント(Server Component)
 */
export default async function ListPage({ params }: Props) {
  const { region } = await params;

  // クライアントコンポーネントにregionパラメータを渡す
  return <ListPageClient region={region} />;
}
