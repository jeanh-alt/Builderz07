-- ============================================
-- Builderz07 - Initialisation Base Supabase
-- Builder 2 : Backend Data & Scoring
-- ============================================

-- ============================================
-- 1. ACTIVER L'EXTENSION PG_TRGM (pour les triggers)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================
-- 2. TABLE RESEAUX (Donnees principales)
-- ============================================
CREATE TABLE IF NOT EXISTS reseaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifiant_reseau TEXT,
  nom_reseau TEXT NOT NULL,
  communes TEXT[],
  departement TEXT,
  region TEXT NOT NULL,
  mo TEXT,
  gestionnaire TEXT,
  annee_creation INTEGER,
  longueur_reseau FLOAT,
  nb_pdl INTEGER,
  taux_enr_r FLOAT,
  echeance DATE,
  confiance TEXT,
  titulaire_est_engie TEXT,
  boamp_montant FLOAT,
  score_echeance FLOAT,
  score_taille FLOAT,
  score_concurrence FLOAT,
  score_opportunite FLOAT,
  ted_lien TEXT,
  ted_dernier_avis DATE,
  has_geometry BOOLEAN DEFAULT false,
  lat FLOAT,
  lng FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requetes
CREATE INDEX IF NOT EXISTS idx_reseaux_region ON reseaux(region);
CREATE INDEX IF NOT EXISTS idx_reseaux_departement ON reseaux(departement);
CREATE INDEX IF NOT EXISTS idx_reseaux_titulaire ON reseaux(titulaire_est_engie);
CREATE INDEX IF NOT EXISTS idx_reseaux_lat_lng ON reseaux(lat, lng);
CREATE INDEX IF NOT EXISTS idx_reseaux_nom ON reseaux(nom_reseau) USING gin;


-- ============================================
-- 3. TABLE REGIONS (Geodonnees pour la carte)
-- ============================================
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  geojson JSONB NOT NULL,
  couleur TEXT DEFAULT '#9E9E9E',
  centroide_lat FLOAT,
  centroide_lng FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requetes geospatiales
CREATE INDEX IF NOT EXISTS idx_regions_nom ON regions(nom);


-- ============================================
-- 4. TABLE RECOMMANDATIONS (Cache LLM)
-- ============================================
CREATE TABLE IF NOT EXISTS recommandations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseau_id UUID REFERENCES reseaux(id) ON DELETE CASCADE,
  recommandation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  score FLOAT
);

-- Index pour les jointures
CREATE INDEX IF NOT EXISTS idx_recommandations_reseau ON recommandations(reseau_id);


-- ============================================
-- 5. FONCTIONS DE CALCUL
-- ============================================

-- Fonction pour calculer le statut
CREATE OR REPLACE FUNCTION calculer_statut(
  titulaire_est_engie TEXT,
  echeance DATE
) RETURNS TEXT AS $$
BEGIN
  IF titulaire_est_engie = 'ENGIE' THEN
    IF echeance IS NOT NULL AND echeance <= (CURRENT_DATE + INTERVAL '2 years') THEN
      RETURN 'ENGIE_RENOUVELLEMENT';
    ELSE
      RETURN 'ENGIE';
    END IF;
  ELSIF titulaire_est_engie = 'Concurrent' OR titulaire_est_engie = 'Inconnu' THEN
    RETURN 'NON_ENGIE';
  ELSE
    RETURN 'INCONNU';
  END IF;
END;
$$ LANGUAGE plpgsql;


