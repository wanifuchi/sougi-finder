import type { Metadata, Viewport } from 'next'
import './index.css'

// メタデータベースURL設定(OGP画像などの絶対URLに使用)
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sougifinder.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: '葬儀社ファインダー | 日本の葬儀社を地図で探す',
    template: '%s | 葬儀社ファインダー',
  },
  description: '日本全国の葬儀社を現在地や地名から簡単に検索できます。施設情報、口コミ、詳細情報も確認できます。',
  keywords: ['葬儀社', '葬儀', '家族葬', '葬儀場', '葬儀ホール', '葬儀施設', '日本'],
  authors: [{ name: '葬儀社ファインダー' }],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: baseUrl,
    siteName: '葬儀社ファインダー',
    title: '葬儀社ファインダー | 日本の葬儀社を地図で探す',
    description: '日本全国の葬儀社を現在地や地名から簡単に検索できます。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '葬儀社ファインダー',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '葬儀社ファインダー | 日本の葬儀社を地図で探す',
    description: '日本全国の葬儀社を現在地や地名から簡単に検索できます。',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// Viewport設定を分離(Next.js 16の推奨方式)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-800">{children}</body>
    </html>
  )
}
