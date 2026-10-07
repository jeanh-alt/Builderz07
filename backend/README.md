# Backend Supabase - Builderz07

> **Builder 2** : Backend Data & Scoring (US-002)

## 📋 Vue d'ensemble

Ce dossier contient la configuration backend pour l'application de visualisation des réseaux de chaleur Engie.

### Responsabilités
- ✅ Création de la base de données Supabase
- ✅ Import des données depuis `data_prep/final/reseaux_for_dashboard.json`
- ✅ Création des tables, vues et triggers
- ✅ Configuration de la sécurité (RLS)
- ✅ Calcul des champs manquants (coordonnées, scores)

## 🚀 Setup Initial

### 1. Créer un projet Supabase

1. Aller sur [https://supabase.com](https://supabase.com)
2. Créer un nouveau projet nommé `builderz07` ou similaire
3. Attendre que le projet soit prêt (≈ 1-2 min)

### 2. Exécuter le script d'initialisation

1. Dans le dashboard Supabase, aller dans **SQL Editor**
2. Ouvrir le fichier `/backend/sql/init.sql` et copier son contenu
3. Exécuter le script complet
4. Vérifier que les tables `reseaux`, `regions`, `recommandations` sont créées

### 3. Importer les données

#### Importer les réseaux

1. Dans le dashboard, aller dans **Table Editor** > **reseaux**
2. Cliquer sur **Import** > **Import from file**
3. Sélectionner le fichier `data_prep/final/reseaux_for_dashboard.json`
4. Cliquer sur **Import**

> ⚠️ **Note** : Si l'import JSON échoue, convertir en CSV d'abord :
> ```bash
> # Sur ta machine locale
> cd /Users/jeanhardy/Documents/BuildersNight
> # Utiliser jq pour convertir JSON en CSV
> jq -r '(.[0] | keys_unsorted) as $keys | $keys, (.[] | [.[$keys[]]])' data_prep/final/reseaux_for_dashboard.json > data_prep/final/reseaux_for_dashboard.csv
> ```

#### Importer les régions (GeoJSON)

1. Télécharger un GeoJSON des régions françaises (ex: [https://france-geojson.gregoiredavid.fr/](https://france-geojson.gregoiredavid.fr/))
2. Dans **Table Editor** > **regions**, importer le GeoJSON
3. Ou utiliser ce script SQL pour ajouter manuellement les centroïdes :

```sql
INSERT INTO regions (nom, centroide_lat, centroide_lng, couleur) VALUES
('Auvergne-Rhône-Alpes', 45.764, 4.8356, '#FF6B6B'),
('Bourgogne-Franche-Comté', 47.2802, 4.9994, '#4ECDC4'),
('Bretagne', 48.1032, -2.8736, '#45B7D1'),
('Centre-Val de Loire', 47.7528, 1.6711, '#96CEB4'),
('Corse', 42.0397, 9.0129, '#FFEAA7'),
('Grand Est', 48.6789, 6.1846, '#DDA0DD'),
('Hauts-de-France', 50.4801, 2.8238, '#98D8C8'),
('Île-de-France', 48.8566, 2.3522, '#F7DC6F'),
('Normandie', 49.1935, 0.3807, '#BB8FCE'),
('Nouvelle-Aquitaine', 45.5833, 0.65, '#85C1E9'),
('Occitanie', 43.6109, 3.8772, '#F8C471'),
('Pays de la Loire', 47.4635, -0.546, '#82E0AA'),
('Provence-Alpes-Côte d\'Azur', 43.8358, 6.4758, '#F1948A');
```

### 4. Configurer les variables d'environnement

Dans ton projet frontend, créer un fichier `.env.local` :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=ton-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta-cle-anon

# Voxtral (optionnel)
VOXTRAL_API_KEY=ta-cle-voxtral
```

Récupérer ces infos dans :
- **SUPABASE_URL** : Settings > API > Project URL
- **SUPABASE_ANON_KEY** : Settings > API > anon key

## 📊 Structure de la base

### Tables

| Table | Description | Champs clés |
|-------|-------------|------------|
| `reseaux` | Données principales des réseaux | id, nom_reseau, region, titulaire_est_engie, score_*, lat, lng |
| `regions` | Géodonnées des régions | id, nom, geojson, centroide_lat, centroide_lng |
| `recommandations` | Cache des recommandations LLM | id, reseau_id, recommandation, score |

### Vues

| Vue | Description |
|-----|-------------|
| `reseaux_avec_statut` | Réseaux avec statut calculé et score global |
| `reseaux_par_region` | Statistiques agrégées par région |

## 🔧 Calcul des champs manquants

### Coordonnées géographiques

Pour les réseaux sans `lat`/`lng` (champ `has_geometry = false`) :

```sql
-- Mise a jour des coordonnees manquantes avec les centroides de region
UPDATE reseaux
SET 
  lat = regions.centroide_lat,
  lng = regions.centroide_lng,
  has_geometry = true
FROM regions
WHERE reseaux.region = regions.nom
  AND (reseaux.lat IS NULL OR reseaux.lng IS NULL);
```

### Score global

Le score est calculé automatiquement dans la vue `reseaux_avec_statut` :

```sql
score_global = (
  score_echeance * 0.4 +
  score_taille * 0.3 +
  (boamp_montant / 50000000) * 0.2 +
  score_concurrence * 0.1
)
```

## 📡 Endpoints API

Supabase génère automatiquement des endpoints REST. Exemples :

### Récupérer tous les réseaux

```bash
curl 'https://[PROJECT_REF].supabase.co/rest/v1/reseaux?select=*' \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
```

### Récupérer les réseaux avec statut

```bash
curl 'https://[PROJECT_REF].supabase.co/rest/v1/reseaux_avec_statut?select=*' \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
```

### Filtrer par région

```bash
curl 'https://[PROJECT_REF].supabase.co/rest/v1/reseaux_avec_statut?region=eq.Île-de-France&select=*' \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
```

## 🔍 Vérifications

### 1. Vérifier que les tables sont créées

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 2. Vérifier le nombre de réseaux importés

```sql
SELECT COUNT(*) FROM reseaux;
```

### 3. Vérifier les vues

```sql
SELECT * FROM reseaux_avec_statut LIMIT 10;
SELECT * FROM reseaux_par_region;
```

### 4. Vérifier les RLS

```sql
SELECT * FROM pg_policies;
```

## 💡 Astuces

### Requête pour obtenir les réseaux avec leur statut

```sql
SELECT 
  id,
  nom_reseau,
  region,
  titulaire_est_engie,
  statut,
  score_global,
  lat,
  lng
FROM reseaux_avec_statut
ORDER BY score_global DESC
LIMIT 100;
```

### Requête pour obtenir les statistiques par région

```sql
SELECT * FROM reseaux_par_region ORDER BY avg_score DESC;
```

## 📂 Fichiers

```
backend/
├── sql/
│   └── init.sql          # Script d'initialisation de la base
└── README.md             # Ce fichier
```

## 👥 Collaboration

- **Builder 1** (Frontend Carte) : A besoin des données de `reseaux_avec_statut` et `regions`
- **Builder 3** (Détails + LLM) : A besoin des données détaillées de `reseaux` et de la table `recommandations`
- **Builder 4** (Recherche) : A besoin des vues pour les filtres

## ✅ Checklist Builder 2

- [x] Créer le dossier backend/sql
- [x] Créer le script init.sql
- [ ] Créer un projet Supabase
- [ ] Exécuter init.sql dans Supabase
- [ ] Importer reseaux_for_dashboard.json
- [ ] Importer les régions (GeoJSON ou centroïdes)
- [ ] Vérifier les vues et triggers
- [ ] Tester les endpoints API
- [ ] Documenter les clés dans .env.example
- [ ] Faire un commit avec les modifications
