/**
 * Speech-to-Text Module for Builderz07
 * Builder 3 - Frontend: Capture de connaissance terrain (Nouvelle fonctionnalité)
 * 
 * Ce module permet aux commerciaux d'enregistrer leur connaissance terrain
 * par la voix. Les enregistrements sont transcrits en texte et peuvent être
 * analysés par Voxtral pour enrichir la base de données Engie.
 */

// ============================================
// TYPES
// ============================================

export interface STTOptions {
  continuous?: boolean;      // Transcription continue ou par phrases
  interimResults?: boolean;  // Recevoir les résultats intermédiaires
  language?: string;         // Langue (default: 'fr-FR')
  maxAlternatives?: number;  // Nombre maximum d'alternatives
}

export interface STTResult {
  transcript: string;         // Texte transcrit
  isFinal: boolean;          // Résultat final ou intermédiaire
  confidence?: number;       // Niveau de confiance (0-1)
  alternatives?: string[];   // Autres alternatives de transcription
}

export interface STTState {
  isListening: boolean;
  isSupported: boolean;
  isProcessing: boolean;
  error: string | null;
}

export interface VoiceNote {
  id: string;
  reseauId: string;
  userId?: string;           // Identifiant du commercial (optionnel pour l'anonymat)
  audioUrl?: string;         // URL de l'enregistrement audio (optionnel)
  transcript: string;        // Texte transcrit
  structuredData?: any;      // Données structurées après analyse Voxtral
  sentiment?: string;        // Sentiment (positif, neutre, négatif)
  keywords?: string[];       // Mots-clés extraits
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceRecording {
  blob: Blob;
  url: string;
  duration: number;
  startTime: number;
  endTime: number;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_OPTIONS: Required<STTOptions> = {
  continuous: true,
  interimResults: true,
  language: 'fr-FR',
  maxAlternatives: 1,
};

// Mots-clés pour l'analyse de priorité
const PRIORITY_KEYWORDS: Record<string, 'critical' | 'high' | 'medium'> = {
  // Critical
  'urgent': 'critical',
  'immédiat': 'critical',
  'dès maintenant': 'critical',
  'priorité absolue': 'critical',
  'risque élevé': 'critical',
  'problème grave': 'critical',
  'à traiter en urgence': 'critical',
  
  // High
  'importante': 'high',
  'fort': 'high',
  'opportunité': 'high',
  'à surveiller': 'high',
  'priorité': 'high',
  'intéressant': 'high',
  'bon marché': 'high',
  
  // Medium
  'moyenne': 'medium',
  'standard': 'medium',
  'normal': 'medium',
  'à noter': 'medium',
  'informations': 'medium',
};

// ============================================
// SPEECH RECOGNITION CLASS
// ============================================

/**
 * Class pour gérer la reconnaissance vocale (Speech-to-Text)
 */
export class SpeechToText {
  private recognition: SpeechRecognition | null = null;
  private options: Required<STTOptions>;
  private finalTranscript: string = '';
  private interimTranscript: string = '';
  private onResultCallback: ((result: STTResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor(options: STTOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initRecognition();
  }

  /**
   * Initialiser l'API de reconnaissance vocale
   */
  private initRecognition(): void {
    if (!this.isSupported()) {
      console.warn('Speech Recognition is not supported in this browser');
      return;
    }

    // @ts-ignore - SpeechRecognition is not in TypeScript by default
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not available');
      return;
    }

    this.recognition = new SpeechRecognition();
    
    // Configuration
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.lang = this.options.language;
    this.recognition.maxAlternatives = this.options.maxAlternatives;

    // Event handlers
    this.recognition.onresult = (event: any) => {
      this.handleResult(event);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.onErrorCallback?.(event.error);
      this.stop();
    };

    this.recognition.onstart = () => {
      this.onStartCallback?.();
    };

    this.recognition.onend = () => {
      this.onEndCallback?.();
    };
  }

  /**
   * Vérifier si l'API est supportée
   */
  isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  /**
   * Démarrer l'enregistrement
   */
  start(
    onResult?: (result: STTResult) => void,
    onError?: (error: string) => void,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (!this.recognition) {
      onError?.('Speech recognition not initialized');
      return;
    }

    // Reset transcripts
    this.finalTranscript = '';
    this.interimTranscript = '';

    // Set callbacks
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onStartCallback = onStart;
    this.onEndCallback = onEnd;

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      onError?.('Failed to start speech recognition');
    }
  }

  /**
   * Arrêter l'enregistrement
   */
  stop(): void {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Failed to stop recognition:', error);
    }
    
    // Reset callbacks
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
  }

  /**
   * Mettre en pause l'enregistrement
   */
  pause(): void {
    if (!this.recognition) return;
    this.recognition.stop();
  }

  /**
   * Reprendre l'enregistrement
   */
  resume(): void {
    if (!this.recognition) return;
    this.recognition.start();
  }

  /**
   * Gérer les résultats de reconnaissance
   */
  private handleResult(event: any): void {
    let final = '';
    let interim = '';

    // @ts-ignore - event.results is not typed
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        final += transcript + ' ';
      } else {
        interim += transcript + ' ';
      }
    }

