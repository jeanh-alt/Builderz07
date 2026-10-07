/**
 * Voxtral API Client for Builderz07
 * Builder 3 - Frontend: Détails & LLM (US-003)
 * 
 * This module provides integration with Voxtral's LLM API for generating
 * network recommendations and cache management.
 */

// ============================================
// TYPES
// ============================================

export interface VoxtralMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VoxtralRequest {
  model: string;
  messages: VoxtralMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface VoxtralResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: VoxtralMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

export interface RecommandationCache {
  reseauId: string;
  recommandation: string;
  createdAt: number;
  score: number;
}

// ============================================
// CONSTANTS
// ============================================

const VOXTRAL_API_URL = 'https://api.voxtral.com/v1/chat';
const DEFAULT_MODEL = 'mistral-large';
const CACHE_KEY_PREFIX = 'voxtral-recommandation-';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================
// PROMPTS
// ============================================

/**
 * Generate recommendation prompt for a network
 * Uses Builderz07 specific context and Engie's business requirements
 */
export function generateNetworkRecommendationPrompt(network: {
  nom_reseau: string;
  gestionnaire: string;
  echeance?: string;
  boamp_montant?: number;
  longueur_reseau?: number;
  nb_pdl?: number;
  score_opportunite?: number;
  score_echeance?: number;
  score_taille?: number;
  score_concurrence?: number;
  region?: string;
  departement?: string;
  titulaire_est_engie: string;
}): string {
  const formatCurrency = (amount?: number): string => {
    if (!amount) return 'non spécifié';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date?: string): string => {
    if (!date) return 'inconnu';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
Tu es un **expert commercial senior chez Engie Solutions**, spécialiste des réseaux de chaleur en France.
Ton rôle est d'analyser les données et de fournir des **recommandations stratégiques et actionnables** pour aider les équipes commerciales à prioriser leurs efforts.

**Contexte :** Engie souhaite développer son portefeuille de réseaux de chaleur en ciblant les marchés les plus prometteurs.

**Données du réseau à analyser :**
- **Nom :** ${network.nom_reseau}
- **Région :** ${network.region || 'non spécifiée'}
- **Département :** ${network.departement || 'non spécifié'}
- **Gestionnaire actuel :** ${network.gestionnaire}
- **Titulaire :** ${network.titulaire_est_engie === 'ENGIE' ? '✅ ENGIE' : network.titulaire_est_engie === 'Concurrent' ? '❌ Concurrent' : '⚪ Inconnu'}
- **Échéance du contrat :** ${formatDate(network.echeance)}
- **Montant du marché :** ${formatCurrency(network.boamp_montant)}
- **Longueur du réseau :** ${network.longueur_reseau || '?'} km
- **Points de livraison :** ${network.nb_pdl || '?'}
- **Score d'opportunité :** ${network.score_opportunite ? (network.score_opportunite * 100).toFixed(0) + '%' : 'non calculé'}
- **Score échéance :** ${network.score_echeance?.toFixed(2) || 'N/A'}
- **Score taille :** ${network.score_taille?.toFixed(2) || 'N/A'}
- **Score concurrence :** ${network.score_concurrence?.toFixed(2) || 'N/A'}

**Instructions pour ta recommandation :**
1. **Évalue l'opportunité** : Ce réseau mérite-t-il une attention commerciale prioritaire ?
2. **Identifie les leviers** : Quels sont les arguments clés pour Engie ? (taille, échéance, concurrence, etc.)
3. **Propose des actions concrètes** : Faut-il contacter le MO ? Préparer une offre ? Surveiller ?
4. **Sois direct et percutant** : 3-4 phrases maximum, avec des emojis pour la lisibilité.
5. **Utilise un ton professionnel mais engageant** : "Opportunité forte", "À surveiller", "Priorité absolue", etc.
6. **Termine par un call-to-action clair** : "Contactez le MO dès maintenant !", "Préparez une offre", etc.

**Format attendu :**
[Évaluation] [Explication des leviers] [Actions recommandées] [Call-to-action]

**Exemple de réponse bien formatée :**
"⭐⭐⭐ **OPPORTUNITÉ FORTE** : Ce réseau de 87 km avec 476 PDL représente un marché de 107M€ avec une échéance proche (2025). Le gestionnaire actuel est un concurrent direct, mais la taille et le montant justifient un **investissement commercial prioritaire**. **Action** : Contactez le MO dès maintenant pour anticiper l'appel d'offres !"

Analyse ce réseau et donne ta recommandation :
`;
}

/**
 * Generate a more detailed analysis prompt
 */
export function generateDetailedAnalysisPrompt(network: any, additionalContext?: string): string {
  return `
${generateNetworkRecommendationPrompt(network)}

**Analyse approfondie demandée** :
${additionalContext || 'Fournis une analyse complète avec évaluation, leviers, risques et recommandations.'}

Structure ta réponse ainsi :
1. **Évaluation globale** (⭐/⭐⭐/⭐⭐⭐)
2. **Points forts**
3. **Points de vigilance**
4. **Recommandation stratégique**
5. **Actions immédiates**

Sois exhaustif mais concis.
`;
}

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Save recommendation to localStorage cache
 */
export function saveToCache(reseauId: string, recommandation: string, score: number): void {
  try {
    const cacheData: RecommandationCache = {
      reseauId,
      recommandation,
      createdAt: Date.now(),
      score,
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${reseauId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to save to cache:', error);
  }
}

/**
 * Get recommendation from cache if valid
 */
export function getFromCache(reseauId: string): RecommandationCache | null {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${reseauId}`);
    if (!cached) return null;
    
    const cacheData: RecommandationCache = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - cacheData.createdAt > CACHE_EXPIRY_MS) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${reseauId}`);
      return null;
    }
    
    return cacheData;
  } catch (error) {
    return null;
  }
}

/**
 * Clear all cached recommendations
 */
export function clearCache(): void {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}

/**
 * Clear cache for a specific network
 */
export function clearNetworkCache(reseauId: string): void {
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${reseauId}`);
  } catch (error) {
    console.warn('Failed to clear network cache:', error);
  }
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Call Voxtral API to generate a recommendation
 */
