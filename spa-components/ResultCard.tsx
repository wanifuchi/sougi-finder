import React from 'react';
import type { SearchResult } from '../types';
import { BuildingOfficeIcon, PhoneIcon, MapIcon, InfoIcon } from './Icons';
import { StarRating } from './StarRating';
import { getFirstPhotoUrl } from '../app/utils/photoUrl';

interface ResultCardProps {
  result: SearchResult;
  onFocusOnMap: (result: SearchResult) => void;
  onSelectResult: (result: SearchResult) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onFocusOnMap, onSelectResult }) => {
  const mapQuery = result.address ? `${result.title}, ${result.address}` : result.title;
  const photoUrl = getFirstPhotoUrl(result);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full overflow-hidden">
      <div className="aspect-w-16 aspect-h-9 border-b border-slate-200 bg-slate-100" style={{ height: '150px' }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={result.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // 写真の読み込みに失敗した場合は地図にフォールバック
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const iframe = document.createElement('iframe');
                iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=m&z=15&output=embed&iwloc=near`;
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.style.border = '0';
                iframe.loading = 'lazy';
                iframe.referrerPolicy = 'no-referrer-when-downgrade';
                iframe.title = `Map of ${result.title}`;
                iframe.className = 'w-full h-full';
                parent.appendChild(iframe);
              }
            }}
          />
        ) : (
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=m&z=15&output=embed&iwloc=near`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map of ${result.title}`}
            className="w-full h-full"
          ></iframe>
        )}
      </div>
      <div className="p-5 flex-grow flex flex-col space-y-3">
        <h3 className="text-lg font-bold text-slate-800 leading-tight">
          {result.title}
        </h3>
        {result.address && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <BuildingOfficeIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{result.address}</span>
          </div>
        )}
        {result.phone && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <PhoneIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <a href={`tel:${result.phone}`} className="hover:underline hover:text-sky-600 transition-colors">
              {result.phone}
            </a>
          </div>
        )}
      </div>
      
      {typeof result.rating === 'number' && typeof result.reviewCount === 'number' && result.reviewCount > 0 && (
        <div className="px-5 pb-4 flex items-center gap-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
          <StarRating rating={result.rating} />
          <span className="font-semibold text-slate-800">{result.rating.toFixed(1)}</span>
          <span className="text-slate-500">({result.reviewCount}件)</span>
        </div>
      )}

      <div className="p-0 bg-slate-50 border-t border-slate-200 grid grid-cols-2 divide-x divide-slate-200 mt-auto">
        <button
          onClick={() => onFocusOnMap(result)}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-800 hover:bg-slate-100 transition-colors duration-200 px-2 py-3"
        >
          <MapIcon className="w-4 h-4" />
          <span>地図で表示</span>
        </button>
        <button
          onClick={() => onSelectResult(result)}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-800 hover:bg-slate-100 transition-colors duration-200 px-2 py-3"
        >
          <InfoIcon className="w-4 h-4" />
          <span>詳細を見る</span>
        </button>
      </div>
    </div>
  );
};
