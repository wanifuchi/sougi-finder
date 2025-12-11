import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { SearchResult } from '../../types';
import { DetailPageClient } from './DetailPageClient';

// ISR設定: 1時間ごとに再生成
export const revalidate = 3600;

// 動的パラメータの型定義 (Next.js 15+ では params は Promise)
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * slugからplaceIdを解決
 * 1. slug-lookup API で placeId を取得（最優先）
 * 2. 失敗時は施設名検索API経由でplaceIdを取得（フォールバック）
 */
async function resolvePlaceId(slug: string): Promise<string | null> {
  // headers()から現在のホスト名を取得
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  console.log(`🔍 [resolvePlaceId] Resolving placeId for slug: "${slug}"`);
  console.log(`🌐 [resolvePlaceId] Using baseUrl: ${baseUrl}`);

  // まず slug-lookup API を試す
  try {
    const lookupUrl = `${baseUrl}/api/slug-lookup?slug=${encodeURIComponent(slug)}`;
    console.log(`📡 [resolvePlaceId] Calling slug-lookup API: ${lookupUrl}`);

    const lookupResponse = await fetch(lookupUrl, {
      next: { revalidate: 3600 }
    });

    if (lookupResponse.ok) {
      const lookupData = await lookupResponse.json();
      if (lookupData.placeId) {
        console.log(`✅ [resolvePlaceId] Found placeId from lookup: ${lookupData.placeId}`);
        return lookupData.placeId;
      } else {
        console.warn(`⚠️ [resolvePlaceId] Lookup API returned no placeId`);
      }
    } else {
      console.warn(`⚠️ [resolvePlaceId] Lookup API failed with status: ${lookupResponse.status}`);
    }
  } catch (error) {
    console.warn('[resolvePlaceId] Lookup API error:', error);
  }

  // フォールバック: 施設名検索API経由
  try {
    const searchUrl = `${baseUrl}/api/search-by-name?name=${encodeURIComponent(slug)}`;
    console.log(`📡 [resolvePlaceId] Fallback to search-by-name API: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      next: { revalidate: 3600 }
    });

    if (!searchResponse.ok) {
      console.error(`❌ [resolvePlaceId] Search API error: ${searchResponse.status}`);
      return null;
    }

    const searchData = await searchResponse.json();
    if (searchData.placeId) {
      console.log(`✅ [resolvePlaceId] Found placeId from search: ${searchData.placeId}`);
      return searchData.placeId;
    } else {
      console.error(`❌ [resolvePlaceId] Search API returned no placeId`);
      return null;
    }
  } catch (error) {
    console.error('❌ [resolvePlaceId] Search API failed:', error);
    return null;
  }
}

/**
 * 施設データをAPIから取得
 */
async function getFacilityData(slug: string): Promise<SearchResult | null> {
  try {
    // 1. slugからplaceIdを解決
    const placeId = await resolvePlaceId(slug);

    if (!placeId) {
      console.error(`No placeId found for slug: ${slug}`);
      return null;
    }

    // 2. placeIdで詳細情報を取得
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const response = await fetch(`${baseUrl}/api/places?placeId=${placeId}`, {
      next: { revalidate: 3600 } // ISRキャッシュ設定
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // SearchResult形式に変換
    const result: SearchResult = {
      title: data.name || '',
      uri: data.url || '',
      placeId: placeId,
      photoUrl: data.photoUrls?.[0],
      photoUrls: data.photoUrls || [],
      address: data.address,
      phone: data.phone,
      rating: data.rating,
      reviewCount: data.reviewsCount,
      detailedReviews: data.reviews || [],
      website: data.website,
      businessStatus: data.businessStatus,
      priceLevel: data.priceLevel,
      openingHours: data.openingHours,
      wheelchairAccessible: data.wheelchairAccessible,
      description: data.description,
    };

    return result;
  } catch (error) {
    console.error('Failed to fetch facility data:', error);
    return null;
  }
}

/**
 * メタデータ生成（SEO最適化）
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const facility = await getFacilityData(slug);

  if (!facility) {
    return {
      title: '施設が見つかりません',
      description: '指定された葬儀社が見つかりませんでした。',
    };
  }

  const title = `${facility.title} - 葬儀社詳細`;
  const description = facility.description
    ? facility.description.substring(0, 160)
    : `${facility.title}の詳細情報。${facility.address || ''}${facility.phone ? ` TEL: ${facility.phone}` : ''}`;

  return {
    title,
    description,
    keywords: ['葬儀社', facility.title, facility.address?.split(/[都道府県市区町村]/)[0] || '', '葬儀', '家族葬'],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ja_JP',
      images: facility.photoUrl ? [{ url: facility.photoUrl, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: facility.photoUrl ? [facility.photoUrl] : [],
    },
  };
}

/**
 * メインページコンポーネント（Server Component）
 */
export default async function DetailPage({ params }: Props) {
  const { slug } = await params;
  const facility = await getFacilityData(slug);

  if (!facility) {
    notFound();
  }

  // クライアントコンポーネントにデータを渡す
  return <DetailPageClient facility={facility} />;
}
