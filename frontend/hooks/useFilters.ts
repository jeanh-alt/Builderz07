'use client';

import { useState, useMemo, useCallback } from 'react';
import { Network, NetworkStatus, calculateNetworkStatus, calculateGlobalScore } from '../types';

// Fix for empty edit - adding comment to ensure change
// Updated imports for voice notes integration

// ============================================
// FILTER TYPES
// ============================================

export interface FilterState {
  searchQuery: string;
  selectedRegions: string[];
  selectedStatuses: NetworkStatus[];
  scoreRange: [number, number];
  onlyWithEcheance: boolean;
}

interface UseFiltersProps {
  networks: Network[];
  availableRegions: string[];
}

interface FilteredResults {
  filteredNetworks: Network[];
  activeFilterCount: number;
  hasActiveFilters: boolean;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  selectedRegions: [],
  selectedStatuses: [],
  scoreRange: [0, 1],
  onlyWithEcheance: false,
};

// ============================================
// MAIN HOOK
// ============================================

export function useFilters({ networks, availableRegions }: UseFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Set a single filter
  const setFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle filter panel
  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(prev => !prev);
  }, []);

  // Close filter panel
  const closeFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(false);
  }, []);

  // Open filter panel
  const openFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(true);
  }, []);

  // ============================================
  // FILTER LOGIC
  // ============================================

  const { filteredNetworks, activeFilterCount, hasActiveFilters } = useMemo<FilteredResults>(() => {
    let result = [...networks];
    let count = 0;

    // Search query filter (name, region, department, communes)
    if (filters.searchQuery.trim()) {
      count++;
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(network =>
        network.nom_reseau.toLowerCase().includes(query) ||
        network.region.toLowerCase().includes(query) ||
        network.departement.toLowerCase().includes(query) ||
        network.communes.some(c => c.toLowerCase().includes(query)) ||
        network.gestionnaire.toLowerCase().includes(query)
      );
    }

    // Region filter
    if (filters.selectedRegions.length > 0) {
      count++;
      result = result.filter(network =>
        filters.selectedRegions.includes(network.region)
      );
    }

    // Status filter
    if (filters.selectedStatuses.length > 0) {
      count++;
      result = result.filter(network => {
        const status = calculateNetworkStatus(network);
        return filters.selectedStatuses.includes(status);
      });
    }

    // Score range filter
    if (filters.scoreRange[0] !== 0 || filters.scoreRange[1] !== 1) {
      count++;
      result = result.filter(network => {
        const score = calculateGlobalScore(network);
        return score >= filters.scoreRange[0] && score <= filters.scoreRange[1];
      });
    }

    // Echeance filter
    if (filters.onlyWithEcheance) {
      count++;
      result = result.filter(network => network.echeance !== null && network.echeance !== undefined);
    }

    return {
      filteredNetworks: result,
      activeFilterCount: count,
      hasActiveFilters: count > 0,
    };
  }, [filters, networks]);

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const regions = [...new Set(networks.map(n => n.region))];
    const statuses: NetworkStatus[] = [
      'ENGIE',
      'ENGIE_RENOUVELLEMENT',
      'NON_ENGIE_HIGH',
      'NON_ENGIE_MEDIUM',
      'NON_ENGIE_LOW',
      'UNKNOWN'
    ];
    
    return { regions, statuses };
  }, [networks]);

  // Parse natural language query
  const parseQuery = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    const newFilters: Partial<FilterState> = {};

    // Detect regions
    availableRegions.forEach(region => {
      if (lowerQuery.includes(region.toLowerCase())) {
        newFilters.selectedRegions = [region];
      }
    });

    // Detect score patterns
    const scoreMatch = lowerQuery.match(/score[\s:]*(>=?|<=?|>|<)\s*([\d.]+)/);
    if (scoreMatch) {
      const operator = scoreMatch[1];
      const value = parseFloat(scoreMatch[2]);
      if (operator === '>=' || operator === '>') {
        newFilters.scoreRange = [value, 1];
      } else if (operator === '<=' || operator === '<') {
        newFilters.scoreRange = [0, value];
      }
    }

    // Detect status keywords
    if (lowerQuery.includes('engie')) {
      newFilters.selectedStatuses = ['ENGIE', 'ENGIE_RENOUVELLEMENT'];
    }
    if (lowerQuery.includes('non-engie') || lowerQuery.includes('concurrent')) {
      newFilters.selectedStatuses = ['NON_ENGIE_HIGH', 'NON_ENGIE_MEDIUM', 'NON_ENGIE_LOW'];
    }
    if (lowerQuery.includes('inconnu')) {
      newFilters.selectedStatuses = ['UNKNOWN'];
    }

    return newFilters;
  }, [availableRegions]);

  // Apply natural language query
  const applyNaturalQuery = useCallback((query: string) => {
    const parsedFilters = parseQuery(query);
    updateFilters({
      searchQuery: query,
      ...parsedFilters,
    });
    openFilterPanel();
  }, [parseQuery, updateFilters, openFilterPanel]);

  return {
    // State
    filters,
    isFilterPanelOpen,
    filteredNetworks,
    activeFilterCount,
    hasActiveFilters,
    filterOptions,
    
    // Actions
    updateFilters,
    setFilter,
    resetFilters,
    toggleFilterPanel,
    openFilterPanel,
    closeFilterPanel,
    applyNaturalQuery,
  };
}

export default useFilters;
