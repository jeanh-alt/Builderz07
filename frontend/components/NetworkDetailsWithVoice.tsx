'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network, calculateNetworkStatus, calculateGlobalScore, statusToColor, statusToLabel } from '../types';
import { VoiceNotesInput } from './VoiceNotesInput';
import { useVoiceNotes } from '../hooks/useVoiceNotes';
import { getVoxtralService, VoxtralService } from '../lib/voxtral';

// ============================================
// TYPES
// ============================================

interface NetworkDetailsWithVoiceProps {
  network: Network | null;
  onClose: () => void;
  voxtralApiKey?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function NetworkDetailsWithVoice({ 
  network, 
  onClose,
  voxtralApiKey
}: NetworkDetailsWithVoiceProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'analysis'>('details');
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [voxtralService, setVoxtralService] = useState<VoxtralService | null>(null);
  
  // Initialize Voxtral service
  useEffect(() => {
    setVoxtralService(getVoxtralService(voxtralApiKey));
  }, [voxtralApiKey]);

  // Voice notes hook
  const {
    notes,
    currentNote,
    isRecording,
    isLoading,
    error,
    loadNotes,
  } = useVoiceNotes({
    network: network!, // We know network is not null when this component is used
    apiKey: voxtralApiKey,
  });

  // Load notes when network changes
  useEffect(() => {
    if (network?.id) {
      loadNotes(network.id);
    }
  }, [network?.id, loadNotes]);

  // Calculate status and score
  const status = network ? calculateNetworkStatus(network) : 'UNKNOWN';
  const score = network ? calculateGlobalScore(network) : 0;
  const color = network ? statusToColor[status] : '#9E9E9E';
  const label = network ? statusToLabel[status] : 'Statut inconnu';

  // Handle tab change
  const handleTabChange = useCallback((tab: 'details' | 'notes' | 'analysis') => {
    setActiveTab(tab);
    if (tab === 'notes' && notes.length === 0) {
      setShowVoiceInput(true);
    }
  }, []);

  // Close voice input
  const handleCloseVoiceInput = useCallback(() => {
    setShowVoiceInput(false);
    setActiveTab('details');
  }, []);

  // Toggle voice input
  const toggleVoiceInput = useCallback(() => {
    setShowVoiceInput(!showVoiceInput);
    if (!showVoiceInput) {
      setActiveTab('notes');
    }
  }, [showVoiceInput]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderStatusBadge = () => (
    <span 
      className="inline-block px-3 py-1 text-xs rounded-full text-white font-medium"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );

  const renderScoreMeter = () => (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-engie-text-medium">
        <span>0</span>
        <span>0.5</span>
        <span>1.0</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div 
          className="h-2 bg-engie-primary rounded-full"
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <div className="text-center text-sm font-medium text-engie-text-dark">
        {score.toFixed(2)} / 1.0
      </div>
    </div>
  );

  const renderNetworkInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div>
          <p className="font-medium text-engie-text-dark mb-1">Région</p>
          <p className="text-engie-text-medium">{network?.region}</p>
        </div>
        <div>
          <p className="font-medium text-engie-text-dark mb-1">Département</p>
          <p className="text-engie-text-medium">{network?.departement}</p>
        </div>
        <div>
          <p className="font-medium text-engie-text-dark mb-1">Communes</p>
          <p className="text-engie-text-medium truncate">
            {network?.communes?.join(', ')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="font-medium text-engie-text-dark mb-1">Maître d'Ouvrage</p>
          <p className="text-engie-text-medium truncate">{network?.mo}</p>
        </div>
        <div>
          <p className="font-medium text-engie-text-dark mb-1">Gestionnaire</p>
          <p className="text-engie-text-medium truncate">{network?.gestionnaire}</p>
        </div>
        <div>
          <p className="font-medium text-engie-text-dark mb-1">Titulaire</p>
          <p className="text-engie-text-medium">
            {network?.titulaire_est_engie === 'ENGIE' ? '✅ ENGIE' : 
             network?.titulaire_est_engie === 'Concurrent' ? '❌ Concurrent' : '⚪ Inconnu'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderTechnicalData = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gray-200 pt-4">
      <div className="text-center">
        <p className="font-medium text-engie-text-dark">{network?.longueur_reseau} km</p>
        <p className="text-xs text-engie-text-medium">Longueur</p>
      </div>
      <div className="text-center">
        <p className="font-medium text-engie-text-dark">{network?.nb_pdl}</p>
        <p className="text-xs text-engie-text-medium">Points de livraison</p>
      </div>
      <div className="text-center">
        <p className="font-medium text-engie-text-dark">{network?.annee_creation}</p>
        <p className="text-xs text-engie-text-medium">Année</p>
      </div>
      <div className="text-center">
        <p className="font-medium text-engie-text-dark">{network?.taux_enr_r}%</p>
        <p className="text-xs text-engie-text-medium">EnR&R</p>
      </div>
    </div>
  );

  const renderFinancialData = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-4">
      {network?.echeance && (
        <div className="flex justify-between">
          <span className="text-engie-text-medium">Échéance</span>
          <span className="font-medium text-engie-text-dark">{network.echeance}</span>
        </div>
      )}
      {network?.boamp_montant && (
        <div className="flex justify-between">
          <span className="text-engie-text-medium">Montant marché</span>
          <span className="font-medium text-engie-text-dark">
            {new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR',
              maximumFractionDigits: 0 
            }).format(network.boamp_montant)}
          </span>
        </div>
      )}
      {network?.confiance && (
        <div className="flex justify-between">
          <span className="text-engie-text-medium">Confiance</span>
          <span className="font-medium text-engie-text-dark">{network.confiance}</span>
        </div>
      )}
      {network?.ted_lien && (
        <div className="flex justify-between">
          <span className="text-engie-text-medium">Lien TED</span>
          <a 
            href={network.ted_lien} 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-medium text-engie-primary hover:underline"
          >
            Voir
          </a>
        </div>
      )}
    </div>
  );

