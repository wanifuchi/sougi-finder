/**
 * Next.js App Router API Route
 * サーバーサイドローマ字変換API
 * Kuroshiro + Kuromoji AnalyzerをNode.js環境で実行
 */

import { NextRequest, NextResponse } from 'next/server';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

// Kuroshiroインスタンスをモジュールレベルでキャッシュ
let kuroshiroInstance: Kuroshiro | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Kuroshiroの初期化（1度のみ実行）
 */
async function initKuroshiro(): Promise<void> {
  if (kuroshiroInstance && kuroshiroInstance._analyzer) {
    return; // 既に初期化済み
  }

  if (initPromise) {
    return initPromise; // 初期化中の場合は待機
  }

  initPromise = (async () => {
    try {
      console.log('[Kuroshiro] Initializing...');
      kuroshiroInstance = new Kuroshiro();

      // Vercel環境でも辞書ファイルを見つけられるように明示的にパスを指定
      const dictPath = process.env.VERCEL
        ? '/var/task/node_modules/kuromoji/dict'
        : undefined;

      console.log('[Kuroshiro] Dict path:', dictPath || 'default');

      await kuroshiroInstance.init(new KuromojiAnalyzer({
        dictPath: dictPath
      }));

      console.log('[Kuroshiro] Initialized successfully');
    } catch (error) {
      console.error('[Kuroshiro] Initialization failed:', error);
      kuroshiroInstance = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * POST /api/convert-romaji
 * 日本語テキストをローマ字に変換
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    console.log(`[Convert Romaji API] Request: "${text}"`);

    // Kuroshiro初期化
    await initKuroshiro();

    if (!kuroshiroInstance) {
      throw new Error('Kuroshiro initialization failed');
    }

    // ローマ字変換
    const romaji = await kuroshiroInstance.convert(text, {
      mode: 'normal',
      to: 'romaji',
      romajiSystem: 'hepburn'
    });

    console.log(`[Convert Romaji API] Raw romaji: "${romaji}"`);

    // クリーニング処理（スペースを削除してフルネームのローマ字に）
    const cleaned = romaji
      .toLowerCase()
      .replace(/\s+/g, '')            // スペースを削除
      .replace(/[^a-z0-9]/g, '');     // 英数字以外を削除

    console.log(`[Convert Romaji API] Cleaned romaji: "${cleaned}"`);

    return NextResponse.json({
      romaji: cleaned,
      original: text
    });

  } catch (error) {
    console.error('[Convert Romaji API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to convert romaji',
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
