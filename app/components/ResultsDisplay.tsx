import React, { useState } from 'react';
import type { SearchResult } from '../types';
import { ResultCard } from './ResultCard';
import { MapView } from './MapView';
import { AlertTriangleIcon, InfoIcon, ListIcon, MapIcon } from './Icons';

type ViewMode = 'list' | 'map';

interface ResultsDisplayProps {
  isLoading: boolean;
  error: string | null;
  searchResults: SearchResult[];
  hasSearched: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeSearchQuery: string;
  onSelectResult: (result: SearchResult) => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    isLoading, 
    error, 
    searchResults, 
    hasSearched,
    viewMode,
    setViewMode,
    activeSearchQuery,
    onSelectResult,
}) => {
  const [focusedResult, setFocusedResult] = useState<SearchResult | null>(null);

  const handleFocusOnMap = (result: SearchResult) => {
    setFocusedResult(result);
    setViewMode('map');
  };

  const handleResetFocus = () => {
    setFocusedResult(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl shadow-md flex flex-col h-full overflow-hidden">
                      <div className="p-5 flex-grow space-y-4">
                          <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                          <div className="flex items-start gap-3 mt-4">
                              <div className="w-5 h-5 bg-slate-200 rounded flex-shrink-0 mt-0.5"></div>
                              <div className="h-4 bg-slate-200 rounded w-full"></div>
                          </div>
                          <div className="flex items-start gap-3">
                              <div className="w-5 h-5 bg-slate-200 rounded flex-shrink-0 mt-0.5"></div>
                              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                          </div>
                      </div>
                      <div className="p-4 bg-slate-50 border-t border-slate-200 mt-2">
                          <div className="h-5 bg-slate-200 rounded w-1/2 mx-auto"></div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md" role="alert">
        <div className="flex">
          <div className="py-1"><AlertTriangleIcon className="h-6 w-6 text-red-500 mr-4"/></div>
          <div>
            <p className="font-bold text-red-800">エラーが発生しました</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSearched) {
     return (
      <div className="text-center p-10 bg-sky-50 border border-sky-200 rounded-lg">
        <InfoIcon className="w-12 h-12 mx-auto text-sky-500 mb-4" />
        <h3 className="text-xl font-semibold text-sky-800">準備完了</h3>
        <p className="text-slate-600 mt-2">
          お近くの、または指定した地域の葬儀社を検索します。<br />
          位置情報の利用を許可すると、より正確な情報を提供できます。
        </p>
      </div>
    );
  }

  if (searchResults.length === 0) {
    return (
      <div className="text-center p-10 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangleIcon className="w-12 h-12 mx-auto text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold text-amber-800">検索結果が見つかりません</h3>
        <p className="text-slate-600 mt-2">
          条件を変えてもう一度お試しください。
        </p>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-4 flex justify-between items-center border-b border-slate-200">
            <div className="flex -mb-px">
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center justify-center gap-2 py-3 px-5 font-semibold text-sm transition-colors duration-200 ${
                        viewMode === 'list' 
                        ? 'border-b-2 border-sky-500 text-sky-600' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                >
                    <ListIcon className="w-5 h-5" />
                    リスト表示
                </button>
                <button
                    onClick={() => {
                        setViewMode('map');
                        handleResetFocus();
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-5 font-semibold text-sm transition-colors duration-200 ${
                        viewMode === 'map' 
                        ? 'border-b-2 border-sky-500 text-sky-600' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                >
                    <MapIcon className="w-5 h-5" />
                    マップ表示
                </button>
            </div>
            {viewMode === 'map' && focusedResult && (
                <button
                    onClick={handleResetFocus}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    <MapIcon className="w-4 h-4" />
                    <span>エリア全体表示に戻る</span>
                </button>
            )}
        </div>

        {viewMode === 'list' ? (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map((result, index) => (
                        <ResultCard key={index} result={result} onFocusOnMap={handleFocusOnMap} onSelectResult={onSelectResult} />
                    ))}
                </div>
            </div>
        ) : (
            <MapView 
              focusedResult={focusedResult} 
              searchQuery={activeSearchQuery} 
              searchResults={searchResults}
            />
        )}
    </div>
  );
};