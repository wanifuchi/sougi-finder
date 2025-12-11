import React from 'react';
import { SearchIcon } from './Icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onSearch, isLoading }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Check if the key is Enter and if an IME composition is not in progress.
    // This prevents the search from firing when a user is finalizing a character conversion.
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      onSearch();
    }
  };
  
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 東京都新宿区の葬儀社"
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200 text-lg"
          disabled={isLoading}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
           <SearchIcon className="w-5 h-5 text-slate-400"/>
        </div>
      </div>
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="w-full sm:w-auto px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200 text-lg flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            検索中...
          </>
        ) : (
          '検索'
        )}
      </button>
    </div>
  );
};