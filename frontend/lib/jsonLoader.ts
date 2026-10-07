// ============================================
// JSON Data Loader - Alternative to Supabase
// Utilise les fichiers JSON locaux au lieu de Supabase
// ============================================

import type { Network, Region } from '../types';

// Type pour les données brutes du JSON
interface RawReseau {
  id?: string;
  identifiant_reseau?: string;
  nom_reseau: string;
  communes?: string[];
  departement?: string;
  region: string;
  mo?: string;
  gestionnaire?: string;
  annee_creation?: number;
  longueur_reseau?: number;
  nb_pdl?: number;
  taux_enr_r?: number;
  echeance?: string;
  confiance?: string;
  titulaire_est_engie?: 'ENGIE' | 'Concurrent' | 'Inconnu';
  boamp_montant?: number;
  score_echeance?: number;
  score_taille?: number;
  score_concurrence?: number;
  score_opportunite?: number;
  ted_lien?: string;
  ted_dernier_avis?: string;
  has_geometry?: boolean;
  lat?: number;
  lng?: number;
}

// Centroïdes des régions pour les réseaux sans coordonnées
export const regionCentroides: Record<string, [number, number]> = {
  'Auvergne-Rhône-Alpes': [45.764, 4.8356],
  'Bourgogne-Franche-Comté': [47.2802, 4.9994],
  'Bretagne': [48.1032, -2.8736],
  'Centre-Val de Loire': [47.7528, 1.6711],
  'Corse': [42.0397, 9.0129],
  'Grand Est': [48.6789, 6.1846],
  'Hauts-de-France': [50.4801, 2.8238],
  "Île-de-France": [48.8566, 2.3522],
  'Normandie': [49.1935, 0.3807],
  'Nouvelle-Aquitaine': [45.5833, 0.65],
  'Occitanie': [43.6109, 3.8772],
  'Pays de la Loire': [47.4635, -0.546],
  "Provence-Alpes-Côte d'Azur": [43.8358, 6.4758],
};

// Centre de la France (fallback)
export const FRANCE_CENTER: [number, number] = [46.603, 1.888];

// Convertit une ligne JSON brute en Network
export const rawToNetwork = (raw: RawReseau, index: number): Network => {
  // Génère un ID si absent
  const id = raw.id || `network_${index}`;
  
  // Applique les coordonnées de la région si le réseau n'en a pas
  let lat = raw.lat;
  let lng = raw.lng;
  let hasGeometry = raw.has_geometry || false;
  
  if ((!lat || !lng) && raw.region) {
    const centroide = regionCentroides[raw.region];
    if (centroide) {
      lat = centroide[0];
      lng = centroide[1];
      hasGeometry = true;
    }
  }
  
  return {
    id,
    identifiant_reseau: raw.identifiant_reseau || '',
    nom_reseau: raw.nom_reseau,
    communes: raw.communes || [],
    departement: raw.departement || '',
    region: raw.region,
    mo: raw.mo || '',
    gestionnaire: raw.gestionnaire || '',
    annee_creation: raw.annee_creation || 0,
    longueur_reseau: raw.longueur_reseau || 0,
    nb_pdl: raw.nb_pdl || 0,
    taux_enr_r: raw.taux_enr_r || 0,
    echeance: raw.echeance || '',
    confiance: raw.confiance || '',
    titulaire_est_engie: raw.titulaire_est_engie || 'Inconnu',
    boamp_montant: raw.boamp_montant || 0,
    score_echeance: raw.score_echeance || 0,
    score_taille: raw.score_taille || 0,
    score_concurrence: raw.score_concurrence || 0,
    score_opportunite: raw.score_opportunite || 0,
    ted_lien: raw.ted_lien || '',
    ted_dernier_avis: raw.ted_dernier_avis || '',
    has_geometry: hasGeometry,
    lat,
    lng,
  };
};

// Récupère tous les réseaux depuis le JSON local
export async function fetchNetworksFromJSON(): Promise<Network[]> {
  try {
    // Import dynamique du JSON (fonctionne côté client et serveur)
    const data = await import('../data/reseaux.json');
    
    // Vérifie que data est un tableau
    const networksArray = Array.isArray(data) ? data : data.default || [];
    
    // Convertit chaque réseau
    return networksArray
      .filter((raw: RawReseau) => raw.nom_reseau) // Filtre les entrées valides
      .map((raw: RawReseau, index: number) => rawToNetwork(raw, index));
  } catch (error) {
    console.error('❌ Erreur lors du chargement du JSON:', error);
    return [];
  }
}

// Récupère les régions (statiques, basées sur les données du JSON)
export async function fetchRegionsFromJSON(): Promise<Region[]> {
  // Récupère les régions uniques depuis les réseaux
  const networks = await fetchNetworksFromJSON();
  const uniqueRegions = [...new Set(networks.map(n => n.region).filter(r => r))];
  
  return uniqueRegions.map(nom => ({
    id: nom.toLowerCase().replace(/\s+/g, '-'),
    nom,
    geojson: generateSimpleGeoJSON(nom), // GeoJSON simplifié pour chaque région
    couleur: getRegionColor(nom),
    centroide_lat: regionCentroides[nom]?.[0] || FRANCE_CENTER[0],
    centroide_lng: regionCentroides[nom]?.[1] || FRANCE_CENTER[1],
  }));
}

