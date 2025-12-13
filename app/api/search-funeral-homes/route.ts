// API Key rotated: 2024-12-13
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@vercel/kv';
import type { GroundingChunk, SearchResult } from '@/app/types';

// Vercel KVクライアントを明示的に作成
const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// キャッシュ用の型定義
interface CachedSearchResult {
  results: SearchResult[];
  query: string;
  timestamp: number;
  count: number;
}

// キャッシュTTL: 7日間（秒）
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800秒

interface Position {
  latitude: number;
  longitude: number;
}

interface QAndA {
  question: string;
  answer: string;
}

interface OwnerInfo {
  message?: string;
  posts?: string[];
}

interface ParsedDetails {
  address?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  reviews?: string[];
  qanda?: QAndA[];
  ownerInfo?: OwnerInfo;
}

const parseDetailsFromMarkdown = (markdown: string): Map<string, ParsedDetails> => {
  const detailsMap = new Map<string, ParsedDetails>();
  if (!markdown) {
    return detailsMap;
  }

  const sections = markdown.split('### ').slice(1);

  for (const section of sections) {
    const lines = section.split('\n');
    const title = lines[0]?.trim();
    if (!title) continue;

    const details: ParsedDetails = {
      reviews: [],
      qanda: [],
      ownerInfo: {
        posts: [],
      },
    };

    let currentQandA: Partial<QAndA> = {};
    let readingReviews = false;
    let readingQandA = false;
    let readingOwnerMessage = false;
    let readingOwnerPosts = false;

    for (const line of lines.slice(1)) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('- **住所:**')) {
        const value = trimmedLine.replace('- **住所:**', '').trim();
        if (value !== '情報なし') details.address = value;
        readingReviews = false; readingQandA = false;
      } else if (trimmedLine.startsWith('- **電話番号:**')) {
        const value = trimmedLine.replace('- **電話番号:**', '').trim();
        if (value !== '情報なし') details.phone = value;
        readingReviews = false; readingQandA = false;
      } else if (trimmedLine.startsWith('- **評価:**')) {
        const ratingStr = trimmedLine.replace('- **評価:**', '').trim();
        const rating = parseFloat(ratingStr);
        if (!isNaN(rating)) details.rating = rating;
        readingReviews = false; readingQandA = false;
      } else if (trimmedLine.startsWith('- **レビュー数:**')) {
        const countStr = trimmedLine.replace('- **レビュー数:**', '').trim();
        const count = parseInt(countStr, 10);
        if (!isNaN(count)) details.reviewCount = count;
        readingReviews = false; readingQandA = false;
      } else if (trimmedLine.startsWith('- **口コミ:**')) {
        readingReviews = true;
        readingQandA = false;
      } else if (trimmedLine.startsWith('- **Q&A:**')) {
        readingReviews = false;
        readingQandA = true;
        readingOwnerMessage = false;
        readingOwnerPosts = false;
      } else if (trimmedLine.startsWith('- **オーナーからのメッセージ:**')) {
        const message = trimmedLine.replace('- **オーナーからのメッセージ:**', '').trim();
        if (message && message !== '情報なし' && details.ownerInfo) {
          details.ownerInfo.message = message;
        }
        readingReviews = false;
        readingQandA = false;
        readingOwnerMessage = true;
        readingOwnerPosts = false;
      } else if (trimmedLine.startsWith('- **オーナーからの投稿:**')) {
        readingReviews = false;
        readingQandA = false;
        readingOwnerMessage = false;
        readingOwnerPosts = true;
      } else if (readingReviews && trimmedLine.startsWith('- ')) {
        const reviewText = trimmedLine.substring(2).trim().replace(/^「|」$/g, '');
        if (reviewText !== '情報なし') {
          details.reviews?.push(reviewText);
        }
      } else if (readingQandA && trimmedLine.startsWith('- **Q:**')) {
        if (currentQandA.question && currentQandA.answer) {
          details.qanda?.push(currentQandA as QAndA);
        }
        const questionText = trimmedLine.replace('- **Q:**', '').trim();
        if (questionText !== '情報なし') {
          currentQandA = { question: questionText };
        } else {
          currentQandA = {};
        }
      } else if (readingQandA && trimmedLine.startsWith('- **A:**') && currentQandA.question) {
        currentQandA.answer = trimmedLine.replace('- **A:**', '').trim();
        details.qanda?.push(currentQandA as QAndA);
        currentQandA = {};
      } else if (readingOwnerPosts && trimmedLine.startsWith('- ')) {
        const post = trimmedLine.substring(2).trim();
        if (post && post !== '情報なし' && details.ownerInfo?.posts) {
          details.ownerInfo.posts.push(post);
        }
      }
    }

    if (currentQandA.question && currentQandA.answer) {
      details.qanda?.push(currentQandA as QAndA);
    }

    detailsMap.set(title, details);
  }

  return detailsMap;
};