export async function callVoxtral(
  messages: VoxtralMessage[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    apiKey?: string;
  } = {}
): Promise<VoxtralResponse> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    max_tokens = 500,
    apiKey = process.env.NEXT_PUBLIC_VOXTRAL_API_KEY,
  } = options;

  if (!apiKey) {
    throw new Error('VOXTRAL_API_KEY is not defined. Please add it to your environment variables.');
  }

  const requestBody: VoxtralRequest = {
    model,
    messages,
    temperature,
    max_tokens,
  };

  const response = await fetch(VOXTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Voxtral API error: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}

/**
 * Generate recommendation for a network using Voxtral
 */
export async function generateNetworkRecommendation(
  network: any,
  options: {
    useCache?: boolean;
    forceRefresh?: boolean;
    apiKey?: string;
  } = {}
): Promise<{ recommandation: string; fromCache: boolean }> {
  const { useCache = true, forceRefresh = false, apiKey } = options;
  
  const reseauId = network.id || network.identifiant_reseau;
  
  // Try to get from cache first
  if (useCache && !forceRefresh) {
    const cached = getFromCache(reseauId);
    if (cached) {
      return { recommandation: cached.recommandation, fromCache: true };
    }
  }

  // Generate prompt
  const prompt = generateNetworkRecommendationPrompt(network);
  
  const messages: VoxtralMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  // Call Voxtral API
  const response = await callVoxtral(messages, { apiKey });
  
  const recommandation = response.choices[0]?.message?.content || 
    'Désolé, je n\'ai pas pu générer de recommandation pour ce réseau.';

  // Calculate score from the response (simple heuristic)
  // This will be used for caching and potential sorting
  const score = calculateRecommendationScore(recommandation, network);

  // Save to cache
  saveToCache(reseauId, recommandation, score);

  return { recommandation, fromCache: false };
}

/**
 * Calculate a score for the recommendation based on its content
 */
function calculateRecommendationScore(recommandation: string, network: any): number {
  let score = 0;

  // Check for positive keywords
  const positiveKeywords = [
    'fort', 'excellente', 'prioritaire', 'absolue', 'urgent', 'immédiat',
    'opportunité', 'recommandé', '⭐⭐⭐', 'contactez', 'dès maintenant'
  ];

  const negativeKeywords = [
    'faible', 'risqué', 'difficile', 'à éviter', 'non recommandé', 'attention'
  ];

  positiveKeywords.forEach(keyword => {
    if (recommandation.toLowerCase().includes(keyword)) {
      score += 0.1;
    }
  });

  negativeKeywords.forEach(keyword => {
    if (recommandation.toLowerCase().includes(keyword)) {
      score -= 0.1;
    }
  });

  // Add network's opportunity score
  if (network.score_opportunite) {
    score += network.score_opportunite * 0.3;
  }

  // Normalize to 0-1 range
  return Math.min(Math.max(score, 0), 1);
}

/**
 * Generate recommendations for multiple networks
 */
export async function generateBulkRecommendations(
  networks: any[],
  options: {
    useCache?: boolean;
    apiKey?: string;
    onProgress?: (progress: number, total: number) => void;
  } = {}
): Promise<Record<string, string>> {
  const { useCache = true, apiKey, onProgress } = options;
  const results: Record<string, string> = {};

  for (let i = 0; i < networks.length; i++) {
    const network = networks[i];
    const reseauId = network.id || network.identifiant_reseau;

    try {
      // Check cache first
      if (useCache) {
        const cached = getFromCache(reseauId);
        if (cached) {
          results[reseauId] = cached.recommandation;
          continue;
        }
      }

      // Generate new recommendation
      const { recommandation } = await generateNetworkRecommendation(network, { 
        useCache: false, 
        apiKey 
      });
      results[reseauId] = recommandation;
    } catch (error) {
      console.error(`Failed to generate recommendation for ${reseauId}:`, error);
      results[reseauId] = 'Recommandation indisponible.';
    }

    // Update progress
    if (onProgress) {
      onProgress(i + 1, networks.length);
    }
  }

  return results;
}

// ============================================
// EXPORT DEFAULT CLIENT
// ============================================

export default {
  callVoxtral,
  generateNetworkRecommendation,
  generateBulkRecommendations,
  generateNetworkRecommendationPrompt,
  generateDetailedAnalysisPrompt,
  saveToCache,
  getFromCache,
  clearCache,
  clearNetworkCache,
};
