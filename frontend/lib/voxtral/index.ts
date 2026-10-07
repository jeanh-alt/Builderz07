/**
 * Voxtral Integration Module
 * Builder 3 - Frontend: Intégration complète Voxtral
 * 
 * Module central pour toutes les interactions avec Voxtral dans Builderz07.
 * Inclut :
 * - Client API
 * - Speech-to-Text (Web Speech API)
 * - Text-to-Speech
 * - Analyse des notes vocales
 * - Génération de recommandations
 * - Configuration et prompts
 */

// ============================================
// EXPORTS FROM SUBMODULES
// ============================================

export * from './client';
export * from './stt';
export * from './tts';
export * from './config';

// ============================================
// MAIN VOXTRAL INTEGRATION CLASS
// ============================================

import {
  callVoxtral,
  generateNetworkRecommendation as _generateNetworkRecommendation,
  sendToVoxtralForAnalysis as _sendToVoxtralForAnalysis,
} from './client';

import {
  getVoiceNoteAnalysisPrompt,
  getNetworkRecommendationPrompt,
  getKnowledgeExtractionPrompt,
  PARAMETER_PRESETS,
  extractJSONFromResponse,
  getConfig,
  getRateLimiter,
} from './config';

import { VoiceNote, VoiceNoteRow, voiceNoteToRow } from '../../types/notes';

/**
 * Main Voxtral service class
 * Provides a unified interface for all Voxtral-related operations
 */
