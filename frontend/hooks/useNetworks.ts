'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getNetworksWithCoords,
  getFrenchRegions,
  getNetworksByRegion,
  searchNetworks,
  fetchNetworksByStatus,
  fetchNetworksByMinScore,
  invalidateCache,
} from '../lib/supabaseQueries';
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
 * Utilise un cache global et des requêtes Supabase
 */
export function useNetworks() {
  const [data, setData] = useState<NetworksData>({
    networks: [],
    regions: [],
    isLoading: true,
    error: null,
  });

  // Charge les données initiales
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [networks, regions] = await Promise.all([
          getNetworksWithCoords(),
          getFrenchRegions(),
        ]);

        setData({
          networks,
          regions,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setData({
          networks: [],
          regions: [],
          isLoading: false,
          error: 'Échec du chargement des données',
        });
      }
    }

    loadInitialData();
  }, []);

  // Filtre les réseaux par région
  const networksByRegion = useCallback(
    (regionName: string | null) => {
      if (!regionName) return data.networks;
      return data.networks.filter(n => n.region === regionName);
    },
    [data.networks]
  );

  // Filtre les réseaux par statut
  const networksByStatus = useCallback(
    (status: string | null) => {
      if (!status) return data.networks;
      // Calcul du statut côté client pour l'instant
      return data.networks.filter(n => {
        const calculatedStatus = n.titulaire_est_engie === 'ENGIE' ? 
          (n.echeance ? new Date(n.echeance) <= new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) ? 'ENGIE_RENOUVELLEMENT' : 'ENGIE') :
          'NON_ENGIE';
        return calculatedStatus === status;
      });
    },
    [data.networks]
  );

  // Filtre les réseaux par score minimum
  const networksByMinScore = useCallback(
    (minScore: number | null) => {
      if (minScore === null) return data.networks;
      return data.networks.filter(n => {
        const score = (
          (n.score_echeance || 0) * 0.4 +
          (n.score_taille || 0) * 0.3 +
          Math.min((n.boamp_montant || 0) / 50000000, 1) * 0.2 +
          (n.score_concurrence || 0) * 0.1
        );
        return score >= minScore;
      });
    },
    [data.networks]
  );

  // Recherche par nom
  const searchByName = useCallback(
    (query: string) => {
      if (!query) return data.networks;
      return data.networks.filter(n =>
        n.nom_reseau.toLowerCase().includes(query.toLowerCase())
      );
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
        result = result.filter(n => n.region === filters.region);
      }

      if (filters.status) {
        result = result.filter(n => {
          const calculatedStatus = n.titulaire_est_engie === 'ENGIE' ? 
            (n.echeance ? new Date(n.echeance) <= new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) ? 'ENGIE_RENOUVELLEMENT' : 'ENGIE') :
            'NON_ENGIE';
          return calculatedStatus === filters.status;
        });
      }

      if (filters.minScore !== undefined) {
        result = result.filter(n => {
          const score = (
            (n.score_echeance || 0) * 0.4 +
            (n.score_taille || 0) * 0.3 +
            Math.min((n.boamp_montant || 0) / 50000000, 1) * 0.2 +
            (n.score_concurrence || 0) * 0.1
          );
          return score >= (filters.minScore || 0);
        });
      }

      if (filters.search) {
        result = result.filter(n =>
          n.nom_reseau.toLowerCase().includes((filters.search || '').toLowerCase())
        );
      }

      return result;
    },
    [data.networks]
  );

  // Invalide le cache et recharge
  const refreshData = useCallback(async () => {
    invalidateCache();
    try {
      const [networks, regions] = await Promise.all([
        getNetworksWithCoords(),
        getFrenchRegions(),
      ]);

      setData(prev => ({
        ...prev,
        networks,
        regions,
        isLoading: false,
      }));
    } catch (err) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Échec du rechargement des données',
      }));
    }
  }, []);

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
    refreshData,
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
        const data = await getNetworksWithCoords();
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
        const data = await getFrenchRegions();
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
