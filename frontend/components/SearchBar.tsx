'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';

// ============================================
// INTERFACES
// ============================================

interface SearchBarProps {
  onSearch: (query: string) => void;
  onOpenFilters: () => void;
  filterCount: number;
  placeholder?: string;
}

interface Suggestion {
  type: 'region' | 'status' | 'network';
  value: string;
  label: string;
  icon?: string;
}

// ============================================
// NLP PARSER (Simple regex-based)
// ============================================

const REGIONS_FRANCE = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne',
  'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France',
  'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
  'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'
];

const STATUS_KEYWORDS: Record<string, string> = {
  'engie': 'ENGIE',
  'concurrent': 'NON_ENGIE',
  'inconnu': 'UNKNOWN',
  'opportunité': 'NON_ENGIE',
  'renouvellement': 'ENGIE_RENOUVELLEMENT',
  'fort': 'NON_ENGIE_HIGH',
  'moyen': 'NON_ENGIE_MEDIUM',
  'faible': 'NON_ENGIE_LOW',
};

const SCORE_PATTERNS: Record<string, [number, number]> = {
  'élevé': [0.8, 1],
  'fort': [0.8, 1],
  'haut': [0.8, 1],
  'moyen': [0.6, 0.8],
  'faible': [0, 0.6],
  'bas': [0, 0.6],
  '> 0.8': [0.8, 1],
  '>= 0.8': [0.8, 1],
  '< 0.8': [0, 0.8],
  '> 0.6': [0.6, 1],
  '< 0.6': [0, 0.6],
};

export const parseNaturalQuery = (query: string): {
  regions: string[];
  statuses: string[];
  scoreRange: [number, number] | null;
  searchText: string;
} => {
  const lowerQuery = query.toLowerCase();
  
  const regions: string[] = [];
  const statuses: string[] = [];
  let scoreRange: [number, number] | null = null;
  let searchText = query;

  // Detect regions
  REGIONS_FRANCE.forEach(region => {
    if (lowerQuery.includes(region.toLowerCase())) {
      regions.push(region);
      searchText = searchText.replace(new RegExp(region, 'gi'), '');
    }
  });

  // Detect status keywords
  Object.entries(STATUS_KEYWORDS).forEach(([keyword, status]) => {
    if (lowerQuery.includes(keyword)) {
      statuses.push(status);
      searchText = searchText.replace(new RegExp(keyword, 'gi'), '');
    }
  });

  // Detect score patterns
  Object.entries(SCORE_PATTERNS).forEach(([pattern, range]) => {
    if (lowerQuery.includes(pattern)) {
      scoreRange = range;
      searchText = searchText.replace(new RegExp(pattern, 'gi'), '');
    }
  });

  // Detect numeric score ranges
  const scoreMatch = lowerQuery.match(/score[\s:]*([\d.]+)[\s-]*([\d.]+)/);
  if (scoreMatch) {
    const min = parseFloat(scoreMatch[1]);
    const max = parseFloat(scoreMatch[2]);
    scoreRange = [min, max];
    searchText = searchText.replace(new RegExp(`score[\\s:]*${scoreMatch[1]}[\\s-]*${scoreMatch[2]}`, 'gi'), '');
  }

  // Clean up search text
  searchText = searchText
    .replace(/\b(montre|affiche|trouve|filtre|recherche|avec|qui|ont|sont|les?|des?|un|une|en|de|du|la|le)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    regions,
    statuses,
    scoreRange,
    searchText,
  };
};

// ============================================
// SUGGESTIONS GENERATOR
// ============================================

const generateSuggestions = (query: string, availableRegions: string[]): Suggestion[] => {
  const lowerQuery = query.toLowerCase();
  const suggestions: Suggestion[] = [];

  // Region suggestions
  if (query.length > 1) {
    availableRegions.forEach(region => {
      if (region.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          type: 'region',
          value: region,
          label: region,
          icon: '📍',
        });
      }
    });
  }

  // Status suggestions
  Object.entries(STATUS_KEYWORDS).forEach(([keyword, status]) => {
    if (keyword.includes(lowerQuery) || lowerQuery.includes(keyword)) {
      suggestions.push({
        type: 'status',
        value: status,
        label: keyword,
        icon: '🏷️',
      });
    }
  });

  // Generic suggestions
  if (query.length > 0 && suggestions.length === 0) {
    suggestions.push(
      { type: 'network', value: query, label: `Rechercher "${query}"`, icon: '🔍' }
    );
  }

  return suggestions.slice(0, 5);
};

// ============================================
// MAIN COMPONENT
// ============================================

