/**
 * Next.js App Router API Route
 * Gemini APIを使用して葬儀社の紹介文を生成・キャッシュ
 * Grounding (Web Search) を使用してインターネットから追加情報を収集
 */

import { NextRequest, NextResponse } from 'next/server';

// 最寄り駅情報の型
interface NearestStationInfo {
  name: string;          // 駅名
  distance: number;      // 距離(m)
  walkingMinutes: number; // 徒歩時間(分)
}

/**
 * 2点間の距離を計算 (メートル) - Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球の半径 (m)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 住所から座標を取得 (Geocoding API)
 */
async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=ja&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log(`[Geocode] Address "${address}" → (${location.lat}, ${location.lng})`);
      return location;
    }
    console.warn(`[Geocode] Failed for address: ${address}, status: ${data.status}`);
    return null;
  } catch (error) {
    console.error('[Geocode] Error:', error);
    return null;
  }
}

/**
 * 座標から最寄り駅を検索 (Places API - Nearby Search)
 */
async function findNearestStation(
  lat: number,
  lng: number,
  apiKey: string
): Promise<NearestStationInfo | null> {
  try {
    // 半径2km以内の鉄道駅を検索
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=train_station&language=ja&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const station = data.results[0]; // 最も近い駅
      const stationLat = station.geometry.location.lat;
      const stationLng = station.geometry.location.lng;

      // 距離計算
      const distance = calculateDistance(lat, lng, stationLat, stationLng);
      const walkingMinutes = Math.ceil(distance / 80); // 80m/分で計算

      // 駅名から「駅」を除去（後で「駅」を付けて表示するため）
      const stationName = station.name.replace(/駅$/, '');

      console.log(`[Station] Found: ${stationName}駅 (${Math.round(distance)}m, 徒歩${walkingMinutes}分)`);

      return {
        name: stationName,
        distance: Math.round(distance),
        walkingMinutes
      };
    }

    console.log(`[Station] No station found within 2km, status: ${data.status}`);
    return null;
  } catch (error) {
    console.error('[Station] Error:', error);
    return null;
  }
}

/**
 * Upstash Redis REST API直接呼び出し
 * 方式2: POSTでコマンド配列を送信（最も確実な方法）
 * 参考: https://upstash.com/docs/redis/features/restapi
 */
async function kvGet(key: string): Promise<string | null> {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!baseUrl || !token) {
    console.warn('[KV] Missing credentials');
    return null;
  }

  try {
    console.log(`[KV GET] Requesting key="${key}"`);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[KV GET] HTTP ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    const hit = data.result !== null && data.result !== undefined;
    console.log(`[KV GET] key="${key}" → ${hit ? 'HIT (' + String(data.result).length + ' chars)' : 'MISS'}`);
    return data.result || null;
  } catch (error) {
    console.error('[KV GET] Error:', error);
    return null;
  }
}

async function kvSet(key: string, value: string): Promise<boolean> {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!baseUrl || !token) {
    console.warn('[KV] Missing credentials');
    return false;
  }

  try {
    console.log(`[KV SET] Storing key="${key}" (${value.length} chars)`);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', key, value]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[KV SET] HTTP ${response.status}: ${errorText}`);
      return false;
    }

    const data = await response.json();
    const success = data.result === 'OK';
    console.log(`[KV SET] key="${key}" → ${success ? 'OK' : 'FAILED: ' + JSON.stringify(data)}`);
    return success;
  } catch (error) {
    console.error('[KV SET] Error:', error);
    return false;
  }
}

/**
 * 外国語が含まれているかチェック
 * ラテン文字3文字以上、キリル文字、アラビア文字、デーバナーガリー文字を検出
 */
