/**
 * Types for Voice Notes and Terrain Knowledge
 * Builder 3 - Frontend: Capture de connaissance terrain
 */

import { NetworkStatus } from './index';

// ============================================
// VOICE NOTE TYPES
// ============================================

/**
 * Represents a voice note recorded by a commercial
 */
export interface VoiceNote {
  id: string;
  reseauId: string;
  
  // Audio data
  audioUrl?: string;
  audioBlob?: Blob;
  duration?: number; // in seconds
  
  // Transcription
  transcript: string;
  isTranscribed: boolean;
  
  // Analysis
  summary?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionItems: string[];
  
  // Structured data from Voxtral analysis
  structuredData?: VoiceNoteStructuredData;
  
  // Metadata
  author?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  
  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Status
  status: VoiceNoteStatus;
  
  // Tags for categorization
  tags?: string[];
  
  // Rating/feedback
  rating?: number; // 1-5 stars
  feedback?: string;
}

/**
 * Status of a voice note
 */
export type VoiceNoteStatus = 
  | 'draft'           // Being recorded
  | 'transcribing'    // Audio is being transcribed
  | 'analyzing'      // Text is being analyzed by Voxtral
  | 'completed'      // All processing done
  | 'archived'       // Note is archived
  | 'deleted';       // Note is deleted (soft delete)

/**
 * Structured data extracted from voice note analysis
 */
export interface VoiceNoteStructuredData {
  // Network-related information
  network?: {
    name?: string;
    region?: string;
    departement?: string;
    gestionnaire?: string;
    status?: NetworkStatus;
  };
  
  // Commercial information
  commercial?: {
    contact?: string;
    company?: string;
    relationship?: string;
  };
  
  // Contract/market information
  market?: {
    size?: number;
    potential?: string;
    competition?: string[];
    timeline?: {
      current?: string;
      nextSteps?: string[];
      deadlines?: string[];
    };
  };
  
  // Opportunities and risks
  opportunities?: string[];
  risks?: string[];
  challenges?: string[];
  
  // Recommandations
  recommendations?: string[];
  
  // Action plan
  actionPlan?: {
    shortTerm?: string[];
    mediumTerm?: string[];
    longTerm?: string[];
    owners?: string[];
    deadlines?: string[];
  };
  
