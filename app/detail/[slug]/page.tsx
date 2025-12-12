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
 * 【新方式】slugが完全なPlaceIDの場合を判定
 * PlaceIDは通常 "ChIJ" で始まる
 */
function isFullPlaceId(slug: string): boolean {
  return slug.startsWith('ChIJ') || slug.startsWith('chij');
}

/**
 * 【旧方式用】slugからplaceIdサフィックス（8文字）を抽出
 * 例: "makinosaiten-chijdetd" → "chijdetd"
 */
function extractPlaceIdSuffix(slug: string): string | null {
  const match = slug.match(/-([A-Za-z0-9]{8})$/);
  return match ? match[1] : null;
}

/**
 * slugからplaceIdを解決
 *
 * 【新方式】slugが完全なPlaceIDの場合（優先）
 * - URLが /detail/ChIJdetd1234... の場合、そのままplaceIdとして使用
 *
 * 【旧方式・後方互換】slugがローマ字+サフィックスの場合
 * 1. slugからplaceIdサフィックスを抽出してprefix検索
 * 2. slug-lookup API で placeId を取得
 * 3. 失敗時は施設名検索API経由でplaceIdを取得（フォールバック）
 */
async function resolvePlaceId(slug: string): Promise<string | null> {
  console.log(`🔍 [resolvePlaceId] Resolving placeId for slug: "${slug}"`);

  // 【新方式】slugが完全なPlaceIDの場合、そのまま使用
  if (isFullPlaceId(slug)) {
    const placeId = `places/${slug}`;
    console.log(`✅ [resolvePlaceId] Direct PlaceID detected: ${placeId}`);
    return placeId;
  }

  // 【旧方式・後方互換】以下は旧形式のslug用フォールバック
  console.log(`📋 [resolvePlaceId] Legacy slug format detected, using fallback chain`);

  // headers()から現在のホスト名を取得
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  // Step 1: slugからplaceIdサフィックスを抽出してprefix検索
  const suffix = extractPlaceIdSuffix(slug);
  if (suffix) {
    console.log(`🎯 [resolvePlaceId] Extracted suffix from slug: "${suffix}"`);
    try {
      const prefixUrl = `${baseUrl}/api/slug-lookup?prefix=${encodeURIComponent(suffix)}`;
      const prefixResponse = await fetch(prefixUrl, {
        next: { revalidate: 3600 }
      });

      if (prefixResponse.ok) {
        const prefixData = await prefixResponse.json();
        if (prefixData.placeId) {
          console.log(`✅ [resolvePlaceId] Found placeId from prefix lookup: ${prefixData.placeId}`);
          return prefixData.placeId;
        }
      }
    } catch (error) {
      console.warn('[resolvePlaceId] Prefix lookup error:', error);
    }
  }

  // Step 2: slug-lookup API を試す
  try {
    const lookupUrl = `${baseUrl}/api/slug-lookup?slug=${encodeURIComponent(slug)}`;
    const lookupResponse = await fetch(lookupUrl, {
      next: { revalidate: 3600 }
    });

    if (lookupResponse.ok) {
      const lookupData = await lookupResponse.json();
      if (lookupData.placeId) {
        console.log(`✅ [resolvePlaceId] Found placeId from lookup: ${lookupData.placeId}`);
        return lookupData.placeId;
      }
    }
  } catch (error) {
    console.warn('[resolvePlaceId] Lookup API error:', error);
  }

  // Step 3: フォールバック: 施設名検索API経由
  try {
    const searchUrl = `${baseUrl}/api/search-by-name?name=${encodeURIComponent(slug)}`;
    const searchResponse = await fetch(searchUrl, {
      next: { revalidate: 3600 }
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.placeId) {
        console.log(`✅ [resolvePlaceId] Found placeId from search: ${searchData.placeId}`);
        return searchData.placeId;
      }
    }
  } catch (error) {
    console.error('❌ [resolvePlaceId] Search API failed:', error);
  }

  console.error(`❌ [resolvePlaceId] Could not resolve placeId for slug: ${slug}`);
  return null;
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
