# Frontend Next.js - Réseaux de Chaleur Engie

> **Projet : Carte interactive des réseaux de chaleur avec scoring et recommandations LLM**

## 🚀 Démarrage rapide

### 1. Installation des dépendances

```bash
cd frontend
npm install
```

### 2. Configuration de Supabase

Créez un fichier `.env.local` à partir du modèle :

```bash
cp .env.example .env.local
```

Éditez `.env.local` avec vos identifiants Supabase :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
```

> ℹ️ **Où trouver ces valeurs ?**
> - Dans votre dashboard Supabase : **Settings > API**
> - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
> - `anon key` (public) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Lancer le serveur de développement

```bash
dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📁 Structure du projet

```
frontend/
├── app/
│   ├── api/                    # Routes API (pour Voxtral, etc.)
│   │   └── colored-pin/
│   │       └── route.ts       # Génération d'icônes personnalisées
│   ├── favicon.ico            # Favicon
│   ├── globals.css            # Styles globaux (Tailwind + Engie)
│   ├── layout.tsx             # Layout principal
│   └── page.tsx               # Page principale (carte interactive)
│
├── data/
│   ├── networks.ts            # Données statiques (fallback)
│   └── regions.ts             # Données des régions (fallback)
│
├── hooks/
│   └── useNetworks.ts         # Hooks personnalisés pour Supabase
│
├── lib/
│   ├── supabaseClient.ts     # Client Supabase
│   └── supabaseQueries.ts    # Requêtes Supabase
│
├── types/
│   └── index.ts              # Définitions TypeScript
│
├── public/                   # Assets statiques
│
├── .env.example              # Modèle de configuration
├── .gitignore
├── package.json
├── README.md                 # Ce fichier
└── tsconfig.json
```

## 🔌 Connexion à Supabase

Le frontend se connecte à votre base Supabase via deux fichiers principaux :

### `lib/supabaseClient.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export { supabase };
```

### `lib/supabaseQueries.ts`
Contient toutes les fonctions pour interagir avec Supabase :
- `fetchAllNetworks()` - Récupère tous les réseaux
- `fetchNetworksByRegion()` - Filtre par région
- `fetchNetworksByStatus()` - Filtre par statut
- `searchNetworks()` - Recherche textuelle
- `fetchAllRegions()` - Récupère les régions GeoJSON
- Et bien plus...

## 🎨 Design System Engie

Le projet utilise le **Fluid Design System** d'Engie avec Tailwind CSS.

### Palette de couleurs (dans `globals.css`)

| Nom | Couleur | Usage |
|-----|---------|-------|
| Primary Green | `#00A86B` | Boutons principaux, accents |
| Primary Dark | `#00825A` | Survols |
| Secondary Blue | `#0055A8` | Accents secondaires |
| Neutral Dark | `#2C3E50` | Textes principaux |
| Neutral Medium | `#6C757D` | Textes secondaires |

### Composants réutilisables

Le fichier `globals.css` contient des classes utilitaires :

```css
/* Boutons */
.btn-primary { ... }
.btn-secondary { ... }

/* Cartes */
.card { ... }

/* Barre de recherche */
.search-bar { ... }
```

## 🗺️ Fonctionnalités implémentées

### ✅ Déjà en place

1. **Carte interactive** (Leaflet + React-Leaflet)
   - Affichage de la France avec les régions
   - Markers colorés par statut
   - Zoom sur les régions
   - Légende interactive

2. **Détails des réseaux**
   - Popup au clic sur un marker
   - Modale avec toutes les informations
   - Affichage des scores

3. **Système de couleurs**
   - 🟢 Vert : Géré par Engie
   - 🟡 Jaune : Engie avec renouvellement < 2 ans
   - 🔴 Rouge : Non-Engie avec score ≥ 0.8
   - 🟠 Orange : Non-Engie avec score 0.6-0.8
   - 🔴 Rouge foncé : Non-Engie avec score < 0.6
   - ⚪ Gris : Inconnu

### 🔄 À connecter

Actuellement, le frontend utilise des **données statiques** depuis :
- `data/networks.ts`
- `data/regions.ts`

**Pour passer à Supabase**, modifiez `app/page.tsx` :

```typescript
// Remplacez :
import { networksWithCoords, getNetworksByRegion } from '../data/networks';
import { frenchRegions, getRegionByName } from '../data/regions';

// Par :
import { useNetworks } from '../hooks/useNetworks';

// Puis dans le composant :
const { networks, regions, isLoading, error } = useNetworks();
```

## 📡 API Endpoints

### Supabase REST API

Le backend Supabase expose automatiquement des endpoints REST :

```bash
# Tous les réseaux
GET https://[PROJECT_REF].supabase.co/rest/v1/reseaux?select=*

# Réseaux avec statut
GET https://[PROJECT_REF].supabase.co/rest/v1/reseaux_avec_statut?select=*

# Par région
GET https://[PROJECT_REF].supabase.co/rest/v1/reseaux_avec_statut?region=eq.Île-de-France
```

Headers requis :
```bash
apikey: [ANON_KEY]
Authorization: Bearer [ANON_KEY]
```

## 🧪 Tests

### Vérifier la connexion à Supabase

Dans la console du navigateur, testez :

```javascript
fetch('https://[PROJECT_REF].supabase.co/rest/v1/reseaux?select=*', {
  headers: {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  }
})
.then(r => r.json())
.then(console.log);
```

## 🔧 Intégration Continue

### Déploiement sur Vercel

Le projet est prêt pour le déploiement sur Vercel :

1. Poussez votre code sur GitHub
2. Importez le dépôt dans Vercel
3. Ajoutez les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Déployez !

### Configuration Vercel (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ]
}
```

## 📝 Notes

### Problèmes courants

1. **CORS Errors** : Assurez-vous que le CORS est configuré dans Supabase
   - Allez dans **Settings > CORS**
   - Ajoutez `http://localhost:3000` et votre URL Vercel

2. **RLS Errors** : Vérifiez que les politiques RLS sont bien configurées
   - Les tables doivent avoir des politiques `FOR SELECT USING (true)`

3. **SSL Errors** : Utilisez toujours `https://` pour Supabase

### Optimisations

- **Cache** : Les données sont cachées dans `lib/supabaseQueries.ts`
- **Lazy Loading** : Les markers sont chargés dynamiquement
- **Pagination** : À implémenter pour les grands datasets

## 🤝 Collaboration

### Builders

| Builder | Responsabilité | Dossier |
|---------|----------------|---------|
| Builder 1 | Carte Interactive (US-001) | `app/page.tsx` |
| Builder 2 | Backend Data & Scoring (US-002) | `backend/` |
| Builder 3 | Détails & LLM (US-003) | À créer |
| Builder 4 | Recherche & NLP (US-004) | À créer |

### Comment contribuer

1. Créez une nouvelle branche : `git checkout -b feature/ma-fonctionnalite`
2. Faites vos modifications
3. Testez localement : `npm run dev`
4. Commitez vos changements
5. Poussez et créez une PR

## 📚 Documentation supplémentaire

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [React-Leaflet Docs](https://react-leaflet.js.org/docs/start-introduction/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## 🎯 Prochaines étapes

1. ✅ Créer le backend Supabase (Builder 2)
2. 🔄 **Connecter le frontend à Supabase**
3. ⏳ Implémenter la recherche avancée (Builder 4)
4. ⏳ Ajouter Voxtral pour les recommandations (Builder 3)
5. ⏳ Déployer sur Vercel

---

**Besoin d'aide ?** Consultez le fichier `backend/README.md` pour la configuration Supabase.