function containsForeignLanguage(text: string): boolean {
  // ラテン文字（英語等）- 3文字以上連続
  const latinPattern = /[A-Za-z]{3,}/;
  // キリル文字（ロシア語）
  const cyrillicPattern = /[\u0400-\u04FF]/;
  // アラビア文字
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  // デーバナーガリー文字（ヒンディー語）
  const devanagariPattern = /[\u0900-\u097F]/;
  // ウルドゥー語/ペルシア語の拡張アラビア文字
  const urduPattern = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  // タイ文字
  const thaiPattern = /[\u0E00-\u0E7F]/;
  // ベトナム語（ラテン文字+声調記号）
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  // 韓国語（ハングル）
  const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
  // 中国語（簡体字・繁体字）- 日本語と重複する漢字を除外するため、特定の中国語専用文字のみ
  // ここでは明確に日本語でない中国語記号を検出
  const chineseOnlyPattern = /[\u31C0-\u31EF]/; // CJK Strokes

  return latinPattern.test(text) ||
         cyrillicPattern.test(text) ||
         arabicPattern.test(text) ||
         devanagariPattern.test(text) ||
         urduPattern.test(text) ||
         thaiPattern.test(text) ||
         vietnamesePattern.test(text) ||
         koreanPattern.test(text) ||
         chineseOnlyPattern.test(text);
}

/**
 * 日本語以外の文字を含む文を検出・除去
 * 許可: ひらがな、カタカナ、漢字、句読点、数字、記号、改行
 */
function sanitizeJapaneseText(text: string): string {
  // 許可される文字パターン（日本語、数字、一般的な記号、改行）
  // ひらがな: U+3040-U+309F
  // カタカナ: U+30A0-U+30FF
  // 漢字: U+4E00-U+9FAF
  // 全角記号: U+3000-U+303F
  // 半角・全角形: U+FF00-U+FFEF
  // 追加の日本語記号: ー（長音）、々（繰り返し）
  const japanesePattern = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF00-\uFFEF0-9、。！？「」『』（）・〜：；ー々\s\n\r]+$/;

  // 文を句点で分割（句点、感嘆符、疑問符）
  const sentences = text.split(/(?<=[。！？\n])/);

  const cleanSentences = sentences.filter(sentence => {
    const trimmed = sentence.trim();
    if (!trimmed) return false;

    // 外国語が含まれていないかチェック
    if (containsForeignLanguage(trimmed)) {
      console.log(`[Sanitize] Removing sentence with foreign language: "${trimmed.substring(0, 50)}..."`);
      return false;
    }

    return true;
  });

  const result = cleanSentences.join('');

  // 残った外国語文字を個別に除去（文の境界で分割できなかった場合のフォールバック）
  const finalResult = result
    .replace(/[A-Za-z]{3,}/g, '') // 英語単語を除去
    .replace(/[\u0400-\u04FF]+/g, '') // キリル文字を除去
    .replace(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+/g, '') // アラビア文字を除去
    .replace(/[\u0900-\u097F]+/g, '') // デーバナーガリーを除去
    .replace(/[\u0E00-\u0E7F]+/g, '') // タイ文字を除去
    .replace(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/g, '') // 韓国語を除去
    .replace(/\./g, '。') // 英語のピリオドを日本語の句点に置換
    .replace(/[ \t]{2,}/g, ' ') // 改行以外の連続空白のみを1つに
    .trim();

  return finalResult;
}