  // Additional context
  context?: {
    source?: string;
    reliability?: 'low' | 'medium' | 'high';
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
}

// ============================================
// CREATE/UPDATE FUNCTIONS
// ============================================

/**
 * Create a new voice note with default values
 */
export function createVoiceNote(
  reseauId: string,
  overrides?: Partial<VoiceNote>
): VoiceNote {
  return {
    id: generateId(),
    reseauId,
    transcript: '',
    isTranscribed: false,
    sentiment: 'neutral',
    keywords: [],
    priority: 'medium',
    actionItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'draft',
    ...overrides,
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Update voice note with analysis results
 */
export function updateVoiceNoteWithAnalysis(
  note: VoiceNote,
  analysis: {
    summary?: string;
    sentiment?: VoiceNote['sentiment'];
    keywords?: string[];
    priority?: VoiceNote['priority'];
    actionItems?: string[];
    structuredData?: VoiceNoteStructuredData;
  }
): VoiceNote {
  return {
    ...note,
    summary: analysis.summary || note.summary,
    sentiment: analysis.sentiment || note.sentiment,
    keywords: analysis.keywords || note.keywords,
    priority: analysis.priority || note.priority,
    actionItems: analysis.actionItems || note.actionItems,
    structuredData: analysis.structuredData || note.structuredData,
    status: 'completed',
    isTranscribed: true,
    updatedAt: new Date(),
  };
}

// ============================================
// DATABASE TYPES (FOR SUPABASE)
// ============================================

/**
 * Voice note as stored in the database
 */
export interface VoiceNoteRow {
  id: string;
  reseau_id: string;
  
  // Audio data (URLs for Supabase Storage)
  audio_url?: string;
  
  // Transcription
  transcript: string;
  is_transcribed: boolean;
  
  // Analysis
  summary?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[]; // JSON array
  priority: 'low' | 'medium' | 'high' | 'critical';
  action_items: string[]; // JSON array
  
  // Structured data (JSON)
  structured_data?: any;
  
  // Metadata
  author_id?: string;
  author_name?: string;
  author_email?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Status
  status: VoiceNoteStatus;
  
  // Tags
  tags?: string[]; // JSON array
}

/**
 * Convert VoiceNote to VoiceNoteRow (for database storage)
 */
export function voiceNoteToRow(note: VoiceNote): VoiceNoteRow {
  return {
    id: note.id,
    reseau_id: note.reseauId,
    audio_url: note.audioUrl,
    transcript: note.transcript,
    is_transcribed: note.isTranscribed,
    summary: note.summary,
    sentiment: note.sentiment,
    keywords: note.keywords,
    priority: note.priority,
    action_items: note.actionItems,
    structured_data: note.structuredData,
    author_id: note.author?.id,
    author_name: note.author?.name,
    author_email: note.author?.email,
    created_at: typeof note.createdAt === 'string' ? note.createdAt : note.createdAt.toISOString(),
    updated_at: typeof note.updatedAt === 'string' ? note.updatedAt : note.updatedAt.toISOString(),
    status: note.status,
    tags: note.tags,
  };
}

/**
 * Convert VoiceNoteRow to VoiceNote (for application use)
 */
export function rowToVoiceNote(row: VoiceNoteRow): VoiceNote {
  return {
    id: row.id,
    reseauId: row.reseau_id,
    audioUrl: row.audio_url,
    transcript: row.transcript,
    isTranscribed: row.is_transcribed,
    summary: row.summary,
    sentiment: row.sentiment,
    keywords: row.keywords || [],
    priority: row.priority,
    actionItems: row.action_items || [],
    structuredData: row.structured_data,
    author: row.author_id ? {
      id: row.author_id,
      name: row.author_name,
      email: row.author_email,
    } : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    tags: row.tags || [],
  };
}

// ============================================
// FILTER AND SEARCH TYPES
// ============================================

/**
 * Filters for voice notes
 */
export interface VoiceNoteFilters {
  reseauId?: string;
  authorId?: string;
  status?: VoiceNoteStatus | VoiceNoteStatus[];
  sentiment?: VoiceNote['sentiment'] | VoiceNote['sentiment'][];
  priority?: VoiceNote['priority'] | VoiceNote['priority'][];
  keyword?: string;
  tag?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of searching voice notes
 */
export interface VoiceNoteSearchResult {
  notes: VoiceNote[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// API TYPES
// ============================================

/**
 * Request to create a voice note
 */
export interface CreateVoiceNoteRequest {
  reseauId: string;
  audioBlob?: Blob;
  transcript?: string;
  author?: {
    id?: string;
    name?: string;
    email?: string;
  };
  tags?: string[];
}

/**
 * Response from voice note creation
 */
export interface CreateVoiceNoteResponse {
  note: VoiceNote;
  audioUrl?: string;
  success: boolean;
  message?: string;
}

/**
 * Request to update a voice note
 */
export interface UpdateVoiceNoteRequest {
  id: string;
  transcript?: string;
  summary?: string;
  sentiment?: VoiceNote['sentiment'];
  keywords?: string[];
  priority?: VoiceNote['priority'];
  actionItems?: string[];
  structuredData?: VoiceNoteStructuredData;
  status?: VoiceNoteStatus;
  tags?: string[];
  rating?: number;
  feedback?: string;
}

export default {
  VoiceNote,
  VoiceNoteStatus,
  VoiceNoteStructuredData,
  VoiceNoteRow,
  VoiceNoteFilters,
  VoiceNoteSearchResult,
  CreateVoiceNoteRequest,
  CreateVoiceNoteResponse,
  UpdateVoiceNoteRequest,
  createVoiceNote,
  updateVoiceNoteWithAnalysis,
  voiceNoteToRow,
  rowToVoiceNote,
};
