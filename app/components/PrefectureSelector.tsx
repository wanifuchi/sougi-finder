'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { REGIONS, PREFECTURES, type RegionBlockData, type PrefectureData } from '../utils/data/prefectures';
import regionsDataModule from '../utils/data/regions.json';

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

/**
 * 都道府県選択UIコンポーネント
 * 8地方区分 → 47都道府県 の2段階選択
 */
export const PrefectureSelector: React.FC = () => {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState<RegionBlockData | null>(null);

  // 各都道府県の施設数をカウント
  const prefectureCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    Object.entries(regionsData).forEach(([_, data]) => {
      const regionData = data as RegionData;
      if (regionData.prefecture) {
        counts[regionData.prefecture] = (counts[regionData.prefecture] || 0) + 1;
      }
    });

    return counts;
  }, []);

  const handleRegionClick = (region: RegionBlockData) => {
    setSelectedRegion(region);
  };

  const handlePrefectureClick = (prefecture: PrefectureData) => {
    // /prefecture/{romaji} へ遷移
    router.push(`/prefecture/${prefecture.romaji}`);
  };

  const handleBack = () => {
    setSelectedRegion(null);
  };

  return (
    <div className="w-full">
      {!selectedRegion ? (
        /* 地方区分選択 */
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 text-center mb-6">
            地方を選択してください
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {REGIONS.map((region) => {
              // この地方の総施設数を計算
              const totalCount = region.prefCodes.reduce(
                (sum, code) => sum + (prefectureCounts[code] || 0),
                0
              );

              return (
                <button
                  key={region.id}
                  onClick={() => handleRegionClick(region)}
                  className={`
                    relative p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-200
                    transform hover:scale-105 bg-gradient-to-br ${region.color}
                    text-white font-semibold
                  `}
                >
                  <div className="text-4xl mb-2">{region.icon}</div>
                  <div className="text-lg">{region.name}</div>
                  <div className="text-sm opacity-90 mt-1">
                    {totalCount}件の施設
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* 都道府県選択 */
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              地方選択に戻る
            </button>
          </div>

          <h2 className="text-xl font-bold text-slate-800 text-center mb-6">
            <span className="text-2xl mr-2">{selectedRegion.icon}</span>
            {selectedRegion.name}の都道府県を選択してください
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedRegion.prefCodes.map((prefCode) => {
              const prefecture = PREFECTURES[prefCode];
              const count = prefectureCounts[prefCode] || 0;

              if (!prefecture) return null;

              return (
                <button
                  key={prefCode}
                  onClick={() => handlePrefectureClick(prefecture)}
                  disabled={count === 0}
                  className={`
                    p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                    ${
                      count > 0
                        ? 'bg-white hover:bg-sky-50 text-slate-800 hover:scale-105'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="font-semibold text-lg">{prefecture.name}</div>
                  <div className="text-sm mt-1">
                    {count > 0 ? (
                      <span className="text-sky-600">{count}件</span>
                    ) : (
                      <span className="text-slate-400">データなし</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
