'use client';

import { useState, useEffect, useCallback } from 'react';
import { NetworkStatus } from '../types';

// ============================================
// INTERFACES
// ============================================

interface FilterValues {
  searchQuery: string;
  selectedRegions: string[];
  selectedStatuses: NetworkStatus[];
  scoreRange: [number, number];
  onlyWithEcheance: boolean;
}

interface FilterPanelProps {
  availableRegions: string[];
  onFilterChange: (filters: FilterValues) => void;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// CONSTANTS - Fluid Design System Engie
// ============================================

const STATUS_FILTERS: { value: NetworkStatus; label: string; color: string; icon: string }[] = [
  { value: 'ENGIE', label: 'Géré par Engie', color: '#00A86B', icon: '✓' },
  { value: 'ENGIE_RENOUVELLEMENT', label: 'Engie < 2 ans', color: '#4CAF50', icon: '⏰' },
  { value: 'NON_ENGIE_HIGH', label: 'Opportunité forte (≥0.8)', color: '#E53935', icon: '⭐⭐⭐' },
  { value: 'NON_ENGIE_MEDIUM', label: 'Opportunité moyenne (0.6-0.8)', color: '#FF9800', icon: '⭐⭐' },
  { value: 'NON_ENGIE_LOW', label: 'Opportunité basse (<0.6)', color: '#D32F2F', icon: '⭐' },
  { value: 'UNKNOWN', label: 'Statut inconnu', color: '#9E9E9E', icon: '?' },
];

const DEFAULT_FILTERS: FilterValues = {
  searchQuery: '',
  selectedRegions: [],
  selectedStatuses: [],
  scoreRange: [0, 1],
  onlyWithEcheance: false,
};

// ============================================
// ACCESSIBILITY UTILITIES
// ============================================

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// MAIN COMPONENT
// ============================================

export function FilterPanel({ availableRegions, onFilterChange, isOpen, onClose }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setIsRegionDropdownOpen(false);
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply filters with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setIsAdvancedOpen(false);
  }, []);

  // Handle filter changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, searchQuery: e.target.value });
  };

  const handleRegionToggle = (region: string) => {
    setFilters({
      ...filters,
      selectedRegions: filters.selectedRegions.includes(region)
        ? filters.selectedRegions.filter(r => r !== region)
        : [...filters.selectedRegions, region],
    });
  };

  const handleStatusToggle = (status: NetworkStatus) => {
    setFilters({
      ...filters,
      selectedStatuses: filters.selectedStatuses.includes(status)
        ? filters.selectedStatuses.filter(s => s !== status)
        : [...filters.selectedStatuses, status],
    });
  };

  const handleScoreChange = (newRange: [number, number]) => {
    setFilters({ ...filters, scoreRange: newRange });
  };

  const handleEcheanceToggle = () => {
    setFilters({ ...filters, onlyWithEcheance: !filters.onlyWithEcheance });
  };

  // Count selected filters for badge
  const selectedCount = (
    filters.selectedRegions.length +
    filters.selectedStatuses.length +
    (filters.searchQuery ? 1 : 0) +
    (filters.scoreRange[0] !== 0 || filters.scoreRange[1] !== 1 ? 1 : 0) +
    (filters.onlyWithEcheance ? 1 : 0)
  );

  // Check if any filter is active
  const hasActiveFilters = selectedCount > 0;

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Filter Panel */}
      <aside
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform translate-x-0 transition-transform duration-300 ease-in-out"
        aria-label="Panneau de filtres"
        role="complementary"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-engie-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">🔍</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-engie-text-dark">Filtres</h2>
              <p className="text-sm text-engie-text-medium">Affiner les résultats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-engie-text-dark hover:text-engie-primary"
            aria-label="Fermer le panneau de filtres"
            onKeyDown={(e) => handleKeyDown(e, onClose)}
            tabIndex={0}
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[calc(100%-160px)] overflow-y-auto">
          
          {/* Search Input */}
          <div className="space-y-2">
            <label htmlFor="search-input" className="block text-sm font-medium text-engie-text-dark">
              Rechercher un réseau
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-engie-text-medium">🔍</span>
              <input
                id="search-input"
                type="search"
                placeholder="Ex: Réseau de Nantes, Île-de-France..."
                value={filters.searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-engie-primary focus:border-transparent transition-all"
                aria-label="Rechercher un réseau par nom, région ou département"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Region Filter */}
          <div className="space-y-2 dropdown-container">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}>
              <label className="block text-sm font-medium text-engie-text-dark">
                Régions
              </label>
              {filters.selectedRegions.length > 0 && (
                <span className="px-2 py-1 bg-engie-primary-light text-engie-primary text-xs rounded-full font-medium">
                  {filters.selectedRegions.length}
                </span>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-engie-primary transition-colors"
              aria-expanded={isRegionDropdownOpen}
              aria-controls="region-dropdown"
              onKeyDown={(e) => handleKeyDown(e, () => setIsRegionDropdownOpen(!isRegionDropdownOpen))}
              tabIndex={0}
            >
              <span className={filters.selectedRegions.length > 0 ? "text-engie-text-dark" : "text-engie-text-medium"}>
                {filters.selectedRegions.length > 0 
                  ? `${filters.selectedRegions.length} région(s) sélectionnée(s)`
                  : "Toutes les régions"
                }
              </span>
              <span className={`transform transition-transform ${isRegionDropdownOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {isRegionDropdownOpen && (
              <div
                id="region-dropdown"
                className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn"
                role="region"
                aria-label="Sélectionner des régions"
              >
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableRegions.sort().map((region) => (
                    <label key={region} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.selectedRegions.includes(region)}
                        onChange={() => handleRegionToggle(region)}
                        className="w-5 h-5 rounded border-gray-300 text-engie-primary focus:ring-engie-primary focus:ring-2"
                        aria-label={`Filtrer par la région ${region}`}
                      />
                      <span className="text-sm text-engie-text-dark group-hover:text-engie-primary transition-colors">
                        {region}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="space-y-2 dropdown-container">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}>
              <label className="block text-sm font-medium text-engie-text-dark">
                Statut du réseau
              </label>
              {filters.selectedStatuses.length > 0 && (
                <span className="px-2 py-1 bg-engie-primary-light text-engie-primary text-xs rounded-full font-medium">
                  {filters.selectedStatuses.length}
                </span>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-engie-primary transition-colors"
              aria-expanded={isStatusDropdownOpen}
              aria-controls="status-dropdown"
              onKeyDown={(e) => handleKeyDown(e, () => setIsStatusDropdownOpen(!isStatusDropdownOpen))}
              tabIndex={0}
            >
              <span className={filters.selectedStatuses.length > 0 ? "text-engie-text-dark" : "text-engie-text-medium"}>
                {filters.selectedStatuses.length > 0 
                  ? `${filters.selectedStatuses.length} statut(s) sélectionné(s)`
                  : "Tous les statuts"
                }
              </span>
              <span className={`transform transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {isStatusDropdownOpen && (
              <div
                id="status-dropdown"
                className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn"
                role="region"
                aria-label="Sélectionner des statuts"
              >
                <div className="space-y-2">
                  {STATUS_FILTERS.map((status) => (
                    <label key={status.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.selectedStatuses.includes(status.value)}
                        onChange={() => handleStatusToggle(status.value)}
                        className="w-5 h-5 rounded border-gray-300 text-engie-primary focus:ring-engie-primary focus:ring-2"
                        aria-label={`Filtrer par le statut ${status.label}`}
                      />
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                          aria-hidden="true"
                        />
                        <span className="text-sm text-engie-text-dark group-hover:text-engie-primary transition-colors">
                          {status.label}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full flex items-center justify-between p-3 text-engie-primary hover:bg-gray-50 rounded-lg transition-colors"
            aria-expanded={isAdvancedOpen}
            aria-controls="advanced-filters"
            onKeyDown={(e) => handleKeyDown(e, () => setIsAdvancedOpen(!isAdvancedOpen))}
            tabIndex={0}
          >
            <span className="font-medium">Filtres avancés</span>
            <span className={`transform transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {/* Advanced Filters */}
          <div 
            id="advanced-filters"
            className={`space-y-4 overflow-hidden transition-all duration-300 ${isAdvancedOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
          >
            {/* Score Range */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label htmlFor="score-min" className="block text-sm font-medium text-engie-text-dark">
                  Score d'opportunité
                </label>
                <span className="text-xs text-engie-text-medium">
                  ({filters.scoreRange[0].toFixed(1)} - {filters.scoreRange[1].toFixed(1)})
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={filters.scoreRange[0]}
                  onChange={(e) => handleScoreChange([parseFloat(e.target.value), filters.scoreRange[1]])}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  aria-label="Score minimum"
                  id="score-min"
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={filters.scoreRange[1]}
                  onChange={(e) => handleScoreChange([filters.scoreRange[0], parseFloat(e.target.value)])}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer absolute top-0"
                  aria-label="Score maximum"
                  id="score-max"
                />
              </div>
              
              <div className="flex justify-between text-xs text-engie-text-medium">
                <span>0.0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>

            {/* Echeance Filter */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.onlyWithEcheance}
                onChange={handleEcheanceToggle}
                className="w-5 h-5 rounded border-gray-300 text-engie-primary focus:ring-engie-primary focus:ring-2"
              />
              <span className="text-sm text-engie-text-dark">
                Uniquement les réseaux avec échéance connue
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 py-3 px-4 border-2 border-engie-primary text-engie-primary font-semibold rounded-lg hover:bg-engie-primary-light transition-colors"
                aria-label="Réinitialiser tous les filtres"
                tabIndex={0}
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-engie-primary text-white font-semibold rounded-lg hover:bg-engie-primary-dark transition-colors"
                aria-label="Appliquer les filtres et fermer"
                tabIndex={0}
              >
                Appliquer ({selectedCount})
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  onClose();
                }}
                className="w-full py-2 text-sm text-engie-primary hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Effacer tous les filtres"
                tabIndex={0}
              >
                ✕ Effacer tous les filtres
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
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

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

export default FilterPanel;
