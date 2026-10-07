'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import leaflet components to avoid SSR issues
const MapContainerNoSSR = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => <div className="loading-container"><div className="loading-content"><h1>Chargement...</h1></div></div>,
  }
);

const TileLayerNoSSR = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const GeoJSONNoSSR = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);

const MarkerNoSSR = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const PopupNoSSR = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Import types and data
import { networksWithCoords, getNetworksByRegion } from '../data/networks';
import { frenchRegions, getRegionByName, FRANCE_CENTER } from '../data/regions';
import { Network, calculateNetworkStatus, calculateGlobalScore } from '../types';

// Status colors from Fluid Design System Engie
const statusColors: Record<string, string> = {
  ENGIE: '#00A86B',
  ENGIE_RENOUVELLEMENT: '#4CAF50',
  NON_ENGIE_HIGH: '#E53935',
  NON_ENGIE_MEDIUM: '#FF9800',
  NON_ENGIE_LOW: '#D32F2F',
  UNKNOWN: '#9E9E9E',
};

const statusLabels: Record<string, string> = {
  ENGIE: 'Géré par Engie',
  ENGIE_RENOUVELLEMENT: 'Engie < 2 ans',
  NON_ENGIE_HIGH: 'Score ≥ 0.8',
  NON_ENGIE_MEDIUM: 'Score 0.6-0.8',
  NON_ENGIE_LOW: 'Score < 0.6',
  UNKNOWN: 'Inconnu',
};

