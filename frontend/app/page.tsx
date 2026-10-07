'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import everything from react-leaflet and leaflet to avoid SSR issues
const MapContainerNoSSR = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => <p className="text-engie-text-dark p-4">Chargement de la carte...</p>,
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

// Import data and types (these are safe as they don't use window)
import { networksWithCoords, getNetworksByRegion } from '../data/networks';
import { frenchRegions, getRegionByName, FRANCE_CENTER } from '../data/regions';
import { Network, NetworkStatus, statusToColor, statusToLabel, calculateNetworkStatus, calculateGlobalScore } from '../types';

// Network Marker Component (uses leaflet only on client)
const NetworkMarker = ({ network, onClick }: { network: Network; onClick: () => void }) => {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  if (!L) return null;

  const status = calculateNetworkStatus(network);
  const color = statusToColor[status];

  const icon = L.divIcon({
    className: 'network-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border-radius: 50% 50% 50% 0;
        position: relative;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 0 0 1px ${color};
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

  if (!network.lat || !network.lng) return null;

  return (
    <MarkerNoSSR
      position={[network.lat, network.lng]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
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
    const region = getRegionByName(regionName);
    if (region) {
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
    }
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

  // Don't render anything until client-side
  if (!isClient) {
    return (
      <main className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-engie-text-dark">
              Réseaux de Chaleur - Engie
            </h1>
            <p className="text-engie-text-medium mt-2">
              Chargement de la carte...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-engie-text-dark">
            Réseaux de Chaleur - Engie
          </h1>
          <p className="text-engie-text-medium">
            Carte interactive des opportunités commerciales
          </p>
        </div>
        <div className="flex items-center gap-4">
          {selectedRegion && (
            <button
              onClick={resetView}
              className="btn-secondary text-sm"
            >
              ← Retour à la France
            </button>
          )}
          <div className="flex gap-2">
            {/* Legend */}
            <div className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg shadow-sm">
              <span className="text-engie-text-medium mr-2">Légende:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-network-engie"></span>
                <span>Engie</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-network-engie-soon"></span>
                <span>Engie &lt;2ans</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-network-high-score"></span>
                <span>Score ≥ 0.8</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-network-medium-score"></span>
                <span>Score 0.6-0.8</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-network-low-score"></span>
                <span>Score &lt; 0.6</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-network-unknown"></span>
                <span>Inconnu</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="map-container relative">
        <MapContainerNoSSR
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          minZoom={5}
          maxZoom={18}
        >
          {/* Base Map Layer */}
          <TileLayerNoSSR
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

      {/* Network Details Modal */}
      {hoveredNetwork && (
        <div className="absolute top-20 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-[1000] card">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-bold text-engie-text-dark">
              {hoveredNetwork.nom_reseau}
            </h2>
            <button
              onClick={() => setHoveredNetwork(null)}
              className="text-engie-text-medium hover:text-engie-text-dark text-xl"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Région:</span> {hoveredNetwork.region}
            </p>
            <p>
              <span className="font-medium">Département:</span> {hoveredNetwork.departement}
            </p>
            <p>
              <span className="font-medium">Communes:</span> {hoveredNetwork.communes.join(', ')}
            </p>
            <p>
              <span className="font-medium">MO:</span> {hoveredNetwork.mo}
            </p>
            <p>
              <span className="font-medium">Gestionnaire:</span> {hoveredNetwork.gestionnaire}
            </p>
            <div className="pt-2 border-t border-gray-200">
              <p>
                <span className="font-medium">Longueur:</span> {hoveredNetwork.longueur_reseau} km
              </p>
              <p>
                <span className="font-medium">Points de livraison:</span> {hoveredNetwork.nb_pdl}
              </p>
              <p>
                <span className="font-medium">Année de création:</span> {hoveredNetwork.annee_creation}
              </p>
              {hoveredNetwork.echeance && (
                <p>
                  <span className="font-medium">Échéance:</span> {hoveredNetwork.echeance}
                </p>
              )}
              {hoveredNetwork.boamp_montant && (
                <p>
                  <span className="font-medium">Montant marché:</span> {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(hoveredNetwork.boamp_montant)}
                </p>
              )}
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="font-medium mb-1">Scores:</p>
              <p>
                <span className="font-medium">Global:</span> {calculateGlobalScore(hoveredNetwork).toFixed(2)}
              </p>
              <p>
                <span className="font-medium">Échéance:</span> {hoveredNetwork.score_echeance?.toFixed(2) || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Taille:</span> {hoveredNetwork.score_taille?.toFixed(2) || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Concurrence:</span> {hoveredNetwork.score_concurrence?.toFixed(2) || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Opportunité:</span> {hoveredNetwork.score_opportunite?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
