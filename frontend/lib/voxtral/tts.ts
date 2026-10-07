/**
 * Text-to-Speech Module for Builderz07
 * Builder 3 - Frontend: Détails & LLM (US-003)
 * 
 * This module provides text-to-speech functionality for reading
 * network recommendations and details aloud.
 */

// ============================================
// TYPES
// ============================================

export interface TTSOptions {
  rate?: number;       // Speed: 0.1 to 10 (default: 1)
  pitch?: number;      // Pitch: 0 to 2 (default: 1)
  volume?: number;     // Volume: 0 to 1 (default: 1)
  voice?: string;      // Specific voice URI or name
  lang?: string;      // Language (default: 'fr-FR')
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  currentUtterance: SpeechSynthesisUtterance | null;
}

export interface VoiceInfo {
  name: string;
  lang: string;
  default: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_OPTIONS: Required<TTSOptions> = {
  rate: 1,
  pitch: 1,
  volume: 1,
  voice: '',
  lang: 'fr-FR',
};

// ============================================
// VOICE MANAGEMENT
// ============================================

/**
 * Check if speech synthesis is supported
 */
export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Get available voices
 * Note: This may return empty initially; voices are loaded asynchronously
 */
export function getAvailableVoices(): VoiceInfo[] {
  if (!isTTSSupported()) return [];
  
  return window.speechSynthesis.getVoices().map(voice => ({
    name: voice.name,
    lang: voice.lang,
    default: voice.default,
  }));
}

/**
 * Get French voices
 */
export function getFrenchVoices(): VoiceInfo[] {
  return getAvailableVoices().filter(voice => 
    voice.lang.startsWith('fr')
  );
}

/**
 * Get the best French voice
 */
export function getBestFrenchVoice(): VoiceInfo | null {
  const frenchVoices = getFrenchVoices();
  if (frenchVoices.length === 0) return null;
  
  // Prefer voices with 'Google' or 'Microsoft' in the name, or the default French voice
  const preferredVoices = frenchVoices.filter(v => 
    v.name.toLowerCase().includes('google') || 
    v.name.toLowerCase().includes('microsoft') ||
    v.default
  );
  
  return preferredVoices[0] || frenchVoices[0];
}

/**
 * Load voices (they may not be available immediately)
 */
export function loadVoices(): Promise<VoiceInfo[]> {
  return new Promise((resolve) => {
    if (!isTTSSupported()) {
      resolve([]);
      return;
    }

    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(getAvailableVoices());
      };
    } else {
      // For other browsers, voices might be available immediately
      resolve(getAvailableVoices());
    }
  });
}

// ============================================
// TTS CLASS
// ============================================

/**
 * TextToSpeech class for managing speech synthesis
 */
export class TextToSpeech {
  private utterance: SpeechSynthesisUtterance | null = null;
  private options: Required<TTSOptions>;
  private voicesLoaded: boolean = false;

  constructor(options: TTSOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadVoices();
  }

  private async loadVoices(): Promise<void> {
    if (this.voicesLoaded) return;
    await loadVoices();
    this.voicesLoaded = true;
  }

