/**
 * Voxtral Configuration for Builderz07
 * Builder 3 - Frontend: Intégration Voxtral optimisée pour la connaissance terrain
 * 
 * Configuration des prompts, paramètres et workflows pour une intégration
 * efficace de Voxtral dans le cadre de l'enrichissement des données
 * commerciales Engie sur les réseaux de chaleur.
 */

// ============================================
// VOXTRAL CONFIGURATION
// ============================================

export interface VoxtralConfig {
  // API Configuration
  apiUrl: string;
  defaultModel: string;
  
  // Default parameters
  temperature: number;
  maxTokens: number;
  
  // Rate limiting
  maxRequestsPerMinute: number;
  requestTimeout: number;
  
  // Retry policy
  maxRetries: number;
  retryDelay: number;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: VoxtralConfig = {
  apiUrl: 'https://api.voxtral.com/v1/chat',
  defaultModel: 'mistral-large',
  temperature: 0.3, // Lower temperature for more deterministic outputs
  maxTokens: 1000,
  maxRequestsPerMinute: 30,
  requestTimeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second between retries
};

export function getConfig(): VoxtralConfig {
  return DEFAULT_CONFIG;
}

// ============================================
// PROMPT TEMPLATES
// ============================================

/**
 * Base system prompt for all Voxtral interactions
 * Provides context about Engie and the task at hand
 */
const BASE_SYSTEM_PROMPT = `
Tu es un **expert senior en analyse commerciale** chez **Engie Solutions**, spécialisé dans les réseaux de chaleur en France.

**Ton rôle :**
- Analyser les informations fournies avec précision
- Extraire des insights actionnables pour les équipes commerciales
- Structurer les données de manière optimale pour l'intégration dans les systèmes Engie
- Fournir des recommandations stratégiques basées sur les données du marché

**Contexte Engie :**
- Engie est leader français des réseaux de chaleur
- Objectif : Développer le portefeuille en ciblant les marchés stratégiques
- Besoin : Capitaliser sur la connaissance terrain des commerciaux

**Règles à respecter :**
1. Réponds toujours en **français**
2. Sois **précis, concis et actionnable**
3. Utilise le vocabulaire métier Engie
4. Structure tes réponses de manière claire
5. Priorise les informations stratégiques

**Vocabulaire spécifique :**
- PDL = Points de Livraison
- MO = Maître d'Ouvrage
- AO = Appel d'Offres
- EnR&R = Énergies Renouvelables et de Récupération
- TED = Tenders Electronic Daily (plateforme européenne des marchés publics)
- BOAMP = Bulletin Officiel des Annonces des Marchés Publics
`;

// ============================================
// VOICE NOTE ANALYSIS PROMPT
// ============================================

/**
 * Prompt pour l'analyse des notes vocales des commerciaux
 * Extrait : sentiment, priorité, mots-clés, actions, résumé, données structurées
 */
export function getVoiceNoteAnalysisPrompt(
  transcript: string,
  context: {
    reseauId?: string;
    networkName?: string;
    region?: string;
    departement?: string;
    gestionnaire?: string;
    titulaireEstEngie?: string;
    echeance?: string;
    boampMontant?: number;
    scoreOpportunite?: number;
  }
): { system: string; user: string } {
  const contextString = `
**Contexte du réseau :**
- ID : ${context.reseauId || 'non spécifié'}
- Nom : ${context.networkName || 'non spécifié'}
- Région : ${context.region || 'non spécifiée'}
- Département : ${context.departement || 'non spécifié'}
- Gestionnaire : ${context.gestionnaire || 'non spécifié'}
- Titulaire : ${context.titulaireEstEngie === 'ENGIE' ? '✅ ENGIE' : context.titulaireEstEngie === 'Concurrent' ? '❌ Concurrent' : '⚪ Inconnu'}
- Échéance : ${context.echeance || 'non spécifiée'}
- Montant marché : ${context.boampMontant ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(context.boampMontant) : 'non spécifié'}
- Score opportunité : ${context.scoreOpportunite ? (context.scoreOpportunite * 100).toFixed(0) + '%' : 'non calculé'}
`;

  return {
    system: BASE_SYSTEM_PROMPT,
    user: `
Analyse cette **note vocale** enregistrée par un commercial Engie concernant un réseau de chaleur :

**Note vocale :** """
${transcript}
"""

${contextString}

**Tâches à exécuter :**

1. **CLASSIFICATION** : Classifie cette note selon son contenu
   - Type : information | opportunité | risque | feedback | question
   - Priorité : critical | high | medium | low

2. **EXTRACTION** : Extrais les informations clés
   - Mots-clés (5-10 maximum)
   - Noms propres (personnes, entreprises, lieux)
   - Dates et échéances mentionnées
   - Montants et chiffres importants

3. **SENTIMENT** : Détermine le sentiment général
   - positif | neutre | négatif | urgent

4. **STRUCTURATION** : Organise les informations en JSON structuré

5. **RECOMMANDATION** : Propose une action concrète

**Format de réponse attendu (JSON strict) :**
{
  "classification": {
    "type": "information|opportunité|risque|feedback|question",
    "priority": "critical|high|medium|low"
  },
  "extraction": {
    "keywords": ["string"],
    "entities": {
      "persons": ["string"],
      "companies": ["string"],
      "locations": ["string"]
    },
    "dates": ["string"],
    "amounts": [{"value": number, "currency": "string", "unit": "string"}]
  },
  "sentiment": {
    "value": "positif|neutre|négatif|urgent",
    "confidence": 0-1
  },
  "summary": "string (2-3 phrases max)",
  "recommendations": [
    {
      "action": "string",
      "owner": "string (rôle ou service)",
      "deadline": "string (optionnel)",
      "priority": "critical|high|medium|low"
    }
  ],
  "structuredData": {
    "network": {
      "potential": 0-1,
      "competition": "string",
      "timeline": "string"
    },
    "commercial": {
      "contact": "string",
      "relationship": "string",
      "nextSteps": ["string"]
    },
    "market": {
      "size": "string",
      "growth": "string",
      "barriers": ["string"]
    }
  }
}

**Important :**
- Ne réponds **que** avec du JSON valide
- N'ajoute **aucun** commentaire ou texte supplémentaire
- Les champs sont **obligatoires** sauf mention contraire
- Utilise les **valeurs exactes** des énumérations
`,
  };
}

// ============================================
// NETWORK RECOMMENDATION PROMPT
// ============================================

/**
 * Prompt pour générer une recommandation commerciale complète
 * Basée sur les données du réseau et la connaissance terrain
 */
export function getNetworkRecommendationPrompt(
  network: any,
  voiceNotes?: string[]
): { system: string; user: string } {
  const voiceNotesContext = voiceNotes && voiceNotes.length > 0
    ? `
**Notes terrain des commerciaux :**
${voiceNotes.map((note, index) => `- Note ${index + 1} : "${note}"`).join('\n')}
`
    : '';

  return {
    system: BASE_SYSTEM_PROMPT,
    user: `
Analyse ce réseau de chaleur et génère une **recommandation commerciale complète** :

**Données du réseau :**
${JSON.stringify(network, null, 2)}

${voiceNotesContext}

**Objectifs de l'analyse :**
1. Évaluer le **potentiel commercial** pour Engie
2. Identifier les **leviers d'attractivité**
3. Analyser les **risques et opportunités**
4. Proposer un **plan d'action détaillé**
5. Estimer le **niveau de priorité**

**Critères d'évaluation :**
- Taille du réseau (longueur, nombre de PDL)
- Montant du marché et potentiel économique
- Statut du titulaire (Engie, concurrent, inconnu)
- Échéance du contrat et opportunité de renouvellement
- Niveau de concurrence
- Potentiel EnR&R
- Connaissance terrain (notes vocales)

**Format de réponse attendu :**
{
  "evaluation": {
    "globalScore": 0-10,
    "attractiveness": "critical|high|medium|low",
    "riskLevel": "critical|high|medium|low",
    "confidence": "high|medium|low"
  },
  "levers": [
    {
      "type": "taille|montant|échéance|concurrence|enr|relation",
      "description": "string",
      "impact": "critical|high|medium|low",
      "value": "string"
    }
  ],
  "opportunities": [
    {
      "description": "string",
      "potential": "high|medium|low",
      "actionRequired": "string"
    }
  ],
  "risks": [
    {
      "description": "string",
      "probability": "high|medium|low",
      "mitigation": "string"
    }
  ],
  "actionPlan": {
    "shortTerm": [
      {
        "action": "string",
        "owner": "string",
        "deadline": "string",
        "priority": "critical|high|medium|low"
      }
    ],
    "mediumTerm": ["string"],
    "longTerm": ["string"]
  },
  "recommendation": {
    "decision": "pursue|monitor|avoid|assess",
    "rationale": "string",
    "expectedOutcome": "string",
    "investmentLevel": "high|medium|low|none"
  },
  "nextSteps": [
    {
      "step": "string",
      "responsible": "string",
      "timeline": "string",
      "resourcesNeeded": ["string"]
    }
  ]
}

**Règles supplémentaires :**
- Sois **ultra-spécifique** dans tes recommandations
- Base-toi sur les **données réelles** du réseau
- Intègre les **notes terrain** si disponibles
- Propose des **actions concrètes et mesurables**
- Priorise les **opportunités à court terme**
`,
  };
}

// ============================================
// SEARCH AND QUERY PROMPT
// ============================================

/**
 * Prompt pour la recherche sémantique dans les notes vocales
 */
export function getSemanticSearchPrompt(
  query: string,
  notes: string[]
): { system: string; user: string } {
  return {
    system: BASE_SYSTEM_PROMPT,
    user: `
Effectue une **recherche sémantique** dans les notes vocales suivantes pour trouver celles qui correspondent à la requête :

**Requête :** "${query}"

**Notes à analyser :**
${notes.map((note, index) => `- Note ${index + 1} : ${note}`).join('\n')}

**Tâches :**
1. Analyse le **sens** de la requête
2. Compare avec le **contenu** de chaque note
3. Identifie les **correspondances** les plus pertinentes
4. Classe les résultats par **pertinence**

**Format de réponse :**
{
  "interpretation": "string (interprétation de la requête)",
  "results": [
    {
      "noteIndex": number,
      "relevanceScore": 0-1,
      "matchingKeywords": ["string"],
      "explanation": "string"
    }
  ],
  "summary": "string (résumé des résultats)"
}

**Conseils :**
- Ne te limite pas à la correspondance exacte de mots
- Comprends le **contexte** et l'**intention** de la requête
- Priorise les notes qui **répondent directement** à la question
`,
  };
}

// ============================================
// SUMMARIZATION PROMPT
// ============================================

/**
 * Prompt pour résumer plusieurs notes vocales sur un même réseau
 */
export function getSummarizationPrompt(
  notes: string[],
  network?: any
): { system: string; user: string } {
  const networkContext = network
    ? `
**Contexte du réseau :** ${JSON.stringify(network, null, 2)}`
    : '';

  return {
    system: BASE_SYSTEM_PROMPT,
    user: `
Résumé les **notes vocales suivantes** sur un réseau de chaleur pour en extraire une vue d'ensemble :

${networkContext}

**Notes :**
${notes.map((note, index) => `- Note ${index + 1} : ${note}`).join('\n')}

**Objectif :**
Créer un **résumé synthétique** qui capture l'essentiel des informations des notes, en identifiant :
- Les points communs
- Les contradictions éventuelles
- Les actions recommandées
- Les informations prioritaires

**Format de réponse :**
{
  "synthesis": {
    "mainThemes": ["string"],
    "keyInformation": ["string"],
    "contradictions": ["string"],
    "gaps": ["string"]
  },
  "consensus": {
    "opportunityLevel": "critical|high|medium|low",
    "riskLevel": "critical|high|medium|low",
    "priority": "critical|high|medium|low"
  },
  "actionItems": [
    {
      "action": "string",
      "frequency": number,
      "urgency": "critical|high|medium|low"
    }
  ],
  "summary": "string (5-10 phrases max)",
  "recommendation": "string"
}

**Instructions :**
- Sois **objectif et neutre**
- Identifie les **tendances** dans les notes
- Mets en avant les **informations actionnables**
- Signale les **incohérences**
`,
  };
}

// ============================================
// KNOWLEDGE EXTRACTION PROMPT
// ============================================

/**
 * Prompt pour extraire la connaissance terrain des notes vocales
 * et structurer les données pour enrichir la base Engie
 */
export function getKnowledgeExtractionPrompt(
  notes: string[],
  networkId: string
): { system: string; user: string } {
  return {
    system: BASE_SYSTEM_PROMPT,
    user: `
Extrais la **connaissance terrain** contenue dans ces notes vocales pour enrichir la base de données Engie.

**Réseau :** ${networkId}

**Notes vocales :**
${notes.map((note, index) => `- Note ${index + 1} : "${note}"`).join('\n')}

**Données à extraire et structurer :**

1. **Relations commerciales**
   - Contacts clés (nom, rôle, entreprise, coordonnées)
   - Niveau de relation (fort, moyen, faible, inexistant)
   - Historique des interactions

2. **Informations marché**
   - Concurrence (noms, parts de marché, forces/faiblesses)
   - Dynamique du marché (croissance, tendances)
   - Opportunités émergentes

3. **Données techniques**
   - État réel du réseau (vs données officielles)
   - Projets en cours
   - Innovations ou évolutions

4. **Retours d'expérience**
   - Satisfaction du client
   - Problèmes rencontrés
   - Bonnes pratiques identifiées

5. **Prévisions**
   - Échéances réelles (vs officielles)
   - Intentions du client
   - Opportunités commerciales

**Format de réponse (JSON) :**
{
  "commercialRelationships": [
    {
      "contact": {
        "name": "string",
        "role": "string",
        "company": "string",
        "email": "string",
        "phone": "string"
      },
      "relationshipLevel": "strong|medium|weak|none",
      "interactionHistory": [
        {
          "date": "string",
          "type": "meeting|call|email|visit",
          "subject": "string",
          "outcome": "string"
        }
      ],
      "nextInteraction": "string"
    }
  ],
  "marketIntelligence": {
    "competitors": [
      {
        "name": "string",
        "marketShare": number,
        "strengths": ["string"],
        "weaknesses": ["string"],
        "strategy": "string"
      }
    ],
    "marketTrends": ["string"],
    "emergingOpportunities": ["string"]
  },
  "technicalInsights": {
    "actualStatus": "string",
    "ongoingProjects": ["string"],
    "innovations": ["string"],
    "maintenanceIssues": ["string"]
  },
  "clientFeedback": {
    "satisfaction": "high|medium|low",
    "issues": ["string"],
    "bestPractices": ["string"],
    "suggestions": ["string"]
  },
  "predictions": {
    "actualDeadlines": [
      {
        "type": "contract|tender|renewal",
        "date": "string",
        "confidence": "high|medium|low"
      }
    ],
    "clientIntentions": ["string"],
    "commercialOpportunities": [
      {
        "type": "renewal|new_contract|expansion",
        "potential": "high|medium|low",
        "timeline": "string",
        "action": "string"
      }
    ]
  },
  "metadata": {
    "networkId": "${networkId}",
    "extractionDate": "${new Date().toISOString()}",
    "source": "voice_notes",
    "confidence": 0-1
  }
}

**Important :**
- Extrais **uniquement** les informations factuelles
- Structure les données de manière **standardisée**
- Indique le **niveau de confiance** pour chaque information
- Identifie les **sources** des informations
`,
  };
}

// ============================================
// PARAMETER PRESETS
// ============================================

/**
 * Parameter presets for different types of queries
 */
export const PARAMETER_PRESETS = {
  // For analytical queries (needs precise, deterministic answers)
  ANALYSIS: {
    temperature: 0.2,
    maxTokens: 1500,
  },
  
  // For creative queries (needs varied, original answers)
  CREATIVE: {
    temperature: 0.8,
    maxTokens: 1000,
  },
  
  // For quick queries (needs fast, concise answers)
  QUICK: {
    temperature: 0.5,
    maxTokens: 300,
  },
  
  // For code generation
  CODE: {
    temperature: 0.3,
    maxTokens: 2000,
  },
  
  // For voice note analysis (default)
  VOICE_NOTE: {
    temperature: 0.3,
    maxTokens: 1000,
  },
} as const;

export type ParameterPreset = keyof typeof PARAMETER_PRESETS;

// ============================================
// RESPONSE PARSING
// ============================================

/**
 * Extract JSON from Voxtral response
 * Handles cases where the response might have markdown or other formatting
 */
export function extractJSONFromResponse(response: string): any {
  // Try to find JSON in the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Voxtral response');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    // Try to fix common JSON issues
    const cleaned = jsonMatch[0]
      .replace(/(\w+):\s*([^,\s\}\]]+)/g, '$1: "$2"') // Add quotes to unquoted strings
      .replace(/(\w+):\s*\n/g, '$1: "\n') // Fix newlines
      .replace(/(\w+):\s*\t/g, '$1: "\t'); // Fix tabs
    
    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON from Voxtral response: ${parseError}`);
    }
  }
}

/**
 * Validate JSON against a schema (simple validation)
 */
export function validateJSON(json: any, schema: any): boolean {
  // Simple type checking
  if (typeof json !== typeof schema) return false;
  
  if (schema === null || schema === undefined) {
    return json === null || json === undefined;
  }
  
  if (Array.isArray(schema)) {
    return Array.isArray(json);
  }
  
  if (typeof schema === 'object') {
    return json !== null && typeof json === 'object';
  }
  
  return true;
}

// ============================================
// RATE LIMITING
// ============================================

class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  waitTime(): number {
    const now = Date.now();
    const recentRequests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
    const requestCount = recentRequests.length;
    
    if (requestCount < this.maxRequests) {
      return 0;
    }
    
    const oldestRequest = Math.min(...recentRequests);
    const waitTime = this.windowMs - (now - oldestRequest);
    return Math.max(0, waitTime);
  }
}

let rateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    const config = getConfig();
    rateLimiter = new RateLimiter(config.maxRequestsPerMinute);
  }
  return rateLimiter;
}

// ============================================
// EXPORT
// ============================================

export default {
  BASE_SYSTEM_PROMPT,
  getConfig,
  getVoiceNoteAnalysisPrompt,
  getNetworkRecommendationPrompt,
  getSemanticSearchPrompt,
  getSummarizationPrompt,
  getKnowledgeExtractionPrompt,
  PARAMETER_PRESETS,
  extractJSONFromResponse,
  validateJSON,
  getRateLimiter,
};
