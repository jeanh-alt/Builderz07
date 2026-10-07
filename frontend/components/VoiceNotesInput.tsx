'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSTT, sendToVoxtralForAnalysis, analyseVoiceNote } from '../lib/voxtral/stt';
import { VoiceNote, VoiceNoteStatus, createVoiceNote, updateVoiceNoteWithAnalysis } from '../types/notes';
import { Network } from '../types';

// ============================================
// TYPES
// ============================================

interface VoiceNotesInputProps {
  network: Network;
  onNoteSaved: (note: VoiceNote) => void;
  onNoteCreated: (note: VoiceNote) => void;
  onError: (error: string) => void;
  existingNotes?: VoiceNote[];
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const RECORDING_STATES = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  PLAYING: 'playing',
} as const;

type RecordingState = typeof RECORDING_STATES[keyof typeof RECORDING_STATES];

const MAX_RECORDING_DURATION = 5 * 60 * 1000; // 5 minutes in ms
const WAVEFORM_COLOR = '#00A86B';
const WAVEFORM_BG_COLOR = '#E3F5E8';

// ============================================
// AUDIO VISUALIZATION
// ============================================

function AudioWaveform({ 
  isActive = false, 
  isListening = false 
}: {
  isActive: boolean;
  isListening: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const amplitude = isListening ? height * 0.4 : height * 0.2;
    const frequency = isListening ? 0.02 : 0.01;
    const phaseShift = isActive ? 0.1 : 0;

    // Draw waveform
    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let x = 0; x < width; x++) {
      const y = centerY + Math.sin(x * frequency + Date.now() * 0.002 + phaseShift) * amplitude;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = isActive ? WAVEFORM_COLOR : WAVEFORM_BG_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw circular indicator
    if (isActive) {
      ctx.beginPath();
      ctx.arc(width / 2, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = WAVEFORM_COLOR;
      ctx.fill();
    }
  }, [isActive, isListening]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const animate = () => {
      drawWaveform();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawWaveform]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-8 rounded-lg"
      aria-hidden="true"
    />
  );
}

// ============================================
// TIMER COMPONENT
// ============================================