// Gemini REST API直接呼び出し用の関数
async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    tools: [
      {
        googleSearch: {}
      }
    ]
  };

  console.log('[Gemini REST API] Calling API...');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini REST API] Error response:', errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Gemini REST API] Response received');

  // レスポンスからテキストを抽出
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { placeId, title, address } = body;

    if (!placeId || !title) {
      return NextResponse.json(
        { error: 'placeId and title are required' },
        { status: 400 }
      );
    }

    console.log(`[Description API] Request received - placeId: "${placeId}", title: "${title}"`);

    // placeIdを正規化（"places/" プレフィックスを除去して一貫性を保つ）
    const normalizedPlaceId = placeId.replace(/^places\//, '');
    console.log(`[Description API] Normalized placeId: "${normalizedPlaceId}"`);

    // Vercel KVからキャッシュをチェック
    const cacheKey = `description:${normalizedPlaceId}`;
    console.log(`[Description Cache] Checking cache with key: "${cacheKey}"`);

    // REST API直接呼び出しでキャッシュをチェック
    const cachedDescription = await kvGet(cacheKey);
    if (cachedDescription) {
      console.log(`[Description Cache] ✅ HIT for "${cacheKey}" (${cachedDescription.length} chars)`);
      return NextResponse.json({ description: cachedDescription, cached: true });
    }
    console.log(`[Description Cache] ❌ MISS for "${cacheKey}", generating...`);

    // Gemini APIキーの取得
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // 住所がある場合、最寄り駅情報を取得（ハルシネーション防止）
    let stationInfo: NearestStationInfo | null = null;
    if (address) {
      const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (mapsApiKey) {
        const coords = await geocodeAddress(address, mapsApiKey);
        if (coords) {
          stationInfo = await findNearestStation(coords.lat, coords.lng, mapsApiKey);
        }
      } else {
        console.warn('[Station] GOOGLE_MAPS_API_KEY not configured, skipping station lookup');
      }
    }

    // 最寄り駅情報をプロンプト用に整形
    const stationInfoText = stationInfo
      ? `最寄り駅: ${stationInfo.name}駅（徒歩約${stationInfo.walkingMinutes}分、約${stationInfo.distance}m）`
      : '';

    // プロンプト: 葬儀社スタッフが自社施設を紹介する自然な文章
    const prompt = `あなたは「${title}」で働く広報担当者です。自社の施設をウェブサイトで紹介する文章を書いてください。

■ 設定（この情報のみを使用してください）
施設名: ${title}
住所: ${address || '（住所不明）'}
${stationInfoText}

■ 重要な制約（必ず守ってください）
・最寄り駅情報は上記の「設定」に記載された情報のみを使用してください
・設定に最寄り駅情報がない場合は、駅やアクセス時間について言及しないでください
・駐車場台数、ホール収容人数、控室の数など、設定に記載されていない具体的な数字は絶対に書かないでください
・推測や仮定に基づく情報は一切書かないでください

■ あなたの役割
この葬儀社で5年以上働いている広報担当。実際に施設のことをよく知っていて、お客様にも何度も説明してきた経験がある。自分の職場に愛着があり、良いところを伝えたいと思っている。

■ 文章のトーン
・丁寧で落ち着いた敬語（堅すぎず、カジュアルすぎず）
・「当施設」「私ども」という一人称を使う
・「〜ございます」「〜しております」は適度に使用

■ 絶対にダメな表現
×「うちは」「うちの」（カジュアルすぎる）
×「〜させていただいております」の連発
×「心を込めて」「真心」「寄り添い」の多用
×「皆様」の連発
×「〜でしょう」「〜かもしれません」という推測
× 長い一文（40文字以上は避ける）
× 電話番号
× 箇条書き
× 英語（カタカナに変換: hall→ホール）
× 設定に記載のない具体的な数字（駐車場◯台、収容◯名など）

■ 良い表現の例
○「当施設は〜」「私どもは〜」
○「〜となっております」「〜がございます」
○「〜ですね」「〜です」（語尾のバリエーション）
○ 設定に記載された情報のみ使用
○ ご利用いただいた方からの声（一般的な内容）

■ 文体の比較
ダメ: 「ご遺族の皆様に寄り添いながら、心を込めたサービスを提供させていただいております」
良い: 「家族葬専門の施設として、一組一組のご家族とじっくり向き合うことを大切にしています」

ダメ: 「うちは24時間対応です」
良い: 「搬送は24時間対応しております。深夜でもスタッフが待機しておりますので、ご安心ください」

■ 構成（5〜6段落、段落間は空行）

1段落目: 場所の紹介
「${title}は〜にあります。」から始める。${stationInfo ? `設定にある最寄り駅（${stationInfo.name}駅、徒歩${stationInfo.walkingMinutes}分）を使用。` : '駅情報がないので、駅については言及しない。'}車でのアクセスは一般的な表現で。

2段落目: 施設の特徴
建物の雰囲気、ホールの広さ、設備など。「当施設の特徴は〜」のような書き出し。

3段落目: 対応できる葬儀の種類
家族葬、一般葬、宗教対応など。最近のニーズにも触れる。

4段落目: スタッフ・サービスの強み
どのような点を大切にしているか、ご利用者からどのような声をいただいているか。

5段落目: 見学・相談について
事前相談や見学のご案内。実際に足を運んでいただければ雰囲気がわかる、という誘導。

6段落目: 締め
1〜2文で自然に締める。

■ 出力ルール
・前置き禁止。「${title}は〜」で始める
・段落間に空行を入れる
・800〜1200文字
・日本語のみ（英語禁止）

Web検索で${title}の情報を確認してから書いてください。`;

    console.log(`[Gemini API] Generating description for ${title} with Grounding...`);

    // 再生成ロジック: 外国語検出時は最大2回まで再試行
    const MAX_RETRIES = 2;
    let description: string = '';
    let retryCount = 0;
    let foreignLanguageDetected = false;

    while (retryCount <= MAX_RETRIES) {
      try {
        const rawDescription = await callGeminiAPI(apiKey, prompt);
        description = rawDescription.trim();
        console.log(`[Gemini API] Raw generation successful, length: ${description.length} chars`);

        // 外国語チェック
        if (containsForeignLanguage(description)) {
          foreignLanguageDetected = true;
          console.warn(`[Description] Foreign language detected (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), sanitizing...`);

          // サニタイズ処理
          const sanitizedDescription = sanitizeJapaneseText(description);
          console.log(`[Description] After sanitization: ${sanitizedDescription.length} chars (was ${description.length})`);

          // サニタイズ後の文字数チェック
          if (sanitizedDescription.length >= 500) {
            description = sanitizedDescription;
            console.log(`[Description] Sanitized description is valid, using it.`);
            break;
          } else if (retryCount < MAX_RETRIES) {
            console.warn(`[Description] Sanitized text too short (${sanitizedDescription.length} chars), retrying...`);
            retryCount++;
            continue;
          } else {
            // 最大リトライ回数に達した場合、サニタイズ済みテキストを使用（短くても）
            description = sanitizedDescription.length > 0 ? sanitizedDescription : description;
            console.warn(`[Description] Max retries reached, using best available (${description.length} chars)`);
            break;
          }
        } else {
          // 外国語なし - そのまま使用
          console.log(`[Description] No foreign language detected, using as-is.`);
          break;
        }
      } catch (geminiError) {
        console.error(`[Gemini API] Error calling API (attempt ${retryCount + 1}):`, geminiError);
        if (retryCount >= MAX_RETRIES) {
          throw geminiError;
        }
        retryCount++;
      }
    }

    console.log(`[Gemini API] Final description length: ${description.length} chars, foreign_detected: ${foreignLanguageDetected}`);

    // AIらしい前置き文を除去（Geminiが出力することがある）
    const aiPreamblePatterns = [
      /^はい[、。].{0,50}(取材記事|作成|書き|記事).{0,20}\n+/,
      /^承知.{0,30}\n+/,
      /^それでは.{0,50}\n+/,
      /^以下.{0,30}(です|ます)[。\n]+/,
      /^こんにちは.{0,50}\n+/,
      /^.*の取材記事を(作成|書き).{0,20}\n+/,
    ];

    for (const pattern of aiPreamblePatterns) {
      if (pattern.test(description)) {
        const before = description.length;
        description = description.replace(pattern, '');
        console.log(`[Description] Removed AI preamble: ${before - description.length} chars removed`);
      }
    }

    // 最終的なテキストクリーンアップ（常に実行）
    description = description
      .replace(/\./g, '。') // 英語のピリオドを句点に置換
      .replace(/,/g, '、') // 英語のカンマを読点に置換
      .replace(/\n{3,}/g, '\n\n') // 3つ以上の改行を2つに統一（段落区切りを保持）
      .replace(/[ \t]{2,}/g, ' ') // 連続する空白（改行以外）を1つに
      .trim();

    if (!description || description.length < 300) {
      console.warn(`[Description Generation] Final text too short: ${description.length} chars`);
      return NextResponse.json(
        { error: 'Generated description is too short' },
        { status: 500 }
      );
    }

    // Vercel KVにキャッシュ（REST API直接呼び出し）
    const cached = await kvSet(cacheKey, description);
    if (cached) {
      console.log(`[Description Cache] ✅ SET success for "${cacheKey}", length: ${description.length} chars`);
    } else {
      console.warn(`[Description Cache] ⚠️ SET failed for "${cacheKey}"`);
    }

    return NextResponse.json({ description, cached: false });

  } catch (error) {
    console.error('Error generating description:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
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
