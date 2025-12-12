/**
 * 構造化データ（JSON-LD）コンポーネント
 * SEO最適化のための各種スキーマを提供
 */

import Script from 'next/script';

// ベースURL
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sougifinder.vercel.app';

/**
 * Organization スキーマ（サイト全体で使用）
 */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '葬儀社ファインダー',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: '日本全国の葬儀社を現在地や地名から簡単に検索できるサービスです。',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Japanese'],
    },
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="afterInteractive"
    />
  );
}

/**
 * WebSite + SearchAction スキーマ（ホームページで使用）
 * サイト内検索機能をGoogleに伝える
 */
export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '葬儀社ファインダー',
    url: BASE_URL,
    description: '日本全国の葬儀社を現在地や地名から簡単に検索できます。',
    inLanguage: 'ja',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/list/{search_term}`,
      },
      'query-input': 'required name=search_term',
    },
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="afterInteractive"
    />
  );
}

/**
 * BreadcrumbList スキーマ
 * パンくずリストの構造化データ
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="afterInteractive"
    />
  );
}

/**
 * LocalBusiness スキーマ（施設詳細ページで使用）
 * 葬儀社の詳細情報を構造化
 */
interface LocalBusinessSchemaProps {
  name: string;
  description?: string;
  address?: string;
  telephone?: string;
  url?: string;
  image?: string | string[];
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  openingHours?: {
    weekday_text?: string[];
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
}

export function LocalBusinessSchema({
  name,
  description,
  address,
  telephone,
  url,
  image,
  rating,
  reviewCount,
  priceRange,
  openingHours,
  geo,
}: LocalBusinessSchemaProps) {
  // 住所から都道府県・市区町村を抽出
  const addressParts = parseJapaneseAddress(address || '');

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FuneralHome',
    name,
    description: description || `${name}は${addressParts.prefecture || '日本'}の葬儀社です。`,
    url: url || BASE_URL,
  };

  // 住所情報
  if (address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: addressParts.street,
      addressLocality: addressParts.city,
      addressRegion: addressParts.prefecture,
      addressCountry: 'JP',
    };
  }

  // 電話番号
  if (telephone) {
    schema.telephone = telephone;
  }

  // 画像
  if (image) {
    schema.image = Array.isArray(image) ? image : [image];
  }

  // 評価
  if (rating && reviewCount && reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount: reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // 価格帯
  if (priceRange) {
    schema.priceRange = priceRange;
  }

  // 営業時間
  if (openingHours?.weekday_text && openingHours.weekday_text.length > 0) {
    schema.openingHoursSpecification = openingHours.weekday_text.map((text) => {
      // 例: "月曜日: 9時00分～17時00分" をパース
      const dayMatch = text.match(/^(.+?):/);
      const timeMatch = text.match(/(\d{1,2})時(\d{2})分[～〜](\d{1,2})時(\d{2})分/);

      if (dayMatch && timeMatch) {
        return {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: convertJapaneseDayToSchema(dayMatch[1]),
          opens: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`,
          closes: `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`,
        };
      }
      return null;
    }).filter(Boolean);
  }

  // 位置情報
  if (geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  }

  return (
    <Script
      id="local-business-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="afterInteractive"
    />
  );
}

/**
 * ItemList スキーマ（リストページで使用）
 * 検索結果一覧の構造化データ
 */
interface ItemListSchemaProps {
  items: Array<{
    name: string;
    url: string;
    image?: string;
    description?: string;
  }>;
  listName: string;
}

export function ItemListSchema({ items, listName }: ItemListSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'FuneralHome',
        name: item.name,
        url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
        ...(item.image && { image: item.image }),
        ...(item.description && { description: item.description }),
      },
    })),
  };

  return (
    <Script
      id="itemlist-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="afterInteractive"
    />
  );
}

/**
 * 日本語の住所をパースする
 */
function parseJapaneseAddress(address: string): {
  prefecture: string;
  city: string;
  street: string;
} {
  // 都道府県を抽出
  const prefectureMatch = address.match(/^(.+?[都道府県])/);
  const prefecture = prefectureMatch ? prefectureMatch[1] : '';

  // 市区町村を抽出
  const cityMatch = address.match(/[都道府県](.+?[市区町村])/);
  const city = cityMatch ? cityMatch[1] : '';

  // 残りを番地として扱う
  const street = address.replace(/^.+?[市区町村]/, '').trim();

  return { prefecture, city, street };
}

/**
 * 日本語の曜日をschema.orgの形式に変換
 */
function convertJapaneseDayToSchema(japaneseDay: string): string {
  const dayMap: Record<string, string> = {
    '月曜日': 'Monday',
    '火曜日': 'Tuesday',
    '水曜日': 'Wednesday',
    '木曜日': 'Thursday',
    '金曜日': 'Friday',
    '土曜日': 'Saturday',
    '日曜日': 'Sunday',
    '月': 'Monday',
    '火': 'Tuesday',
    '水': 'Wednesday',
    '木': 'Thursday',
    '金': 'Friday',
    '土': 'Saturday',
    '日': 'Sunday',
  };
  return dayMap[japaneseDay] || japaneseDay;
}