function RecordingTimer({ 
  startTime, 
  isActive 
}: {
  startTime: number | null;
  isActive: boolean;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className={`text-sm font-mono ${elapsedTime > MAX_RECORDING_DURATION - 30000 ? 'text-red-500 animate-pulse' : ''}`}>
      {formatTime(elapsedTime)}
    </span>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function VoiceNotesInput({
  network,
  onNoteSaved,
  onNoteCreated,
  onError,
  existingNotes = [],
  className = '',
}: VoiceNotesInputProps) {
  const [currentNote, setCurrentNote] = useState<VoiceNote | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>(RECORDING_STATES.IDLE);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [showExistingNotes, setShowExistingNotes] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // STT Hook
  const {
    startListening,
    stopListening,
    transcript,
    isListening,
    isSupported: isSTTSupported,
    error: sttError,
    reset: resetSTT,
  } = useSTT();

  // Sync recording state with STT state
  useEffect(() => {
    if (isListening) {
      setRecordingState(RECORDING_STATES.RECORDING);
    } else if (recordingState === RECORDING_STATES.RECORDING) {
      setRecordingState(RECORDING_STATES.IDLE);
    }
  }, [isListening, recordingState]);

  // Handle STT errors
  useEffect(() => {
    if (sttError) {
      onError(sttError);
    }
  }, [sttError, onError]);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ============================================
  // RECORDING FUNCTIONS
  // ============================================

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      // Reset previous state
      resetSTT();
      setAudioChunks([]);
      setAudioUrl('');
      setStartTime(Date.now());

      // Create new note
      const newNote = createVoiceNote(network.id, {
        author: {
          name: 'Commercial Engie',
          role: 'Commercial',
        },
        status: 'draft',
      });
      setCurrentNote(newNote);

      // Start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        setAudioChunks(prev => [...prev, event.data]);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      
      // Start recording
      recorder.start(1000); // Collect data every 1 second
      
      // Start STT
      startListening(
        (result) => {
          // Update note transcript
          if (currentNote) {
            setCurrentNote(prev => prev ? {
              ...prev,
              transcript: result.transcript,
              isTranscribed: result.isFinal,
            } : null);
          }
        },
        (error) => {
          onError(`Erreur de transcription: ${error}`);
        }
      );

      setRecordingState(RECORDING_STATES.RECORDING);

    } catch (error) {
      console.error('Error starting recording:', error);
      onError('Impossible de démarrer l\'enregistrement. Vérifiez les permissions du microphone.');
    }
  }, [network.id, resetSTT, startListening, currentNote, onError]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorder && recordingState === RECORDING_STATES.RECORDING) {
      mediaRecorder.stop();
      stopListening();
      setRecordingState(RECORDING_STATES.IDLE);
      setStartTime(null);
    }
  }, [mediaRecorder, recordingState, stopListening]);

  /**
   * Play recorded audio
   */
  const playAudio = useCallback(() => {
    if (!audioUrl) return;
    
    const audio = new Audio(audioUrl);
    audio.play();
    setRecordingState(RECORDING_STATES.PLAYING);
    
    audio.onended = () => {
      setRecordingState(RECORDING_STATES.IDLE);
    };
  }, [audioUrl]);

  /**
   * Stop playing audio
   */
  const stopPlayback = useCallback(() => {
    // In a real implementation, we would pause all audio elements
    // For now, just reset the state
    setRecordingState(RECORDING_STATES.IDLE);
  }, []);

  /**
   * Process recorded audio and transcript
   */
  const processRecording = useCallback(async () => {
    if (!currentNote || !audioChunks.length) return;

    setRecordingState(RECORDING_STATES.PROCESSING);
    setIsAnalyzing(true);

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioObjectUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioObjectUrl);

      // Update note with audio
      const noteWithAudio = {
        ...currentNote,
        audioBlob,
        audioUrl: audioObjectUrl,
        duration: audioChunks.reduce((acc, chunk) => acc + chunk.size, 0) / 1000, // Approximate duration
        transcript: transcript || currentNote.transcript,
        isTranscribed: true,
      };
      setCurrentNote(noteWithAudio);

      // Analyze with Voxtral
      const analysis = await sendToVoxtralForAnalysis(
        noteWithAudio.transcript,
        {
          reseauId: network.id,
          networkName: network.nom_reseau,
          region: network.region,
          gestionnaire: network.gestionnaire,
          status: currentNote.status,
        }
      );

      // Update note with analysis
      const analyzedNote = updateVoiceNoteWithAnalysis(noteWithAudio, analysis);
      setCurrentNote(analyzedNote);
      setRecordingState(RECORDING_STATES.IDLE);

      // Notify parent
      onNoteCreated(analyzedNote);

    } catch (error) {
      console.error('Error processing recording:', error);
      onError('Erreur lors du traitement de l\'enregistrement');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentNote, audioChunks, transcript, network, onError, onNoteCreated]);

  /**
   * Save note to database
   */
  const saveNote = useCallback(async () => {
    if (!currentNote) return;

    // In a real implementation, this would save to Supabase
    // For now, we just notify the parent
    onNoteSaved(currentNote);
    
    // Reset state
    setCurrentNote(null);
    setAudioChunks([]);
    setAudioUrl('');
    resetSTT();
  }, [currentNote, onNoteSaved, resetSTT]);

  /**
   * Cancel current recording
   */
  const cancelRecording = useCallback(() => {
    stopRecording();
    resetSTT();
    setCurrentNote(null);
    setAudioChunks([]);
    setAudioUrl('');
    setStartTime(null);
    setRecordingState(RECORDING_STATES.IDLE);
  }, [stopRecording, resetSTT]);

  // ============================================
  // AUTO-PROCESS WHEN STOPPED
  // ============================================

  useEffect(() => {
    if (recordingState === RECORDING_STATES.IDLE && 
        currentNote && 
        audioChunks.length > 0 &&
        !isAnalyzing) {
      // Auto-process when recording is stopped
      processRecording();
    }
  }, [recordingState, currentNote, audioChunks.length, isAnalyzing, processRecording]);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + K to start/stop recording
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault();
        if (recordingState === RECORDING_STATES.RECORDING) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingState, startRecording, stopRecording]);

  // ============================================
  // RENDER
  // ============================================

  const isRecording = recordingState === RECORDING_STATES.RECORDING;
  const isProcessing = recordingState === RECORDING_STATES.PROCESSING || isAnalyzing;
  const hasAudio = audioUrl && audioUrl.length > 0;
  const hasTranscript = currentNote?.transcript && currentNote.transcript.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Voice Input Card */}
      <div 
        className={`
          bg-white rounded-xl shadow-lg border-2 p-5
          ${isRecording ? 'border-engie-primary' : 'border-gray-200'}
          transition-all duration-200
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${isRecording ? 'bg-engie-primary' : 'bg-gray-100'}
              transition-colors duration-200
            `}>
              <span className={`text-2xl ${isRecording ? 'text-white' : 'text-engie-primary'}`}>
                {isRecording ? '🎤' : '💬'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-engie-text-dark">
                Ajouter une note vocale
              </h3>
              <p className="text-sm text-engie-text-medium">
                Partagez votre connaissance terrain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRecording && !isProcessing && hasTranscript && (
              <button
                onClick={saveNote}
                disabled={!currentNote || isProcessing}
                className="btn-primary text-sm"
              >
                ✓ Enregistrer
              </button>
            )}
            {(isRecording || hasTranscript) && (
              <button
                onClick={cancelRecording}
                disabled={isProcessing}
                className="px-4 py-2 text-sm text-engie-text-medium hover:text-engie-primary transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        {/* Waveform and Timer */}
        <div className="mb-4">
          <AudioWaveform isActive={isRecording} isListening={isListening} />
          <div className="flex justify-between items-center mt-2">
            <RecordingTimer startTime={startTime} isActive={isRecording} />
            {isSupported() && (
              <span className="text-xs text-engie-text-medium">
                Raccourci: Ctrl+Shift+K
              </span>
            )}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex justify-center gap-4 mb-4">
          
          {/* Record Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              shadow-lg transition-all duration-200
              ${isRecording 
                ? 'bg-red-500 text-white ring-4 ring-red-200' 
                : 'bg-engie-primary text-white hover:bg-engie-primary-dark'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
            aria-busy={isProcessing}
            tabIndex={0}
          >
            <span className="text-2xl">
              {isRecording ? '⏹️' : isProcessing ? '🔄' : '🎤'}
            </span>
          </button>

          {/* Play Button (visible after recording) */}
          {hasAudio && !isRecording && (
            <button
              onClick={playAudio}
              className="w-14 h-14 rounded-full bg-engie-primary-light text-engie-primary flex items-center justify-center shadow-lg hover:bg-engie-primary hover:text-white transition-all duration-200"
              aria-label="Écouter l\'enregistrement"
              tabIndex={0}
            >
              <span className="text-xl">▶️</span>
            </button>
          )}
        </div>

        {/* Status Messages */}
        {!isSTTSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <span className="text-yellow-600 font-medium">⚠️ </span>
            La reconnaissance vocale n'est pas supportée dans ce navigateur.
            Vous pouvez toujours enregistrer l'audio manuellement.
          </div>
        )}

        {isRecording && (
          <div className="bg-engie-primary-light border border-engie-primary rounded-lg p-3 text-sm">
            <span className="text-engie-primary font-medium">🎤 </span>
            Enregistrement en cours... Parlez normalement.
          </div>
        )}

        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <span className="text-blue-600 font-medium">🤖 </span>
            Analyse de votre note avec Voxtral...
          </div>
        )}

        {/* Transcript */}
        {hasTranscript && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-engie-primary">📝</span>
              <span className="font-medium text-engie-text-dark">Transcription</span>
            </div>
            <p className="text-sm text-engie-text-medium whitespace-pre-wrap">
              {currentNote?.transcript || ''}
            </p>
          </div>
        )}

        {/* Analysis Results */}
        {currentNote?.isTranscribed && !isProcessing && (
          <div className="bg-gradient-to-r from-engie-primary-light to-engie-secondary-light rounded-lg p-4">
            <h4 className="font-medium text-engie-text-dark mb-3 flex items-center gap-2">
              <span>🤖</span>
              Analyse Voxtral
            </h4>
            
            <div className="space-y-3">
              {/* Priority */}
              <div className="flex items-center gap-3">
                <span className="text-engie-text-medium">Priorité:</span>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${currentNote.priority === 'critical' ? 'bg-red-100 text-red-600' :
                    currentNote.priority === 'high' ? 'bg-yellow-100 text-yellow-600' :
                    currentNote.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }
                `}>
                  {currentNote.priority}
                </span>
              </div>

              {/* Sentiment */}
              <div className="flex items-center gap-3">
                <span className="text-engie-text-medium">Sentiment:</span>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${currentNote.sentiment === 'positive' ? 'bg-green-100 text-green-600' :
                    currentNote.sentiment === 'negative' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }
                `}>
                  {currentNote.sentiment}
                </span>
              </div>

              {/* Keywords */}
              {currentNote.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-engie-text-medium">Mots-clés:</span>
                  <div className="flex flex-wrap gap-1">
                    {currentNote.keywords.slice(0, 5).map((keyword, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-white text-engie-primary text-xs rounded-full border border-engie-primary-light"
                      >
                        {keyword}
                      </span>
                    ))}
                    {currentNote.keywords.length > 5 && (
                      <span className="px-2 py-1 bg-white text-engie-text-medium text-xs rounded-full">
                        +{currentNote.keywords.length - 5} autres
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              {currentNote.summary && (
                <div className="pt-3 border-t border-gray-300">
                  <span className="text-engie-text-medium font-medium">Résumé:</span>
                  <p className="text-sm text-engie-text-dark mt-1">
                    {currentNote.summary}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Existing Notes */}
      {existingNotes.length > 0 && (
        <>
          <button
            onClick={() => setShowExistingNotes(!showExistingNotes)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-engie-text-dark flex items-center gap-2">
              <span>📚</span>
              Notes existantes ({existingNotes.length})
            </span>
            <span className={`transform transition-transform ${showExistingNotes ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showExistingNotes && (
            <div className="space-y-3">
              {existingNotes.map((note, index) => (
                <div 
                  key={note.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
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
                    
                    <button
                      onClick={() => {/* Play note audio */}}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Écouter la note"
                    >
                      <span className="text-lg">▶️</span>
                    </button>
                  </div>
                  
                  <p className="text-sm text-engie-text-medium mb-2">
                    {note.summary || note.transcript.substring(0, 100) + '...'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {note.keywords.slice(0, 3).map((keyword, i) => (
                      <span 
                        key={i}
                        className="px-2 py-1 bg-gray-100 text-engie-text-medium text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Microphone Permission Notice */}
      {!isRecording && !hasTranscript && (
        <div className="text-xs text-engie-text-medium text-center">
          {isSTTSupported 
            ? 'Cliquez sur le microphone ou utilisez le raccourci Ctrl+Shift+K pour commencer.'
            : 'Votre navigateur ne supporte pas la reconnaissance vocale.'
          }
        </div>
      )}
    </div>
  );
}

// ============================================
// SUPPORT CHECK
// ============================================

function isSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
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
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }
`;

if (typeof document !== 'undefined') {
  const styleId = 'voice-notes-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}

export default VoiceNotesInput;
