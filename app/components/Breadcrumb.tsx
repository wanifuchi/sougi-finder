'use client';

import Link from 'next/link';
import { BreadcrumbSchema } from './StructuredData';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * パンくずリストコンポーネント
 * SEO対応のパンくずナビゲーションを提供
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  // ホームを先頭に追加
  const fullItems: BreadcrumbItem[] = [
    { name: 'ホーム', url: '/' },
    ...items,
  ];

  return (
    <>
      {/* JSON-LD構造化データ */}
      <BreadcrumbSchema items={fullItems} />

      {/* 視覚的なパンくずリスト */}
      <nav aria-label="パンくずリスト" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          {fullItems.map((item, index) => {
            const isLast = index === fullItems.length - 1;

            return (
              <li key={item.url} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-slate-400" aria-hidden="true">
                    /
                  </span>
                )}
                {isLast ? (
                  <span className="text-slate-700 font-medium" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.url}
                    className="text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
