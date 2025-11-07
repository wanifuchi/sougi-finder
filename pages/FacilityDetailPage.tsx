import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DetailPage } from '../components/DetailPage';
import type { SearchResult } from '../types';
import {
  generateFacilitySlugAsync,
  loadSearchResults
} from '../utils/urlHelpers';

/**
 * 施設詳細ページ
 * URLパラメータから施設スラッグを取得し、詳細情報を表示
 */
export const FacilityDetailPage: React.FC = () => {
  const { facilitySlug } = useParams<{ facilitySlug: string }>();
  const navigate = useNavigate();
  const [facility, setFacility] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // URLスラッグから施設データを取得
    // 現時点では sessionStorage からキャッシュされた検索結果を取得
    // 将来的にはAPIから直接取得する実装に変更可能
    const loadFacility = async () => {
      try {
        // sessionStorageから検索結果を取得
        const searchData = loadSearchResults();

        if (!searchData) {
          setError('検索結果が見つかりません。検索からやり直してください。');
          setIsLoading(false);
          return;
        }

        const { results } = searchData;

        // スラッグに対応する施設を検索（非同期スラッグ生成で正確に比較）
        let found: SearchResult | undefined;

        for (const result of results) {
          const generatedSlug = await generateFacilitySlugAsync(result.title, result.placeId);
          if (generatedSlug === facilitySlug) {
            found = result;
            break;
          }
        }

        if (found) {
          setFacility(found);
        } else {
          setError('施設情報が見つかりませんでした');
        }
      } catch (e) {
        console.error('Error loading facility:', e);
        setError('施設情報の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadFacility();
  }, [facilitySlug]);

  const handleBackToList = () => {
    navigate(-1); // 前のページに戻る
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

  if (error || !facility) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">施設が見つかりません</h2>
          <p className="text-slate-600 mb-6">{error || '指定された施設情報が見つかりませんでした'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return <DetailPage result={facility} onBack={handleBackToList} />;
};