// Génère un GeoJSON simplifié pour chaque région (pour l'affichage)
function generateSimpleGeoJSON(regionName: string): any {
  const centroide = regionCentroides[regionName];
  if (!centroide) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: FRANCE_CENTER,
      },
      properties: { name: regionName },
    };
  }
  
  // GeoJSON simplifiés pour chaque région (rectangles approximatifs)
  const regionGeoJSON: Record<string, any> = {
    'Auvergne-Rhône-Alpes': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[4.0, 45.0], [4.0, 47.0], [7.0, 47.0], [7.0, 45.0], [4.0, 45.0]]],
      },
      properties: { name: 'Auvergne-Rhône-Alpes' },
    },
    'Bourgogne-Franche-Comté': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[4.0, 46.5], [4.0, 48.0], [6.5, 48.0], [6.5, 46.5], [4.0, 46.5]]],
      },
      properties: { name: 'Bourgogne-Franche-Comté' },
    },
    'Bretagne': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-3.5, 47.5], [-3.5, 48.8], [-1.8, 48.8], [-1.8, 47.5], [-3.5, 47.5]]],
      },
      properties: { name: 'Bretagne' },
    },
    'Centre-Val de Loire': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0.5, 46.5], [0.5, 48.0], [3.0, 48.0], [3.0, 46.5], [0.5, 46.5]]],
      },
      properties: { name: 'Centre-Val de Loire' },
    },
    'Corse': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[8.5, 41.5], [8.5, 43.0], [9.5, 43.0], [9.5, 41.5], [8.5, 41.5]]],
      },
      properties: { name: 'Corse' },
    },
    'Grand Est': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[5.0, 47.5], [5.0, 49.5], [8.0, 49.5], [8.0, 47.5], [5.0, 47.5]]],
      },
      properties: { name: 'Grand Est' },
    },
    'Hauts-de-France': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[1.5, 49.5], [1.5, 51.0], [4.0, 51.0], [4.0, 49.5], [1.5, 49.5]]],
      },
      properties: { name: 'Hauts-de-France' },
    },
    "Île-de-France": {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[2.0, 48.5], [2.0, 49.0], [3.0, 49.0], [3.0, 48.5], [2.0, 48.5]]],
      },
      properties: { name: 'Île-de-France' },
    },
    'Normandie': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-1.5, 48.5], [-1.5, 50.0], [1.0, 50.0], [1.0, 48.5], [-1.5, 48.5]]],
      },
      properties: { name: 'Normandie' },
    },
    'Nouvelle-Aquitaine': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-1.5, 44.0], [-1.5, 47.0], [2.0, 47.0], [2.0, 44.0], [-1.5, 44.0]]],
      },
      properties: { name: 'Nouvelle-Aquitaine' },
    },
    'Occitanie': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[2.0, 42.5], [2.0, 44.5], [5.0, 44.5], [5.0, 42.5], [2.0, 42.5]]],
      },
      properties: { name: 'Occitanie' },
    },
    'Pays de la Loire': {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-2.0, 46.5], [-2.0, 48.0], [1.0, 48.0], [1.0, 46.5], [-2.0, 46.5]]],
      },
      properties: { name: 'Pays de la Loire' },
    },
    "Provence-Alpes-Côte d'Azur": {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[5.0, 43.0], [5.0, 44.5], [7.0, 44.5], [7.0, 43.0], [5.0, 43.0]]],
      },
      properties: { name: 'Provence-Alpes-Côte d\'Azur' },
    },
  };
  
  return regionGeoJSON[regionName] || {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: centroide || FRANCE_CENTER,
    },
    properties: { name: regionName },
  };
}

// Couleurs pour chaque région (Fluid Design System)
function getRegionColor(regionName: string): string {
  const colors = [
    '#00A86B', '#0055A8', '#4CAF50', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#4ECDC4'
  ];
  const index = Object.keys(regionCentroides).indexOf(regionName);
  return colors[index % colors.length];
}

// Filtre les réseaux par région
export function filterNetworksByRegion(networks: Network[], regionName: string | null): Network[] {
  if (!regionName) return networks;
  return networks.filter(n => n.region === regionName);
}

// Filtre les réseaux par statut
export function filterNetworksByStatus(networks: Network[], status: string | null): Network[] {
  if (!status) return networks;
  
  return networks.filter(n => {
    const calculatedStatus = n.titulaire_est_engie === 'ENGIE'
      ? (n.echeance && new Date(n.echeance) <= new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
        ? 'ENGIE_RENOUVELLEMENT'
        : 'ENGIE')
      : 'NON_ENGIE';
    return calculatedStatus === status;
  });
}

// Filtre les réseaux par score minimum
export function filterNetworksByMinScore(networks: Network[], minScore: number | null): Network[] {
  if (minScore === null) return networks;
  
  return networks.filter(n => {
    const score = (
      (n.score_echeance || 0) * 0.4 +
      (n.score_taille || 0) * 0.3 +
      Math.min((n.boamp_montant || 0) / 50000000, 1) * 0.2 +
      (n.score_concurrence || 0) * 0.1
    );
    return score >= minScore;
  });
}

// Recherche par nom
export function searchNetworksByName(networks: Network[], query: string): Network[] {
  if (!query) return networks;
  return networks.filter(n =>
    n.nom_reseau.toLowerCase().includes(query.toLowerCase())
  );
}
