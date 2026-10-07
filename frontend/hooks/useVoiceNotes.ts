'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  VoiceNote, 
  VoiceNoteRow, 
  createVoiceNote, 
  updateVoiceNoteWithAnalysis,
  rowToVoiceNote,
} from '../types/notes';
import { Network } from '../types';
import { 
  VoxtralService, 
  getVoxtralService,
  getSTTInstance,
  analyseVoiceNote,
  sendToVoxtralForAnalysis,
} from '../lib/voxtral';

// ============================================
// TYPES
// ============================================

interface UseVoiceNotesProps {
  network: Network;
  apiKey?: string;
}

interface UseVoiceNotesReturn {
  // Notes state
  notes: VoiceNote[];
  currentNote: VoiceNote | null;
  isLoading: boolean;
  error: string | null;
  
  // Recording state
  isRecording: boolean;
  isTranscribing: boolean;
  isAnalyzing: boolean;
  transcript: string;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  saveNote: (note?: Partial<VoiceNote>) => Promise<VoiceNote | null>;
  deleteNote: (noteId: string) => Promise<void>;
  loadNotes: (reseauId: string) => Promise<void>;
  
  // Analysis
  analyseWithVoxtral: (transcript: string) => Promise<any>;
  
  // STT
  sttSupported: boolean;
}

// ============================================
// MOCK DATA STORAGE (for demo without backend)
// ============================================

// In-memory storage for voice notes (for demo purposes)
const voiceNotesStorage: Record<string, VoiceNote[]> = {};

function saveNoteToStorage(note: VoiceNote): void {
  const reseauId = note.reseauId;
  if (!voiceNotesStorage[reseauId]) {
    voiceNotesStorage[reseauId] = [];
  }
  
  // Remove existing note with same ID
  voiceNotesStorage[reseauId] = voiceNotesStorage[reseauId].filter(
    n => n.id !== note.id
  );
  
  voiceNotesStorage[reseauId].push(note);
}

function loadNotesFromStorage(reseauId: string): VoiceNote[] {
  return voiceNotesStorage[reseauId] || [];
}

function deleteNoteFromStorage(reseauId: string, noteId: string): void {
  if (!voiceNotesStorage[reseauId]) return;
  voiceNotesStorage[reseauId] = voiceNotesStorage[reseauId].filter(
    n => n.id !== noteId
  );
}

// ============================================
// MAIN HOOK
// ============================================

