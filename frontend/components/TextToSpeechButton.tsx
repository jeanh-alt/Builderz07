'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTTS, formatForTTS, isTTSSupported, VoiceInfo } from '../lib/voxtral/tts';

// ============================================
// TYPES
// ============================================

interface TextToSpeechButtonProps {
  text: string;
  className?: string;
  voiceOptions?: VoiceInfo[];
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onPlayError?: (error: any) => void;
}

// ============================================
// CONSTANTS
// ============================================

const PLAY_ICON = '▶️';
const PAUSE_ICON = '⏸️';
const STOP_ICON = '⏹️';
const LOADING_ICON = '🔄';

// ============================================
// MAIN COMPONENT
// ============================================

export function TextToSpeechButton({
  text,
  className = '',
  voiceOptions,
  onPlayStart,
  onPlayEnd,
  onPlayError,
}: TextToSpeechButtonProps) {
  const {
    speak,
    pause,
    resume,
    cancel,
    isSpeaking,
    isPaused,
    isSupported,
    isLoading,
    availableVoices,
  } = useTTS();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLocalPaused, setIsLocalPaused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Combined state for play/pause
  const isActive = isSpeaking || isLocalPaused;

  // Get icon based on state
  const getIcon = useCallback((): string => {
    if (!isSupported) return '❌';
    if (isLoading) return LOADING_ICON;
    if (isLocalPaused) return PAUSE_ICON;
    if (isSpeaking) return STOP_ICON;
    return PLAY_ICON;
  }, [isSupported, isLoading, isLocalPaused, isSpeaking]);

  // Get tooltip text based on state
  const getTooltipText = useCallback((): string => {
    if (!isSupported) return 'Text-to-speech non supporté';
    if (isLoading) return 'Chargement des voix...';
    if (isLocalPaused) return 'Lecture en pause. Cliquez pour reprendre';
    if (isSpeaking) return 'Lecture en cours. Cliquez pour arrêter';
    return 'Lire le texte à voix haute';
  }, [isSupported, isLoading, isLocalPaused, isSpeaking]);

  // Handle click
  const handleClick = useCallback(() => {
    if (!isSupported) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    if (isSpeaking) {
      cancel();
      setIsPlaying(false);
      setIsLocalPaused(false);
      onPlayEnd?.();
      return;
    }

    if (isLocalPaused) {
      resume();
      setIsLocalPaused(false);
      onPlayStart?.();
      return;
    }

    // Start speaking
    speak(formatForTTS(text), selectedVoice ? { voice: selectedVoice } : {});
    setIsPlaying(true);
    onPlayStart?.();

    // Set up end listener
    const checkSpeaking = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(checkSpeaking);
        setIsPlaying(false);
        setIsLocalPaused(false);
        onPlayEnd?.();
      }
    }, 100);

    // Clean up on unmount or next play
    return () => clearInterval(checkSpeaking);
  }, [text, isSupported, isSpeaking, isLocalPaused, selectedVoice, speak, cancel, resume, onPlayStart, onPlayEnd]);

  // Handle pause
  const handlePauseResume = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      pause();
      setIsLocalPaused(true);
    } else if (isLocalPaused) {
      resume();
      setIsLocalPaused(false);
    }
  }, [isSpeaking, isLocalPaused, pause, resume]);

  // Handle voice selection
  const handleVoiceSelect = useCallback((voiceUri: string) => {
    setSelectedVoice(voiceUri);
    setShowVoiceSelector(false);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowVoiceSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
    if (e.key === 'Escape') {
      setShowVoiceSelector(false);
    }
  }, [handleClick]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative" ref={buttonRef}>
      {/* Main Button */}
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          ${className}
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-engie-primary-light text-engie-primary
          hover:bg-engie-primary hover:text-white
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-engie-primary focus:ring-offset-2
          ${isActive ? 'ring-2 ring-engie-primary' : ''}
        `}
        disabled={!isSupported || isLoading}
        aria-label={getTooltipText()}
        aria-expanded={showVoiceSelector}
        aria-haspopup={isSupported ? 'true' : 'false'}
        tabIndex={0}
        title={getTooltipText()}
      >
        <span className="text-lg" aria-hidden="true">{getIcon()}</span>
        <span className="font-medium text-sm">Lire</span>
        
        {/* Voice selector chevron */}
        {isSupported && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowVoiceSelector(!showVoiceSelector);
            }}
            className="w-6 h-6 flex items-center justify-center hover:bg-black hover:bg-opacity-10 rounded-full transition-colors"
            aria-label="Choisir une voix"
            tabIndex={0}
          >
            <span className="text-sm">▼</span>
          </button>
        )}
      </button>

      {/* Tooltip for unsupported */}
      {showTooltip && !isSupported && (
        <div 
          className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-black text-white text-xs px-3 py-1 rounded whitespace-nowrap z-50 animate-fadeIn"
          role="tooltip"
          aria-hidden="true"
        >
          TTS non supporté dans ce navigateur
        </div>
      )}

      {/* Voice Selector Dropdown */}
      {showVoiceSelector && isSupported && (
        <div 
          className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn"
          role="menu"
          aria-label="Sélectionner une voix"
        >
          <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">
            Voix disponibles ({availableVoices.length})
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {availableVoices
              .filter(v => v.lang.startsWith('fr'))
              .map((voice, index) => (
                <button
                  key={`${voice.name}-${index}`}
                  onClick={() => handleVoiceSelect(voice.name)}
                  className={`
                    w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors
                    ${selectedVoice === voice.name ? 'bg-engie-primary-light text-engie-primary' : 'text-gray-700'}
                  `}
                  role="menuitem"
                  tabIndex={0}
                >
                  <span className="font-medium">{voice.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{voice.lang}</span>
                  {voice.default && (
                    <span className="ml-2 px-2 py-0.5 bg-engie-primary text-white text-xs rounded-full">Par défaut</span>
                  )}
                </button>
              ))}
            
            {availableVoices.filter(v => v.lang.startsWith('fr')).length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-500">
                Aucune voix française disponible
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-200">
            <button
              onClick={() => handleVoiceSelect('')}
              className="w-full text-sm text-engie-primary hover:bg-gray-50 transition-colors py-1"
            >
              Voix par défaut du système
            </button>
          </div>
        </div>
      )}

      {/* Playing indicator */}
      {isSpeaking && (
        <div 
          className="absolute -right-2 -top-2 w-3 h-3 bg-engie-primary rounded-full animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ============================================
// STANDALONE PLAY BUTTON (for simple use cases)
// ============================================

interface SimpleTTSButtonProps {
  text: string;
  className?: string;
}

export function SimpleTTSButton({ text, className = '' }: SimpleTTSButtonProps) {
  const { speak, isSpeaking, isSupported } = useTTS();

  return (
    <button
      onClick={() => isSupported && speak(formatForTTS(text))}
      disabled={!isSupported}
      className={`
        ${className}
        p-2 rounded-lg hover:bg-gray-100 transition-colors
        ${isSpeaking ? 'animate-pulse' : ''}
      `}
      aria-label={isSupported ? 'Lire à voix haute' : 'TTS non supporté'}
      title={isSupported ? 'Lire à voix haute' : 'Text-to-speech non supporté dans ce navigateur'}
    >
      <span className="text-xl" aria-hidden="true">🔊</span>
    </button>
  );
}

// ============================================
// ANIMATIONS
// ============================================

const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .animate-pulse {
    animation: pulse 1s infinite;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'tts-button-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}

export default TextToSpeechButton;
