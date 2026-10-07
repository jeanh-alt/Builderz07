# **Spécifications Techniques - Carte des Réseaux de Chaleur Engie**
> *Template de spécifications précises pour exécution distribuée sur 4 builders avec Vibe*
> **Durée cible : 1h30 max** | **Version : 2.0** | **Date : 2026-10-07** | **Dernière mise à jour : Annulation Supabase, passage en JSON local**

---

## 📋 **0. CONTEXTE & OBJECTIFS**

### 0.1 **Énoncé du problème**
Les directeurs France et les commerciaux Engie ont besoin d'une **visualisation interactive** des réseaux de chaleur en France pour :
- Identifier rapidement les réseaux **gérés par Engie** vs ceux **en appel d'offres (AO)**.
- **Prioriser les opportunités commerciales** via un scoring basé sur l'échéance, le montant, la taille, et l'analyse LLM des rapports.
- Accéder à des **détails stratégiques** (recommandations, historique, contacts) pour chaque réseau.

### 0.2 **Objectifs principaux**
1. **Carte interactive** de la France avec tous les réseaux de chaleur, colorés par statut (Engie / Non-Engie / AO).
2. **Filtrage et recherche** par région, département, statut, score.
3. **Détails enrichis** par réseau : données techniques, score d'opportunité, recommandation LLM (Voxtral).
4. **Expérience "wahou"** : fluide, moderne, sans auth (démo pure).

### 0.3 **Périmètre (IN/OUT)**
| **IN** ✅ | **OUT** ❌ |
|-----------|-----------|
| Carte interactive (Leaflet/Mapbox) | Authentification |
| Données des réseaux (JSON local) | Base de données utilisateurs |
| Scoring automatique (échéance, montant, taille) | CRM intégrée |
| Recommandations LLM (Voxtral) | Export PDF/Excel |
| Recherche en langage naturel | Mobile app (web-only) |
| Déploiement Vercel | Monitoring/Analytics |

### 0.4 **Contraintes**
- **Temps** : 1h30 max (incluant tests et validation)
- **Stack** : Frontend Next.js + TypeScript + TailwindCSS, Déploiement Vercel
- **Données** : Utiliser les fichiers JSON locaux (`frontend/data/reseaux.json` basé sur `data_prep/final/reseaux_for_dashboard.json`)
- **Pas d'auth** : Démo publique, pas de gestion d'utilisateurs
- **Design** : **Fluid Design System Engie** (voir section 2.5). Couleurs, typographie et composants prédéfinis.

---

## 🎯 **1. SPÉCIFICATIONS FONCTIONNELLES**

### 1.1 **User Stories Prioritaires**

