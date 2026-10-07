import { supabase } from './supabaseClient';
import type { Network, Region } from '../types';

// ============================================
// TYPES POUR LES RETOURS SUPABASE
// ============================================

interface ReseauRow {
  id: string;
  identifiant_reseau: string;
  nom_reseau: string;
  communes: string[];
  departement: string;
  region: string;
  mo: string | null;
  gestionnaire: string | null;
  annee_creation: number | null;
  longueur_reseau: number | null;
  nb_pdl: number | null;
  taux_enr_r: number | null;
  echeance: string | null;
  confiance: string | null;
  titulaire_est_engie: string | null;
  boamp_montant: number | null;
  score_echeance: number | null;
  score_taille: number | null;
  score_concurrence: number | null;
  score_opportunite: number | null;
  ted_lien: string | null;
  ted_dernier_avis: string | null;
  has_geometry: boolean | null;
  lat: number | null;
  lng: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface RegionRow {
  id: string;
  nom: string;
  geojson: any;
  couleur: string;
  centroide_lat: number | null;
  centroide_lng: number | null;
  created_at: string | null;
}

// ============================================
// FONCTIONS DE CONVERSION
// ============================================

/**
 * Convertit une ligne Supabase en objet Network
 */
export const rowToNetwork = (row: ReseauRow): Network => ({
  id: row.id,
  identifiant_reseau: row.identifiant_reseau,
  nom_reseau: row.nom_reseau,
  communes: row.communes || [],
  departement: row.departement,
  region: row.region,
  mo: row.mo || '',
  gestionnaire: row.gestionnaire || '',
  annee_creation: row.annee_creation || 0,
  longueur_reseau: row.longueur_reseau || 0,
  nb_pdl: row.nb_pdl || 0,
  taux_enr_r: row.taux_enr_r || 0,
  echeance: row.echeance || '',
  confiance: row.confiance || '',
  titulaire_est_engie:
    row.titulaire_est_engie === 'ENGIE' || row.titulaire_est_engie === 'Concurrent'
      ? row.titulaire_est_engie
      : 'Inconnu',
  boamp_montant: row.boamp_montant || 0,
  score_echeance: row.score_echeance || 0,
  score_taille: row.score_taille || 0,
  score_concurrence: row.score_concurrence || 0,
  score_opportunite: row.score_opportunite || 0,
  ted_lien: row.ted_lien || '',
  ted_dernier_avis: row.ted_dernier_avis || '',
  has_geometry: row.has_geometry || false,
  lat: row.lat ?? undefined,
  lng: row.lng ?? undefined,
});

/**
 * Convertit une ligne Supabase en objet Region
 */
export const rowToRegion = (row: RegionRow): Region => ({
  id: row.id,
  nom: row.nom,
  geojson: row.geojson,
  couleur: row.couleur,
  centroide_lat: row.centroide_lat || 0,
  centroide_lng: row.centroide_lng || 0,
});

// ============================================
// REQUÊTES PRINCIPALES
// ============================================

/**
 * Récupère tous les réseaux avec leurs coordonnées
 */
export async function fetchAllNetworks(): Promise<Network[]> {
  try {
    const { data, error } = await supabase
      .from('reseaux')
      .select('*')
      .eq('has_geometry', true)
      .or('lat.is.not.null,lng.is.not.null');

    if (error) {
      console.error('❌ Erreur lors de la récupération des réseaux:', error);
      return [];
    }

    return data.map(rowToNetwork);
  } catch (err) {
    console.error('❌ Exception lors de la récupération des réseaux:', err);
    return [];
  }
}

/**
 * Récupère tous les réseaux avec leur statut calculé
 */
export async function fetchNetworksWithStatus(): Promise<Network[]> {
  try {
    const { data, error } = await supabase
      .from('reseaux_avec_statut')
      .select('*');

    if (error) {
      console.error('❌ Erreur lors de la récupération des réseaux avec statut:', error);
      return [];
    }

    return data.map(rowToNetwork);
  } catch (err) {
    console.error('❌ Exception lors de la récupération des réseaux avec statut:', err);
    return [];
  }
}

/**
 * Récupère les réseaux d'une région spécifique
 */
export async function fetchNetworksByRegion(regionName: string): Promise<Network[]> {
  try {
    const { data, error } = await supabase
      .from('reseaux_avec_statut')
      .select('*')
      .eq('region', regionName);

    if (error) {
      console.error(`❌ Erreur lors de la récupération des réseaux pour ${regionName}:`, error);
      return [];
    }

    return data.map(rowToNetwork);
  } catch (err) {
    console.error(`❌ Exception lors de la récupération des réseaux pour ${regionName}:`, err);
    return [];
  }
}

/**
 * Récupère toutes les régions avec leurs GeoJSON
 */
export async function fetchAllRegions(): Promise<Region[]> {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('*');

    if (error) {
      console.error('❌ Erreur lors de la récupération des régions:', error);
      return [];
    }

    return data.map(rowToRegion);
  } catch (err) {
    console.error('❌ Exception lors de la récupération des régions:', err);
    return [];
  }
}

