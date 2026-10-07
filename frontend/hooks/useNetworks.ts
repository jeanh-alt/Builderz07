'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchNetworksFromJSON,
  fetchRegionsFromJSON,
  filterNetworksByRegion,
  filterNetworksByStatus,
  filterNetworksByMinScore,
  searchNetworksByName,
} from '../lib/jsonLoader';
import type { Network, Region } from '../types';

// ============================================
// TYPES
// ============================================

interface NetworksData {
  networks: Network[];
  regions: Region[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook personnalisé pour gérer le chargement des réseaux et régions
 * depuis les fichiers JSON locaux
 */
export function useNetworks() {
  const [data, setData] = useState<NetworksData>({
    networks: [],
    regions: [],
    isLoading: true,
    error: null,
  });

  // Charge les données initiales depuis le JSON
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [networks, regions] = await Promise.all([
          fetchNetworksFromJSON(),
          fetchRegionsFromJSON(),
        ]);

        // Si on n'a pas de réseaux, on tente de retourner un message d'erreur
        if (networks.length === 0) {
          setData({
            networks: [],
            regions: [],
            isLoading: false,
            error: 'Aucun réseau trouvé dans le fichier JSON',
          });
          return;
        }

        setData({
          networks,
          regions,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        console.error('Erreur lors du chargement des données JSON:', err);
        setData({
          networks: [],
          regions: [],
          isLoading: false,
          error: `Échec du chargement des données: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    loadInitialData();
  }, []);

  // Filtre les réseaux par région
  const networksByRegion = useCallback(
    (regionName: string | null) => {
      return filterNetworksByRegion(data.networks, regionName);
    },
    [data.networks]
  );

  // Filtre les réseaux par statut
  const networksByStatus = useCallback(
    (status: string | null) => {
      return filterNetworksByStatus(data.networks, status);
    },
    [data.networks]
  );

  // Filtre les réseaux par score minimum
  const networksByMinScore = useCallback(
    (minScore: number | null) => {
      return filterNetworksByMinScore(data.networks, minScore);
    },
    [data.networks]
  );

  // Recherche par nom
  const searchByName = useCallback(
    (query: string) => {
      return searchNetworksByName(data.networks, query);
    },
    [data.networks]
  );

  // Filtre combiné (région + statut + score + recherche)
  const filteredNetworks = useCallback(
    (filters: {
      region?: string | null;
      status?: string | null;
      minScore?: number | null;
      search?: string | null;
    }) => {
      let result = [...data.networks];

      if (filters.region) {
        result = filterNetworksByRegion(result, filters.region);
      }

      if (filters.status) {
        result = filterNetworksByStatus(result, filters.status);
      }

      if (filters.minScore !== undefined) {
        result = filterNetworksByMinScore(result, filters.minScore);
      }

      if (filters.search) {
        result = searchNetworksByName(result, filters.search);
      }

      return result;
    },
    [data.networks]
  );

  // Récupère une région par son nom
  const getRegion = useCallback(
    (nom: string) => {
      return data.regions.find(r => r.nom === nom) || null;
    },
    [data.regions]
  );

  return {
    ...data,
    networksByRegion,
    networksByStatus,
    networksByMinScore,
    searchByName,
    filteredNetworks,
    getRegion,
  };
}

// ============================================
// HOOK SIMPLE POUR LES RÉSEAUX UNIQUEMENT
// ============================================

/**
 * Hook pour récupérer uniquement les réseaux
 */
export function useSimpleNetworks() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNetworks() {
      try {
        const data = await fetchNetworksFromJSON();
        setNetworks(data);
      } catch (err) {
        setError('Échec du chargement des réseaux');
      } finally {
        setIsLoading(false);
      }
    }

    loadNetworks();
  }, []);

  return { networks, isLoading, error };
}

// ============================================
// HOOK POUR LES RÉGIONS UNIQUEMENT
// ============================================

/**
 * Hook pour récupérer uniquement les régions
 */
export function useRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRegions() {
      try {
        const data = await fetchRegionsFromJSON();
        setRegions(data);
      } catch (err) {
        setError('Échec du chargement des régions');
      } finally {
        setIsLoading(false);
      }
    }

    loadRegions();
  }, []);

  return { regions, isLoading, error };
}
