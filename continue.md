# 開発継続ガイド

## 現在の状態（2025-11-12時点）

### 最新デプロイ
- **本番URL**: https://sougifinder-9y70kkhxf-wanifucks.vercel.app
- **デプロイ日時**: 2025-11-12
- **ステータス**: 正常稼働中

### 最後に実施した変更（2025-11-12）
**都道府県ページからの検索機能を完全修正**

#### 問題の発覚
ユーザーから「市区町村から探すをするとエラーが出る」との報告。以下のエラーが発生：
- `/api/convert-romaji` が500エラーを返す
- 最終的に「検索結果が見つかりません。検索からやり直してください。」エラーが表示される

#### 第1回修正（部分的な成功）
**問題**: PrefecturePageClient.tsx が `generateRegionSlugAsync()` を呼び出し、失敗する Kuroshiro API を使用していた

**対応**:
- `handleRegionClick` を修正してromajiを直接使用
- `generateRegionSlugAsync` 依存を削除
- ボタンから `muni.romaji` と `station.romaji` を直接渡すように変更

**結果**: CORSエラーは解消したが、検索結果は依然として表示されず

#### 第2回修正（完全解決）
**根本原因の特定**:
- PrefecturePageClient は API 呼び出しをせずに直接 `/list/{romaji}` に遷移していた
- sessionStorage にデータが保存されていなかった
- ListPageClient が sessionStorage からデータを読み込もうとして null を受け取り、エラーを表示

**実装した解決策**:
1. **完全な検索フロー実装**:
   ```typescript
   const handleRegionClick = useCallback(async (romaji: string, regionName: string) => {
     try {
       setIsLoading(true);
       setError(null);

       // 地域名で葬儀社を検索
       const places = await searchFuneralHomes(regionName, position);

       // sessionStorage に検索結果を保存
       saveSearchResults(places, regionName, false);

       // 検索結果ページへ遷移
       router.push(`/list/${romaji}`);
     } catch (e) {
       console.error('検索エラー:', e);
       setError('検索中にエラーが発生しました。しばらくしてからもう一度お試しください。');
     } finally {
       setIsLoading(false);
     }
   }, [router, position]);
   ```

2. **必要なインポート追加**:
   - `useState`, `useCallback` from React
   - `searchFuneralHomes` from services/geminiService
   - `saveSearchResults` from utils/urlHelpers
   - `useGeolocation` hook

3. **状態管理追加**:
   - `isLoading` - ローディング状態
   - `error` - エラーメッセージ
   - `position` - 位置情報

4. **UI改善**:
   - ローディングスピナーの追加（スカイブルーの回転アイコン）
   - エラーメッセージバナーの追加（赤色）
   - ボタンに `disabled={isLoading}` 属性追加
   - 無効化時のスタイリング追加

5. **ボタンハンドラー更新**:
   ```typescript
   // 市区町村ボタン
   onClick={() => handleRegionClick(muni.romaji, muni.name)}

   // 駅ボタン
   onClick={() => handleRegionClick(station.romaji, station.name)}
   ```

#### デプロイ結果
- ビルド成功: 3,593ページ生成
- デプロイURL: https://sougifinder-9y70kkhxf-wanifucks.vercel.app
- ステータス: 全ての検索フローが正常動作

#### 修正されたファイル
- `/Users/noriaki/Desktop/claude_base/sougi_finder/app/prefecture/[prefSlug]/PrefecturePageClient.tsx`

#### データフローの統一
修正後、すべての検索エントリーポイントで一貫したフローを実現：
```
検索開始 → API呼び出し → sessionStorage保存 → 結果ページへ遷移 → データ読み込み → 表示
```

HomePage と PrefecturePageClient で同じパターンを使用し、アーキテクチャの一貫性を確保。

---

## 前回の改善内容（2025-11-07）

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

---

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

---

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
open https://sougifinder-9y70kkhxf-wanifucks.vercel.app

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

---

## 重要なファイル

### 検索機能
- **PrefecturePageClient**: `app/prefecture/[prefSlug]/PrefecturePageClient.tsx`
  - 行70-92: `handleRegionClick` 関数（完全な検索フロー実装）
  - 行34-36: 状態管理（isLoading, error, position）
  - 行3-10: 必要なインポート
- **ListPageClient**: `app/list/[region]/ListPageClient.tsx`
  - sessionStorage からデータを読み込み、検索結果を表示
- **HomePage**: `app/page.tsx`
  - 行41-74: `performSearch` 関数（参照実装）

### プロンプト設定
- **ファイル**: `api/generate-description.ts`
- **行番号**: 60-170行目
- **変更時の影響**: キャッシュクリアが必要

### URL処理
- **ファイル**: `app/utils/urlHelpers.ts`
  - `saveSearchResults()` - sessionStorage保存
  - `loadSearchResults()` - sessionStorage読み込み
  - `convertToRomajiFallback()` - regions.json フォールバック

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

---

## トラブルシューティング

### プロンプトが反映されない
**原因**: キャッシュが残っている
**解決**: キャッシュクリアスクリプトを実行

### 都道府県ページからの検索エラー
**原因**: sessionStorage にデータが保存されていない
**解決**: PrefecturePageClient.tsx で検索API呼び出し → sessionStorage保存 → 遷移のフローを確認

### API エラーが発生
**原因**: 環境変数が不足
**解決**: `vercel env pull .env.local --yes`

### ビルドエラー
**原因**: 依存関係の不整合
**解決**: `npm install` を再実行

### デプロイ失敗
**原因**: Vercel認証エラー
**解決**: `vercel login` で再ログイン

---

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
vercel logs https://sougifinder-9y70kkhxf-wanifucks.vercel.app --since 5m
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

---

## 連絡先・リソース

- **Vercelダッシュボード**: https://vercel.com/wanifucks/sougi_finder
- **Vercel Storage (KV)**: https://vercel.com/wanifucks/sougi_finder/stores
- **GitHub Issues**: https://github.com/anthropics/claude-code/issues（フィードバック用）

---

## アーキテクチャメモ

### 検索データフロー
すべての検索エントリーポイント（HomePage、PrefecturePageClient）で統一されたパターン：

```
1. ユーザーアクション（検索ボタンクリック、地域選択）
   ↓
2. API呼び出し（searchFuneralHomes）
   ↓
3. sessionStorage保存（saveSearchResults）
   ↓
4. ページ遷移（router.push）
   ↓
5. ListPageClientでデータ読み込み（loadSearchResults）
   ↓
6. 検索結果表示
```

### 重要な設計決定
1. **sessionStorage使用**: ページ遷移間でデータを共有
2. **Kuroshiro APIフォールバック**: API失敗時は regions.json から romaji を取得
3. **一貫したエラーハンドリング**: try-catch-finally パターンで状態管理
4. **ローディングUI**: ユーザーフィードバック向上のためのスピナーとメッセージ

---

## 備考

- Claude Code起動時に自動初期化される機能（Serena、Gemini CLI、Tsumiki）は正常動作中
- バックグラウンドで実行中のプロセスがあれば、`ps aux | grep tsx` で確認可能
- キャッシュクリアは時間がかかる処理なので、必要性を判断してから実行すること
- 都道府県ページからの検索機能は完全に修正され、正常動作を確認済み（2025-11-12）