export function SearchBar({ 
  onSearch, 
  onOpenFilters, 
  filterCount = 0,
  placeholder = "Rechercher un réseau, une région..."
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Generate suggestions
    if (value.length > 0) {
      setSuggestions(generateSuggestions(value, REGIONS_FRANCE));
    } else {
      setSuggestions([]);
    }
  };

  // Handle search submit
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim() === '') {
      onSearch('');
      return;
    }
    
    // Parse natural language
    const parsed = parseNaturalQuery(query);
    
    // For now, just pass the query
    // In the future, we can use the parsed data to set filters directly
    onSearch(query);
    setShowSuggestions(false);
  };

  // Handle suggestion select
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.label);
    setShowSuggestions(false);
    onSearch(suggestion.value);
    inputRef.current?.focus();
  };

  // Handle focus/blur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    // Don't handle if not an arrow key or Enter
    if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return;
    
    e.preventDefault();
    
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }
    
    if (e.key === 'Enter') {
      handleSubmit();
      return;
    }
  };

  // Clear query
  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    onSearch('');
    inputRef.current?.focus();
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="relative" role="search">
        {/* Search Input Container */}
        <div className="relative flex items-center">
          {/* Search Icon */}
          <div className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center text-engie-text-medium">
            <span className="text-lg">🔍</span>
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            onFocus={() => {
              setIsFocused(true);
              if (query.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-14 pr-14 py-3.5 text-engie-text-dark placeholder:text-engie-text-medium bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-engie-primary focus:border-transparent transition-all shadow-sm hover:shadow-md"
            aria-label="Rechercher un réseau, une région ou utiliser une requête en langage naturel"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="search-suggestions"
            autoComplete="off"
          />

          {/* Clear Button (visible when query exists) */}
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-4 z-10 w-8 h-8 flex items-center justify-center text-engie-text-medium hover:text-engie-primary transition-colors rounded-full hover:bg-gray-100"
              aria-label="Effacer la recherche"
              tabIndex={0}
            >
              <span className="text-lg">✕</span>
            </button>
          )}

          {/* Filter Button */}
          <button
            type="button"
            onClick={onOpenFilters}
            className="absolute right-16 z-10 w-10 h-10 flex items-center justify-center text-engie-text-medium hover:text-engie-primary transition-colors rounded-full hover:bg-gray-100"
            aria-label={`Ouvrir les filtres ${filterCount > 0 ? `(${filterCount} actif)` : ''}`}
            tabIndex={0}
          >
            <span className="text-xl">⚙️</span>
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-engie-primary text-white text-xs rounded-full flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul
            id="search-suggestions"
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn"
            role="listbox"
            aria-label="Suggestions de recherche"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.type}-${suggestion.value}-${index}`}
                role="option"
                tabIndex={0}
                onClick={() => handleSuggestionSelect(suggestion)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSuggestionSelect(suggestion);
                }}
                className="px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 last:border-0"
              >
                <span aria-hidden="true">{suggestion.icon}</span>
                <span className="text-sm text-engie-text-dark">{suggestion.label}</span>
                <span className="ml-auto text-xs text-engie-text-medium capitalize">
                  {suggestion.type}
                </span>
              </li>
            ))}
            
            <li className="px-4 py-2 text-xs text-engie-text-medium border-t border-gray-200 mt-2">
              <div className="flex items-center gap-2">
                <span>💡</span>
                <span>Essayez : "Réseaux Engie en Île-de-France" ou "Score > 0.8"</span>
              </div>
            </li>
          </ul>
        )}

        {/* NLP Examples (when focused and no query) */}
        {isFocused && query.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn">
            <div className="px-4 py-2 text-xs text-engie-text-medium">
              <span className="font-medium">Exemples de requêtes :</span>
            </div>
            {[
              'Montre-moi les réseaux Engie en Île-de-France',
              'Quels sont les réseaux avec un score > 0.8 ?',
              'Affiche les réseaux dont l\'échéance est en 2025',
              'Réseaux avec opportunité forte',
            ].map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setQuery(example);
                  handleSubmit();
                }}
                className="w-full px-4 py-2 text-left text-sm text-engie-text-dark hover:bg-gray-50 transition-colors"
                tabIndex={0}
              >
                <span className="text-engie-primary">🔍</span>
                <span className="ml-2">{example}</span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

// ============================================
// ANIMATIONS
// ============================================

const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
`;

// Inject styles if not already injected
if (typeof document !== 'undefined') {
  const styleId = 'search-bar-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}

export default SearchBar;