/**
 * 検索クエリからキャッシュキーを生成
 * 日本語のまま正規化（小文字化、空白除去）
 */
function generateCacheKey(query: string): string {
  const normalized = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ''); // 空白を除去
  return `search:${normalized}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, position } = body as { query: string; position: Position | null };

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // === キャッシュチェック ===
    // 現在地検索（positionあり）はキャッシュしない（位置が毎回異なるため）
    const cacheKey = generateCacheKey(query);
    let cacheReadError: string | null = null;
    if (!position) {
      try {
        const cached = await kv.get<CachedSearchResult>(cacheKey);
        if (cached) {
          console.log(`✅ [Cache HIT] key=${cacheKey}, count=${cached.count}, age=${Math.round((Date.now() - cached.timestamp) / 1000 / 60)}分`);
          return NextResponse.json({
            places: cached.results,
            cached: true,
            cacheAge: Date.now() - cached.timestamp,
            _debug: { cacheKey, cacheReadError: null }
          });
        }
        console.log(`⏳ [Cache MISS] key=${cacheKey}`);
      } catch (cacheError: any) {
        console.warn('[Cache Read Error]', cacheError);
        cacheReadError = cacheError?.message || 'Unknown cache read error';
        // キャッシュエラーは無視して検索を続行
      }
    }

    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('VITE_GEMINI_API_KEY not set in environment variables');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents = `「${query}」という検索クエリに合致する日本の**葬儀社または斎場のみ**を検索してください。レストラン、公園、その他の無関係な施設は**絶対に含めないでください**。

Googleマップで見つかった各施設について、以下の情報を厳密なフォーマットで提供してください。施設名は必ず三重のシャープ記号（###）で見出しとしてください。情報がない場合は「情報なし」と記載してください。

**【重要】すべての情報は必ず日本語で記載してください。ローマ字や英語は使用しないでください。**

### [施設の正式名称（日本語）]
- **住所:** [都道府県から始まる完全な住所（必ず日本語で記載）。例: 新潟県長岡市○○町○-○-○]
- **電話番号:** [市外局番から始まる電話番号]
- **評価:** [5段階評価の数値]
- **レビュー数:** [レビューの件数]
- **口コミ:** (注意: 詳細な口コミ情報は別のAPIで取得するため、ここでは代表的なものを1-2件程度の簡易版で記載してください。口コミがない場合は、この項目に続く口コミの箇条書きは省略してください。)
  - [簡易的な口コミ1]
  - [簡易的な口コミ2]

---
【🔴 最重要セクション1: Q&A（質問と回答）】
---
- **Q&A:**

  【絶対に守るべきルール】
  1. Googleマップのビジネスプロフィールページで「質問と回答」または「Q&A」という**専用セクション**を必ず探してください
  2. その専用セクションに実際に投稿されている質問と回答のペアのみを抽出してください
  3. **レビュー・口コミの内容は絶対にQ&Aとして記載しないでください**
  4. 想像や推測で質問と回答を作成しないでください
  5. Q&A専用セクションが見つからない場合、または投稿がゼロの場合は、この項目全体を省略してください（「情報なし」も記載不要）

  【抽出すべきQ&A内容の例】
  - 駐車場: 「駐車場はありますか？」「無料駐車場が20台分ございます」
  - 予約: 「予約は必要ですか？」「事前予約をお勧めしております」
  - 営業時間: 「夜間対応は可能ですか？」「24時間365日対応しております」
  - アクセス: 「最寄り駅はどこですか？」「○○駅から徒歩5分です」
  - 料金: 「家族葬の料金は？」「30万円からのプランがございます」
  - 宗派: 「無宗教でも対応できますか？」「はい、対応可能です」

  【実際の記載フォーマット】
  - **Q:** [実際の質問内容1]
  - **A:** [実際の回答内容1]
  - **Q:** [実際の質問内容2]
  - **A:** [実際の回答内容2]
  - **Q:** [実際の質問内容3]
  - **A:** [実際の回答内容3]

  ※Q&A専用セクションに投稿がない場合は、この「- **Q&A:**」項目全体を省略してください

---
【🔴 最重要セクション2: オーナー情報】
---
- **オーナーからのメッセージ:**

  【絶対に守るべきルール】
  1. Googleビジネスプロフィールの「オーナー」セクションに直接投稿されているテキストメッセージや挨拶文を抽出してください
  2. オーナーが書いた文章そのものを、そのまま引用してください
  3. **施設のアクセシビリティ情報（車椅子対応、駐車場、トイレ、バリアフリー等）は絶対に含めないでください**
  4. オーナーの挨拶文・メッセージがない場合は「情報なし」と記載してください

  【抽出すべきメッセージの例】
  - 「当社は創業50年の実績があり、故人様とご遺族様に寄り添った丁寧なサービスを心がけております」
  - 「地域の皆様に愛される葬儀社を目指して、日々精進しております」

  【記載してはいけない内容】
  - ❌ 「車椅子で入れます」「駐車場があります」「バリアフリー対応」などのアクセシビリティ情報
  - ❌ Googleが自動生成した施設情報
  - ❌ レビューや口コミの内容

