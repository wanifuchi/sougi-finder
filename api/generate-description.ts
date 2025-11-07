/**
 * Vercel Serverless Function
 * Gemini APIを使用して葬儀社の紹介文を生成・キャッシュ
 * Grounding (Web Search) を使用してインターネットから追加情報を収集
 */

import { kv } from '@vercel/kv';
import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエスト（preflight）への対応
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { placeId, title, address } = req.body;

    if (!placeId || !title) {
      return res.status(400).json({ error: 'placeId and title are required' });
    }

    console.log(`[Description API] Request received - placeId: ${placeId}, title: ${title}`);

    // Vercel KVからキャッシュをチェック
    const cacheKey = `description:${placeId}`;
    const cachedDescription = await kv.get<string>(cacheKey);

    if (cachedDescription) {
      console.log(`[Description Cache] HIT for ${placeId}`);
      return res.status(200).json({ description: cachedDescription, cached: true });
    }

    console.log(`[Description Cache] MISS for ${placeId}, generating...`);

    // Gemini APIキーの取得
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 改善されたプロンプト: シンプルで明確な日本語のみの指示
    const prompt = `あなたは日本の葬儀社の紹介文を書く専門ライターです。

【必須条件】
- 自然な日本語で記述してください（漢字、ひらがな、カタカナを適切に使い分ける）
- 新聞記事や雑誌記事のような標準的な文体で書いてください
- 読みやすく、温かみのある文章を心がけてください

【入力情報】
葬儀社名: ${title}
住所: ${address || '住所情報なし'}

【作業手順】
1. Web検索で施設の最新情報を収集してください
2. 前置きや挨拶なしで、直接本文から書き始めてください
3. 1000〜2000文字程度の紹介文を作成してください

【記載内容（段落形式で記述）】

第1段落: アクセス方法
- 住所（区まで）、最寄り駅と徒歩時間、駐車場情報

第2段落: 施設の基本情報
- ホールの収容人数、安置室の雰囲気

第3段落: 対応可能な葬儀形式
- 家族葬、一日葬など
- 家族葬の説明（近親者や親しい友人のみで行う形式であることを説明）

第4段落: 宗教・宗派への対応
- 仏式、神式、キリスト教式など

第5段落: 施設の特徴
- バリアフリー対応、控室、貸切制度など

第6段落: 営業時間・搬送サービス
- 24時間対応、搬送サービスなど（電話番号は記載しない）

第7段落: 口コミや具体的サービス
- 利用者の声、料理や設備の特徴

第8段落: スタッフの姿勢
- 簡潔に1〜2文で記述

第9段落: 見学会・事前相談
- 見学や相談の受付について

第10段落: 葬儀後のサポート
- 法事やお墓の相談など

第11段落: 地域の特徴
- 周辺環境、雰囲気

第12段落: 締めの言葉
- 施設の理念や姿勢を1〜2文で

【文体のポイント】
- 断定形を使用（「〜です」「〜できます」）
- 伝聞調は避ける（「〜ようです」「〜そうです」は使わない）
- 過剰な敬語は避ける（自然な敬語で十分）
- 具体的な情報を盛り込む（駅名、人数、台数など）

【注意事項】
- 前置きの挨拶や作業説明は書かない
- 電話番号は記載しない
- 箇条書きではなく段落形式で記述する
- 会話的で読みやすい文章を心がける

【出力形式】
紹介文の本文のみを出力してください。余計な説明や前置きは不要です。`;

    console.log(`[Gemini API] Generating description for ${title} with Grounding...`);

    // Gemini API設定
    const config: any = {
      tools: [{ googleSearch: {} }]  // Grounding: Web検索を有効化
    };

    // 正しいGemini API呼び出し方法（search-funeral-homes.tsと同じ）
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config
    });

    const description = response.text.trim();
    console.log(`[Gemini API] Generation successful, length: ${description.length} chars`);

    if (!description || description.length < 500) {
      console.warn(`[Description Generation] Generated text too short: ${description.length} chars`);
      return res.status(500).json({ error: 'Generated description is too short' });
    }

    // Vercel KVにキャッシュ（無期限）
    await kv.set(cacheKey, description);
    console.log(`[Description Cache] SET for ${placeId}, length: ${description.length} chars`);

    return res.status(200).json({ description, cached: false });

  } catch (error) {
    console.error('Error generating description:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
