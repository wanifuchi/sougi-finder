'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PrefectureData } from '../../utils/data/prefectures';
import regionsDataModule from '../../utils/data/regions.json';
import { LogoIcon, SearchIcon } from '../../components/Icons';
import { searchFuneralHomes } from '../../services/geminiService';
import { saveSearchResults } from '../../utils/urlHelpers';
import { useGeolocation } from '../../hooks/useGeolocation';

const regionsData = (regionsDataModule as any).default || regionsDataModule;

interface RegionData {
  romaji: string;
  type: 'municipality' | 'station' | 'area';
  priority: 1 | 2 | 3 | 4 | 5;
  prefecture?: string;
  lat?: number;
  lon?: number;
  lineIds?: string[];
}

interface PrefecturePageClientProps {
  prefSlug: string;
  prefCode: string;
  prefecture: PrefectureData;
}

/**
 * 都道府県ページのClient Component
 * 市区町村と駅を表示し、クリックで検索ページへ遷移
 */
export function PrefecturePageClient({ prefSlug, prefCode, prefecture }: PrefecturePageClientProps) {
  const router = useRouter();
  const { position } = useGeolocation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // この都道府県に属する市区町村と駅を取得
  const { municipalities, stations } = useMemo(() => {
    const munis: Array<{ name: string; romaji: string; priority: number }> = [];
    const stats: Array<{ name: string; romaji: string; priority: number; lineIds?: string[] }> = [];

    Object.entries(regionsData).forEach(([name, data]) => {
      const regionData = data as RegionData;

      // 都道府県コードが一致するものだけフィルタ
      if (regionData.prefecture === prefCode) {
        if (regionData.type === 'municipality') {
          munis.push({
            name,
            romaji: regionData.romaji,
            priority: regionData.priority,
          });
        } else if (regionData.type === 'station') {
          stats.push({
            name,
            romaji: regionData.romaji,
            priority: regionData.priority,
            lineIds: regionData.lineIds,
          });
        }
      }
    });

    // 優先度順にソート
    munis.sort((a, b) => a.priority - b.priority);
    stats.sort((a, b) => a.priority - b.priority);

    return { municipalities: munis, stations: stats };
  }, [prefCode]);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <LogoIcon className="w-10 h-10 text-slate-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">
              葬儀社ファインダー
            </h1>
          </div>
          <p className="text-slate-500">日本の葬儀社を地図で探す</p>
        </header>

        {/* パンくずリスト */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-slate-600">
            <li>
              <button
                onClick={() => router.push('/')}
                className="hover:text-sky-600 transition-colors"
              >
                ホーム
              </button>
            </li>
            <li className="text-slate-400">/</li>
            <li className="text-slate-800 font-semibold">{prefecture.name}</li>
          </ol>
        </nav>

        <main>
          {/* 都道府県情報カード */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {prefecture.name}の葬儀社
            </h2>
            <p className="text-slate-600">
              {prefecture.name}にある葬儀社を市区町村・駅から検索できます。
            </p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* ローディング表示 */}
          {isLoading && (
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-6 mb-8 flex items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sky-800 font-medium">検索中...</span>
            </div>
          )}

          {/* 市区町村セクション */}
          {municipalities.length > 0 && (
            <section className="mb-8">
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🏙️</span>
                  市区町村から探す
                  <span className="text-sm font-normal text-slate-500">
                    （{municipalities.length}件）
                  </span>
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {municipalities.map((muni) => (
                    <button
                      key={muni.romaji}
                      onClick={() => handleRegionClick(muni.romaji, muni.name)}
                      disabled={isLoading}
                      className="p-3 rounded-lg bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <SearchIcon className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
                        <span className="text-slate-800 font-medium group-hover:text-sky-600">
                          {muni.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 駅セクション */}
          {stations.length > 0 && (
            <section>
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🚉</span>
                  駅から探す
                  <span className="text-sm font-normal text-slate-500">
                    （{stations.length}件）
                  </span>
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {stations.map((station) => (
                    <button
                      key={station.romaji}
                      onClick={() => handleRegionClick(station.romaji, station.name)}
                      disabled={isLoading}
                      className="p-3 rounded-lg bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <SearchIcon className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
                        <span className="text-slate-800 font-medium group-hover:text-sky-600">
                          {station.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* データがない場合 */}
          {municipalities.length === 0 && stations.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-600 text-lg mb-4">
                {prefecture.name}のデータは現在準備中です。
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
              >
                ホームに戻る
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
