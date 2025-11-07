# 開発継続ガイド

## 現在の状態（2025-11-07時点）

### 最新デプロイ
- **本番URL**: https://sougifinder-33n3561x8-wanifucks.vercel.app
- **デプロイ日時**: 2025-11-07
- **ステータス**: 正常稼働中

### 最後に実施した変更
プロンプトの改善版を適用し、デプロイ完了。

## 主要な改善内容

### プロンプト最適化（`api/generate-description.ts`）
以下の問題を解決：
1. **過剰敬語の排除**: 「〜いただけます」「〜いただけるよう」の多用を禁止
2. **推測形の禁止**: 「〜でしょう」を完全に排除
3. **過剰な敬称の修正**: 「故人様」→「故人」、「お客様」→「ご家族」
4. **堅い動詞の排除**: 「努めています」「承ります」「ございます」を禁止
5. **常套句の制限**: 「寄り添い」「心を込めて」「心温まる」を各1回まで
6. **電話番号の非表示**: 文中に電話番号を記載しない
7. **カジュアルな表現**: 「あります」「います」「対応しています」「安心です」「休めます」「過ごせます」を推奨

### プロンプトの構造（12段落構成）
```
第1段落: 場所とアクセス（住所、駅、駐車場）
第2段落: 施設の基本情報（収容人数、安置室）
第3段落: 対応する葬儀形式（家族葬の定義）
第4段落: 宗教・宗派対応
第5段落: 施設の特徴（バリアフリー、貸切制度）
第6段落: 営業時間・搬送（電話番号は記載しない）
第7段落: 口コミ・具体的サービス
第8段落: スタッフの姿勢（1-2文、控えめ）
第9段落: 見学会・事前相談
第10段落: 葬儀後のサポート
第11段落: 地域の特徴
第12段落: 締め（1-2文）
```

## 未完了のタスク

### キャッシュクリア（保留中）
- **スクリプト**: `scripts/clear-cache-batch.ts`
- **対象**: `description:*` パターンのキー（約7000件）
- **ステータス**: ユーザーの指示により一時停止中
- **実行方法**: `npx tsx scripts/clear-cache-batch.ts`
- **注意**: 新しいプロンプトを全施設に適用するには、キャッシュクリアが必要

### 実行待ちのバックグラウンドプロセス
以下のプロセスが実行中の可能性があります：
```bash
# 確認方法
ps aux | grep -E "vercel|tsx|cache"

# 必要に応じて停止
pkill -f "clear-cache"
```

## 次回開発時の手順

### 1. 環境確認
```bash
cd /Users/noriaki/Desktop/claude_base/sougi_finder

# 環境変数の確認
cat .env.local | grep -E "GEMINI_API_KEY|KV_"

# 環境変数が不足している場合
vercel env pull .env.local --yes
```

### 2. 最新デプロイの動作確認
```bash
# 最新デプロイURLにアクセス
open https://sougifinder-33n3561x8-wanifucks.vercel.app

# または、本番URLにアクセス
vercel ls
```

### 3. キャッシュクリアの実行（必要に応じて）
新しいプロンプトを全施設に反映させる場合：
```bash
# バッチ削除スクリプトの実行
npx tsx scripts/clear-cache-batch.ts

# 進行状況の確認（別ターミナル）
# 約7000件のキーを100件ずつバッチ削除
# 完了まで約5-10分
```

### 4. ローカル開発の開始
```bash
# 依存関係のインストール（初回のみ）
npm install

# 開発サーバーの起動
npm run dev

# ブラウザで http://localhost:5173 を開く
```

### 5. ビルド＆デプロイ
```bash
# ビルドの確認
npm run build

# 本番デプロイ
vercel --prod --yes
```

## 重要なファイル

### プロンプト設定
- **ファイル**: `api/generate-description.ts`
- **行番号**: 60-170行目
- **変更時の影響**: キャッシュクリアが必要

### キャッシュ管理
- **スクリプト**: `scripts/clear-cache-batch.ts`（バッチ削除版、推奨）
- **スクリプト**: `scripts/clear-cache.ts`（1件ずつ削除版）
- **ガイド**: `CACHE_CLEAR_GUIDE.md`

### 型定義
- **ファイル**: `types.ts`
- **重要フィールド**: `description?: string;`（施設紹介文）

### フロントエンド
- **コンポーネント**: `components/DetailPage.tsx`
- **API呼び出し**: 40-75行目
- **表示UI**: 407-427行目

## トラブルシューティング

### プロンプトが反映されない
**原因**: キャッシュが残っている
**解決**: キャッシュクリアスクリプトを実行

### API エラーが発生
**原因**: 環境変数が不足
**解決**: `vercel env pull .env.local --yes`

### ビルドエラー
**原因**: 依存関係の不整合
**解決**: `npm install` を再実行

### デプロイ失敗
**原因**: Vercel認証エラー
**解決**: `vercel login` で再ログイン

## 参考情報

### Vercelコマンド
```bash
# ログイン
vercel login

# プロジェクト一覧
vercel ls

# 環境変数取得
vercel env pull .env.local --yes

# 本番デプロイ
vercel --prod --yes

# ログ確認
vercel logs https://sougifinder-33n3561x8-wanifucks.vercel.app --since 5m
```

### npm スクリプト
```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# プレビュー
npm run preview
```

### TypeScript実行
```bash
# スクリプト実行
npx tsx scripts/clear-cache-batch.ts
```

## 連絡先・リソース

- **Vercelダッシュボード**: https://vercel.com/wanifucks/sougi_finder
- **Vercel Storage (KV)**: https://vercel.com/wanifucks/sougi_finder/stores
- **GitHub Issues**: https://github.com/anthropics/claude-code/issues（フィードバック用）

## 備考

- Claude Code起動時に自動初期化される機能（Serena、Gemini CLI、Tsumiki）は正常動作中
- バックグラウンドで実行中のプロセスがあれば、`ps aux | grep tsx` で確認可能
- キャッシュクリアは時間がかかる処理なので、必要性を判断してから実行すること
