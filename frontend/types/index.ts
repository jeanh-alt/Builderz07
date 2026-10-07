// ============================================
// Types for Réseaux de Chaleur Application
// Fluid Design System Engie
// ============================================

// Network Status Types
export type NetworkStatus = 
  | 'ENGIE'                   // Géré par Engie
  | 'ENGIE_RENOUVELLEMENT'    // Géré par Engie avec renouvellement < 2 ans
  | 'NON_ENGIE_HIGH'          // Non-Engie avec score ≥ 0.8
  | 'NON_ENGIE_MEDIUM'        // Non-Engie avec score 0.6-0.8
  | 'NON_ENGIE_LOW'           // Non-Engie avec score < 0.6
  | 'UNKNOWN';                 // Statut inconnu

// Network Data from Supabase / JSON
export interface Network {
  id: string;
  identifiant_reseau: string;
  nom_reseau: string;
  communes: string[];
  departement: string;
  region: string;
  mo: string; // Maître d'Ouvrage
  gestionnaire: string;
  annee_creation?: number;
  longueur_reseau?: number;
  nb_pdl?: number;
  taux_enr_r?: number;
  echeance?: string; // Date string (YYYY-MM-DD)
  confiance?: string; // 'confirmee_boamp', 'confirmee_ted', 'estimee'
  titulaire_connu?: string | null;
  titulaire_est_engie: 'ENGIE' | 'Concurrent' | 'Inconnu';
  boamp_montant?: number;
  score_echeance?: number;
  score_taille?: number;
  score_concurrence?: number;
  score_opportunite?: number;
  ted_lien?: string;
  ted_dernier_avis?: string;
  has_geometry: boolean;
  lat?: number;
  lng?: number;
  // Calculated fields
  statut?: NetworkStatus;
  score_global?: number;
}

// Region Data for GeoJSON
export interface Region {
  id: string;
  nom: string;
  geojson: GeoJSON.Feature<GeoJSON.Polygon>;
  couleur: string;
  centroide_lat?: number;
  centroide_lng?: number;
}

// GeoJSON Type
declare namespace GeoJSON {
  interface Point {
    type: 'Point';
    coordinates: [number, number];
  }
  
  interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][];
  }
  
  interface Feature<T extends Point | Polygon> {
    type: 'Feature';
    geometry: T;
    properties: Record<string, any>;
  }
  
  interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature<Point | Polygon>[];
  }
}

// Recommandation from Voxtral
export interface Recommandation {
  id: string;
  reseau_id: string;
  recommandation: string;
  created_at: string;
  score: number;
}

// Search Filter Types
export interface SearchFilters {
  region?: string;
  departement?: string;
  statut?: NetworkStatus;
  minScore?: number;
  maxScore?: number;
  query?: string; // Natural language query
}

// Center coordinates for regions (fallback for networks without lat/lng)
export const regionCentroides: Record<string, [number, number]> = {
  "Auvergne-Rhône-Alpes": [45.764, 4.8356],
  "Bourgogne-Franche-Comté": [47.2802, 4.9994],
  "Bretagne": [48.1032, -2.8736],
  "Centre-Val de Loire": [47.7528, 1.6711],
  "Corse": [42.0397, 9.0129],
  "Grand Est": [48.6789, 6.1846],
  "Hauts-de-France": [50.4801, 2.8238],
  "Île-de-France": [48.8566, 2.3522],
  "Normandie": [49.1935, 0.3807],
  "Nouvelle-Aquitaine": [45.5833, 0.65],
  "Occitanie": [43.6109, 3.8772],
  "Pays de la Loire": [47.4635, -0.546],
  "Provence-Alpes-Côte d'Azur": [43.8358, 6.4758],
  "Guadeloupe": [16.265, -61.551],
  "Martinique": [14.6415, -61.0242],
  "Guyane": [4.011, -53.119],
  "La Réunion": [-21.1151, 55.5364],
  "Mayotte": [-12.8275, 45.1662],
};

// Utility function to get network coordinates
export const getNetworkCoords = (network: Network): [number, number] => {
  if (network.lat !== undefined && network.lng !== undefined) {
    return [network.lat, network.lng];
  }
  return regionCentroides[network.region] || [46.603, 1.888]; // Fallback: center of France
};

// Utility function to calculate network status
export const calculateNetworkStatus = (network: Network): NetworkStatus => {
  if (network.titulaire_est_engie === 'ENGIE') {
    if (network.echeance) {
      const maintenant = new Date();
      const echeance = new Date(network.echeance);
      const deuxAns = new Date();
      deuxAns.setFullYear(deuxAns.getFullYear() + 2);
      if (echeance <= deuxAns) {
        return 'ENGIE_RENOUVELLEMENT';
      }
    }
    return 'ENGIE';
  } else {
    const score = network.score_opportunite || 0;
    if (score >= 0.8) {
      return 'NON_ENGIE_HIGH';
    } else if (score >= 0.6) {
      return 'NON_ENGIE_MEDIUM';
    } else if (score > 0) {
      return 'NON_ENGIE_LOW';
    }
    return 'UNKNOWN';
  }
};

// Utility function to calculate global score
export const calculateGlobalScore = (network: Network): number => {
  const scoreEcheance = network.score_echeance || 0;
  const scoreTaille = network.score_taille || 0;
  const scoreMontant = network.boamp_montant ? Math.min(network.boamp_montant / 50_000_000, 1) : 0; // Normalized to 50M€
  const scoreConcurrence = network.score_concurrence || 0;
  
  return (
    scoreEcheance * 0.4 +
    scoreTaille * 0.3 +
    scoreMontant * 0.2 +
    scoreConcurrence * 0.1
  );
};

// Network Status to Color Map (Fluid Design System)
export const statusToColor: Record<NetworkStatus, string> = {
  ENGIE: '#00A86B',
  ENGIE_RENOUVELLEMENT: '#4CAF50',
  NON_ENGIE_HIGH: '#E53935',
  NON_ENGIE_MEDIUM: '#FF9800',
  NON_ENGIE_LOW: '#D32F2F',
  UNKNOWN: '#9E9E9E',
};

// Network Status to Label Map
export const statusToLabel: Record<NetworkStatus, string> = {
  ENGIE: 'Géré par Engie',
  ENGIE_RENOUVELLEMENT: 'Engie (Renouvellement < 2 ans)',
  NON_ENGIE_HIGH: 'Non-Engie (Score ≥ 0.8)',
  NON_ENGIE_MEDIUM: 'Non-Engie (Score 0.6-0.8)',
  NON_ENGIE_LOW: 'Non-Engie (Score < 0.6)',
  UNKNOWN: 'Statut inconnu',
};
