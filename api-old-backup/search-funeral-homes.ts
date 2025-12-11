import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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

interface MapChunk {
  uri: string;
  title: string;
  placeId?: string;
}

interface GroundingChunk {
  maps?: MapChunk;
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('VITE_GEMINI_API_KEY not set in environment variables');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { query, position } = req.body as { query: string; position: Position | null };

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
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

    const placesWithoutPhotos = groundingChunks
      .filter(chunk => chunk.maps && chunk.maps.uri && chunk.maps.title)
      .map((chunk, index) => {
        const title = chunk.maps!.title;

        // 方法1: インデックスマッチング（優先）
        let matchedTitle = detailsArray[index]?.[0];
        let details: ParsedDetails | undefined = detailsArray[index]?.[1];

        console.log(`[Title Matching] Index ${index}: groundingTitle="${title}", detailsTitle="${matchedTitle || 'N/A'}"`);

        // 方法2: 文字列マッチング（フォールバック）
        if (!matchedTitle || !details) {
          console.warn(`[Title Matching] Index match failed for index ${index}, trying string matching...`);
          const matchingKey = Array.from(detailsMap.keys()).find(key => {
            const normalizedKey = key.replace(/[\s\u3000]/g, '');
            const normalizedTitle = title.replace(/[\s\u3000]/g, '');
            return normalizedKey === normalizedTitle || normalizedKey.includes(normalizedTitle) || normalizedTitle.includes(normalizedKey);
          });
          matchedTitle = matchingKey || '';
          details = matchingKey ? detailsMap.get(matchingKey) : undefined;
        }

        // デバッグログ
        if (matchedTitle && matchedTitle !== title) {
          console.log(`[Title Matching] ✓ "${title}" → "${matchedTitle}"`);
        } else if (!matchedTitle) {
          console.warn(`[Title Matching] ✗ Failed: "${title}"`);
        }

        return {
          title: matchedTitle || title,
          uri: chunk.maps!.uri,
          placeId: chunk.maps!.placeId,
          address: details?.address,
          phone: details?.phone,
          rating: details?.rating,
          reviewCount: details?.reviewCount,
          reviews: details?.reviews,
          qanda: details?.qanda,
          ownerInfo: details?.ownerInfo,
        };
      });

    return res.status(200).json({ places: placesWithoutPhotos });

  } catch (error: any) {
    console.error('[Gemini API Error]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
