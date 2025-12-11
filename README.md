# 葬儀社ファインダー

日本全国の葬儀社・斎場を現在地や地名から簡単に検索できるWebアプリケーションです。

![葬儀社ファインダー](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 特徴

- 🗺️ **現在地から検索**: ブラウザの位置情報を使用して周辺の葬儀社を自動検索
- 🔍 **地名・キーワード検索**: 地名やキーワードで全国の葬儀社を検索
- 📍 **2つの表示モード**: リスト表示と地図表示を切り替え可能
- 📝 **詳細情報**: 住所、電話番号、評価、口コミ、Q&Aを表示
- 🚀 **Gemini AI搭載**: Google Gemini APIのGoogle Maps Grounding機能で高精度な検索を実現

## 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Vite
- **AI**: Google Gemini API (gemini-2.5-flash)
- **地図**: Google Maps Embed API

## セットアップ

### 前提条件

- Node.js (推奨バージョン: 18以上)
- npm または yarn

### 1. リポジトリのクローン

```bash
git clone https://github.com/wanifuchi/sougi_finder.git
cd sougi_finder
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```bash
# Gemini API Key（必須）
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Google Maps API Key（オプション - より良い地図表示のため）
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

#### APIキーの取得方法

**Gemini API Key（必須）**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. 生成されたAPIキーをコピーして`.env.local`に設定

**Google Maps API Key（オプション）**
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「APIキー」を選択
5. Maps Embed APIを有効化
6. 生成されたAPIキーをコピーして`.env.local`に設定

> **注意**: Google Maps API Keyがない場合でも、地図は表示されますが、使用制限がある可能性があります。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

### 5. ビルド

本番環境用のビルドを作成：

```bash
npm run build
```

ビルドされたファイルは`dist`ディレクトリに出力されます。

### 6. ビルドのプレビュー

```bash
npm run preview
```

## デプロイ

### Vercelへのデプロイ（推奨）

1. [Vercel](https://vercel.com/) にアクセスしてGitHubアカウントで連携
2. リポジトリをインポート
3. 環境変数を設定：
   - `VITE_GEMINI_API_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`（オプション）
4. デプロイ実行

### その他のデプロイ先

- **Netlify**: `dist`ディレクトリをデプロイ
- **Cloudflare Pages**: `npm run build`の出力をデプロイ
- **GitHub Pages**: 静的ホスティングとして利用可能

## プロジェクト構造

```
sougi_finder/
├── components/          # UIコンポーネント
│   ├── DetailPage.tsx   # 施設詳細ページ
│   ├── Icons.tsx        # SVGアイコン
│   ├── MapView.tsx      # 地図表示
│   ├── ResultCard.tsx   # 検索結果カード
│   ├── ResultsDisplay.tsx # 検索結果表示エリア
│   ├── SearchBar.tsx    # 検索バー
│   └── StarRating.tsx   # 星評価表示
├── hooks/
│   └── useGeolocation.ts # 位置情報取得フック
├── services/
│   └── geminiService.ts  # Gemini API通信
├── App.tsx              # メインコンポーネント
├── index.tsx            # エントリーポイント
├── types.ts             # 型定義
├── index.css            # グローバルCSS
├── vite.config.ts       # Vite設定
├── tailwind.config.js   # Tailwind設定
└── package.json         # 依存関係
```

## 使い方

### 1. 現在地から検索

1. 「現在地から検索」タブを選択
2. ブラウザの位置情報許可を承認
3. 「現在地から探す」ボタンをクリック

### 2. 地名・キーワードで検索

1. 「地名・キーワードで検索」タブを選択
2. 検索ボックスに地名やキーワードを入力（例: 「東京都新宿区」「新宿駅 葬儀社」）
3. 「検索」ボタンをクリック

### 3. 検索結果の表示

- **リスト表示**: 施設情報をカード形式で一覧表示
- **マップ表示**: 地図上に施設を表示

### 4. 詳細情報の確認

- 各施設カードの「詳細を見る」ボタンをクリック
- 住所、電話番号、評価、口コミ、Q&Aを確認
- 「Googleマップで開く」で経路案内
- 「電話をかける」で直接連絡（モバイルデバイス）

## トラブルシューティング

### 位置情報が取得できない

- ブラウザの位置情報設定を確認してください
- HTTPS環境が必要です（ローカル開発では`localhost`でOK）

### 地図が表示されない

- Google Maps API Keyを`.env.local`に設定してください
- Maps Embed APIが有効化されているか確認してください

### Gemini APIエラー

- APIキーが正しく設定されているか確認してください
- APIの使用制限に達していないか確認してください
- [Google AI Studio](https://aistudio.google.com/) で利用状況を確認できます

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 貢献

プルリクエストを歓迎します！バグ報告や機能リクエストは[Issues](https://github.com/wanifuchi/sougi_finder/issues)でお願いします。

## お問い合わせ

質問や提案がある場合は、[Issues](https://github.com/wanifuchi/sougi_finder/issues)でお知らせください。
