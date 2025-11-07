// ===== React Router実装（有効化）=====
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SearchPage } from './pages/SearchPage';
import { ListPage } from './pages/ListPage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';

/**
 * メインアプリケーションコンポーネント
 * React Routerを使用してページ間のルーティングを管理
 */
const App: React.FC = () => {
  return (
    <Routes>
      {/* ホーム - 検索ページ */}
      <Route path="/" element={<SearchPage />} />

      {/* 地域別一覧ページ */}
      <Route path="/list/:region" element={<ListPage />} />

      {/* 施設詳細ページ */}
      <Route path="/detail/:facilitySlug" element={<FacilityDetailPage />} />

      {/* 404 Not Found - ホームにリダイレクト */}
      <Route path="*" element={<SearchPage />} />
    </Routes>
  );
};

export default App;

// ===== 過去の単一ページ実装（コメントアウト・保存中）=====
/*
import React, { useState, useCallback } from 'react';
import type { SearchResult } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { searchFuneralHomes } from './services/geminiService';
import { SearchBar } from './components/SearchBar';
import { ResultsDisplay } from './components/ResultsDisplay';
import { DetailPage } from './components/DetailPage';
import { LogoIcon, CompassIcon, AlertTriangleIcon, MapPinIcon, SearchIcon } from './components/Icons';

type SearchTab = 'nearby' | 'manual';
type ViewMode = 'list' | 'map';

const App: React.FC = () => {
  const [manualQuery, setManualQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('nearby');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);


  const { position, error: geoError, loading: geoLoading } = useGeolocation();

  const performSearch = useCallback(async (searchQuery: string, searchPosition: typeof position) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchResults([]);
    setActiveSearchQuery(searchQuery);
    setViewMode('list'); // Reset to list view on new search
    setSelectedResult(null); // Reset selected result on new search

    try {
      const places = await searchFuneralHomes(searchQuery, searchPosition);
      setSearchResults(places);
    } catch (e) {
      console.error(e);
      setError('検索中にエラーが発生しました。しばらくしてからもう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNearbySearch = useCallback(() => {
    if (geoError || !position) {
      setError('位置情報の取得に失敗しました。ブラウザの設定を確認し、再度お試しください。');
      return;
    }
    performSearch('近くの葬儀社', position);
  }, [position, geoError, performSearch]);

  const handleManualSearch = useCallback(() => {
    if (!manualQuery.trim()) {
      setError('検索キーワードを入力してください。');
      return;
    }
    performSearch(manualQuery, position); // Pass position for context if available
  }, [manualQuery, position, performSearch]);

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result);
  };

  const handleBackToList = () => {
    setSelectedResult(null);
  };


  const renderNearbyTabContent = () => (
    <div className="flex flex-col items-center text-center">
      {geoLoading && (
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <CompassIcon className="w-5 h-5 animate-spin" />
          <span>位置情報を取得中...</span>
        </div>
      )}
      {geoError && (
         <div className="flex items-center gap-2 mb-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-md w-full">
          <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
          <span>位置情報が取得できませんでした。手動検索をお試しください。</span>
        </div>
      )}
       <p className="text-slate-600 mb-6">
        現在地周辺の葬儀社を検索します。<br/>
        最高の検索結果を得るために、ブラウザの位置情報へのアクセスを許可してください。
      </p>
      <button
        onClick={handleNearbySearch}
        disabled={isLoading || geoLoading || !!geoError}
        className="w-full sm:w-auto px-8 py-4 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 text-lg flex items-center justify-center gap-3"
      >
        {isLoading && activeTab === 'nearby' ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>検索中...</span>
          </>
        ) : (
          <>
            <MapPinIcon className="w-6 h-6" />
            <span>現在地から探す</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <LogoIcon className="w-10 h-10 text-slate-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">
              葬儀社ファインダー
            </h1>
          </div>
          <p className="text-slate-500">日本の葬儀社を地図で探す</p>
        </header>

        <main>
          {!selectedResult && (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 sticky top-4 z-10 mb-8">
               <div className="flex border-b border-slate-200">
                  <button
                      onClick={() => setActiveTab('nearby')}
                      className={`flex-1 py-4 px-2 text-center font-semibold flex items-center justify-center gap-2 transition-colors duration-200 ${
                          activeTab === 'nearby' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                  >
                      <MapPinIcon className="w-5 h-5"/>
                      現在地から検索
                  </button>
                   <button
                      onClick={() => setActiveTab('manual')}
                      className={`flex-1 py-4 px-2 text-center font-semibold flex items-center justify-center gap-2 transition-colors duration-200 ${
                          activeTab === 'manual' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                  >
                      <SearchIcon className="w-5 h-5"/>
                      地名・キーワードで検索
                  </button>
              </div>
              <div className="p-6">
                  {activeTab === 'nearby' ? renderNearbyTabContent() : (
                      <SearchBar
                          value={manualQuery}
                          onChange={setManualQuery}
                          onSearch={handleManualSearch}
                          isLoading={isLoading}
                      />
                  )}
              </div>
            </div>
          )}

          {selectedResult ? (
            <DetailPage result={selectedResult} onBack={handleBackToList} />
          ) : (
            <ResultsDisplay
              isLoading={isLoading}
              error={error}
              searchResults={searchResults}
              hasSearched={hasSearched}
              viewMode={viewMode}
              setViewMode={setViewMode}
              activeSearchQuery={activeSearchQuery}
              onSelectResult={handleSelectResult}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
*/
