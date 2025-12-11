/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 画像最適化設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'maps.gstatic.com',
      },
    ],
    unoptimized: true, // Vercel 外部ドメインの場合
  },

  // 実験的機能
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // TypeScript設定
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