export function useVoiceNotes({ 
  network, 
  apiKey 
}: UseVoiceNotesProps): UseVoiceNotesReturn {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [currentNote, setCurrentNote] = useState<VoiceNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttSupported, setSttSupported] = useState(false);

  // Voxtral service
  const voxtralService = useMemo(() => getVoxtralService(apiKey), [apiKey]);
  
  // STT instance
  const sttInstance = useMemo(() => getSTTInstance(), []);

  // Check STT support
  useEffect(() => {
    setSttSupported(sttInstance.isSupported());
  }, [sttInstance]);

  // Load notes for this network
  const loadNotes = useCallback(async (reseauId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In production, this would load from Supabase
      // For demo, we use in-memory storage
      const storedNotes = loadNotesFromStorage(reseauId);
      setNotes(storedNotes);
    } catch (err) {
      setError(`Échec du chargement des notes: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!sttSupported) {
      setError('La reconnaissance vocale n\'est pas supportée dans ce navigateur');
      return;
    }

    try {
      // Create new note
      const newNote = createVoiceNote(network.id, {
        author: {
          name: 'Commercial Engie',
          role: 'Commercial',
        },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      setCurrentNote(newNote);
      setTranscript('');
      setIsRecording(true);
      setIsTranscribing(true);
      setError(null);

      // Start STT
      sttInstance.start(
        (result) => {
          setTranscript(result.transcript);
          
          // Update current note
          setCurrentNote(prev => prev ? {
            ...prev,
            transcript: result.transcript,
            isTranscribed: result.isFinal,
          } : null);
        },
        (err) => {
          setError(`Erreur de transcription: ${err}`);
          setIsRecording(false);
          setIsTranscribing(false);
        },
        () => {
          // Started
        },
        () => {
          // Stopped
          setIsRecording(false);
        }
      );

    } catch (err) {
      setError(`Échec du démarrage: ${err}`);
      setIsRecording(false);
    }
  }, [network.id, sttSupported, sttInstance]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (isRecording) {
      sttInstance.stop();
      setIsRecording(false);
    }
  }, [isRecording, sttInstance]);

  // Analyse transcript with Voxtral
  const analyseWithVoxtral = useCallback(async (transcriptText: string) => {
    if (!currentNote) return null;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Prepare context
      const context = {
        reseauId: network.id,
        networkName: network.nom_reseau,
        region: network.region,
        departement: network.departement,
        gestionnaire: network.gestionnaire,
        titulaireEstEngie: network.titulaire_est_engie,
        echeance: network.echeance,
        boampMontant: network.boamp_montant,
        scoreOpportunite: network.score_opportunite,
      };

      // Use Voxtral service for analysis
      const analysis = await voxtralService.analyseVoiceNote(transcriptText, context);
      
      return analysis;

    } catch (err) {
      setError(`Erreur d'analyse: ${err}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentNote, network, voxtralService]);

  // Save note
  const saveNote = useCallback(async (overrides?: Partial<VoiceNote>) => {
    if (!currentNote) {
      setError('Aucune note en cours');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update note with transcript
      let noteToSave = currentNote;
      
      // If we have a transcript, analyse it with Voxtral
      if (currentNote.transcript && !currentNote.isTranscribed) {
        const analysis = await analyseWithVoxtral(currentNote.transcript);
        
        if (analysis) {
          noteToSave = updateVoiceNoteWithAnalysis(currentNote, {
            summary: analysis.summary,
            sentiment: analysis.sentiment?.value || 'neutral',
            keywords: analysis.extraction?.keywords || [],
            priority: analysis.classification?.priority || 'medium',
            actionItems: analysis.recommendations?.map((r: any) => r.action) || [],
            structuredData: analysis,
          });
        }
      }

      // Apply overrides
      if (overrides) {
        noteToSave = { ...noteToSave, ...overrides };
      }

      // Mark as completed
      noteToSave = {
        ...noteToSave,
        status: 'completed',
        isTranscribed: true,
        updatedAt: new Date(),
      };

      // Save to storage
      saveNoteToStorage(noteToSave);
      
      // Update local state
      setNotes(prev => [...prev.filter(n => n.id !== noteToSave.id), noteToSave]);
      setCurrentNote(null);
      setTranscript('');

      return noteToSave;

    } catch (err) {
      setError(`Échec de la sauvegarde: ${err}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentNote, analyseWithVoxtral]);

  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      deleteNoteFromStorage(network.id, noteId);
      
      setNotes(prev => prev.filter(n => n.id !== noteId));
      
      // If current note is being deleted, clear it
      if (currentNote?.id === noteId) {
        setCurrentNote(null);
        setTranscript('');
      }

    } catch (err) {
      setError(`Échec de la suppression: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [network.id, currentNote]);

  // Auto-stop recording when we have enough transcript
  useEffect(() => {
    if (!isRecording || !isTranscribing) return;

    // If we have a significant amount of text, auto-stop
    if (transcript.length > 500) {
      stopRecording();
      setIsTranscribing(false);
    }
  }, [isRecording, isTranscribing, transcript.length, stopRecording]);

  // Return hook value
  return {
    notes,
    currentNote,
    isLoading,
    error,
    isRecording,
    isTranscribing,
    isAnalyzing,
    transcript,
    startRecording,
    stopRecording,
    saveNote,
    deleteNote,
    loadNotes,
    analyseWithVoxtral,
    sttSupported,
  };
}

// ============================================
// SUPABASE INTEGRATION HOOK (for production)
// ============================================

/**
 * Hook for Supabase integration (production version)
 * This would replace the in-memory storage with real Supabase calls
 */
export function useVoiceNotesSupabase(
  network: Network,
  supabaseClient: any,
  apiKey?: string
): UseVoiceNotesReturn {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [currentNote, setCurrentNote] = useState<VoiceNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttSupported, setSttSupported] = useState(false);

  // Voxtral service
  const voxtralService = useMemo(() => getVoxtralService(apiKey), [apiKey]);
  
  // STT instance
  const sttInstance = useMemo(() => getSTTInstance(), []);

  // Check STT support
  useEffect(() => {
    setSttSupported(sttInstance.isSupported());
  }, [sttInstance]);

  // Load notes from Supabase
  const loadNotes = useCallback(async (reseauId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // @ts-ignore - Supabase types
      const { data, error } = await supabaseClient
        .from('voice_notes')
        .select('*')
        .eq('reseau_id', reseauId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notes: VoiceNote[] = data.map(rowToVoiceNote);
      setNotes(notes);
    } catch (err) {
      setError(`Échec du chargement: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!sttSupported) {
      setError('La reconnaissance vocale n\'est pas supportée');
      return;
    }

    try {
      const newNote = createVoiceNote(network.id);
      setCurrentNote(newNote);
      setTranscript('');
      setIsRecording(true);
      setIsTranscribing(true);

      // Start STT
      sttInstance.start(
        (result) => {
          setTranscript(result.transcript);
          setCurrentNote(prev => prev ? {
            ...prev,
            transcript: result.transcript,
          } : null);
        },
        (err) => {
          setError(err);
          setIsRecording(false);
          setIsTranscribing(false);
        }
      );
    } catch (err) {
      setError(`Échec: ${err}`);
      setIsRecording(false);
    }
  }, [network.id, sttSupported, sttInstance]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (isRecording) {
      sttInstance.stop();
      setIsRecording(false);
    }
  }, [isRecording, sttInstance]);

  // Save note to Supabase
  const saveNote = useCallback(async (overrides?: Partial<VoiceNote>) => {
    if (!currentNote) return null;

    setIsLoading(true);
    setError(null);

    try {
      let noteToSave = currentNote;
      
      // Analyse with Voxtral if we have transcript
      if (currentNote.transcript && !currentNote.isTranscribed) {
        const analysis = await voxtralService.analyseVoiceNote(
          currentNote.transcript,
          network
        );
        
        if (analysis) {
          noteToSave = updateVoiceNoteWithAnalysis(currentNote, {
            summary: analysis.summary,
            sentiment: analysis.sentiment?.value || 'neutral',
            keywords: analysis.extraction?.keywords || [],
            priority: analysis.classification?.priority || 'medium',
            actionItems: analysis.recommendations?.map((r: any) => r.action) || [],
            structuredData: analysis,
          });
        }
      }

      // Apply overrides
      if (overrides) {
        noteToSave = { ...noteToSave, ...overrides };
      }

      // Convert to row format for Supabase
      const row = {
        ...voiceNoteToRow(noteToSave),
        status: 'completed',
        is_transcribed: true,
      };

      // Save to Supabase
      // @ts-ignore
      const { data, error } = await supabaseClient
        .from('voice_notes')
        .insert(row)
        .select();

      if (error) throw error;

      const savedNote = data[0] ? rowToVoiceNote(data[0]) : noteToSave;
      
      // Update local state
      setNotes(prev => [...prev.filter(n => n.id !== savedNote.id), savedNote]);
      setCurrentNote(null);
      setTranscript('');

      return savedNote;

    } catch (err) {
      setError(`Échec: ${err}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentNote, network, voxtralService, supabaseClient]);

  // Delete note from Supabase
  const deleteNote = useCallback(async (noteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // @ts-ignore
      const { error } = await supabaseClient
        .from('voice_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      // Update local state
      setNotes(prev => prev.filter(n => n.id !== noteId));
      
      if (currentNote?.id === noteId) {
        setCurrentNote(null);
        setTranscript('');
      }

    } catch (err) {
      setError(`Échec: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, currentNote]);

  // Analyse with Voxtral
  const analyseWithVoxtral = useCallback(async (transcriptText: string) => {
    if (!currentNote) return null;

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysis = await voxtralService.analyseVoiceNote(
        transcriptText,
        network
      );
      return analysis;
    } catch (err) {
      setError(`Erreur: ${err}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentNote, network, voxtralService]);

  return {
    notes,
    currentNote,
    isLoading,
    error,
    isRecording,
    isTranscribing,
    isAnalyzing,
    transcript,
    startRecording,
    stopRecording,
    saveNote,
    deleteNote,
    loadNotes,
    analyseWithVoxtral,
    sttSupported,
  };
}

// ============================================
// EXPORT
// ============================================

export default useVoiceNotes;