- **オーナーからの投稿:**

  【絶対に守るべきルール】
  1. Googleマップの「オーナー」セクションに表示されているオーナーの投稿文やお知らせを抽出してください
  2. オーナーが書いたテキストメッセージのみを抽出してください（写真の説明文も含む）
  3. **施設のアクセシビリティ情報（車椅子対応、駐車場、トイレ、バリアフリー等）は絶対に含めないでください**
  4. 投稿がない場合は、この項目全体を省略してください

  【抽出すべき投稿の例】
  - 「新しいプランを開始しました。お気軽にご相談ください」
  - 「年末年始も24時間対応いたします」
  - 「ホームページをリニューアルしました」

  【記載してはいけない内容】
  - ❌ 「車椅子対応トイレ完備」「駐車場20台分」などのアクセシビリティ情報
  - ❌ Googleが自動生成した施設情報
  - ❌ レビューや口コミの内容

  【実際の記載フォーマット】
  - [投稿1: オーナーが書いたテキストメッセージ]
  - [投稿2: オーナーが書いたテキストメッセージ]
  - [投稿3: オーナーが書いたテキストメッセージ]

  ※オーナーからの投稿がない場合は、この「- **オーナーからの投稿:**」項目全体を省略してください

---

これを、見つかった全ての施設について繰り返してください。`;

    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (position) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: position.latitude,
            longitude: position.longitude,
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config,
    });

    const groundingChunks: GroundingChunk[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as any;

    console.log(`[Gemini API] Found ${groundingChunks.length} places`);
    console.log(`[Gemini Response] First 500 chars:`, response.text?.substring(0, 500) || '');

    const detailsMap = parseDetailsFromMarkdown(response.text || '');

    console.log(`[Data Processor] Parsed details map contains ${detailsMap.size} items.`);

    // Q&A 詳細ログ
    const placesWithQandA = Array.from(detailsMap.values()).filter(d => d.qanda && d.qanda.length > 0);
    console.log(`[Q&A] ${placesWithQandA.length}/${detailsMap.size} places have Q&A`);
    placesWithQandA.forEach((place, idx) => {
      const title = Array.from(detailsMap.keys())[idx];
      console.log(`[Q&A Details] ${title}: ${place.qanda?.length} Q&A pairs`);
      place.qanda?.forEach((qa, qaIdx) => {
        console.log(`  [Q&A #${qaIdx + 1}] Q: ${qa.question.substring(0, 50)}...`);
        console.log(`  [Q&A #${qaIdx + 1}] A: ${qa.answer.substring(0, 50)}...`);
      });
    });

    // オーナー情報詳細ログ
    const placesWithOwnerInfo = Array.from(detailsMap.values()).filter(d => d.ownerInfo && (d.ownerInfo.message || (d.ownerInfo.posts && d.ownerInfo.posts.length > 0)));
    console.log(`[Owner Info] ${placesWithOwnerInfo.length}/${detailsMap.size} places have owner info`);
    placesWithOwnerInfo.forEach((place, idx) => {
      const title = Array.from(detailsMap.entries()).filter(([_, v]) => v === place)[0]?.[0];
      if (place.ownerInfo?.message) {
        console.log(`[Owner Message] ${title}: ${place.ownerInfo.message.substring(0, 50)}...`);
      }
      if (place.ownerInfo?.posts && place.ownerInfo.posts.length > 0) {
        console.log(`[Owner Posts] ${title}: ${place.ownerInfo.posts.length} posts`);
        place.ownerInfo.posts.forEach((post, postIdx) => {
          console.log(`  [Post #${postIdx + 1}] ${post.substring(0, 50)}...`);
        });
      }
    });

    // detailsMap を配列に変換（順序保持）
    const detailsArray = Array.from(detailsMap.entries());
    console.log(`[Title Matching] Total: groundingChunks=${groundingChunks.length}, detailsMap=${detailsArray.length}`);
    console.log(`[Title Matching] detailsMap keys:`, Array.from(detailsMap.keys()));
    console.log(`[Title Matching] groundingChunks titles:`, groundingChunks.map(c => c.maps?.title).filter(Boolean));

    // detailsMap を基準にして、groundingChunks から URI と placeId を取得
    // これにより、Gemini レスポンステキストから抽出した正しいフルネームを使用
    const placesWithoutPhotos = Array.from(detailsMap.entries())
      .map(([detailTitle, details], index) => {
        // インデックスで対応する groundingChunk を探す
        const chunk = groundingChunks[index];

        // chunk がない、または URI/placeId がない場合はスキップ
        if (!chunk?.maps?.uri || !chunk?.maps?.placeId) {
          console.warn(`⚠️ [Mapping] Index ${index}: Missing groundingChunk for "${detailTitle}"`);
          console.warn(`  → Chunk exists: ${!!chunk}, URI: ${chunk?.maps?.uri}, placeId: ${chunk?.maps?.placeId}`);
          return null;
        }

        const chunkTitle = chunk.maps?.title || '';
        console.log(`✅ [Mapping] Index ${index}: "${detailTitle}" ← groundingTitle="${chunkTitle}"`);
        console.log(`  → URI: ${chunk.maps.uri}`);
        console.log(`  → placeId: ${chunk.maps.placeId}`);

        return {
          title: detailTitle,  // Gemini レスポンステキストから抽出したフルネームを使用
          uri: chunk.maps.uri,
          placeId: chunk.maps.placeId,
          address: details.address,
          phone: details.phone,
          rating: details.rating,
          reviewCount: details.reviewCount,
          reviews: details.reviews,
          qanda: details.qanda,
          ownerInfo: details.ownerInfo,
        };
      })
      .filter((place) => place !== null) as SearchResult[];

    console.log(`📊 [Final Results] ${placesWithoutPhotos.length} places mapped successfully (from ${detailsMap.size} detailsMap entries)`);
    placesWithoutPhotos.forEach((place, i) => {
      console.log(`  ${i + 1}. "${place.title}" → ${place.placeId || 'undefined'}`);
    });

    // === 施設詳細を取得してマージ ===
    // キャッシュ保存前に写真・レビュー等の詳細情報を取得
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const placesWithDetails = await Promise.all(
      placesWithoutPhotos.map(async (place) => {
        if (!place.placeId || !googleMapsApiKey) return place;

        try {
          const cleanPlaceId = place.placeId.replace('places/', '');
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cleanPlaceId}&fields=name,formatted_address,formatted_phone_number,photos,reviews,website,business_status,price_level,opening_hours,wheelchair_accessible_entrance,rating,user_ratings_total&language=ja&key=${googleMapsApiKey}`;

          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();

          if (detailsData.status !== 'OK') {
            console.warn(`[Place Details] Failed for ${place.title}: ${detailsData.status}`);
            return place;
          }

          const details = detailsData.result;

          // 写真リファレンスを保存（APIキーは含めない - セキュリティ対策）
          const photoRefs = details.photos
            ? details.photos.map((photo: any) => photo.photo_reference)
            : [];

          console.log(`✅ [Place Details] ${place.title}: ${photoRefs.length} photos, ${details.reviews?.length || 0} reviews`);

          return {
            ...place,
            title: details.name || place.title, // Places APIの公式名で上書き
            photoRefs,  // APIキーなしのリファレンスのみ
            detailedReviews: details.reviews || [],
            website: details.website,
            businessStatus: details.business_status,
            priceLevel: details.price_level,
            openingHours: details.opening_hours,
            wheelchairAccessible: details.wheelchair_accessible_entrance,
          };
        } catch (err) {
          console.warn(`[Place Details Error] ${place.title}:`, err);
          return place;
        }
      })
    );

    console.log(`📊 [With Details] ${placesWithDetails.filter(p => p.photoRefs && p.photoRefs.length > 0).length}/${placesWithDetails.length} places have photos`);

    // === キャッシュ保存 ===
    // 現在地検索でなく、結果がある場合のみキャッシュ（詳細情報込み）
    let cacheWriteError: string | null = null;
    if (!position && placesWithDetails.length > 0) {
      try {
        const cacheData: CachedSearchResult = {
          results: placesWithDetails,
          query: query,
          timestamp: Date.now(),
          count: placesWithDetails.length
        };
        await kv.set(cacheKey, cacheData, { ex: CACHE_TTL_SECONDS });
        console.log(`💾 [Cache SAVE] key=${cacheKey}, count=${placesWithDetails.length}, TTL=${CACHE_TTL_SECONDS}秒 (with details)`);
      } catch (cacheError: any) {
        console.warn('[Cache Write Error]', cacheError);
        cacheWriteError = cacheError?.message || 'Unknown cache write error';
        // キャッシュエラーは無視して結果を返す
      }
    }

    return NextResponse.json({
      places: placesWithDetails,
      cached: false,
      _debug: {
        cacheKey,
        cacheReadError,
        cacheWriteError,
        positionProvided: !!position
      }
    });

  } catch (error: any) {
    console.error('[Gemini API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONSリクエスト対応（CORS preflight）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