    // Update transcripts
    this.finalTranscript = final.trim();
    this.interimTranscript = interim.trim();

    // Notify callback
    if (final) {
      this.onResultCallback?.({
        transcript: this.finalTranscript + (this.interimTranscript ? ` ${this.interimTranscript}` : ''),
        isFinal: false,
        alternatives: this.getAlternatives(event),
      });
    }

    if (interim) {
      this.onResultCallback?.({
        transcript: this.finalTranscript + (interim ? ` ${interim}` : ''),
        isFinal: false,
        alternatives: this.getAlternatives(event),
      });
    }
  }

  /**
   * Obtenir les alternatives de transcription
   */
  private getAlternatives(event: any): string[] {
    if (!this.options.maxAlternatives || this.options.maxAlternatives <= 1) {
      return [];
    }

    const alternatives: string[] = [];
    // @ts-ignore
    for (let i = event.resultIndex; i < event.results.length; i++) {
      // @ts-ignore
      for (let j = 1; j < event.results[i].length && j < this.options.maxAlternatives; j++) {
        // @ts-ignore
        alternatives.push(event.results[i][j].transcript);
      }
    }
    return alternatives;
  }

  /**
   * Obtenir le texte transcrit final
   */
  getTranscript(): string {
    return this.finalTranscript + (this.interimTranscript ? ` ${this.interimTranscript}` : '');
  }

  /**
   * Obtenir uniquement le texte final (sans les résultats intermédiaires)
   */
  getFinalTranscript(): string {
    return this.finalTranscript;
  }

  /**
   * Réinitialiser
   */
  reset(): void {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.stop();
  }

  /**
   * Obtenir l'état actuel
   */
  getState(): STTState {
    if (!this.recognition) {
      return {
        isListening: false,
        isSupported: false,
        isProcessing: false,
        error: 'API not supported',
      };
    }

    return {
      isListening: this.recognition?.speaking === true,
      isSupported: true,
      isProcessing: false,
      error: null,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let sttInstance: SpeechToText | null = null;

/**
 * Obtenir l'instance singleton
 */
export function getSTTInstance(options?: STTOptions): SpeechToText {
  if (!sttInstance) {
    sttInstance = new SpeechToText(options);
  }
  return sttInstance;
}

/**
 * Réinitialiser l'instance
 */
export function resetSTTInstance(): void {
  if (sttInstance) {
    sttInstance.reset();
    sttInstance = null;
  }
}

// ============================================
// REACT HOOK
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface UseSTTReturn {
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  transcript: string;
  finalTranscript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  isProcessing: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Hook React pour la reconnaissance vocale
 */
export function useSTT(initialOptions?: STTOptions): UseSTTReturn {
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Initialiser le support
  useEffect(() => {
    setIsSupported(getSTTInstance().isSupported());
  }, []);

  // Instance STT
  const stt = useMemo(() => new SpeechToText(initialOptions), []);

  // Callbacks
  const onResult = useCallback((result: STTResult) => {
    setTranscript(result.transcript);
    if (result.isFinal) {
      setFinalTranscript(result.transcript);
    } else {
      setInterimTranscript(result.transcript);
    }
  }, []);

  const onError = useCallback((err: string) => {
    setError(err);
    setIsListening(false);
    setIsProcessing(false);
  }, []);

  const onStart = useCallback(() => {
    setIsListening(true);
    setIsProcessing(true);
    setError(null);
    setTranscript('');
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  const onEnd = useCallback(() => {
    setIsListening(false);
    setIsProcessing(false);
  }, []);

  // Actions
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    stt.start(onResult, onError, onStart, onEnd);
  }, [stt, onResult, onError, onStart, onEnd, isSupported]);

  const stopListening = useCallback(() => {
    stt.stop();
  }, [stt]);

  const pauseListening = useCallback(() => {
    stt.pause();
  }, [stt]);

  const resumeListening = useCallback(() => {
    stt.resume();
  }, [stt]);

  const reset = useCallback(() => {
    stt.reset();
    setTranscript('');
    setFinalTranscript('');
    setInterimTranscript('');
    setError(null);
  }, [stt]);

  return {
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    transcript,
    finalTranscript,
    interimTranscript,
    isListening,
    isSupported,
    isProcessing,
    error,
    reset,
  };
}

// ============================================
// ANALYSE DE TEXTE AVEC VOXTRAL
// ============================================

/**
 * Analyser le texte transcrit avec Voxtral pour extraire des insights
 */
export async function analyseVoiceNote(
  transcript: string,
  context?: {
    reseauId?: string;
    networkName?: string;
    region?: string;
    gestionnaire?: string;
  }
): Promise<{
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionItems: string[];
  structuredData: any;
}> {
  // Pour l'instant, on fait une analyse locale
  // En production, on envoie à Voxtral pour une analyse plus fine
  
  const lowerText = transcript.toLowerCase();

  // Détecter le sentiment
  const sentiment = detectSentiment(lowerText);

  // Extraire les mots-clés
  const keywords = extractKeywords(lowerText, context);

  // Détecter la priorité
  const priority = detectPriority(lowerText);

  // Extraire les actions
  const actionItems = extractActionItems(lowerText);

  // Générer un résumé
  const summary = generateSummary(transcript, context);

  // Structurer les données
  const structuredData = {
    type: 'voice_note',
    content: transcript,
    metadata: {
      sentiment,
      priority,
      keywords,
      actionItems,
    },
    context,
  };

  return {
    summary,
    sentiment,
    keywords,
    priority,
    actionItems,
    structuredData,
  };
}

/**
 * Détecter le sentiment du texte
 */
function detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['bon', 'excellente', 'super', 'parfait', 'opportunité', 'fort', 'intéressant', 'positif'];
  const negativeWords = ['mauvais', 'problème', 'risque', 'difficile', 'négatif', 'dangereux', 'à éviter'];

  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Extraire les mots-clés
 */
function extractKeywords(text: string, context?: any): string[] {
  const keywords: Set<string> = new Set();

  // Ajouter les mots-clés de priorité
  Object.keys(PRIORITY_KEYWORDS).forEach(keyword => {
    if (text.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  // Ajouter les mots spécifiques au contexte
  if (context) {
    if (context.networkName) {
      keywords.add(context.networkName.toLowerCase());
    }
    if (context.gestionnaire) {
      keywords.add(context.gestionnaire.toLowerCase());
    }
    if (context.region) {
      keywords.add(context.region.toLowerCase());
    }
  }

  // Mots-clés génériques
  const genericKeywords = ['réseau', 'chaleur', 'engie', 'marché', 'contrat', 'échéance', 'opportunité'];
  genericKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  return Array.from(keywords);
}

/**
 * Détecter la priorité
 */
function detectPriority(text: string): 'low' | 'medium' | 'high' | 'critical' {
  for (const [keyword, priority] of Object.entries(PRIORITY_KEYWORDS)) {
    if (text.includes(keyword)) {
      return priority;
    }
  }
  return 'medium';
}

/**
 * Extraire les éléments d'action
 */
function extractActionItems(text: string): string[] {
  const actionVerbs = ['contacter', 'appeler', 'envoyer', 'prendre', 'organiser', 'planifier', 'surveiller', 'vérifier'];
  const actionItems: string[] = [];

  actionVerbs.forEach(verb => {
    const regex = new RegExp(`${verb} (.+?)(?:\\.|,|$)`);
    const match = text.match(regex);
    if (match) {
      actionItems.push(match[1].trim());
    }
  });

  return actionItems.length > 0 ? actionItems : ['Revoir la note pour identification des actions'];
}

/**
 * Générer un résumé
 */
function generateSummary(text: string, context?: any): string {
  // Simple summary for now
  // In production, this would use Voxtral to generate a proper summary
  
  const sentences = text.split('. ').filter(s => s.trim().length > 0);
  const firstSentence = sentences[0];
  
  if (context?.networkName) {
    return `Note sur ${context.networkName}: ${firstSentence}...`;
  }
  
  return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
}

// ============================================
// ENVOI À VOXTRAL (SI CLÉ DISPONIBLE)
// ============================================

/**
 * Envoyer le texte à Voxtral pour analyse avancée
 */
export async function sendToVoxtralForAnalysis(
  transcript: string,
  context?: any
): Promise<any> {
  const apiKey = process.env.NEXT_PUBLIC_VOXTRAL_API_KEY;
  
  if (!apiKey) {
    // Fallback to local analysis
    return analyseVoiceNote(transcript, context);
  }

  try {
    const prompt = `
Analyse cette note vocale d'un commercial Engie concernant un réseau de chaleur.

**Note :** ${transcript}

**Contexte :** ${context ? JSON.stringify(context) : 'Aucun contexte supplémentaire'}

**Tâche :**
1. Résume la note en 1-2 phrases
2. Détecte le sentiment (positif/neutre/négatif)
3. Extrais les mots-clés pertinents
4. Évalue la priorité (low/medium/high/critical)
5. Identifie les actions à entreprendre
6. Structure les données pour stockage

**Format de réponse attendu (JSON) :**
{
  "summary": "Résumé de la note",
  "sentiment": "positif|neutre|négatif",
  "keywords": ["mot1", "mot2", ...],
  "priority": "low|medium|high|critical",
  "actionItems": ["action1", "action2", ...],
  "structuredData": { ... }
}

Ne réponds que avec du JSON valide, sans commentaires.
`;

    const response = await fetch('https://api.voxtral.com/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-large',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Voxtral API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || '';

    // Parse JSON from content
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse Voxtral response:', e);
    }

    // Fallback to local analysis
    return analyseVoiceNote(transcript, context);
    
  } catch (error) {
    console.error('Error sending to Voxtral:', error);
    return analyseVoiceNote(transcript, context);
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  SpeechToText,
  getSTTInstance,
  resetSTTInstance,
  useSTT,
  analyseVoiceNote,
  sendToVoxtralForAnalysis,
  isTTSSupported: () => getSTTInstance().isSupported(),
};
