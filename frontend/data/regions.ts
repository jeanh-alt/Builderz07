// Simplified GeoJSON for French regions
// Used for the interactive map
// Source: Simplified from official INSEE GeoJSON

import { Region } from '../types';

export const frenchRegions: Region[] = [
  {
    id: 'auvergne-rhone-alpes',
    nom: 'Auvergne-Rhône-Alpes',
    couleur: '#00A86B',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8, 45.0], [4.8, 46.5], [7.0, 46.5], [7.0, 45.0], [4.8, 45.0]
        ]]
      },
      properties: { name: 'Auvergne-Rhône-Alpes' }
    }
  },
  {
    id: 'bourgogne-franche-comte',
    nom: 'Bourgogne-Franche-Comté',
    couleur: '#0055A8',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.0, 46.5], [4.0, 47.5], [6.5, 47.5], [6.5, 46.5], [4.0, 46.5]
        ]]
      },
      properties: { name: 'Bourgogne-Franche-Comté' }
    }
  },
  {
    id: 'bretagne',
    nom: 'Bretagne',
    couleur: '#4CAF50',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-3.5, 47.5], [-3.5, 48.8], [-1.8, 48.8], [-1.8, 47.5], [-3.5, 47.5]
        ]]
      },
      properties: { name: 'Bretagne' }
    }
  },
  {
    id: 'centre-val-de-loire',
    nom: 'Centre-Val de Loire',
    couleur: '#E3F5E8',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [0.5, 46.5], [0.5, 48.0], [3.0, 48.0], [3.0, 46.5], [0.5, 46.5]
        ]]
      },
      properties: { name: 'Centre-Val de Loire' }
    }
  },
  {
    id: 'grand-est',
    nom: 'Grand Est',
    couleur: '#FF9800',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.5, 48.0], [4.5, 50.0], [8.0, 50.0], [8.0, 48.0], [4.5, 48.0]
        ]]
      },
      properties: { name: 'Grand Est' }
    }
  },
  {
    id: 'hauts-de-france',
    nom: 'Hauts-de-France',
    couleur: '#9E9E9E',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [1.5, 49.5], [1.5, 51.0], [4.5, 51.0], [4.5, 49.5], [1.5, 49.5]
        ]]
      },
      properties: { name: 'Hauts-de-France' }
    }
  },
  {
    id: 'ile-de-france',
    nom: 'Île-de-France',
    couleur: '#D32F2F',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [1.5, 48.0], [1.5, 49.0], [3.5, 49.0], [3.5, 48.0], [1.5, 48.0]
        ]]
      },
      properties: { name: 'Île-de-France' }
    }
  },
  {
    id: 'normandie',
    nom: 'Normandie',
    couleur: '#00825A',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-1.5, 48.5], [-1.5, 49.8], [1.5, 49.8], [1.5, 48.5], [-1.5, 48.5]
        ]]
      },
      properties: { name: 'Normandie' }
    }
  },
  {
    id: 'nouvelle-aquitaine',
    nom: 'Nouvelle-Aquitaine',
    couleur: '#E53935',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-1.5, 43.0], [-1.5, 46.0], [2.0, 46.0], [2.0, 43.0], [-1.5, 43.0]
        ]]
      },
      properties: { name: 'Nouvelle-Aquitaine' }
    }
  },
  {
    id: 'occitanie',
    nom: 'Occitanie',
    couleur: '#FFC107',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.0, 43.0], [2.0, 44.5], [4.5, 44.5], [4.5, 43.0], [2.0, 43.0]
        ]]
      },
      properties: { name: 'Occitanie' }
    }
  },
  {
    id: 'pays-de-la-loire',
    nom: 'Pays de la Loire',
    couleur: '#00A86B',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-2.0, 46.0], [-2.0, 48.0], [0.0, 48.0], [0.0, 46.0], [-2.0, 46.0]
        ]]
      },
      properties: { name: 'Pays de la Loire' }
    }
  },
  {
    id: 'provence-alpes-cote-d-azur',
    nom: 'Provence-Alpes-Côte d\'Azur',
    couleur: '#0055A8',
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [5.0, 43.0], [5.0, 44.5], [7.0, 44.5], [7.0, 43.0], [5.0, 43.0]
        ]]
      },
      properties: { name: 'Provence-Alpes-Côte d\'Azur' }
    }
  }
];

// Get region by name
export const getRegionByName = (name: string): Region | undefined => {
  return frenchRegions.find(region => region.nom === name);
};

// Get all region names
export const getAllRegionNames = (): string[] => {
  return frenchRegions.map(region => region.nom);
};

// Center of France (fallback)
export const FRANCE_CENTER: [number, number] = [46.603, 1.888];
