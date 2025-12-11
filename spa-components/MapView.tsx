import React from 'react';
import type { SearchResult } from '../types';

interface MapViewProps {
  focusedResult: SearchResult | null;
  searchQuery: string;
  searchResults: SearchResult[];
}

export const MapView: React.FC<MapViewProps> = ({ focusedResult, searchQuery, searchResults }) => {
  const getQuery = () => {
    // If a specific result is focused, show that single location accurately.
    if (focusedResult) {
      return focusedResult.address
        ? `${focusedResult.title}, ${focusedResult.address}`
        : focusedResult.title;
    }

    // For the general map view, create a query with all result titles.
    // This avoids overly long and complex queries with addresses that might fail.
    // Using just titles is more robust for the Google Maps Embed API.
    if (searchResults.length > 0) {
      const queryParts = searchResults.map(result => `"${result.title}"`);
      return queryParts.join(' OR ');
    }
    
    // Fallback for initial load or if results are empty for some reason.
    return searchQuery.includes('葬儀') ? searchQuery : `${searchQuery} 葬儀社`;
  };

  const query = getQuery();
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=ja&z=14&output=embed${mapsApiKey ? `&key=${mapsApiKey}` : ''}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="aspect-w-16 aspect-h-9" style={{ height: '60vh', minHeight: '400px' }}>
            <iframe
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map of ${query}`}
            ></iframe>
        </div>
    </div>
  );
};
