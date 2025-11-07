import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { LogoIcon, MapPinIcon } from '../components/Icons';
import type { SearchResult } from '../types';
import { generateFacilitySlug } from '../utils/urlHelpers';

/**
 * 地域別一覧ページ
 * URLパラメータから地域スラッグを取得し、該当地域の施設一覧を表示
 */
type ViewMode = 'list' | 'map';

export const ListPage: React.FC = () => {
  const { region } = useParams<{ region: string }>();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  useEffect(() => {
    // URLスラッグから地域の施設データを取得
    const loadFacilities = () => {
      try {
        // sessionStorageから検索結果を取得
        const cachedResults = sessionStorage.getItem('searchResults');
        const cachedQuery = sessionStorage.getItem('searchQuery');

        if (cachedResults) {
          const results: SearchResult[] = JSON.parse(cachedResults);

          // 地域スラッグに対応する施設を抽出
          // 暫定的な実装: addressに含まれる地域名で絞り込み
          const filteredResults = results.filter(r => {
            const addressSlug = r.address.toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-');
            return addressSlug.includes(region || '');
          });

          setFacilities(filteredResults);
          setRegionName(cachedQuery || '検索結果');
          setHasSearched(true);
        } else {
          // キャッシュがない場合は全結果を表示
          setFacilities([]);
          setRegionName('検索結果');
          setHasSearched(true);
        }
      } catch (e) {
        console.error('Error loading facilities:', e);
        setError('施設情報の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadFacilities();
  }, [region]);

  const handleSelectResult = (result: SearchResult) => {
    // 施設詳細ページへ遷移（urlHelpers.tsを使用）
    const facilitySlug = generateFacilitySlug(result.title, result.placeId);
    navigate(`/detail/${facilitySlug}`);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-sky-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">エラーが発生しました</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={handleBackToHome}
            className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors"
            >
              <LogoIcon className="w-8 h-8" />
              <span className="font-bold text-xl">葬儀社ファインダー</span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <MapPinIcon className="w-5 h-5" />
            <span className="text-sm font-medium">地域</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{regionName}</h1>
          <p className="text-slate-600 mt-2">
            {facilities.length > 0
              ? `${facilities.length}件の施設が見つかりました`
              : 'この地域の施設情報はありません'}
          </p>
        </div>

        {facilities.length > 0 ? (
          <ResultsDisplay
            isLoading={isLoading}
            error={error}
            searchResults={facilities}
            hasSearched={hasSearched}
            viewMode={viewMode}
            setViewMode={setViewMode}
            activeSearchQuery={regionName}
            onSelectResult={handleSelectResult}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MapPinIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">施設が見つかりませんでした</h3>
            <p className="text-slate-600 mb-6">
              この地域に該当する葬儀社が見つかりませんでした。<br />
              別の地域で検索してみてください。
            </p>
            <button
              onClick={handleBackToHome}
              className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
            >
              新しく検索する
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
