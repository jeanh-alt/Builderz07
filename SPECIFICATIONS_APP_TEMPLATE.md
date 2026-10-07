# **Spécifications Techniques - [Nom de l'Application])
> *Template de spécifications précises pour exécution distribuée sur 4 builders avec Vibe*
> **Durée cible : 1h30 max** | **Version : 1.0** | **Date : 2026-10-07**

---

## 📋 **0. CONTEXTE & OBJECTIFS**
*À compléter en 5 min chrono – toute l'équipe doit aligner sa compréhension*

### 0.1 **Énoncé du problème**
> *En 2-3 phrases max : quel problème résout cette app ? Pour qui ?*
- [ Chez LEI, les directeurs commerciaux veulent gagner les appels d'offre des réseau de chaleur, mais ils ont une mauvaise visibilité de l'état du marché. L'objectif est de leur donner une vue de réseaux déjà gérés par Engie, ceux qui méritent leur attention, les marchés qui vont bientôt ouvrir et qui méritent d'être répondu, et pour les marchés en cours, analyser le PDF de l'AO] 

### 0.2 **Objectifs principaux**
> *Liste numérotée des 3-5 objectifs non-négociables*
1. Avoir une vue globale des marchés réseaux de chaleur de la région
2. Avoir un score d'intérêt des marchés pour savoir quoi répondre
3. Avoir une aide à la décision

### 0.3 **Périmètre (IN/OUT)**
| **IN** ✅ | **OUT** ❌ |
|-----------|-----------|
|Outil mistral (OCR, Voxtral) | |
| | |

### 0.4 **Contraintes**
- **Temps** : 1h30 max (incluant tests et validation)
- **Technos** : Modèles mistral
- **Compatibilité** : Web app pour démo
- **Performance** : Données stockées et mockée, pas besoin de réels appels API

---

## 🎯 **1. SPÉCIFICATIONS FONCTIONNELLES**
*À finaliser en 15 min – chaque user story doit être atomic et testable*

### 1.1 **User Stories Prioritaires**
> *Format : "En tant que [rôle], je veux [action] afin de [bénéfice]" + Critères d'acceptation*

| ID | User Story | Priorité | Complexité | Builder Assigné |
|----|------------|----------|------------|-----------------|
| US-001 | | ⭐⭐⭐ | Haute | Builder 1 |
| US-002 | | ⭐⭐ | Moyenne | Builder 2 |
| US-003 | | ⭐⭐⭐ | Haute | Builder 3 |
| US-004 | | ⭐ | Basse | Builder 4 |

---

### 1.2 **Détail des User Stories**

#### **US-001 : [Titre]**
- **Description** : 
- **Critères d'acceptation** :
  - [ ] 
  - [ ] 
  - [ ] 
- **Maquettes/References** : [Lien Figma/ASCII diagramme/Description textuelle]
- **Dépendances** : [Ex: US-002 doit être finie avant]

#### **US-002 : [Titre]**
- **Description** : 
- **Critères d'acceptation** :
  - [ ] 
  - [ ] 
- **Maquettes/References** : 
- **Dépendances** : 

*(Répéter pour US-003, US-004...)*

---

## ⚙️ **2. SPÉCIFICATIONS TECHNIQUES**
*À valider en 10 min – architectural decisions qui impactent tous les builders*

### 2.1 **Architecture Globale**
> *Schéma ASCII obligatoire*
```
┌─────────────────────────┐     ┌─────────────────────────┐
│         Frontend          │────▶│        Backend           │
│  (React/Vue/...)          │     │  (Node.js/Python/...)    │
└─────────────────────────┘     └─────────────────────────┘
       │                           │
       ▼                           ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│       Database           │     │     External APIs        │
│  (PostgreSQL/Mongo...)   │     │  (Stripe, Auth0...)      │
└─────────────────────────┘     └─────────────────────────┘
```

### 2.2 **Stack Technique**
| Composant | Technologie | Version | Justification |
|-----------|-------------|---------|---------------|
| Frontend | | | |
| Backend | | | |
| Base de données | | | |
| Auth | | | |
| Déploiement | | | |

### 2.3 **Endpoints API** *(si applicable)*
> *Format : Méthode + Path + Description + Exemple de réponse*

| Méthode | Endpoint | Description | Status Codes | Exemple Réponse |
|---------|----------|-------------|--------------|------------------|
| GET | `/api/v1/users` | Liste tous les utilisateurs | 200, 401 | `{ users: [...] }` |
| POST | `/api/v1/users` | Crée un utilisateur | 201, 400 | `{ id: 123, name: "..." }` |

### 2.4 **Modèles de Données**
> *Schémas simplifiés – 1 tableau par modèle principal*

#### **Modèle : User**
| Champ | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | ✅ | gen_random_uuid() | Identifiant unique |
| email | string | ✅ | - | Email validé |
| password_hash | string | ✅ | - | Hash bcrypt |

*(Répéter pour chaque modèle : Post, Comment, etc.)*

---

## 👥 **3. RÉPARTITION DES TÂCHES PAR BUILDER**
*Chaque builder a 30-45 min de travail effectif. Équilibrer la charge !*

### 🔧 **Builder 1 - [Nom du Module]**
> *Ex: "Frontend - Auth & User Dashboard"*
- **Responsable** : @[nom]
- **Tâches** :
  - [ ] Implémenter US-001 (Frontend)
  - [ ] Créer composants : LoginForm, RegisterForm
  - [ ] Intégrer avec API `/auth/login` et `/auth/register`
  - [ ] Tests unitaires (80% coverage)
- **Dépendances** : Backend doit exposer les endpoints d'auth (Builder 2)
- **Livrables** : 
  - Code dans `/frontend/auth/`
  - Tests dans `/frontend/auth/__tests__/`
- **Validation** : 
  - [ ] Formulaires fonctionnels
  - [ ] Redirection post-login
  - [ ] Gestion des erreurs affichée

### 🛠️ **Builder 2 - [Nom du Module]**
> *Ex: "Backend - Auth & User Management"*
- **Responsable** : @[nom]
- **Tâches** :
  - [ ] Implémenter endpoints : POST `/auth/login`, POST `/auth/register`
  - [ ] Middleware d'authentification JWT
  - [ ] Modèle User + migrations
  - [ ] Tests API (Postman/Newman ou Jest)
- **Dépendances** : Aucune (ou Base de données prête)
- **Livrables** :
  - Code dans `/backend/routes/auth.js`
  - Migration dans `/backend/migrations/`
- **Validation** :
  - [ ] Endpoints testables avec curl/Postman
  - [ ] JWT valide retourné

### 🖥️ **Builder 3 - [Nom du Module]**
> *Ex: "Frontend - Core Features"*
- **Responsable** : @[nom]
- **Tâches** :
  - [ ] Implémenter US-003
  - [ ] Créer pages : Dashboard, Profile
  - [ ] Intégrer avec endpoints Builder 2 et Builder 4
  - [ ] Style responsive (Mobile-first)
- **Dépendances** : Endpoints Builder 2 et Builder 4
- **Livrables** :
  - Code dans `/frontend/core/`
  - Styles dans `/frontend/styles/`
- **Validation** :
  - [ ] Pages accessibles avec auth valide
  - [ ] Design conforme aux maquettes

### 🗄️ **Builder 4 - [Nom du Module]**
> *Ex: "Backend - Data & Business Logic"*
- **Responsable** : @[nom]
- **Tâches** :
  - [ ] Implémenter US-004
  - [ ] Endpoints CRUD pour [Ressource]
  - [ ] Logique métier (ex: calculs, validations)
  - [ ] Seed de la base de données
- **Dépendances** : Modèle User (Builder 2)
- **Livrables** :
  - Code dans `/backend/routes/[ressource].js`
  - Seed dans `/backend/seeds/`
- **Validation** :
  - [ ] CRUD fonctionnel via Postman
  - [ ] Données cohérentes en DB

---

## ⏱️ **4. TIMELINE & SYNCHRONISATION**
*Respecter ces checkpoints pour éviter les blocages*

| Temps | Action | Responsable | Statut |
|-------|--------|-------------|--------|
| **0:00 - 0:05** | Briefing commun + questions | Tous | ⬜ |
| **0:05 - 0:20** | Finalisation specs (ce doc) | Lead | ⬜ |
| **0:20 - 0:25** | Assignment des builders + clarifications | Lead | ⬜ |
| **0:25 - 0:55** | **Sprint 1** : Implémentation coeur | Builders | ⬜ |
| **0:55 - 1:00** | **Checkpoint 1** : Status + blocages | Tous | ⬜ |
| **1:00 - 1:25** | **Sprint 2** : Intégration + Tests | Builders | ⬜ |
| **1:25 - 1:30** | **Checkpoint 2** : Validation finale | Tous | ⬜ |

---

## ✅ **5. CRITÈRES D'ACCEPTATION GLOBAUX**
*L'app est considérée comme terminée quand :*

### 5.1 **Fonctionnel**
- [ ] Toutes les US prioritaires (⭐⭐⭐) sont implémentées
- [ ] Aucune régression sur les features existantes (si applicable)
- [ ] Les erreurs sont gérées et affichées proprement

### 5.2 **Technique**
- [ ] Code compilable sans erreurs
- [ ] Tests unitaires > 70% de coverage
- [ ] Pas de `console.log` en production
- [ ] Variables d'environnement externalisées (`.env`)

### 5.3 **Qualité**
- [ ] Code review rapide entre builders (pair programming si temps)
- [ ] Commit messages clairs (format : `feat(auth): add login endpoint`)
- [ ] Documentation des endpoints (Swagger/OpenAPI ou commentaires)

---

## 🚨 **6. GESTION DES BLOCAGES**

### 6.1 **Escalade**
1. **Problème technique** → Demander au Builder voisin ou Lead
2. **Spécification floue** → @Lead pour clarification **immédiate**
3. **Dépendance bloquante** → Prioriser la tâche dépendante

### 6.2 **Solutions de Contournement**
- [ ] Mock des APIs si backend pas prêt (ex: `msw` pour frontend)
- [ ] Utiliser des données statiques pour les tests frontend
- [ ] Valider les contrats d'API avec des tests d'intégration

---

## 📂 **7. STRUCTURE DU PROJET**
*À adapter selon votre stack*
```
📦 [nom-projet]
├── 📂 backend
│   ├── 📂 src
│   │   ├── 📂 routes
│   │   ├── 📂 models
│   │   ├── 📂 controllers
│   │   └── 📂 middlewares
│   ├── 📂 migrations
│   ├── 📂 seeds
│   └── 📄 package.json
│
├── 📂 frontend
│   ├── 📂 src
│   │   ├── 📂 components
│   │   ├── 📂 pages
│   │   ├── 📂 styles
│   │   └── 📂 __tests__
│   └── 📄 package.json
│
├── 📂 docs
│   └── 📄 API.md (généré auto si possible)
│
├── 📄 .env.example
├── 📄 docker-compose.yml (si applicable)
└── 📄 README.md
```

---

## 🔍 **8. OUTILS & COMMANDES UTILES**

### 8.1 **Développement**
| Outil | Commande | Usage |
|-------|----------|-------|
| Vibe | `vibe` | Lancer un subagent pour une tâche |
| Git | `git checkout -b feat/[us-id]` | Créer une branche par US |
| Docker | `docker-compose up` | Lancer les services |

### 8.2 **Testing**
- Frontend : `npm run test:unit` (Jest/Vitest)
- Backend : `npm run test:api` (Jest/Supertest)
- E2E : `npm run test:e2e` (Cypress/Playwright)

### 8.3 **Déploiement** *(si applicable en 1h30)*
- [ ] Script de déploiement : `./deploy.sh`
- [ ] Environnement de staging : [URL]
- [ ] Environnement de prod : [URL]

---

## 📝 **9. NOTES & QUESTIONS OUVERTES**
*À remplir pendant le briefing*

### ❓ Questions pour clarification :
1. 
2. 
3. 

### 💡 Décisions techniques à valider :
1. 
2. 

### ⚠️ Risques identifiés :
1. 
2. 

---

## 🎉 **10. CLÔTURE**
- **Heure de fin prévue** : [HH:MM]
- **Responsable validation finale** : @[nom]
- **Next Steps** : 
  - [ ] Merge des branches
  - [ ] Tag de la release `v1.0.0`
  - [ ] Rétrospective (10 min max)

---

### ✏️ **Instructions pour les Builders** :
1. **Lire ce document en entier** avant de commencer.
2. **Poser toutes les questions** pendant le briefing (0:00-0:05).
3. **Respecter les dépendances** : ne pas commencer une tâche si sa dépendance n'est pas prête.
4. **Commiter régulièrement** : au moins 1 commit par US implémentée.
5. **Tester en continu** : valider sa partie avant de merger.
6. **Communiquer les blocages** : utiliser le channel dédié (Discord/Slack/whatever).

---

*"Des specs floues = du temps perdu. Des specs précises = une exécution fluide."* 🚀