  /**
   * Speak text
   */
  speak(text: string, options?: Partial<TTSOptions>): void {
    if (!isTTSSupported()) {
      console.warn('Text-to-speech is not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    const voice = this.getVoice(options);
    if (voice) {
      utterance.voice = voice;
    }

    // Set options
    utterance.rate = options?.rate ?? this.options.rate;
    utterance.pitch = options?.pitch ?? this.options.pitch;
    utterance.volume = options?.volume ?? this.options.volume;
    utterance.lang = options?.lang ?? this.options.lang;

    // Handle events
    utterance.onstart = () => {
      this.utterance = utterance;
    };

    utterance.onend = () => {
      this.utterance = null;
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.utterance = null;
    };

    // Store reference
    this.utterance = utterance;

    // Speak
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (!isTTSSupported()) return;
    window.speechSynthesis.pause();
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (!isTTSSupported()) return;
    window.speechSynthesis.resume();
  }

  /**
   * Cancel speech
   */
  cancel(): void {
    if (!isTTSSupported()) return;
    window.speechSynthesis.cancel();
    this.utterance = null;
  }

  /**
   * Get current state
   */
  getState(): TTSState {
    if (!isTTSSupported()) {
      return {
        isSpeaking: false,
        isPaused: false,
        isSupported: false,
        currentUtterance: null,
      };
    }

    return {
      isSpeaking: window.speechSynthesis.speaking,
      isPaused: window.speechSynthesis.paused,
      isSupported: true,
      currentUtterance: this.utterance,
    };
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.getState().isSpeaking;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.getState().isPaused;
  }

  /**
   * Set options
   */
  setOptions(options: Partial<TTSOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get the voice to use
   */
  private getVoice(options?: Partial<TTSOptions>): SpeechSynthesisVoice | null {
    if (!isTTSSupported()) return null;

    const voiceOption = options?.voice ?? this.options.voice;
    const langOption = options?.lang ?? this.options.lang;

    // If a specific voice is requested
    if (voiceOption) {
      const voice = window.speechSynthesis.getVoices().find(
        v => v.name === voiceOption || v.voiceURI === voiceOption
      );
      if (voice) return voice;
    }

    // Find a voice matching the language
    const voices = window.speechSynthesis.getVoices().filter(
      v => v.lang.startsWith(langOption)
    );

    if (voices.length > 0) {
      // Prefer non-default voices for better quality
      return voices.find(v => !v.default) || voices[0];
    }

    // Fallback to any available voice
    return window.speechSynthesis.getVoices()[0] || null;
  }

  /**
   * Stop and clear
   */
  destroy(): void {
    this.cancel();
    this.utterance = null;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let ttsInstance: TextToSpeech | null = null;

/**
 * Get the singleton TTS instance
 */
export function getTTSInstance(options?: TTSOptions): TextToSpeech {
  if (!ttsInstance) {
    ttsInstance = new TextToSpeech(options);
  }
  return ttsInstance;
}

/**
 * Reset the singleton instance (useful for testing or option changes)
 */
export function resetTTSInstance(): void {
  if (ttsInstance) {
    ttsInstance.destroy();
    ttsInstance = null;
  }
}

// ============================================
// REACT HOOK
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface UseTTSReturn {
  speak: (text: string, options?: Partial<TTSOptions>) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  isLoading: boolean;
  availableVoices: VoiceInfo[];
  state: TTSState;
}

/**
 * React hook for text-to-speech
 */
export function useTTS(initialOptions?: TTSOptions): UseTTSReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    isSupported: isTTSSupported(),
    currentUtterance: null,
  });

  // Load voices on mount
  useEffect(() => {
    const load = async () => {
      if (state.isSupported) {
        const voices = await loadVoices();
        setAvailableVoices(voices);
      }
      setIsLoading(false);
    };
    load();

    // Listen for voice changes
    const handleVoicesChanged = () => {
      setAvailableVoices(getAvailableVoices());
    };

    if (state.isSupported) {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }

    return () => {
      if (state.isSupported) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [state.isSupported]);

  // Update state when speech synthesis events occur
  useEffect(() => {
    if (!state.isSupported) return;

    const updateState = () => {
      setState({
        isSpeaking: window.speechSynthesis.speaking,
        isPaused: window.speechSynthesis.paused,
        isSupported: true,
        currentUtterance: null, // We don't have access to the current utterance here
      });
    };

    const interval = setInterval(updateState, 100);
    return () => clearInterval(interval);
  }, [state.isSupported]);

  // Create TTS instance
  const tts = useMemo(() => new TextToSpeech(initialOptions), []);

  // Define actions
  const speak = useCallback((text: string, options?: Partial<TTSOptions>) => {
    tts.speak(text, options);
  }, [tts]);

  const pause = useCallback(() => {
    tts.pause();
  }, [tts]);

  const resume = useCallback(() => {
    tts.resume();
  }, [tts]);

  const cancel = useCallback(() => {
    tts.cancel();
  }, [tts]);

  // Get current state
  const { isSpeaking, isPaused, isSupported } = state;

  return {
    speak,
    pause,
    resume,
    cancel,
    isSpeaking,
    isPaused,
    isSupported,
    isLoading,
    availableVoices,
    state,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Speak text directly (without creating an instance)
 */
export function speakText(
  text: string,
  options: TTSOptions = {}
): void {
  const tts = getTTSInstance(options);
  tts.speak(text, options);
}

/**
 * Stop speech directly
 */
export function stopSpeech(): void {
  const tts = getTTSInstance();
  tts.cancel();
}

/**
 * Format network recommendation for better TTS reading
 */
export function formatForTTS(text: string): string {
  return text
    // Replace emojis with words
    .replace(/⭐/g, 'étoile ')
    .replace(/✅/g, 'okay ')
    .replace(/❌/g, 'non ')
    .replace(/🟢/g, 'vert ')
    .replace(/🟡/g, 'jaune ')
    .replace(/🔴/g, 'rouge ')
    .replace(/📍/g, 'localisation ')
    .replace(/⏰/g, 'heure ')
    .replace(/€/g, ' euros ')
    .replace(/km/g, ' kilomètres ')
    .replace(/PDL/g, ' points de livraison ')
    // Add pauses for better readability
    .replace(/\. /g, '. ... ')
    .replace(/!/g, '! ... ')
    .replace(/\?/g, '? ... ')
    // Remove markdown formatting
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/#/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Create a TTS-friendly version of a network recommendation
 */
export function createTTSFriendlyRecommendation(recommendation: string, networkName: string): string {
  return `Recommandation pour le réseau ${networkName}. ${formatForTTS(recommendation)}`;
}

// ============================================
// EXPORTS
// ============================================

export default {
  TextToSpeech,
  getTTSInstance,
  resetTTSInstance,
  useTTS,
  speakText,
  stopSpeech,
  formatForTTS,
  createTTSFriendlyRecommendation,
  isTTSSupported,
  getAvailableVoices,
  getFrenchVoices,
  getBestFrenchVoice,
  loadVoices,
};