// Network Marker Component
const NetworkMarker = ({ network, onClick }: { network: Network; onClick: () => void }) => {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((leaflet) => setL(leaflet));
  }, []);

  if (!L || !network.lat || !network.lng) return null;

  const status = calculateNetworkStatus(network);
  const color = statusColors[status];

  const icon = L.divIcon({
    className: 'network-marker',
    html: `
      <div style="
        width: 24px; height: 24px;
        background-color: ${color};
        border-radius: 50% 50% 50% 0;
        position: relative;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 0 0 1px ${color};
      ">
        <div style="
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 8px; height: 8px;
          background: white; border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

  return (
    <MarkerNoSSR
      position={[network.lat, network.lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
    />
  );
};

// Region Highlight Component
const RegionHighlight = ({ region, isSelected, onClick }: {
  region: any;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const style = {
    fillColor: isSelected ? '#00A86B' : isHovered ? '#E3F5E8' : '#6C757D',
    fillOpacity: isSelected ? 0.4 : isHovered ? 0.3 : 0.1,
    color: '#FFFFFF',
    weight: isSelected ? 3 : isHovered ? 2 : 1,
    opacity: 1,
  };

  return (
    <GeoJSONNoSSR
      data={region.geojson}
      style={style}
      onEachFeature={(_, layer) => {
        layer.on({
          mouseover: () => setIsHovered(true),
          mouseout: () => setIsHovered(false),
          click: () => onClick(),
        });
      }}
    />
  );
};

// Main page component
export default function Home() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredNetwork, setHoveredNetwork] = useState<Network | null>(null);
  const [zoom, setZoom] = useState<number>(6);
  const [center, setCenter] = useState<[number, number]>(FRANCE_CENTER);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter networks based on selected region
  const filteredNetworks = useMemo(() => {
    return selectedRegion
      ? getNetworksByRegion(selectedRegion)
      : networksWithCoords;
  }, [selectedRegion]);

  // Handle region click
  const handleRegionClick = (regionName: string) => {
    setSelectedRegion(regionName === selectedRegion ? null : regionName);
    const regionCenters: Record<string, [number, number]> = {
      'Île-de-France': [48.8566, 2.3522],
      'Pays de la Loire': [47.4635, -0.546],
      'Nouvelle-Aquitaine': [45.5833, 0.65],
      'Auvergne-Rhône-Alpes': [45.764, 4.8356],
      'Centre-Val de Loire': [47.7528, 1.6711],
      'Bretagne': [48.1032, -2.8736],
      'Grand Est': [48.6789, 6.1846],
      'Hauts-de-France': [50.4801, 2.8238],
      'Normandie': [49.1935, 0.3807],
      'Occitanie': [43.6109, 3.8772],
      'Provence-Alpes-Côte d\'Azur': [43.8358, 6.4758],
      'Bourgogne-Franche-Comté': [47.2802, 4.9994],
    };
    const newCenter = regionCenters[regionName] || FRANCE_CENTER;
    setCenter(newCenter);
    setZoom(8);
  };

  // Handle map click (deselect region)
  const handleMapClick = () => {
    if (selectedRegion) {
      setSelectedRegion(null);
      setCenter(FRANCE_CENTER);
      setZoom(6);
    }
  };

  // Reset to France view
  const resetView = () => {
    setSelectedRegion(null);
    setCenter(FRANCE_CENTER);
    setZoom(6);
  };

  // Don't render until client-side
  if (!isClient) {
    return (
      <main className="loading-container">
        <div className="loading-content">
          <h1>Réseaux de Chaleur - Engie</h1>
          <p>Chargement de la carte...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-engie-bg">
      {/* Header with Engie Design System */}
      <header>
        <div>
          <h1>Carte des Réseaux de Chaleur - Engie</h1>
          <p>Visualisation interactive des opportunités commerciales</p>
        </div>
        <div className="flex items-center gap-4">
          {selectedRegion && (
            <button
              onClick={resetView}
              className="btn-return"
            >
              ← Retour
            </button>
          )}
          {/* Legend with Engie colors */}
          <div className="legend-container">
            <span className="legend-label">Légende:</span>
            <div className="legend-item">
              <span className="legend-color engie"></span>
              <span>Engie</span>
            </div>
            <div className="legend-item">
              <span className="legend-color engie-soon"></span>
              <span>Engie &lt;2ans</span>
            </div>
            <div className="legend-item">
              <span className="legend-color high-score"></span>
              <span>Score ≥ 0.8</span>
            </div>
            <div className="legend-item">
              <span className="legend-color medium-score"></span>
              <span>Score 0.6-0.8</span>
            </div>
            <div className="legend-item">
              <span className="legend-color low-score"></span>
              <span>Score &lt; 0.6</span>
            </div>
            <div className="legend-item">
              <span className="legend-color unknown"></span>
              <span>Inconnu</span>
            </div>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="map-container">
        <MapContainerNoSSR
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          minZoom={5}
          maxZoom={18}
          onClick={handleMapClick}
        >
          {/* Base Map Layer */}
          <TileLayerNoSSR
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Regions Layer */}
          {frenchRegions.map((region) => (
            <RegionHighlight
              key={region.id}
              region={region}
              isSelected={selectedRegion === region.nom}
              onClick={() => handleRegionClick(region.nom)}
            />
          ))}

          {/* Networks Markers */}
          {filteredNetworks.map((network) => (
            <NetworkMarker
              key={network.id}
              network={network}
              onClick={() => setHoveredNetwork(network)}
            />
          ))}
        </MapContainerNoSSR>
      </div>

      {/* Network Details Modal with Engie Design */}
      {hoveredNetwork && (
        <div className="modal-overlay">
          <div className="modal-header">
            <h2>{hoveredNetwork.nom_reseau}</h2>
            <span 
              className="modal-close"
              onClick={() => setHoveredNetwork(null)}
            >
              ✕
            </span>
          </div>
          <div className="modal-body">
            <p><span className="modal-label">Région:</span> {hoveredNetwork.region}</p>
            <p><span className="modal-label">Département:</span> {hoveredNetwork.departement}</p>
            <p><span className="modal-label">Communes:</span> {hoveredNetwork.communes.join(', ')}</p>
            <p><span className="modal-label">MO:</span> {hoveredNetwork.mo}</p>
            <p><span className="modal-label">Gestionnaire:</span> {hoveredNetwork.gestionnaire}</p>
            
            <div className="modal-section">
              <p><span className="modal-label">Longueur:</span> {hoveredNetwork.longueur_reseau} km</p>
              <p><span className="modal-label">Points de livraison:</span> {hoveredNetwork.nb_pdl}</p>
              <p><span className="modal-label">Année:</span> {hoveredNetwork.annee_creation}</p>
              {hoveredNetwork.echeance && (
                <p><span className="modal-label">Échéance:</span> {hoveredNetwork.echeance}</p>
              )}
              {hoveredNetwork.boamp_montant && (
                <p>
                  <span className="modal-label">Montant:</span> 
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  }).format(hoveredNetwork.boamp_montant)}
                </p>
              )}
            </div>
            
            <div className="modal-section">
              <p className="modal-label">Scores:</p>
              <p>
                <span className="modal-label">Global:</span> 
                {calculateGlobalScore(hoveredNetwork).toFixed(2)}
              </p>
              <p>
                <span className="modal-label">Échéance:</span> 
                {hoveredNetwork.score_echeance?.toFixed(2) || 'N/A'}
              </p>
              <p>
                <span className="modal-label">Taille:</span> 
                {hoveredNetwork.score_taille?.toFixed(2) || 'N/A'}
              </p>
              <p>
                <span className="modal-label">Concurrence:</span> 
                {hoveredNetwork.score_concurrence?.toFixed(2) || 'N/A'}
              </p>
              <p>
                <span className="modal-label">Opportunité:</span> 
                {hoveredNetwork.score_opportunite?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