-- Fonction pour calculer le score global
CREATE OR REPLACE FUNCTION calculer_score_global(
  score_echeance FLOAT,
  score_taille FLOAT,
  score_montant FLOAT,
  score_concurrence FLOAT
) RETURNS FLOAT AS $$
BEGIN
  RETURN (
    COALESCE(score_echeance, 0) * 0.4 +
    COALESCE(score_taille, 0) * 0.3 +
    COALESCE(score_montant, 0) * 0.2 +
    COALESCE(score_concurrence, 0) * 0.1
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 6. VUES
-- ============================================

-- Vue: reseaux_avec_statut (avec statut calcule et score global)
CREATE OR REPLACE VIEW reseaux_avec_statut AS
SELECT 
  r.*,
  calculer_statut(r.titulaire_est_engie, r.echeance) AS statut,
  calculer_score_global(
    r.score_echeance,
    r.score_taille,
    COALESCE(r.boamp_montant / 50000000.0, 0), -- Normalisation sur 50M
    r.score_concurrence
  ) AS score_global
FROM reseaux r
WHERE r.has_geometry = true OR (r.lat IS NOT NULL AND r.lng IS NOT NULL);


-- Vue: reseaux_par_region (regroupement par region)
CREATE OR REPLACE VIEW reseaux_par_region AS
SELECT 
  region,
  COUNT(*) AS nb_reseaux,
  AVG(score_global) AS avg_score,
  MAX(score_global) AS max_score,
  MIN(score_global) AS min_score,
  COUNT(*) FILTER (WHERE statut = 'ENGIE') AS nb_engie,
  COUNT(*) FILTER (WHERE statut = 'ENGIE_RENOUVELLEMENT') AS nb_engie_renouvellement,
  COUNT(*) FILTER (WHERE statut = 'NON_ENGIE') AS nb_non_engie
FROM reseaux_avec_statut
GROUP BY region;


-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Trigger pour mettre a jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reseaux_updated_at ON reseaux;
CREATE TRIGGER update_reseaux_updated_at
  BEFORE UPDATE ON reseaux
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 8. DONNEES INITIALES (Optionnel - a importer via interface Supabase)
-- ============================================

-- Les donnees seront importees depuis:
-- - reseaux: data_prep/final/reseaux_for_dashboard.json
-- - regions: a definir avec GeoJSON des regions francaises

-- Exemple de donnees pour regions (a completer):
-- INSERT INTO regions (nom, geojson, centroide_lat, centroide_lng) VALUES
-- ('Ile-de-France', '{"type":"Feature",...}', 48.8566, 2.3522);


-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS pour toutes les tables
ALTER TABLE reseaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommandations ENABLE ROW LEVEL SECURITY;

-- Politique: Lecture seule pour tout le monde (pas d'auth)
CREATE POLICY "Public read access for reseaux"
  ON reseaux FOR SELECT USING (true);

CREATE POLICY "Public read access for regions"
  ON regions FOR SELECT USING (true);

CREATE POLICY "Public read access for recommandations"
  ON recommandations FOR SELECT USING (true);


-- ============================================
-- 10. COMMENTAIRES
-- ============================================

COMMENT ON TABLE reseaux IS 'Table principale des reseaux de chaleur avec toutes les donnees';
COMMENT ON TABLE regions IS 'Table des regions francaises avec GeoJSON pour la carte';
COMMENT ON TABLE recommandations IS 'Cache des recommandations LLM generees par Voxtral';
COMMENT ON VIEW reseaux_avec_statut IS 'Vue des reseaux avec statut calcule et score global';
COMMENT ON VIEW reseaux_par_region IS 'Vue de regroupement des reseaux par region';

-- ============================================
-- INSTRUCTIONS POUR L'IMPORT
-- ============================================
-- 
-- 1. Executer ce script dans l'interface SQL de Supabase
-- 2. Importer les donnees depuis reseaux_for_dashboard.json:
--    - Aller dans Table Editor > reseaux > Import
--    - Selectionner le fichier JSON
--    - Mapper les colonnes automatiquement
--    
-- 3. Pour les regions, importer un fichier GeoJSON des regions francaises
--    ou utiliser l'API pour les recuperer
--
-- 4. Verifier que les vues et triggers fonctionnent correctement
--
-- ============================================
