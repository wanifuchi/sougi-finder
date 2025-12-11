import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { LogoIcon, MapPinIcon } from '../components/Icons';
import type { SearchResult } from '../types';
import {
  generateFacilitySlugAsync,
  loadSearchResults
} from '../utils/urlHelpers';

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
        const searchData = loadSearchResults();

        if (!searchData) {
          // キャッシュがない場合はホームへリダイレクト
          setError('検索結果が見つかりません。検索からやり直してください。');
          setIsLoading(false);
          return;
        }

        const { results, query, isCurrentLocation } = searchData;

        if (region === 'current') {
          // 現在地検索の結果
          if (!isCurrentLocation) {
            // current URLなのに現在地検索でない場合は全結果を表示
            setFacilities(results);
            setRegionName(query);
          } else {
            // 現在地検索の結果をそのまま表示
            setFacilities(results);
            setRegionName('現在地周辺の葬儀社');
          }
        } else {
          // 地名検索の結果 - 全結果を表示（すでに地域で絞り込まれている）
          setFacilities(results);
          setRegionName(query);
        }

        setHasSearched(true);
      } catch (e) {
        console.error('Error loading facilities:', e);
        setError('施設情報の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadFacilities();
  }, [region]);

  const handleSelectResult = async (result: SearchResult) => {
    // 施設詳細ページへ遷移（非同期版スラッグ生成を使用）
    const facilitySlug = await generateFacilitySlugAsync(result.title, result.placeId);
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <LogoIcon className="w-10 h-10 text-slate-600" />
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">
                葬儀社ファインダー
              </h1>
            </button>
          </div>
          <p className="text-slate-500">日本の葬儀社を地図で探す</p>
          <button
            onClick={handleBackToHome}
            className="text-sm text-sky-600 hover:text-sky-700 underline mt-2 transition-colors"
          >
            ← TOPに戻る
          </button>
        </header>

        {/* メインコンテンツ */}
        <main>
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-500 mb-2">
              <MapPinIcon className="w-5 h-5" />
              <span className="text-sm font-medium">地域</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">{regionName}</h2>
            <p className="text-slate-600">
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
    </div>
  );
};
