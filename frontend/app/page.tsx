'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from 'react-leaflet';
import L, { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { networksWithCoords, getNetworksByRegion } from '../data/networks';
import { frenchRegions, getRegionByName, FRANCE_CENTER } from '../data/regions';
import { 
  Network, 
  NetworkStatus, 
  statusToColor, 
  statusToLabel, 
  calculateNetworkStatus, 
  calculateGlobalScore, 
  regionCentroides 
} from '../types';
import { useFilters } from '../hooks/useFilters';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { NetworkDetailsWithVoice } from '../components/NetworkDetailsWithVoice';

// ============================================
// CUSTOM ICONS
// ============================================

const createNetworkIcon = (status: NetworkStatus) => {
  const color = statusToColor[status];
  return L.divIcon({
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
};

// ============================================
// REGION STYLING
// ============================================

const getRegionStyle = (isHovered: boolean, isSelected: boolean, hasActiveFilters: boolean) => {
  return {
    fillColor: isSelected ? '#00A86B' : isHovered ? '#E3F5E8' : hasActiveFilters ? '#F0F0F0' : '#6C757D',
    fillOpacity: isSelected ? 0.3 : isHovered ? 0.2 : hasActiveFilters ? 0.05 : 0.1,
    color: isSelected ? '#00A86B' : isHovered ? '#4CAF50' : '#FFFFFF',
    weight: isSelected ? 3 : isHovered ? 2 : 1,
    opacity: 1,
  };
};

// ============================================
// REGION HIGHLIGHT COMPONENT
// ============================================

const RegionHighlight = ({ 
  region, 
  isSelected, 
  onClick,
  hasActiveFilters
}: {
  region: any;
  isSelected: boolean;
  onClick: () => void;
  hasActiveFilters: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const style = getRegionStyle(isHovered, isSelected, hasActiveFilters);

  return (
    <GeoJSON
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

// ============================================
// MAP EVENTS HANDLER
// ============================================

const MapEventsHandler = ({ onClick }: { onClick: () => void }) => {
  useMapEvents({
    click: () => onClick(),
  });
  return null;
};

// ============================================
// LEGEND COMPONENT
// ============================================

const Legend = () => (
  <div className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg shadow-sm border border-gray-200">
    <span className="text-engie-text-medium mr-2 font-medium">Légende:</span>
    <div className="flex items-center gap-3">
      {[
        { color: '#00A86B', label: 'Engie' },
        { color: '#4CAF50', label: 'Engie <2ans' },
        { color: '#E53935', label: 'Score ≥ 0.8' },
        { color: '#FF9800', label: 'Score 0.6-0.8' },
        { color: '#D32F2F', label: 'Score < 0.6' },
        { color: '#9E9E9E', label: 'Inconnu' },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span 
            className="w-3 h-3 rounded-full block"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-xs">{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// NO RESULTS STATE
// ============================================

const NoResults = ({ onResetFilters }: { onResetFilters: () => void }) => (
  <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-50">
    <div className="text-center p-6">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-4xl">🔍</span>
      </div>
      <h3 className="text-xl font-bold text-engie-text-dark mb-2">
        Aucun réseau trouvé
      </h3>
      <p className="text-engie-text-medium mb-6">
        Ajustez vos filtres pour voir plus de résultats
      </p>
      <button
        onClick={onResetFilters}
        className="btn-primary"
      >
        Réinitialiser les filtres
      </button>
    </div>
  </div>
);

// ============================================
// NETWORK MARKER POPUP
// ============================================

const NetworkMarkerPopup = ({ network }: { network: Network }) => {
  const status = calculateNetworkStatus(network);
  const score = calculateGlobalScore(network);
  const color = statusToColor[status];
  const label = statusToLabel[status];

  return (
    <Popup>
      <div className="min-w-[200px]">
        <h3 className="font-bold text-engie-text-dark mb-1 truncate">
          {network.nom_reseau}
        </h3>
        <p className="text-sm text-engie-text-medium mb-2">
          {network.region} • {network.departement}
        </p>
        <div className="mb-2">
          <span
            className="inline-block px-2 py-1 text-xs rounded-full text-white font-medium"
            style={{ backgroundColor: color }}
          >
            {label}
          </span>
        </div>
        <div className="text-sm space-y-1">
          <p>
            <span className="font-medium">Gestionnaire:</span> {network.gestionnaire}
          </p>
          <p>
            <span className="font-medium">Points de livraison:</span> {network.nb_pdl}
          </p>
          <p>
            <span className="font-medium">Longueur:</span> {network.longueur_reseau} km
          </p>
          <p>
            <span className="font-medium">Score:</span> {score.toFixed(2)}
          </p>
          {network.echeance && (
            <p>
              <span className="font-medium">Échéance:</span> {network.echeance}
            </p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => {
              // This will be handled by the parent component
            }}
            className="w-full py-2 bg-engie-primary-light text-engie-primary text-sm rounded-lg hover:bg-engie-primary hover:text-white transition-colors"
          >
            Voir les détails →
          </button>
        </div>
      </div>
    </Popup>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function Home() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [zoom, setZoom] = useState<number>(6);
  const [center, setCenter] = useState<[number, number]>(FRANCE_CENTER);

  // Initialize filters hook
  const {
    filters,
    isFilterPanelOpen,
    filteredNetworks,
    activeFilterCount,
    hasActiveFilters,
    filterOptions,
    updateFilters,
    resetFilters,
    openFilterPanel,
    closeFilterPanel,
  } = useFilters({
    networks: networksWithCoords,
    availableRegions: frenchRegions.map(r => r.nom),
  });

  // Get region centers for zooming
  const regionCenters: Record<string, [number, number]> = useMemo(() => {
    const centers: Record<string, [number, number]> = {};
    frenchRegions.forEach(region => {
      const coords = regionCentroides[region.nom];
      if (coords) centers[region.nom] = coords;
    });
    return centers;
  }, []);

  // Handle region click
  const handleRegionClick = useCallback((regionName: string) => {
    setSelectedRegion(prev => prev === regionName ? null : regionName);
    const newCenter = regionCenters[regionName] || FRANCE_CENTER;
    setCenter(newCenter);
    setZoom(regionName === selectedRegion ? 6 : 8);
    
    // Update filters to show only this region
    updateFilters({
      selectedRegions: prev => prev.includes(regionName) ? [] : [regionName]
    });
  }, [selectedRegion, regionCenters, updateFilters]);

  // Handle map click (deselect region)
  const handleMapClick = useCallback(() => {
    if (selectedRegion) {
      setSelectedRegion(null);
      setCenter(FRANCE_CENTER);
      setZoom(6);
      updateFilters({ selectedRegions: [] });
    }
  }, [selectedRegion, updateFilters]);

  // Reset to France view
  const resetView = useCallback(() => {
    setSelectedRegion(null);
    setCenter(FRANCE_CENTER);
    setZoom(6);
    resetFilters();
    setSelectedNetwork(null);
  }, [resetFilters]);

  // Filter networks based on selected region and active filters
  const displayedNetworks = useMemo(() => {
    const baseNetworks = selectedRegion
      ? getNetworksByRegion(selectedRegion)
      : networksWithCoords;
    return filteredNetworks.filter(n => baseNetworks.includes(n));
  }, [selectedRegion, filteredNetworks]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    updateFilters({ searchQuery: query });
  }, [updateFilters]);

  // Handle network click (open details modal)
  const handleNetworkClick = useCallback((network: Network) => {
    setSelectedNetwork(network);
  }, []);

  // Handle close details modal
  const handleCloseDetails = useCallback(() => {
    setSelectedNetwork(null);
  }, []);

  // Handle network selection from search/filters
  const handleNetworkSelect = useCallback((network: Network) => {
    setSelectedNetwork(network);
  }, []);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (selectedNetwork) {
          handleCloseDetails();
          e.preventDefault();
        } else if (isFilterPanelOpen) {
          closeFilterPanel();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNetwork, isFilterPanelOpen, handleCloseDetails, closeFilterPanel]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <main className="min-h-screen bg-engie-bg">
      
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex flex-col gap-4 sticky top-0 z-40">
        <div className="flex justify-between items-center">
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
                className="btn-secondary text-sm hidden md:flex"
              >
                ← Retour à la France
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <SearchBar
            onSearch={handleSearch}
            onOpenFilters={openFilterPanel}
            filterCount={activeFilterCount}
            placeholder="Rechercher un réseau, une région... (Essayez: 'Engie en Île-de-France')"
          />
          <div className="flex-shrink-0">
            <Legend />
          </div>
        </div>
      </header>

      {/* Filter Panel */}
      <FilterPanel
        availableRegions={filterOptions.regions}
        onFilterChange={updateFilters}
        isOpen={isFilterPanelOpen}
        onClose={closeFilterPanel}
      />

      {/* Map Container */}
      <div className="map-container relative h-[calc(100vh-200px)] md:h-[calc(100vh-240px)]">
        
        {/* Map */}
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          minZoom={5}
          maxZoom={18}
          zoomControl={false}
          attributionControl={false}
        >
          {/* Base Map Layer */}
          <TileLayer
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
              hasActiveFilters={hasActiveFilters}
            />
          ))}

          {/* Networks Markers */}
          {displayedNetworks.map((network) => {
            const status = calculateNetworkStatus(network);
            const score = calculateGlobalScore(network);

            if (!network.lat || !network.lng) return null;

            return (
              <Marker
                key={network.id}
                position={[network.lat, network.lng]}
                icon={createNetworkIcon(status)}
                eventHandlers={{
                  click: () => handleNetworkClick(network),
                }}
                zIndexOffset={score > 0.8 ? 100 : score > 0.6 ? 50 : 0}
              >
                <NetworkMarkerPopup network={network} />
              </Marker>
            );
          })}

          {/* Map Click Handler */}
          <MapEventsHandler onClick={handleMapClick} />
        </MapContainer>

        {/* Network Details Modal with Voice Notes */}
        {selectedNetwork && (
          <NetworkDetailsWithVoice
            network={selectedNetwork}
            onClose={handleCloseDetails}
            voxtralApiKey={process.env.NEXT_PUBLIC_VOXTRAL_API_KEY}
          />
        )}

        {/* No Results Overlay */}
        {displayedNetworks.length === 0 && hasActiveFilters && (
          <NoResults onResetFilters={resetFilters} />
        )}

        {/* Reset View Button (Mobile) */}
        {selectedRegion && (
          <button
            onClick={resetView}
            className="absolute bottom-4 left-4 btn-secondary text-sm z-[1000] md:hidden"
          >
            ← Retour à la France
          </button>
        )}

        {/* Filter Summary (Mobile) */}
        {hasActiveFilters && !isFilterPanelOpen && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-center z-[1000] md:hidden">
            <button
              onClick={openFilterPanel}
              className="bg-white border border-engie-primary text-engie-primary px-4 py-2 rounded-full shadow-lg hover:bg-engie-primary-light transition-colors"
            >
              <span className="font-medium">{activeFilterCount} filtre(s) actif(s)</span>
            </button>
          </div>
        )}

        {/* Zoom Controls (Custom) */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[1000]">
          <button
            onClick={() => {
              const map = (window as any).leafletMap;
              if (map) map.zoomIn();
            }}
            className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Zoomer"
            tabIndex={0}
          >
            <span className="text-xl">+</span>
          </button>
          <button
            onClick={() => {
              const map = (window as any).leafletMap;
              if (map) map.zoomOut();
            }}
            className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Dézoomer"
            tabIndex={0}
          >
            <span className="text-xl">−</span>
          </button>
        </div>

        {/* Voice Notes Floating Button (Mobile) */}
        {!selectedNetwork && !isFilterPanelOpen && (
          <button
            onClick={() => {
              // Open first network's details for voice notes
              if (displayedNetworks.length > 0) {
                handleNetworkClick(displayedNetworks[0]);
              }
            }}
            className="absolute bottom-20 right-4 w-14 h-14 bg-engie-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-engie-primary-dark transition-colors z-[1000] md:hidden"
            aria-label="Ajouter une note vocale"
            tabIndex={0}
          >
            <span className="text-2xl">🎤</span>
          </button>
        )}
      </div>
    </main>
  );
}

// ============================================
// LEAFLET FIX FOR NEXT.JS
// ============================================

// Fix for leaflet icons and CSS in Next.js
if (typeof window !== 'undefined') {
  // @ts-ignore - Leaflet icon fix
  delete L.Icon.Default.prototype._getIconUrl;
  // @ts-ignore
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/images/marker-icon-2x.png',
    iconUrl: '/images/marker-icon.png',
    shadowUrl: '/images/marker-shadow.png',
  });
}