| ID | User Story | Priorité | Complexité | Builder Assigné |
|----|------------|----------|------------|-----------------|
| **US-001** | En tant que directeur France, je veux voir **la carte de toute la France** avec les réseaux de chaleur et leur **état** (géré par Engie ou score d'AO) pour avoir une vue globale des opportunités. | ⭐⭐⭐ | Haute | Builder 1 (Frontend Carte) |
| **US-002** | En tant que commercial, je veux **connaître l'état d'un réseau** (4 états : Engie / Engie avec renouvellement <2ans / Non-Engie avec score / Inconnu) pour évaluer son potentiel. | ⭐⭐⭐ | Moyenne | Builder 2 (Backend Data) |
| **US-003** | En tant que commercial, quand je clique sur un réseau, je veux **accéder à ses détails** (explication du score, recommandation d'investissement via Voxtral) pour décider si je dois y consacrer du temps. | ⭐⭐⭐ | Haute | Builder 3 (Frontend Détails) |
| **US-004** | En tant qu'utilisateur, je veux **rechercher et filtrer** les réseaux (par région, statut, score) et interagir en **langage naturel** (ex: "Montre-moi les réseaux Engie en Île-de-France") pour trouver rapidement linfo. | ⭐⭐ | Moyenne | Builder 4 (Search & NLP) |

---

### 1.2 **Détail des User Stories**

#### **US-001 : Carte interactive des réseaux de chaleur**
- **Description** :
  - Carte de France (découpée en régions) avec **tous les réseaux** affichés sous forme de points ou de polygones.
  - **Couleurs par statut** :
    - 🟢 **Vert** : Géré par Engie
    - 🟡 **Jaune** : Géré par Engie avec renouvellement prévu **dans moins de 2 ans**
    - 🔴 **Rouge** : Non géré par Engie (avec score d'opportunité)
    - ⚪ **Gris** : Statut inconnu
  - **Zoom régional** : Cliquer sur une région pour zoomer et voir les réseaux en détail.
  - **Légende** : Afficher la signification des couleurs.

- **Critères d'acceptation** :
  - [ ] La carte s'affiche sans erreur avec tous les réseaux du dataset.
  - [ ] Les couleurs correspondent aux 4 états définis.
  - [ ] Le zoom régional fonctionne (clic sur une région → zoom + affichage des réseaux).
  - [ ] La légende est visible et claire.
  - [ ] Performances : chargement < 2s (avec lazy loading si nécessaire).

- **Maquettes/References** :
  ```
  [Carte France]
  ├─ Région 1 (ex: Île-de-France) → [Points colorés]
  │   ├─ Réseau A (🟢 Engie)
  │   ├─ Réseau B (🟡 Engie <2ans)
  │   └─ Réseau C (🔴 Score: 0.85)
  └─ Région 2 (ex: Auvergne-Rhône-Alpes) → [...]
  ```

- **Dépendances** : Aucune (données statiques en JSON pour la démo).

---

#### **US-002 : État et scoring des réseaux**
- **Description** :
  Pour chaque réseau, afficher son **état** et son **score d'opportunité** (si non-Engie).
  
  **4 états possibles** :
  1. **Géré par Engie** → `titulaire_est_engie = "ENGIE"`
  2. **Géré par Engie avec renouvellement < 2 ans** → `titulaire_est_engie = "ENGIE"` **ET** `echeance` dans les 24 prochains mois
  3. **Non géré par Engie** → `titulaire_est_engie = "Concurrent"` ou `"Inconnu"`
     - **Score calculé** = `(score_echeance * 0.4) + (score_taille * 0.3) + (score_montant * 0.2) + (score_concurrence * 0.1)`
     - **Seuils** :
       - Score ≥ 0.8 → ⭐⭐⭐ (Priorité haute)
       - 0.6 ≤ Score < 0.8 → ⭐⭐ (Priorité moyenne)
       - Score < 0.6 → ⭐ (Priorité basse)
  4. **Inconnu** → Données manquantes.

- **Données utilisées** (issues des CSV/JSON existants) :
  - `nom_reseau` (Nom du réseau)
  - `communes` (Liste des communes couvertes)
  - `region` / `departement`
  - `Gestionnaire` (Nom du gestionnaire actuel)
  - `titulaire_est_engie` (ENGIE / Concurrent / Inconnu)
  - `echeance` (Date de fin de contrat)
  - `boamp_montant` (Montant du marché en €)
  - `longueur_reseau` (km)
  - `nb_pdl` (Nombre de points de livraison)
  - `score_echeance`, `score_taille`, `score_concurrence`, `score_opportunite` (déjà calculés dans les données)

- **Critères d'acceptation** :
  - [ ] Le statut de chaque réseau est correctement calculé.
  - [ ] Le score est calculé avec la formule ci-dessus.
  - [ ] Les seuils de priorité (⭐⭐⭐/⭐⭐/⭐) sont appliqués.

- **Dépendances** : Données du fichier `reseaux_for_dashboard.json` (déjà disponible).

---

#### **US-003 : Détails d'un réseau + Recommandation LLM**
- **Description** :
  Quand un utilisateur clique sur un réseau, une **modale** s'ouvre avec :
  1. **Infos de base** :
     - Nom, communes, région, département
     - Gestionnaire actuel
     - Année de création, longueur, nb de points de livraison
     - Échéance du contrat
  2. **Score détaillé** :
     - Score global + décomposition (échéance, taille, montant, concurrence)
     - Explication textuelle des composantes du score
  3. **Recommandation LLM (Voxtral)** :
     - **Prompt** :
       ```
       "Tu es un expert commercial Engie. Analyse ce réseau de chaleur et recommande si Engie doit y investir du temps commercial.
       Données :
       - Nom: {nom_reseau}
       - Gestionnaire actuel: {Gestionnaire}
       - Échéance: {echeance}
       - Montant marché: {boamp_montant}€
       - Longueur: {longueur_reseau} km
       - Points de livraison: {nb_pdl}
       - Score opportunité: {score_opportunite}
       - Score échéance: {score_echeance}
       - Score taille: {score_taille}
       
       Réponds en 3-4 phrases max, avec un ton encourageant et proactif."
       ```
     - **Exemple de sortie** :
       > "⭐⭐⭐ **Opportunité forte** : Ce réseau a un score élevé (0.89) grâce à son échéance proche (2025) et sa taille (120 PDL). Le gestionnaire actuel est un concurrent direct, mais le montant du marché (13,5M€) justifie un investissement commercial prioritaire. Contactez le MO dès maintenant !"

- **Critères d'acceptation** :
  - [ ] La modale s'ouvre au clic sur un réseau.
  - [ ] Toutes les infos de base sont affichées.
  - [ ] Le score est décomposé et expliqué.
  - [ ] La recommandation LLM est générée **à la volée via Voxtral API** (clé disponible).
  - [ ] Le design est propre et lisible.

- **Dépendances** :
  - US-001 (carte) + US-002 (statut/scoring) doivent être implémentés.
  - **Accès à Voxtral** : Clé API disponible (pas de mock nécessaire).

---

#### **US-004 : Recherche et interactions en langage naturel**
- **Description** :
  - **Barre de recherche** en haut de l'écran pour filtrer les réseaux par :
    - Région / Département (autocomplete)
    - Statut (Engie / Non-Engie / etc.)
    - Score (min/max)
    - Nom du réseau (recherche textuelle)
  - **Recherche NLP** :
    - Exemples de requêtes :
      - "Montre-moi les réseaux Engie en Île-de-France"
      - "Quels sont les réseaux avec un score > 0.8 ?"
      - "Affiche les réseaux dont l'échéance est en 2025"
    - **Implémentation** :
      - Utiliser un **parser simple** (regex + mots-clés) pour extraire les filtres.
      - Pas besoin de vrai NLP (trop complexe pour 1h30), mais simuler l'expérience.

- **Critères d'acceptation** :
  - [ ] La recherche textuelle fonctionne (filtre par nom/région).
  - [ ] Les filtres par statut/score/région sont fonctionnels.
  - [ ] Les requêtes NLP de base sont interprétées correctement.

- **Dépendances** : Aucune (peut être fait en parallèle).

---

## ⚙️ **2. SPÉCIFICATIONS TECHNIQUES**

### 2.1 **Architecture Globale**
```
┌─────────────────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js / Vercel - Static Site)             │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐   │
│  │  Carte       │    │  Search/NLP   │    │  Détails + LLM            │   │
│  │  (Leaflet)   │    │  (US-004)    │    │  (US-003)               │   │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘   │
│       │                    │                       │                 │
└───────┼────────────────────┼───────────────────────┼─────────────────┘
        │                    │                       │
        ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DONNÉES JSON LOCALES                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  frontend/data/reseaux.json (toutes les données réseaux)          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  frontend/data/regions.ts (géodonnées simplifiées)               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 **Stack Technique**
| Composant | Technologie | Version | Justification |
|-----------|-------------|---------|---------------|
| **Frontend** | Next.js (App Router) | 14+ | Framework moderne, SSR/SSG, facile à déployer sur Vercel |
| **Map Library** | Leaflet + React-Leaflet | Latest | Légère, open-source, bonne doc |
| **UI** | TailwindCSS | 3.x | Rapidité de développement + **Fluid Design System Engie** (voir section 2.5) |
| **Données** | JSON local | - | Données statiques dans `frontend/data/reseaux.json` |
| **LLM** | Voxtral (API) | - | Pour les recommandations (**clé API disponible**, pas de mock nécessaire) |
| **Déploiement** | Vercel | - | Intégration native avec Next.js |

> ⚠️ **Note Voxtral** : Une clé API sera générée pour les recommandations LLM. Pas besoin de mock.

---

### 2.5 **Fluid Design System Engie** *(À appliquer partout dans l'UI)*
Engie utilise le **Fluid Design System** pour une identité visuelle cohérente. Voici les éléments clés à implémenter :

#### **🎨 Palette de Couleurs**
| Couleur | Usage | Hex | Exemple |
|---------|-------|-----|---------|
| **Primary Green** | Boutons principaux, liens, accents | `#00A86B` | ✅ |
| **Primary Dark Green** | Survols, backgrounds | `#00825A` | ✅ |
| **Primary Light Green** | Backgrounds légers | `#E3F5E8` | ✅ |
| **Secondary Blue** | Accents secondaires | `#0055A8` | ✅ |
| **Neutral Dark** | Textes principaux | `#2C3E50` | ✅ |
| **Neutral Medium** | Textes secondaires | `#6C757D` | ✅ |
| **Neutral Light** | Backgrounds, bordures | `#F8F9FA` | ✅ |
| **White** | Background principal | `#FFFFFF` | ✅ |
| **Error Red** | Erreurs, alertes | `#D32F2F` | ❌ |
| **Warning Yellow** | Avertissements | `#FFC107` | ⚠️ |

#### **📐 Couleurs de la Carte (Statuts des Réseaux)**
| Statut | Couleur | Hex | Description |
|--------|---------|-----|-------------|
| **Géré par Engie** | Vert Engie | `#00A86B` | Réseaux Engie |
| **Engie avec renouvellement < 2 ans** | Vert clair | `#4CAF50` | À surveiller |
| **Non-Engie (Score ≥ 0.8)** | Rouge vif | `#E53935` | Opportunité forte |
| **Non-Engie (0.6 ≤ Score < 0.8)** | Orange | `#FF9800` | Opportunité moyenne |
| **Non-Engie (Score < 0.6)** | Rouge foncé | `#D32F2F` | Priorité basse |
| **Inconnu** | Gris | `#9E9E9E` | Statut inconnu |

#### **📝 Typographie (Fallback: Inter via Google Fonts)**
| Élément | Police | Poids | Taille | Couleur |
|---------|--------|-------|-------|---------|
| Titres (H1, H2) | Inter | Bold | 2.5rem / 2rem | `#2C3E50` |
| Titres (H3, H4) | Inter | SemiBold | 1.5rem / 1.25rem | `#2C3E50` |
| Textes | Inter | Regular | 1rem | `#2C3E50` |
| Textes secondaires | Inter | Regular | 0.875rem | `#6C757D` |
| Liens | Inter | Medium | 1rem | `#00A86B` |

#### **💡 Exemple TailwindCSS (à ajouter dans `globals.css`)**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --engie-primary: #00A86B;
    --engie-primary-dark: #00825A;
    --engie-primary-light: #E3F5E8;
    --engie-secondary: #0055A8;
    --engie-text-dark: #2C3E50;
    --engie-text-medium: #6C757D;
    --engie-bg: #FFFFFF;
    --engie-bg-light: #F8F9FA;
    --engie-error: #D32F2F;
    --engie-warning: #FFC107;
  }
  
  body {
    @apply bg-white text-engie-text-dark font-sans;
  }
  
  h1, h2, h3, h4 {
    @apply text-engie-text-dark font-bold;
  }
  
  a {
    @apply text-engie-primary hover:text-engie-primary-dark;
  }
}

@layer components {
  .btn-primary {
    @apply bg-engie-primary text-white font-semibold py-2 px-4 rounded-md 
           hover:bg-engie-primary-dark transition-colors duration-200;
  }
  
  .btn-secondary {
    @apply bg-white text-engie-primary border-2 border-engie-primary font-semibold py-2 px-4 rounded-md 
           hover:bg-engie-primary-light transition-colors duration-200;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md p-4 border border-gray-200;
  }
  
  .search-bar {
    @apply w-full max-w-md px-4 py-2 rounded-full border border-gray-300 
           focus:outline-none focus:ring-2 focus:ring-engie-primary;
  }
}
```

---

### 2.3 **Modèle de Données (JSON Local)**

#### **Fichier `frontend/data/reseaux.json`** *(Données principales)*
> *Basé sur `data_prep/final/reseaux_for_dashboard.json` - chargé directement par le frontend*

**Structure d'un réseau** (objet JSON) :

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | string | Identifiant unique | `"a0eebc99-..."` |
| `identifiant_reseau` | string | ID original | `"4401C"` |
| `nom_reseau` | string | Nom du réseau | `"Réseau de Nantes"` |
| `communes` | string[] | Communes couvertes | `["Nantes", "Rezé"]` |
| `departement` | string | Département | `"Loire-Atlantique"` |
| `region` | string | Région | `"Pays de la Loire"` |
| `mo` | string | Maître d'Ouvrage | `"Nantes Métropole"` |
| `gestionnaire` | string | Gestionnaire actuel | `"ERENA (ENGIE SOLUTIONS)"` |
| `annee_creation` | number | Année de création | `1970` |
| `longueur_reseau` | number | Longueur en km | `87.0` |
| `nb_pdl` | number | Nombre de points de livraison | `476` |
| `taux_enr_r` | number | Taux EnR&R (%) | `79.1` |
| `echeance` | string | Date de fin de contrat (YYYY-MM-DD) | `"2036-12-16"` |
| `confiance` | string | Source de l'échéance | `"confirmee_boamp"` |
| `titulaire_est_engie` | string | Statut Engie | `"ENGIE"` / `"Concurrent"` / `"Inconnu"` |
| `boamp_montant` | number | Montant du marché (€) | `107251894.0` |
| `score_echeance` | number | Score échéance (0-1) | `0.942` |
| `score_taille` | number | Score taille (0-1) | `0.891` |
| `score_concurrence` | number | Score concurrence (0-1) | `1.0` |
| `score_opportunite` | number | Score global (0-1) | `0.65` |
| `has_geometry` | boolean | A des coordonnées géo ? | `true` |
| `lat` | number | Latitude | `47.2184` |
| `lng` | number | Longitude | `-1.5536` |

> **Note** : Pour les réseaux sans `lat`/`lng`, le frontend utilise le **centroïde de la région** via `regionCentroides` (voir `frontend/types/index.ts`).

#### **Fichier `frontend/data/regions.ts`** *(Géodonnées pour la carte)*
- Contient des **polygones GeoJSON simplifiés** pour chaque région française
- Chaque région a : `id`, `nom`, `geojson`, `couleur`

> **Note** : Les GeoJSON sont simplifiés (rectangles approximatifs) pour un chargement rapide. Pour une version production, utiliser des GeoJSON officiels INSEE.

---

### 2.4 **Chargement des Données**
> *Pas de backend - chargement direct côté client depuis les fichiers JSON*

- **Fonction principale** : `fetchNetworksFromJSON()` dans `frontend/lib/jsonLoader.ts`
- **Conversion** : Les données brutes sont converties en objets `Network` typés via `rawToNetwork()`
- **Fallback coordonnées** : Si un réseau n'a pas de `lat`/`lng`, utilisation du centroïde de sa région
- **Performance** : Chargement asynchrone avec cache local

---

### 2.5 **Algorithme de Scoring** *(Côté Frontend - `frontend/types/index.ts`)*
```typescript
// Calcul du statut (US-002)
function getStatut(reseau: Reseau): Statut {
  const maintenant = new Date();
  const echeance = new Date(reseau.echeance);
  const deuxAns = new Date();
  deuxAns.setFullYear(deuxAns.getFullYear() + 2);

  if (reseau.titulaire_est_engie === "ENGIE") {
    if (echeance <= deuxAns) {
      return "ENGIE_RENOUVELLEMENT"; // 🟡 Jaune
    }
    return "ENGIE"; // 🟢 Vert
  } else {
    return "NON_ENGIE"; // 🔴 Rouge ou ⚪ Gris si inconnu
  }
}

// Calcul du score global (pour US-002)
function calculerScoreGlobal(reseau: Reseau): number {
  const scoreEcheance = reseau.score_echeance || 0;
  const scoreTaille = reseau.score_taille || 0;
  const scoreMontant = reseau.boamp_montant ? Math.min(reseau.boamp_montant / 50_000_000, 1) : 0; // Normalisé sur 50M€
  const scoreConcurrence = reseau.score_concurrence || 0;
  
  return (
    scoreEcheance * 0.4 +
    scoreTaille * 0.3 +
    scoreMontant * 0.2 +
    scoreConcurrence * 0.1
  );
}
```

---

### 2.6 **Géolocalisation des Réseaux**
- **Source** : Le fichier `frontend/data/reseaux.json` contient des coordonnées (`lat`, `lng`) pour les réseaux qui en ont (`has_geometry: true`).
- **Fallback** : Pour les réseaux sans coordonnées, le frontend utilise **automatiquement le centroïde de la région** via la fonction `getNetworkCoords()` dans `frontend/types/index.ts`.
- **Format** : Points simples pour les réseaux, GeoJSON simplifiés pour les régions.

---

## 👥 **3. RÉPARTITION DES TÂCHES PAR BUILDER**

### 🗺️ **Builder 1 - Frontend : Carte Interactive (US-001)**
> *Responsable : @[à assigner]*
- **Tâches** :
  - [ ] Initialiser un projet **Next.js** (App Router) + TailwindCSS.
  - [ ] Intégrer **Leaflet** avec React-Leaflet.
  - [ ] Charger les **régions françaises** (GeoJSON) et les afficher comme couches cliquables.
  - [ ] Charger les **réseaux** (depuis `frontend/data/reseaux.json`) et les afficher comme des **markers** colorés.
  - [ ] Implémenter le **zoom régional** (clic sur une région → zoom + focus).
  - [ ] Ajouter une **légende** pour les couleurs.
  - [ ] Gérer les **performances** (lazy loading des markers).
- **Dépendances** : Aucune (peut commencer tout de suite).
- **Livrables** :
  - Code dans `/frontend/components/Map/`
  - Page `/pages/index.tsx` (ou `/app/page.tsx`)
- **Validation** :
  - [ ] Carte fonctionnelle avec toutes les régions.
  - [ ] Markers colorés selon le statut.
  - [ ] Zoom régional fluide.

---

### 📊 **Builder 2 - Data Preparation & Scoring (US-002)**
> *Responsable : @[à assigner]*
> *⚠️ **OBSOLÈTE** : Supabase annulé, tout passe par JSON local. Cette section est gardée pour référence historique.

- **Tâches initiales prévues (non nécessaires)** :
  - [x] ~~Créer la base Supabase~~ → **Annulé : utilisation du JSON local**
  - [x] ~~Importer les données~~ → **Annulé : données déjà dans `frontend/data/reseaux.json`**
  - [x] ~~Créer les vues SQL~~ → **Annulé : calculs faits côté frontend**

- **Tâches réelles (si besoin)** :
  - [ ] Vérifier que `frontend/data/reseaux.json` est à jour avec `data_prep/final/reseaux_for_dashboard.json`
  - [ ] S'assurer que les fonctions de calcul (`calculateNetworkStatus`, `calculateGlobalScore`) fonctionnent correctement

- **Dépendances** : Aucune
- **Livrables** :
  - Fichier `frontend/data/reseaux.json` validé et complet
  - Vérification que tous les réseaux ont des coordonnées ou un fallback région valide
- **Validation** :
  - [ ] Le fichier JSON est chargé sans erreur par le frontend
  - [ ] Les calculs de statut et score sont corrects
  - [ ] Toutes les données nécessaires sont présentes

---

### 🔍 **Builder 3 - Frontend : Détails & LLM (US-003)**
> *Responsable : @[à assigner]*
- **Tâches** :
  - [ ] Créer une **modale** qui s'ouvre au clic sur un réseau (intégration avec Builder 1).
  - [ ] Afficher les **infos de base** du réseau (nom, communes, gestionnaire, etc.).
  - [ ] Afficher le **score détaillé** avec décomposition et explications.
  - [ ] Intégrer **Voxtral** pour générer les recommandations :
    - Option 1 : Appel API direct à Voxtral (si clé disponible).
    - Option 2 : **Mock** avec des recommandations pré-écrites (pour la démo).
  - [ ] Stocker les recommandations en **cache** (localStorage).
- **Dépendances** :
  - Builder 1 (pour l'intégration de la modale).
  - Fichier `frontend/data/reseaux.json` disponible.
- **Livrables** :
  - Composant `/frontend/components/NetworkDetailsModal.tsx`
  - Fonction `/frontend/utils/voxtral.ts` (ou mock)
- **Validation** :
  - [ ] Modale fonctionnelle avec toutes les infos.
  - [ ] Recommandations affichées (même en mock).
  - [ ] Design propre et lisible.

---

### 🔎 **Builder 4 - Frontend : Recherche & NLP (US-004)**
> *Responsable : @[à assigner]*
- **Tâches** :
  - [ ] Ajouter une **barre de recherche** en haut de l'écran.
  - [ ] Implémenter le **filtre par région/département** (autocomplete avec les données de `frontend/data/reseaux.json`).
  - [ ] Implémenter le **filtre par statut** (Engie / Non-Engie / etc.).
  - [ ] Implémenter le **filtre par score** (slider min/max).
  - [ ] Implémenter la **recherche textuelle** (nom du réseau).
  - [ ] Ajouter un **parser NLP simple** pour les requêtes en langage naturel :
    - Exemple : `"Montre-moi les réseaux Engie en Île-de-France"` → Filtre : `statut=ENGIE AND region=Île-de-France`
    - Utiliser des **regex** pour extraire les mots-clés (région, statut, score).
- **Dépendances** :
  - Fichier `frontend/data/reseaux.json` disponible.
- **Livrables** :
  - Composant `/frontend/components/SearchBar.tsx`
  - Fonction `/frontend/utils/nlpParser.ts`
- **Validation** :
  - [ ] Recherche textuelle fonctionnelle.
  - [ ] Filtres (région, statut, score) opérationnels.
  - [ ] Requêtes NLP de base interprétées.

---

## ⏱️ **4. TIMELINE & SYNCHRONISATION**

| Temps | Action | Responsable | Statut |
|-------|--------|-------------|--------|
| **0:00 - 0:05** | Briefing commun + validation des US | Tous | ⬜ |
| **0:05 - 0:15** | Setup projets (Next.js + dépendances) | Tous | ⬜ |
| **0:15 - 0:20** | **Checkpoint 1** : Projets initialisés ? Blocages ? | Tous | ⬜ |
| **0:20 - 0:50** | **Sprint 1** :
- Builder 1 : Carte de base + régions
- Builder 3 : Modale + affichage infos
- Builder 4 : Barre de recherche + filtres | Builders | ⬜ |
| **0:50 - 0:55** | **Checkpoint 2** : Statuts + synchronisation | Tous | ⬜ |
| **0:55 - 1:20** | **Sprint 2** :
- Builder 1 : Zoom régional + couleurs
- Builder 3 : Intégration Voxtral/mock
- Builder 4 : Parser NLP | Builders | ⬜ |
| **1:25 - 1:30** | **Checkpoint 3** : Validation finale + tests | Tous | ⬜ |

---

## ✅ **5. CRITÈRES D'ACCEPTATION GLOBAUX**

### 5.1 **Fonctionnel**
- [ ] **US-001** : Carte interactive avec réseaux colorés par statut.
- [ ] **US-002** : Statut et score calculés correctement pour chaque réseau.
- [ ] **US-003** : Modale avec détails + recommandation (même en mock).
- [ ] **US-004** : Recherche et filtres fonctionnels.

### 5.2 **Technique**
- [ ] Code **propre et commenté** (pas de `any`, typage TypeScript).
- [ ] **Pas de `console.log`** en production.
- [ ] **Variables d'environnement** externalisées (`.env.example` fourni).
- [ ] **Tests manuels** : Toutes les US validées par au moins 2 personnes.

### 5.3 **Qualité**
- [ ] **Design cohérent** : TailwindCSS utilisé uniformément.
- [ ] **Performances** : Temps de chargement < 2s, pas de lag sur la carte.
- [ ] **Accessibilité** : Contrastes corrects, keyboard navigation.
- [ ] **Responsive** : Fonctionne sur desktop (mobile bonus).

---

## 🚨 **6. GESTION DES BLOCAGES**

### 6.1 **Escalade**
1. **Problème technique** → Demander au Builder voisin ou Lead.
2. **Données manquantes** → Utiliser des **mocks** ou des valeurs par défaut.
3. **Dépendance bloquante** → Prioriser la tâche dépendante.

### 6.2 **Solutions de Contournement**
- **Voxtral** : Clé API disponible → pas de mock nécessaire.
- **Leaflet trop complexe** → Utiliser **Mapbox GL JS** (plus simple pour les débutants).
- **Données manquantes** → Utiliser les centroïdes de région pour les réseaux sans coordonnées.

---

## 📂 **7. STRUCTURE DU PROJET**
```
📦 reseaux-chaleur-engie
├── 📂 frontend
│   ├── 📂 app
│   │   ├── 📂 (main)          # Page principale (carte + recherche)
│   │   │   └── page.tsx
│   │   └── 📂 network
│   │       └── [id]
│   │           └── page.tsx   # Page détail d'un réseau (optionnel)
│   ├── 📂 components
│   │   ├── 📂 Map             # Builder 1
│   │   │   ├── FranceMap.tsx
│   │   │   └── NetworkMarker.tsx
│   │   ├── 📂 Search          # Builder 4
│   │   │   ├── SearchBar.tsx
│   │   │   └── nlpParser.ts
│   │   └── 📂 Details         # Builder 3
│   │       ├── NetworkDetailsModal.tsx
│   │       └── voxtral.ts (ou mock)
│   ├── 📂 lib
│   │   ├── jsonLoader.ts    # Chargement des données JSON
│   │   └── utils.ts          # Fonctions utilitaires (scoring, etc.)
│   ├── 📂 data
│   │   ├── reseaux.json     # Données des réseaux (source de vérité)
│   │   └── regions.ts       # GeoJSON des régions
│   ├── 📂 styles
│   │   └── globals.css       # Tailwind + custom styles
│   ├── 📄 .env.example       # (Optionnel pour Voxtral API key)
│   └── 📄 package.json
│
├── 📂 backend               # ⚠️ OBSOLÈTE - Supabase annulé
│   ├── 📂 sql
│   │   └── init.sql         # Script SQL de référence (non utilisé)
│   └── 📄 README.md         # Docs historique
│
├── 📂 data_prep             # Données brutes pour référence
│   ├── 📄 reseaux.json      # Données importées (fallback)
│   └── 📄 regions.geojson   # Géodonnées régions
│
├── 📄 .gitignore
├── 📄 README.md             # Instructions déploiement
└── 📄 vercel.json           # Config Vercel
```

---

## 🔍 **8. OUTILS & COMMANDES UTILES**

### 8.1 **Setup Initial**
```bash
# Tous les Builders (Frontend uniquement)
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false
cd frontend
npm install leaflet react-leaflet @types/leaflet
npm install axios  # Pour Voxtral (optionnel)
# Ajouter Inter (Fluid Design System Engie) dans _document.tsx ou layout.tsx
# Voir section 2.5 pour le CSS Tailwind
```

### 8.2 **Chargement des Données JSON**
- **Source principale** : `frontend/data/reseaux.json` (basé sur `data_prep/final/reseaux_for_dashboard.json`)
- **Chargement** : Via `fetchNetworksFromJSON()` dans `frontend/lib/jsonLoader.ts`
- **Conversion** : Les données brutes sont transformées en objets TypeScript typés
- **Fallback coordonnées** : Utilisation des centroïdes de région pour les réseaux sans `lat`/`lng`
- **Vérification** :
  ```bash
  # Vérifier que le fichier JSON est valide
  node -e "const data = require('./frontend/data/reseaux.json'); console.log('Réseaux:', data.length);"
  ```

### 8.3 **Voxtral**
- **API Key** : **Disponible** (à générer et ajouter dans `.env`).
- **Variable d'environnement** : `VOXTRAL_API_KEY=xxx`
- **Appel API** :
  ```typescript
  // Dans /frontend/utils/voxtral.ts
  export const callVoxtral = async (prompt: string): Promise<string> => {
    const response = await axios.post(
      "https://api.voxtral.com/v1/chat",
      {
        model: "mistral-large",
        messages: [{ role: "user", content: prompt }]
      },
      { headers: { Authorization: `Bearer ${process.env.VOXTRAL_API_KEY}` } }
    );
    return response.data.choices[0].message.content;
  };
  ```
- **Prompt pour US-003** :
  ```typescript
  const prompt = `
    Tu es un expert commercial Engie. Analyse ce réseau de chaleur et recommande si Engie doit y investir du temps.
    Données :
    - Nom: ${reseau.nom_reseau}
    - Gestionnaire: ${reseau.gestionnaire}
    - Échéance: ${reseau.echeance}
    - Montant: ${reseau.boamp_montant}€
    - Longueur: ${reseau.longueur_reseau} km
    - Points de livraison: ${reseau.nb_pdl}
    - Score opportunité: ${reseau.score_opportunite}
    
    Réponds en 3-4 phrases max, avec un ton encourageant et proactif. Utilise des emojis (⭐, ✅, etc.) pour rendre la recommandation visuelle.
  `;
  ```

### 8.4 **Leaflet**
- **Exemple de base** :
  ```typescript
  import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
  
  <MapContainer center={[46.603, 1.888]} zoom={6} style={{ height: '100vh' }}>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Marker position={[48.8566, 2.3522]}>
      <Popup>Paris</Popup>
    </Marker>
  </MapContainer>
  ```

### 8.5 **Fluid Design System (Setup Next.js)**
1. **Ajouter Inter dans `_app.tsx` ou `layout.tsx`** :
   ```tsx
   import { Inter } from 'next/font/google';
   const inter = Inter({ subsets: ['latin'] });
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="fr" className={inter.className}>
         <body>{children}</body>
       </html>
     );
   }
   ```
2. **Configurer Tailwind** (`tailwind.config.js`) :
   ```javascript
   module.exports = {
     content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
     theme: {
       extend: {
         colors: {
           engie: {
             primary: '#00A86B',
             primaryDark: '#00825A',
             primaryLight: '#E3F5E8',
             secondary: '#0055A8',
             textDark: '#2C3E50',
             textMedium: '#6C757D',
           },
         },
       },
     },
   };
   ```
3. **Utiliser les couleurs** :
   ```tsx
   <button className="bg-engie-primary text-white hover:bg-engie-primaryDark">
     Voir les détails
   </button>
   ```

4. **Centroïdes des régions** (pour les réseaux sans coordonnées) :
   ```typescript
   // Dans /frontend/utils/geo.ts
   export const regionCentroides: Record<string, [number, number]> = {
     "Auvergne-Rhône-Alpes": [45.764, 4.8356],
     "Bourgogne-Franche-Comté": [47.2802, 4.9994],
     "Bretagne": [48.1032, -2.8736],
     "Centre-Val de Loire": [47.7528, 1.6711],
     "Corse": [42.0397, 9.0129],
     "Grand Est": [48.6789, 6.1846],
     "Hauts-de-France": [50.4801, 2.8238],
     "Île-de-France": [48.8566, 2.3522],
     "Normandie": [49.1935, 0.3807],
     "Nouvelle-Aquitaine": [45.5833, 0.65],
     "Occitanie": [43.6109, 3.8772],
     "Pays de la Loire": [47.4635, -0.546],
     "Provence-Alpes-Côte d'Azur": [43.8358, 6.4758],
   };
   
   export const getReseauCoords = (reseau: Reseau): [number, number] => {
     if (reseau.lat && reseau.lng) return [reseau.lat, reseau.lng];
     return regionCentroides[reseau.region] || [46.603, 1.888]; // Fallback: centre de la France
   };
   ```

---

## 📝 **9. NOTES & QUESTIONS OUVERTES**

### ❓ Questions pour clarification :
1. **Données géographiques** : Les coordonnées (`lat`/`lng`) sont-elles disponibles pour tous les réseaux ? Sinon, faut-il les calculer (centroïdes de communes) ?
   → *Réponse : Utiliser les données de `reseaux_for_dashboard.json` (champ `has_geometry`). Pour les autres, prendre le centroïde de la région via `getNetworkCoords()`.*
2. **Voxtral** : A-t-on accès à l'API Voxtral pour la démo ? Sinon, faut-il un mock ?
   → *Réponse : Mock pour la démo (générer des recommandations basées sur le score).*

### 💡 **Décisions techniques validées** :
1. **Frontend** : Utiliser Next.js (App Router) pour le SSR et le déploiement facile sur Vercel. ✅
2. **Carte** : Leaflet (léger) plutôt que Mapbox (plus simple mais payant). ✅
3. **Scoring** : Calculer côté frontend (plus flexible pour la démo). ✅
4. **Recommandations LLM** : Mock pour gagner du temps. ✅
5. **Données** : **JSON local uniquement** - Supabase annulé pour simplifier la démo. ✅

### ⚠️ Risques identifiés :
1. **Temps** : Le parsing NLP pourrait prendre plus de temps que prévu → *Solution : Limiter à 3-4 types de requêtes.*
2. **Données** : Certains réseaux n'ont pas de coordonnées → *Solution : Utiliser des centroïdes de région (déjà implémenté dans `getNetworkCoords()`).*
3. **Voxtral** : Clé API disponible → pas de risque.
4. **JSON local** : Fichier trop volumineux → *Solution : Minifier le JSON ou utiliser un sous-ensemble pour la démo.*

---

## 🎉 **10. CLÔTURE**
- **Heure de fin prévue** : 14:30 (si départ à 13:00)
- **Responsable validation finale** : @[Lead à désigner]
- **Next Steps** :
  - [ ] Merge des branches (si Git utilisé)
  - [ ] Déploiement final sur Vercel
  - [ ] Démo live avec l'équipe

---

### ✏️ **Instructions pour les Builders** :
1. **Lire ce document en entier** avant de commencer (surtout la partie **JSON local** et non Supabase).
2. **Poser toutes les questions** pendant le briefing (0:00-0:05).
3. **Respecter les dépendances** : ne pas commencer une tâche si sa dépendance n'est pas prête.
4. **Commiter régulièrement** : 1 commit par US implémentée.
5. **Tester en continu** : Valider sa partie avant de merger.
6. **Communiquer les blocages** : Utiliser le channel dédié (ex: Discord #builderz07).

---

> **⚠️ IMPORTANT : Supabase a été annulé. Tout fonctionne avec des données JSON locales. Pas besoin de backend !**

*"1h30 pour un MVP qui impressionne : focus, exécution, pas de perfectionnisme."* 🚀