  const renderScores = () => (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <p className="font-medium text-engie-text-dark mb-3">Scores détaillés</p>
      <div className="space-y-2">
        {[
          { label: 'Global', value: score.toFixed(2) },
          { label: 'Échéance', value: network?.score_echeance?.toFixed(2) || 'N/A' },
          { label: 'Taille', value: network?.score_taille?.toFixed(2) || 'N/A' },
          { label: 'Concurrence', value: network?.score_concurrence?.toFixed(2) || 'N/A' },
          { label: 'Opportunité', value: network?.score_opportunite?.toFixed(2) || 'N/A' },
        ].map((item) => (
          <div key={item.label} className="flex justify-between">
            <span className="text-engie-text-medium">{item.label}</span>
            <span className="font-medium text-engie-text-dark">{item.value}</span>
          </div>
        ))}
      </div>
      {renderScoreMeter()}
    </div>
  );

  const renderVoiceNotesSection = () => (
    <div className="space-y-4">
      {/* Record New Note Button */}
      <button
        onClick={toggleVoiceInput}
        className="w-full flex items-center justify-center gap-2 py-3 bg-engie-primary-light text-engie-primary font-semibold rounded-lg hover:bg-engie-primary hover:text-white transition-colors"
      >
        <span className="text-xl">🎤</span>
        <span>Ajouter une note vocale</span>
      </button>

      {/* Voice Input (conditionally shown) */}
      {showVoiceInput && network && (
        <VoiceNotesInput
          network={network}
          onNoteSaved={() => {
            setShowVoiceInput(false);
            loadNotes(network.id);
          }}
          onNoteCreated={() => {
            // Note created, will be saved separately
          }}
          onError={(err) => {
            console.error('Voice note error:', err);
          }}
          existingNotes={notes}
        />
      )}

      {/* Existing Notes */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-engie-text-dark">
            Notes existantes ({notes.length})
          </h4>
          
          <div className="space-y-3">
            {notes.map((note) => (
              <div 
                key={note.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${note.priority === 'critical' ? 'bg-red-100 text-red-600' :
                        note.priority === 'high' ? 'bg-yellow-100 text-yellow-600' :
                        note.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }
                    `}>
                      {note.priority}
                    </span>
                    <span className="text-xs text-engie-text-medium">
                      {new Date(note.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                
                {note.summary && (
                  <p className="text-sm text-engie-text-dark mb-2">{note.summary}</p>
                )}
                
                <p className="text-sm text-engie-text-medium">
                  {note.transcript.substring(0, 150)}{note.transcript.length > 150 ? '...' : ''}
                </p>
                
                {note.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {note.keywords.slice(0, 3).map((keyword, i) => (
                      <span 
                        key={i}
                        className="px-2 py-1 bg-white text-engie-text-medium text-xs rounded-full border"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voxtral Analysis Summary */}
      {notes.length > 0 && (
        <div className="bg-gradient-to-r from-engie-primary-light to-engie-secondary-light rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🤖</span>
            <h4 className="font-medium text-engie-text-dark">Analyse Voxtral des notes</h4>
          </div>
          
          {voxtralService && (
            <p className="text-sm text-engie-text-medium">
              {notes.length} note(s) analysée(s) avec Voxtral pour extraire la connaissance terrain.
              Les insights sont intégrés dans la base de données Engie.
            </p>
          )}
          
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-1 bg-white text-engie-primary text-sm rounded-lg border border-engie-primary hover:bg-engie-primary-light">
              Voir l'analyse complète
            </button>
            <button className="px-3 py-1 bg-white text-engie-text-dark text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
              Exporter
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderVoxtralInsights = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">💡</span>
          <h4 className="font-medium text-engie-text-dark">Recommandation Voxtral</h4>
        </div>
        
        <div className="text-sm text-engie-text-medium">
          <p>
            Cette recommandation est générée par Voxtral en analysant les données du réseau
            et la connaissance terrain des commerciaux.
          </p>
          
          {network && (
            <div className="mt-4 p-3 bg-white rounded-lg">
              <p className="text-center text-engie-text-medium">
                Analyse en cours avec Voxtral...
              </p>
              <button 
                onClick={async () => {
                  if (voxtralService) {
                    const recommendation = await voxtralService.generateNetworkRecommendation(network);
                    console.log('Voxtral Recommendation:', recommendation);
                  }
                }}
                className="mt-3 w-full bg-engie-primary text-white py-2 rounded-lg hover:bg-engie-primary-dark transition-colors"
              >
                Générer la recommandation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  if (!network) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Container */}
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 
              id="modal-title"
              className="text-2xl font-bold text-engie-text-dark truncate"
            >
              {network.nom_reseau}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              {renderStatusBadge()}
              <span className="text-sm text-engie-text-medium">
                Score: {score.toFixed(2)}
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-engie-text-dark hover:text-engie-primary"
            aria-label="Fermer"
            tabIndex={0}
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 p-6 -mb-px">
          {[
            { id: 'details', label: 'Détails' },
            { id: 'notes', label: `Notes (${notes.length})` },
            { id: 'analysis', label: 'Analyse Voxtral' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`
                px-4 py-2 font-medium text-sm transition-colors
                ${activeTab === tab.id 
                  ? 'text-engie-primary border-b-2 border-engie-primary' 
                  : 'text-engie-text-medium hover:text-engie-text-dark'
                }
              `}
              aria-current={activeTab === tab.id ? 'true' : 'false'}
              tabIndex={0}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {renderNetworkInfo()}
              {renderTechnicalData()}
              {renderFinancialData()}
              {renderScores()}
            </div>
          )}

          {activeTab === 'notes' && renderVoiceNotesSection()}
          {activeTab === 'analysis' && renderVoxtralInsights()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border-2 border-gray-300 text-engie-text-dark font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORT
// ============================================

export default NetworkDetailsWithVoice;
