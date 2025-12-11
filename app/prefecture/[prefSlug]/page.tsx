import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrefecturePageClient } from './PrefecturePageClient';
import { PREFECTURES, PREFECTURE_ROMAJI_TO_CODE } from '../../utils/data/prefectures';

// ISR: 1時間ごとに再検証
export const revalidate = 3600;

// 47都道府県のみ許可
export const dynamicParams = false;

/**
 * 47都道府県すべての静的パスを生成
 */
export async function generateStaticParams() {
  return Object.values(PREFECTURES).map((pref) => ({
    prefSlug: pref.romaji,
  }));
}

/**
 * 都道府県ページのメタデータ生成
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ prefSlug: string }>;
}): Promise<Metadata> {
  const { prefSlug } = await params;
  const prefCode = PREFECTURE_ROMAJI_TO_CODE[prefSlug];

  // 無効な都道府県スラッグの場合は404
  if (!prefCode) {
    return {
      title: 'ページが見つかりません | 葬儀社ファインダー',
    };
  }

  const prefecture = PREFECTURES[prefCode];
  const prefName = prefecture.name;

  return {
    title: `${prefName}の葬儀社一覧 | 葬儀社ファインダー`,
    description: `${prefName}にある葬儀社を市区町村・駅から検索できます。地域別に葬儀社を探して、詳細情報を確認できます。`,
    openGraph: {
      title: `${prefName}の葬儀社一覧`,
      description: `${prefName}の葬儀社を市区町村・駅から検索`,
      type: 'website',
    },
  };
}

/**
 * 都道府県ページ（Server Component）
 */
export default async function PrefecturePage({
  params,
}: {
  params: Promise<{ prefSlug: string }>;
}) {
  const { prefSlug } = await params;
  const prefCode = PREFECTURE_ROMAJI_TO_CODE[prefSlug];

  // 無効な都道府県スラッグの場合は404
  if (!prefCode) {
    notFound();
  }

  const prefecture = PREFECTURES[prefCode];

  return <PrefecturePageClient prefSlug={prefSlug} prefCode={prefCode} prefecture={prefecture} />;
}