/**
 * Récupère un réseau spécifique par son ID
 */
export async function fetchNetworkById(id: string): Promise<Network | null> {
  try {
    const { data, error } = await supabase
      .from('reseaux_avec_statut')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Erreur lors de la récupération du réseau:', error);
      return null;
    }

    return data ? rowToNetwork(data) : null;
  } catch (err) {
    console.error('❌ Exception lors de la récupération du réseau:', err);
    return null;
  }
}

/**
 * Récupère les statistiques par région
 */
export async function fetchRegionsStats() {
  try {
    const { data, error } = await supabase
      .from('reseaux_par_region')
      .select('*');

    if (error) {
      console.error('❌ Erreur lors de la récupération des stats par région:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('❌ Exception lors de la récupération des stats par région:', err);
    return [];
  }
}

// ============================================
// REQUÊTES AVANCÉES (FILTRES)
// ============================================

/**
 * Filtre les réseaux par statut
 */
export async function fetchNetworksByStatus(status: string): Promise<Network[]> {
  try {
    const { data, error } = await supabase
      .from('reseaux_avec_statut')
      .select('*')
      .eq('statut', status);

    if (error) {
      console.error('❌ Erreur lors du filtrage par statut:', error);
      return [];
    }

    return data.map(rowToNetwork);
  } catch (err) {
    console.error('❌ Exception lors du filtrage par statut:', err);
    return [];
  }
}

/**
 * Filtre les réseaux par score minimum
 */
export async function fetchNetworksByMinScore(minScore: number): Promise<Network[]> {
  try {
    const { data, error } = await supabase
      .from('reseaux_avec_statut')
      .select('*')
      .gte('score_global', minScore);

    if (error) {
      console.error('❌ Erreur lors du filtrage par score:', error);
      return [];
    }

    return data.map(rowToNetwork);
  } catch (err) {
    console.error('❌ Exception lors du filtrage par score:', err);
    return [];
  }
}

/**
 * Recherche des réseaux par nom (recherche textuelle)
 */
export async function searchNetworks(query: string): Promise<Network[]> {
  try {
    const { data, error } = await supabase
      .from('reseaux_avec_statut')
      .select('*')
      .ilike('nom_reseau', `%${query}%`);

    if (error) {
      console.error('❌ Erreur lors de la recherche:', error);
      return [];
    }

    return data.map(rowToNetwork);
  } catch (err) {
    console.error('❌ Exception lors de la recherche:', err);
    return [];
  }
}

// ============================================
// CACHE ET OPTIMISATION
// ============================================

// Cache pour éviter les requêtes répétées
let networksCache: Network[] | null = null;
let regionsCache: Region[] | null = null;

/**
 * Récupère tous les réseaux avec cache
 */
export async function getNetworksWithCoords(): Promise<Network[]> {
  if (networksCache) {
    return networksCache;
  }
  
  const networks = await fetchNetworksWithStatus();
  networksCache = networks;
  return networks;
}

/**
 * Récupère toutes les régions avec cache
 */
export async function getFrenchRegions(): Promise<Region[]> {
  if (regionsCache) {
    return regionsCache;
  }
  
  const regions = await fetchAllRegions();
  regionsCache = regions;
  return regions;
}

/**
 * Invalide le cache (à appeler après une mise à jour)
 */
export function invalidateCache(): void {
  networksCache = null;
  regionsCache = null;
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Récupère une région par son nom
 */
export async function getRegionByName(nom: string): Promise<Region | null> {
  const regions = await getFrenchRegions();
  return regions.find(r => r.nom === nom) || null;
}

/**
 * Récupère les réseaux d'une région (avec cache)
 */
export async function getNetworksByRegion(regionName: string): Promise<Network[]> {
  const networks = await getNetworksWithCoords();
  return networks.filter(n => n.region === regionName);
}