export class VoxtralService {
  private apiKey: string;
  private rateLimiter: ReturnType<typeof getRateLimiter>;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_VOXTRAL_API_KEY || '';
    this.rateLimiter = getRateLimiter();
  }

  /**
   * Check if Voxtral is available
   */
  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Analyse a voice note with Voxtral
   */
  async analyseVoiceNote(
    transcript: string,
    context: any = {}
  ): Promise<any> {
    if (!this.isAvailable()) {
      // Fallback to local analysis
      return this.localVoiceNoteAnalysis(transcript, context);
    }

    // Check rate limiting
    const waitTime = this.rateLimiter.waitTime();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      const { system, user } = getVoiceNoteAnalysisPrompt(transcript, context);
      
      const messages = [
        { role: 'system', content: system } as const,
        { role: 'user', content: user } as const,
      ];

      const response = await callVoxtral(messages, {
        apiKey: this.apiKey,
        model: getConfig().defaultModel,
        temperature: PARAMETER_PRESETS.VOICE_NOTE.temperature,
        max_tokens: PARAMETER_PRESETS.VOICE_NOTE.maxTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      return extractJSONFromResponse(content);

    } catch (error) {
      console.error('Voxtral analysis error:', error);
      return this.localVoiceNoteAnalysis(transcript, context);
    } finally {
      this.rateLimiter.recordRequest();
    }
  }

  /**
   * Local fallback analysis (when Voxtral is not available)
   */
  private localVoiceNoteAnalysis(transcript: string, context: any): any {
    // This is a simplified local analysis
    // In production, you might want to implement a more sophisticated fallback
    
    const lowerText = transcript.toLowerCase();
    
    // Classify
    const type = this.classifyNote(transcript);
    const priority = this.detectPriority(lowerText);
    const sentiment = this.detectSentiment(lowerText);
    
    // Extract keywords
    const keywords = this.extractKeywords(lowerText, context);
    
    // Generate summary
    const summary = this.generateSummary(transcript, context);
    
    return {
      classification: {
        type,
        priority,
      },
      extraction: {
        keywords,
        entities: {
          persons: [],
          companies: [],
          locations: [],
        },
        dates: [],
        amounts: [],
      },
      sentiment: {
        value: sentiment,
        confidence: 0.8,
      },
      summary,
      recommendations: [
        {
          action: 'Revoir la note manuellement',
          owner: 'Commercial',
          priority: 'medium',
        },
      ],
      structuredData: {
        network: {},
        commercial: {},
        market: {},
      },
    };
  }

  /**
   * Classify note type
   */
  private classifyNote(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('opportunité') || 
        lowerText.includes('potentiel') ||
        lowerText.includes('marché') ||
        lowerText.includes('contrat')) {
      return 'opportunité';
    }
    
    if (lowerText.includes('risque') || 
        lowerText.includes('problème') ||
        lowerText.includes('difficulté') ||
        lowerText.includes('danger')) {
      return 'risque';
    }
    
    if (lowerText.includes('feedback') || 
        lowerText.includes('retour') ||
        lowerText.includes('satisfaction') ||
        lowerText.includes('avis')) {
      return 'feedback';
    }
    
    if (lowerText.includes('?') || 
        lowerText.includes('comment') ||
        lowerText.includes('pourquoi') ||
        lowerText.includes('qui') ||
        lowerText.includes('quoi')) {
      return 'question';
    }
    
    return 'information';
  }

  /**
   * Detect priority
   */
  private detectPriority(text: string): 'critical' | 'high' | 'medium' | 'low' {
    const criticalKeywords = ['urgent', 'immédiat', 'dès maintenant', 'priorité absolue', 'critique'];
    const highKeywords = ['important', 'fort', 'excellente', 'opportunité', 'priorité', 'à surveiller'];
    const lowKeywords = ['faible', 'peu', 'peu important', 'secondaire'];
    
    if (criticalKeywords.some(kw => text.includes(kw))) return 'critical';
    if (highKeywords.some(kw => text.includes(kw))) return 'high';
    if (lowKeywords.some(kw => text.includes(kw))) return 'low';
    return 'medium';
  }

  /**
   * Detect sentiment
   */
  private detectSentiment(text: string): 'positif' | 'neutre' | 'négatif' | 'urgent' {
    const positiveWords = ['bon', 'excellente', 'super', 'parfait', 'opportunité', 'fort', 'intéressant'];
    const negativeWords = ['mauvais', 'problème', 'risque', 'difficile', 'négatif', 'dangereux'];
    const urgentWords = ['urgent', 'immédiat', 'dès maintenant', 'vite'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    const urgentCount = urgentWords.filter(word => text.includes(word)).length;
    
    if (urgentCount > 0) return 'urgent';
    if (positiveCount > negativeCount) return 'positif';
    if (negativeCount > positiveCount) return 'négatif';
    return 'neutre';
  }

  /**
   * Extract keywords
   */
  private extractKeywords(text: string, context: any): string[] {
    const keywords: Set<string> = new Set();
    
    // Add context keywords
    if (context) {
      if (context.networkName) keywords.add(context.networkName.toLowerCase());
      if (context.region) keywords.add(context.region.toLowerCase());
      if (context.gestionnaire) keywords.add(context.gestionnaire.toLowerCase());
    }
    
    // Add generic keywords
    const genericKeywords = [
      'réseau', 'chaleur', 'engie', 'marché', 'contrat', 'échéance',
      'opportunité', 'concurrence', 'client', 'pdl', 'montant',
      'renouvellement', 'ao', 'boamp', 'ted', 'enr'
    ];
    
    genericKeywords.forEach(kw => {
      if (text.includes(kw)) {
        keywords.add(kw);
      }
    });
    
    // Extract from text
    const words = text.split(/\s+/);
    words.forEach(word => {
      if (word.length > 4 && !keywords.has(word)) {
        keywords.add(word);
      }
    });
    
    return Array.from(keywords).slice(0, 10);
  }

  /**
   * Generate summary
   */
  private generateSummary(text: string, context: any): string {
    const sentences = text.split('. ').filter(s => s.trim().length > 0);
    const firstSentence = sentences[0];
    
    if (context?.networkName) {
      return `Note sur ${context.networkName}: ${firstSentence.length > 80 ? firstSentence.substring(0, 80) + '...' : firstSentence}`;
    }
    
    return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
  }

  /**
   * Generate network recommendation with Voxtral
   */
  async generateNetworkRecommendation(
    network: any,
    voiceNotes?: string[]
  ): Promise<any> {
    if (!this.isAvailable()) {
      return this.localNetworkRecommendation(network, voiceNotes);
    }

    const { system, user } = getNetworkRecommendationPrompt(network, voiceNotes);
    
    const messages = [
      { role: 'system', content: system } as const,
      { role: 'user', content: user } as const,
    ];

    try {
      const response = await callVoxtral(messages, {
        apiKey: this.apiKey,
        model: getConfig().defaultModel,
        temperature: PARAMETER_PRESETS.ANALYSIS.temperature,
        max_tokens: PARAMETER_PRESETS.ANALYSIS.maxTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      return extractJSONFromResponse(content);

    } catch (error) {
      console.error('Voxtral recommendation error:', error);
      return this.localNetworkRecommendation(network, voiceNotes);
    }
  }

  /**
   * Local fallback for network recommendation
   */
  private localNetworkRecommendation(network: any, voiceNotes?: string[]): any {
    // Simple local recommendation based on network data
    const score = network.score_opportunite || 0;
    const isEngie = network.titulaire_est_engie === 'ENGIE';
    const hasEcheance = network.echeance && new Date(network.echeance) > new Date();
    
    let decision: string;
    let rationale: string;
    
    if (score >= 0.8) {
      decision = 'pursue';
      rationale = `Score élevé (${(score * 100).toFixed(0)}%) avec ${isEngie ? 'réseau géré par Engie' : 'opportunité de prise de marché'}`;
    } else if (score >= 0.6) {
      decision = 'monitor';
      rationale = `Score moyen (${(score * 100).toFixed(0)}%) à surveiller`;
    } else {
      decision = hasEcheance ? 'assess' : 'avoid';
      rationale = `Score faible (${(score * 100).toFixed(0)}%) ${hasEcheance ? 'mais échéance proche' : ''}`;
    }
    
    return {
      evaluation: {
        globalScore: Math.round(score * 10),
        attractiveness: score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low',
        riskLevel: isEngie ? 'low' : 'medium',
        confidence: 'medium',
      },
      levers: [
        {
          type: 'score',
          description: `Score d'opportunité de ${(score * 100).toFixed(0)}%`,
          impact: score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low',
          value: (score * 100).toFixed(0) + '%',
        },
      ],
      opportunities: [
        {
          description: isEngie ? 'Renouvellement du contrat' : 'Prise de marché',
          potential: isEngie ? 'medium' : 'high',
          actionRequired: 'Contacter le MO',
        },
      ],
      risks: [],
      actionPlan: {
        shortTerm: [
          {
            action: 'Analyser le dossier',
            owner: 'Commercial',
            deadline: '1 semaine',
            priority: 'high',
          },
        ],
        mediumTerm: [],
        longTerm: [],
      },
      recommendation: {
        decision,
        rationale,
        expectedOutcome: `Développement du portefeuille Engie`,
        investmentLevel: score >= 0.8 ? 'high' : 'medium',
      },
      nextSteps: [],
    };
  }

  /**
   * Extract knowledge from multiple voice notes
   */
  async extractKnowledge(
    notes: string[],
    networkId: string
  ): Promise<any> {
    if (!this.isAvailable()) {
      return this.localKnowledgeExtraction(notes, networkId);
    }

    const { system, user } = getKnowledgeExtractionPrompt(notes, networkId);
    
    const messages = [
      { role: 'system', content: system } as const,
      { role: 'user', content: user } as const,
    ];

    try {
      const response = await callVoxtral(messages, {
        apiKey: this.apiKey,
        model: getConfig().defaultModel,
        temperature: PARAMETER_PRESETS.ANALYSIS.temperature,
        max_tokens: PARAMETER_PRESETS.ANALYSIS.maxTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      return extractJSONFromResponse(content);

    } catch (error) {
      console.error('Voxtral knowledge extraction error:', error);
      return this.localKnowledgeExtraction(notes, networkId);
    }
  }

  /**
   * Local fallback for knowledge extraction
   */
  private localKnowledgeExtraction(notes: string[], networkId: string): any {
    return {
      commercialRelationships: [],
      marketIntelligence: {
        competitors: [],
        marketTrends: [],
        emergingOpportunities: [],
      },
      technicalInsights: {
        actualStatus: 'À vérifier',
        ongoingProjects: [],
        innovations: [],
        maintenanceIssues: [],
      },
      clientFeedback: {
        satisfaction: 'unknown',
        issues: [],
        bestPractices: [],
        suggestions: [],
      },
      predictions: {
        actualDeadlines: [],
        clientIntentions: [],
        commercialOpportunities: [],
      },
      metadata: {
        networkId,
        extractionDate: new Date().toISOString(),
        source: 'voice_notes',
        confidence: 0.5,
      },
    };
  }

  /**
   * Batch process voice notes for a network
   */
  async processVoiceNotesForNetwork(
    network: any,
    notes: VoiceNote[]
  ): Promise<{
    network: any;
    notes: VoiceNote[];
    analysis: any;
    knowledge: any;
  }> {
    // Transcribe and analyze each note
    const analyzedNotes = await Promise.all(
      notes.map(async note => {
        if (!note.isTranscribed && note.audioBlob) {
          // In a real implementation, we would transcribe the audio here
          // For now, we assume the note already has a transcript
        }
        
        if (note.transcript) {
          const analysis = await this.analyseVoiceNote(note.transcript, {
            reseauId: network.id,
            networkName: network.nom_reseau,
            region: network.region,
            gestionnaire: network.gestionnaire,
          });
          
          return updateVoiceNoteWithAnalysis(note, analysis);
        }
        
        return note;
      })
    );

    // Extract knowledge from all notes
    const knowledge = await this.extractKnowledge(
      analyzedNotes.map(n => n.transcript).filter(t => t),
      network.id
    );

    // Generate network recommendation
    const analysis = await this.generateNetworkRecommendation(
      network,
      analyzedNotes.map(n => n.transcript)
    );

    return {
      network,
      notes: analyzedNotes,
      analysis,
      knowledge,
    };
  }

  /**
   * Get Voxtral usage statistics
   */
  getStats(): {
    requestsMade: number;
    canMakeRequest: boolean;
    waitTime: number;
  } {
    const requestsMade = this.rateLimiter['requests']?.length || 0;
    const canMakeRequest = this.rateLimiter.canRequest();
    const waitTime = this.rateLimiter.waitTime();
    
    return {
      requestsMade,
      canMakeRequest,
      waitTime,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let voxtralService: VoxtralService | null = null;

/**
 * Get the singleton VoxtralService instance
 */
export function getVoxtralService(apiKey?: string): VoxtralService {
  if (!voxtralService) {
    voxtralService = new VoxtralService(apiKey);
  }
  return voxtralService;
}

/**
 * Reset the singleton instance
 */
export function resetVoxtralService(): void {
  voxtralService = null;
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  VoxtralService,
  getVoxtralService,
  resetVoxtralService,
  // Re-export everything
  ...require('./client'),
  ...require('./stt'),
  ...require('./tts'),
  ...require('./config'),
};
