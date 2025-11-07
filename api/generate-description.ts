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

    // 改善されたプロンプト: 自然で会話的、具体的な情報を含む紹介文を生成
    const prompt = `CRITICAL LANGUAGE RULE: You MUST write 100% in Japanese (ひらがな、カタカナ、漢字 ONLY).
ABSOLUTELY FORBIDDEN: Any Latin alphabet (a-z, A-Z), Cyrillic (а-я, А-Я), or other non-Japanese characters.

あなたは日本語で葬儀社の紹介文を書く専門ライターです。

**【絶対厳守】言語ルール - 違反は即座に却下**
1. ✅ 使用可能: ひらがな、カタカナ、漢字、句読点のみ（ふりがなは不要）
2. ❌ 完全禁止: 以下の文字を1文字でも使用したら即座に書き直し
   - ロシア語のキリル文字（близких, последний, времени など）
   - 英語のアルファベット（family, close, last など）
   - 中国語簡体字・繁体字
   - 韓国語ハングル
   - その他すべての外国語文字
3. 🔍 出力前の必須チェック: 生成した文章をスキャンし、日本語以外の文字が1文字でもあれば削除または日本語に置換
4. 💡 表現方法: 外国語を使わず、適切な日本語の類義語・同義語で表現
5. ⚠️ 注意: ふりがなや括弧での読み仮名表記は不要（普通の文章として記述）

【入力情報】
葬儀社名: ${title}
住所: ${address || '不明'}

【作業手順】
1. 必ずWeb検索を実行して最新情報を収集
2. 以下のルールに従って1000-2000文字の紹介文を作成
3. **前置きや挨拶なしで、直接本文から書き始める**
4. **日本語のみで記述する**

【情報収集（必須）】
Web検索で以下を必ず確認：
- 正確な住所（番地まで）
- アクセス方法（最寄り駅、所要時間、主要道路）
- 駐車場台数
- ホール収容人数
- 設備詳細（安置室、控室、バリアフリー等）
- 対応する葬儀形式
- 運営会社名
- 利用者の口コミ

【文体ルール（厳守）】

■絶対に出力してはいけない表現
❌ 前置き文: 「了解いたしました」「承ります」「作成します」
❌ 作業説明: 「まずはWeb検索で〜」「情報収集を行い〜」
❌ 伝聞調: 「〜ようです」「〜そうです」「〜とのことです」
❌ 推測形: 「〜でしょう」「〜かもしれません」
❌ 過剰敬語: 「〜いただけます」「〜いただけるよう」を多用
❌ 堅い動詞: 「位置します」「承ります」「ございます」「努めています」
❌ 過剰な敬称: 「故人様」→「故人」、「お客様」→「ご家族」
❌ 企業主語: 「弊社」「当社」「当ホール」
❌ 機械的接続詞: 「まず」「次に」「そして」「最後に」
❌ 説明前置き: 「〜について説明します」「〜をご紹介します」
❌ 箇条書き: すべて段落で記述
❌ 常套句の連発: 「寄り添い」「心を込めて」「心温まる」（各1回まで）
❌ 電話番号の記載: 文中に電話番号を書かない

■推奨表現
✅ 断定形: 「〜しています」「〜です」「〜できます」
✅ カジュアルな動詞: 「あります」「います」「対応しています」
✅ 説明口調: 「〜なんです」「〜んです」
✅ シンプルな表現: 「安心です」「休めます」「過ごせます」
✅ 具体的情報: 駅名、距離、台数、人数
✅ リズム変化: 短文と長文を交互に配置
✅ 主語の省略: 「〇〇は、」を連発しない

【構成（全12段落、見出しなし）】

第1段落: 場所とアクセス
- 住所、最寄り駅と徒歩時間、主要道路
- 駐車場台数
例: 「〇〇は、△△区〜にあります。〜駅から徒歩〜分。駐車場は〜台分あります。」

第2段落: 施設の基本情報
- 収容人数、安置室の雰囲気
例: 「ホールは〜名まで入る広さです。和室の安置室があって、〜」

第3段落: 対応する葬儀形式
- 家族葬の定義を具体的に（⚠️ この段落で外国語混入が多発！日本語のみ使用！）
- 「近親者」「親族」「親しい友人」など日本語で表現
- ❌ 禁止: близких, close relatives など外国語表現
例: 「家族葬、一日葬など対応しています。家族葬は近親者や親しい友人のみで行う形式で〜」

第4段落: 宗教・宗派対応
例: 「仏式、神式、キリスト教式に対応。宗派を問わず〜」

第5段落: 施設の特徴
- バリアフリー、控室、貸切制度
例: 「バリアフリー設計で〜。1日1件の貸切なので〜なんです。」

第6段落: 営業時間・搬送（電話番号は書かない）
例: 「搬送は24時間365日対応。いつでも連絡すれば〜」

第7段落: 口コミ・具体的サービス
- 口コミを引用、または料理などの具体例
例: 「『〜』という声をもらっています」「料理は〜と提携していて〜」

第8段落: スタッフの姿勢（1-2文、控えめに）
例: 「スタッフは〜を心がけています」

第9段落: 見学会・事前相談
例: 「見学会や事前相談も受け付けています。気軽に〜」

第10段落: 葬儀後のサポート
例: 「葬儀後の法事や〜の相談にも対応しています」

第11段落: 地域の特徴
例: 「〇〇区の〜な住宅街です。落ち着いた雰囲気で〜」

第12段落: 締め（1-2文）
例: 「〜を大切にした葬儀をサポートしています」

【出力形式】
- **日本語のみで記述する（外国語の使用は絶対禁止）**
- 前置き・挨拶・作業説明は一切書かない
- いきなり第1段落から書き始める
- 電話番号は書かない
- 本文のみを出力する

【品質チェック】
□ **日本語以外の言語が混入していないか**
□ 前置き文を書いていないか
□ 電話番号を書いていないか
□ 「〜いただけます」を多用していないか
□ 「〜でしょう」を使っていないか
□ 「故人様」「お客様」を多用していないか
□ 「ようです」「そうです」を使っていないか
□ 常套句を連発していないか
□ 各段落が会話的で自然か
□ 文の長さにリズムがあるか

【重要】
- 出力は紹介文の本文のみ。余計な説明や前置きは絶対に書かないこと。
- **すべての文章を日本語で記述すること。外国語（英語、ロシア語、中国語など）の使用は絶対禁止。**

【最終確認（出力前に必ずチェック）】
1. 文章全体をスキャンし、日本語以外の文字（а-я, А-Я, a-z, A-Z, 中国語簡体字など）が1文字でも含まれていないか確認
2. もし外国語が見つかった場合は、その単語を適切な日本語に置き換えてから出力
3. 出力は100%日本語のみで構成されていること
4. 特に「близких」「последний」「времени」などのロシア語キリル文字が混入していないか確認
5. これらの単語を見つけたら、以下のように置換:
   - близких → 近しい、親しい
   - последний → 最後の、最終的な
   - времени → 時間

CRITICAL FINAL CHECK:
- Scan ENTIRE output for Cyrillic characters (а-я, А-Я)
- Scan ENTIRE output for Latin alphabet (a-z, A-Z)
- If ANY non-Japanese character found, REMOVE it or REPLACE with Japanese equivalent
- OUTPUT MUST BE 100% Japanese characters ONLY (ひらがな、カタカナ、漢字、句読点)
- NEVER output text containing "близких", "последний", "времени", or any other foreign words`;

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
