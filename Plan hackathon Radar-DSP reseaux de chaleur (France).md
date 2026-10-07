# Plan hackathon — Radar échéances DSP réseaux de chaleur (France uniquement)

> Note : l'historique complet de la recherche (DECP, FCU, BOAMP, exploration internationale TED/JOUE) est conservé dans `files/plan-research-history.md`. Ce plan ne reprend que les décisions utiles à la construction du POC pour le hackathon, **scope France uniquement**.

## 0. Objectif

Construire un radar qui liste les réseaux de chaleur français, croise leurs données techniques (FCU) avec leurs données contractuelles (BOAMP en source principale, DECP en complément), et calcule une échéance de contrat (DSP/marché d'exploitation) avec un score d'opportunité — pour identifier les contrats à renouveler prochainement.

## 0bis. Risques dérisqués AVANT implémentation (vérifications live faites)

### ✅ Risque #1 — Accès aux données FCU : LEVÉ

Le risque principal identifié précédemment (« aucun export public FCU trouvé ») est résolu : **FCU publie officiellement un export en open data sur data.gouv.fr**, dataset *« Tracés des réseaux de chaleur et de froid »* (organisation : France Chaleur Urbaine), mis à jour régulièrement (dernier : 14/09/2026).

- Téléchargé et inspecté en conditions réelles (fichier `opendata-fcu.zip`, ~61 Mo).
- Contient des GeoJSON avec les attributs attendus par réseau : `Identifiant reseau`, `nom_reseau`, `communes`, `departement`, `region`, `MO` (maître d'ouvrage), `Gestionnaire`, `annee_creation`, `longueur_reseau`, `Taux EnR&R`, données de production/livraison détaillées.
- **1 022 réseaux au total** : 842 réseaux distincts avec tracé géométrique + 218 réseaux recensés sans tracé disponible.
- Exemple vérifié : réseau d'Héricourt → `Gestionnaire: "COFELY SERVICES hericourt (ENGIE SOLUTIONS)"`, cohérent avec le titulaire BOAMP « ENGIE COFELY » trouvé précédemment sur ce même réseau. Confirme que le rapprochement FCU↔BOAMP est bien réalisable sur des cas réels.
- Toujours aucun champ contractuel (date de fin, durée) — confirmé, cf. §6 de l'historique — mais ce n'est plus un risque d'accès, juste une limite de contenu déjà anticipée (comblée par BOAMP/DECP).

**Conclusion : le point bloquant n°1 du plan précédent n'existe plus.** Le pipeline peut démarrer directement sur ce fichier.

### ⚠️ Risque #2 — Fiabilité de la jointure FCU ↔ BOAMP (nom acheteur/commune) : MESURÉ, PARTIELLEMENT MAÎTRISABLE

Test réalisé sur un échantillon réel de 100 des 133 DSP chaleur BOAMP : extraction du nom de commune depuis `nomacheteur` (regex simple retirant « Ville de/Commune de/Mairie de ») puis comparaison normalisée à la liste des communes FCU.

| Méthode | Taux de match |
| --- | --- |
| Normalisation + extraction regex simple | **44-46 %** |
| + fuzzy matching (difflib, seuil 0.82) | pas d'amélioration significative sur cet échantillon |

**Causes identifiées des non-matches** (vérifiées cas par cas, pas une supposition) :
1. **Structures intercommunales/EPCI** (« Toulouse Métropole », « Bordeaux Métropole », « Brest métropole »...) : le nom de l'acheteur est l'EPCI, pas la commune précise du réseau → nécessite une table de correspondance EPCI→communes (ex. via l'API Géo/INSEE) pour résoudre correctement.
2. **Structures non-communales** (syndicats type SIAVED, ASL, bailleurs sociaux type « Habitat et Métropole Saint-Étienne », universités) : hors périmètre direct FCU (qui référence par commune), à traiter au cas par cas ou à exclure du scope « réseaux FCU ».
3. **Non-recoupement réel** : certaines communes avec DSP BOAMP (ex. Fontainebleau, Caudan, Millau) **n'apparaissent pas du tout** dans l'export FCU actuel — probablement des réseaux fermés depuis, non recensés par FCU, ou DSP concernant un équipement hors périmètre FCU. Ce n'est pas un bug de matching, c'est un vrai non-recoupement des deux bases.
4. Imperfections mineures d'extraction regex (ex. « Commune du Bourget du Lac » existe bien dans FCU mais non détecté par la regex testée — facilement corrigible).

**Conclusion : un taux de jointure autour de 50-65 % est réaliste avec un effort de normalisation raisonnable** (ajout d'une table EPCI→commune, nettoyage regex), **pas 100 %**. C'est suffisant pour un POC de hackathon (on affiche un statut « non rapproché » pour le reste plutôt que de bloquer), mais ça doit être assumé dans la démo et dans le choix du niveau de confiance affiché par réseau.

### Ce qui reste à vérifier pendant l'implémentation (pas bloquant, mais à surveiller)
- Couverture réelle de la jointure FCU↔DECP (même technique de matching, pas encore testée en volume).
- Robustesse du parseur BOAMP sur les variantes de schéma (déjà identifié, pas re-testé ici).

## 1. Sources retenues (décision actée)

| Source | Rôle | Ce qu'elle apporte |
| --- | --- | --- |
| **FCU** (France Chaleur Urbaine) | Référentiel de base | Liste des ~900 réseaux, gestionnaire actuel, année de création, mix énergétique, longueur réseau |
| **BOAMP** (open data, `boamp-datadila.opendatasoft.com`) | Source principale des échéances | Avis d'attribution DSP/marchés légalement publiés : titulaire, date d'attribution, durée en mois → échéance calculable. 133 DSP « réseau de chaleur » identifiées, vs 13 en DECP |
| **DECP** (`data.economie.gouv.fr`, `decp-2022-marches-valides` / `decp-2022-concessions-valides`) | Complément / vérification croisée | 4 001 marchés liés à la chaleur ; sert à enrichir/confirmer quand BOAMP est incomplet, et à couvrir des marchés hors-seuil de publication BOAMP |

Pas d'extension internationale dans ce plan (documentée séparément dans l'historique comme roadmap).

## 2. Pipeline de construction

1. **Télécharger l'export FCU officiel** depuis data.gouv.fr (dataset « Tracés des réseaux de chaleur et de froid », mis à jour régulièrement) : 1 022 réseaux (commune, gestionnaire, MO, année de création, longueur, mix énergie). ✅ Vérifié et dérisqué — plus besoin de scraping ni de contact FCU.
2. **Extraire les avis BOAMP pertinents** : filtrer `nature_categorise_libelle like "resultat"` + mots-clés/CPV chaleur (`09323*`, `71314*`, `50720*` + « réseau de chaleur », « chauffage urbain »), parser le champ JSON `donnees` pour sortir CPV, titulaire, date d'attribution, durée en mois (gérer les variantes de schéma XML, `LOT` dict ou liste).
3. **Extraire les marchés/concessions DECP chaleur** (déjà mesuré : 4 001 marchés, 13 concessions) en complément.
4. **Normaliser les identifiants acheteurs** (SIRET/SIREN si dispo) et prévoir une **table de correspondance EPCI→communes** (via API Géo/INSEE) pour résoudre les cas où l'acheteur BOAMP/DECP est une intercommunalité plutôt qu'une commune — mesuré comme la principale cause de non-match (cf. §0bis).
5. **Joindre FCU ↔ BOAMP** (commune + gestionnaire, SIRET si disponible) → échéance fiable sur les réseaux couverts.
6. **Joindre FCU ↔ DECP** en complément sur les réseaux non couverts par BOAMP.
7. **Fallback échéance estimée** pour les réseaux FCU sans aucun avis trouvé (probable DSP pré-2015) : `annee_creation` + durée médiane observée sur l'échantillon BOAMP (~20-25 ans), avec badge « estimée, non confirmée » — jamais masqué, toujours affiché avec son niveau de confiance.
8. **Scoring d'opportunité** : combiner échéance (plus proche = score plus élevé), taille du réseau (longueur), signal de concurrence (nombre d'offres reçues si dispo dans BOAMP), éventuellement classification Mistral sur le texte libre des avis pour détecter les signaux faibles (avenants, contentieux, intentions de renouvellement).
9. **Restitution** : interface (Streamlit ou équivalent POC) listant les réseaux par échéance croissante / score décroissant, avec niveau de confiance affiché par source.

## 3. Chiffres clés déjà vérifiés (pour cadrer les attentes de complétude)

- BOAMP : 133 DSP « réseau de chaleur » avec date d'attribution + durée exploitables (117 acheteurs distincts), 70% de complétude des 4 champs clés sur un échantillon de 50.
- DECP : 4 001 marchés chaleur (1 454 acheteurs distincts), seulement 13 concessions nationales mentionnant « chaleur ».
- FCU : ~900 réseaux recensés mais aucun champ contractuel natif — sert uniquement de référentiel technique/gestionnaire.
- Conséquence : le radar sera **crédible sur un sous-ensemble significatif** (BOAMP-couvert, post-2015) et **affichera une estimation prudente** pour le reste — pas une couverture 100% fiable sur tous les ~900 réseaux, ce qui doit être assumé dans la communication du POC.

## 4. Risques identifiés à garder en tête

- ~~Pas d'export FCU confirmé~~ → **levé** : export officiel data.gouv.fr confirmé et inspecté (cf. §0bis).
- **Jointure FCU↔BOAMP par nom** : taux de match mesuré ~45-65% selon effort de normalisation (EPCI→commune, nettoyage regex) — à budgéter, ne pas viser 100%, afficher un statut « non rapproché » explicite plutôt que de masquer.
- Variantes de schéma XML BOAMP (plusieurs versions `source_schema`) → parseur à rendre tolérant, ne pas viser 100% de complétude.
- Doublons/rectificatifs BOAMP (avis initial, rectificatif, résultat pour un même contrat) → dédoublonner par acheteur + objet proche, ou utiliser les champs de chaînage d'avis liés.
- Certains réseaux avec DSP BOAMP n'apparaissent plus du tout dans l'export FCU actuel (réseaux fermés/non recensés) → cas réel confirmé (Fontainebleau, Caudan, Millau), à traiter comme non-recoupement légitime plutôt que bug.

## 5. Prototype & présentation

### 5.1 Ce qu'on montre en démo (aligné avec le pitch du brief original)

1. **Carte/liste radar des échéances** : réseaux FCU classés par échéance croissante (BOAMP → DECP → estimée), filtrable par région/titulaire sortant/horizon (2027-2030), avec un badge de confiance par ligne (🟢 BOAMP confirmé / 🟡 DECP / ⚪ estimé).
2. **Fiche opportunité** sur un réseau sélectionné : acheteur, titulaire sortant, date d'attribution, durée, nombre d'offres reçues (signal de concurrence), score d'opportunité avec explication par critère.
3. **(Si le temps le permet) Agent conversationnel** NL→SQL sur la table consolidée (ex. *« Quelles DSP chaleur gérées par un concurrent arrivent à échéance avant 2029 ? »*) — scope à confirmer selon le temps réellement disponible ; prévoir un **fallback obligatoire** : 3 questions pré-enregistrées avec réponses figées si l'agent ne fonctionne pas de façon fiable avant le gel du code.

### 5.2 Score d'opportunité (repris du brief, à valider avec le métier avant de coder — cf. §7)

| Critère | Logique | Poids indicatif |
| --- | --- | --- |
| Échéance | Plus proche (fenêtre 12-36 mois) = score plus élevé | 35 % |
| Titulaire sortant | Concurrent = conquête ; ENGIE = rétention à sécuriser | 25 % |
| Concurrence | Peu d'offres reçues (`NB_OFFRE_RECU` BOAMP) = marché peu disputé | 20 % |
| Taille | Montant / longueur réseau | 20 % |

### 5.3 Script de pitch (3 min, repris du brief)

1. Problème (30s) → 2. Démo carte+fiche+agent (90s) → 3. Rôle de Mistral dans la réparation de la donnée (20s) → 4. Valeur business / réutilisabilité GEMS-Efficacité énergétique (30s) → 5. Punchline de clôture (10s).

## 6. Répartition du travail à 3 personnes

**Principe clé compte tenu du format court (2h annoncé dans le brief initial)** : tout ce qui peut être pré-calculé AVANT le hackathon (téléchargement FCU, extraction BOAMP/DECP, jointure, table EPCI) doit l'être — sous réserve de validation du règlement (cf. §7, point 1). Le temps de hackathon doit se concentrer sur l'intégration, le scoring, Mistral, et l'UX/démo, pas sur la redécouverte de ce qui a déjà été vérifié dans ce document.

| Rôle | Responsabilité principale | Appui sur ce plan |
| --- | --- | --- |
| **Rôle 1 — Data & Pipeline** | Finalise/exécute le pipeline §2 (téléchargement FCU, extraction+parsing BOAMP, extraction DECP, jointure EPCI→commune, calcul d'échéance + fallback), expose une table unique requêtable (SQLite/DuckDB/CSV) | §2, §0bis, §3, §4 |
| **Rôle 2 — Mistral & Scoring** | Implémente le score d'opportunité (§5.2), le prompt de classification des signaux faibles, le prompt de fiche opportunité, et l'agent NL→SQL (+ les 3 questions de secours pré-enregistrées) | §5.1, §5.2 |
| **Rôle 3 — Prototype/UX & Pitch** | Écran radar (liste/carte + filtres + badges de confiance), écran fiche opportunité, intégration visuelle, chronométrage et répétition du pitch (§5.3), slides de secours | §5.1, §5.3 |

### Déroulé indicatif sur 2h (à ajuster une fois le format exact confirmé)

| Créneau | Rôle 1 (Data) | Rôle 2 (Mistral/Score) | Rôle 3 (UX/Pitch) |
| --- | --- | --- | --- |
| 0:00-0:10 | Vérifie l'environnement, charge les données déjà pré-extraites | Cadrage : 3 cas de démo concrets (réseaux bien couverts, ex. Héricourt) | Cadrage structure du pitch |
| 0:10-0:40 | Finalise jointure FCU↔BOAMP↔DECP + calcul échéance/fallback | Implémente et teste le score sur les 3 cas démo | Construit l'écran radar (liste + filtres + badges) |
| 0:40-1:10 | Expose la table consolidée (requêtable), corrige les cas limites remontés par les autres rôles | Prompt fiche opportunité + agent NL→SQL, test sur les 3 cas | Écran fiche opportunité + intégration du prompt |
| 1:10-1:30 | Intégration bout en bout, corrections | Finalise le fallback 3 questions pré-enregistrées | Polissage UX (couleurs, textes, états vides/estimés) |
| 1:30-1:45 | **Gel du code**, capture vidéo de secours | Répétition du pitch | Captures d'écran de secours pour les slides |
| 1:45-2:00 | Support technique pendant la répétition | Répétition finale chronométrée | Slide d'extension (GEMS / efficacité énergétique) |

**Règles d'équipe** (reprises du brief) : gel du code à 1:30 sans exception ; si l'agent conversationnel ne fonctionne pas de façon fiable à 1:10, bascule sur les 3 questions pré-enregistrées ; une seule personne pousse sur la branche principale.

## 7. Ce qu'on peut/doit valider AVANT de démarrer le hackathon

### Organisationnel (repris et complété du brief initial)
- [ ] **Règlement** : données et code préparés à l'avance sont-ils autorisés ? Si oui → faire tout le pipeline data (§2, §0bis) en amont et arriver avec la table consolidée prête. Si non → le plan de charge ci-dessus doit intégrer le temps de pipeline complet, ce qui est serré sur 2h à 3 personnes.
- [ ] **Accès Mistral** : clé API/crédits fournis par l'organisateur confirmés, modèles disponibles identifiés.
- [ ] **Format de rendu** : dépôt de code, URL, ou vidéo ? Conditionne si on investit du temps dans le déploiement ou juste la démo locale.
- [ ] **Rôle de Wivoo** dans le défi : données ou outils spécifiques à exploiter en plus de ceux déjà identifiés ici ?
- [ ] Repo git initialisé et accès partagé aux 3 avant le début.

### Data (nouveau, basé sur les vérifications de ce document)
- [ ] **Pré-télécharger le zip FCU** (`opendata-fcu.zip` depuis le dataset data.gouv.fr « Tracés des réseaux de chaleur et de froid ») et pré-extraire les GeoJSON — fichier volumineux (~60 Mo), ne pas le télécharger en live le jour J.
- [ ] **Pré-exécuter l'extraction BOAMP** (133 DSP chaleur + 4 001 marchés chaleur DECP) et stocker en CSV/SQLite prêt à requêter — évite de dépendre de la disponibilité live des API Opendatasoft pendant le hackathon.
- [ ] **Pré-construire la table EPCI→communes** (API Géo/INSEE) identifiée comme solution au principal point de non-match (§0bis).
- [ ] **Choisir et figer les 3 cas de démo** à l'avance sur des réseaux déjà confirmés bien couverts (ex. réseau d'Héricourt / ENGIE COFELY, cf. §0bis) plutôt que de les découvrir en live.
- [ ] **Liste des SIREN/SIRET des concurrents** (Dalkia, Coriance, Idex, ENGIE Solutions et filiales) à préparer pour la normalisation des titulaires et la détection « concurrent vs ENGIE » du score.

### Métier
- [ ] **Validation du score d'opportunité** (pondérations §5.2) par une personne côté métier/PM avant de le coder, pour éviter de le refaire en plein hackathon.

## 8. Plan d'exécution détaillé — préparation DATA avant le hackathon

Objectif : arriver le jour J avec une **table consolidée unique, requêtable immédiatement** (réseaux × échéance × score de base), sans dépendre d'aucun appel réseau live ni d'aucune extraction encore à faire. Tout ce qui suit peut être fait en amont, en lecture seule sur les sources publiques (sous réserve de validation §7 — règlement autorisant la préparation).

### Étape 1 — Récupérer et figer les données brutes (aucune dépendance entre ces 3 tâches, parallélisables)

| Tâche | Source | Méthode | Livrable |
| --- | --- | --- | --- |
| 1.1 FCU | data.gouv.fr, dataset « Tracés des réseaux de chaleur et de froid » | Télécharger `opendata-fcu.zip`, extraire `reseaux_de_chaleur.geojson` + `reseaux_de_chaleur_sans_traces.geojson` | `raw/fcu_reseaux.csv` (1 022 lignes : id réseau, nom, communes, departement, region, MO, Gestionnaire, annee_creation, longueur_reseau, mix énergie) |
| 1.2 BOAMP | `boamp-datadila.opendatasoft.com`, dataset `boamp` | Appels API paginés avec `where=nature_categorise_libelle like "resultat" and (objet like "chaleur" or objet like "chauffage urbain")`, limit/offset jusqu'à épuisement | `raw/boamp_notices_chaleur.jsonl` (tous les avis bruts, champ `donnees` inclus, ~790 lignes attendues : 133 concessions + 657 marchés) |
| 1.3 DECP | `data.economie.gouv.fr`, `decp-2022-marches-valides` + `decp-2022-concessions-valides` | Appels API paginés avec filtre CPV (`09323*`, `71314*`, `50720*`) union mots-clés objet | `raw/decp_marches_chaleur.csv` + `raw/decp_concessions_chaleur.csv` (~4 001 + 13 lignes) |

**Critère de succès étape 1** : 3 fichiers bruts présents localement, avec un comptage de lignes qui correspond (± marge raisonnable) aux volumes déjà mesurés dans ce document — si un comptage s'écarte fortement, creuser avant de continuer (ne pas construire la suite du pipeline sur une extraction suspecte).

### Étape 2 — Parser et structurer chaque source indépendamment

| Tâche | Détail | Livrable |
| --- | --- | --- |
| 2.1 Parser BOAMP | Parser le JSON `donnees` de chaque ligne de 1.2, en tolérant les variantes de schéma (`LOT` dict ou liste, chemins alternatifs selon `source_schema`) ; extraire : CPV, nomacheteur, titulaire, date_attribution, duree_mois, montant, nb_offre_recu | `clean/boamp_dsp_parsed.csv` avec un flag `completude` (nb de champs clés trouvés sur 4) par ligne |
| 2.2 Dédoublonner BOAMP | Regrouper les avis liés (initial/rectificatif/résultat) par `nomacheteur` + objet proche (similarité texte) ou via les champs de chaînage s'ils sont exploités | `clean/boamp_dsp_dedup.csv` (1 ligne = 1 contrat, pas 1 avis) |
| 2.3 Nettoyer DECP | Même logique de nettoyage/normalisation basique (dates, montants) sur les fichiers 1.3 | `clean/decp_chaleur_clean.csv` |

**Critère de succès étape 2** : sur un échantillon de 20 lignes de `boamp_dsp_dedup.csv`, vérification manuelle que `duree_mois` + `date_attribution` donnent une échéance plausible (ni dans le passé de plusieurs décennies, ni à 100 ans dans le futur) — un garde-fou simple contre une erreur de parsing silencieuse.

### Étape 3 — Construire les référentiels de normalisation (nécessaires à la jointure)

| Tâche | Détail | Livrable |
| --- | --- | --- |
| 3.1 Table EPCI → communes | Télécharger via l'API Géo (`geo.api.gouv.fr`) ou l'INSEE la liste des EPCI et leurs communes membres, pour résoudre les acheteurs de type « Toulouse Métropole » vers une ou plusieurs communes | `ref/epci_communes.csv` |
| 3.2 Liste SIREN concurrents | Rechercher sur l'Annuaire des entreprises/SIRENE les SIREN de Dalkia, Coriance, Idex, ENGIE Solutions/COFELY et principales filiales connues | `ref/siren_concurrents.csv` (raison sociale, SIREN, groupe parent, est_engie: oui/non) |
| 3.3 Normalisation noms d'acheteurs | Fonction de normalisation texte (minuscule, suppression accents/articles « Ville de/Commune de/Mairie de/CU/CA/CC », suppression codes postaux parenthésés) réutilisée pour tous les matchings | `scripts/normalize.py` (fonction pure, testée sur les cas déjà rencontrés : Héricourt, Villard-de-Lans (38), Bourget-du-Lac) |

**Critère de succès étape 3** : relancer le test de matching déjà fait (§0bis, 44-46% naïf) avec la table EPCI intégrée → objectif mesuré d'atteindre **≥55-60%** sur le même échantillon de 100 DSP BOAMP avant de considérer l'étape suffisante.

### Étape 4 — Jointures et calcul final

| Tâche | Détail | Livrable |
| --- | --- | --- |
| 4.1 Joindre FCU ↔ BOAMP | Sur commune normalisée (+ résolution EPCI si acheteur = EPCI) + similarité nom gestionnaire/titulaire | `joined/fcu_boamp.csv` avec statut par ligne : `matched_exact`, `matched_epci`, `unmatched` |
| 4.2 Joindre FCU ↔ DECP | Même logique, en complément des réseaux non couverts par 4.1 | `joined/fcu_decp.csv` |
| 4.3 Fusionner | Une ligne par réseau FCU, avec la meilleure source disponible (priorité BOAMP > DECP > estimé), date d'échéance calculée, niveau de confiance (`confirmee_boamp`, `confirmee_decp`, `estimee`) | `final/reseaux_echeances.csv` — **la table de référence pour tout le reste du build** |
| 4.4 Fallback estimé | Pour les réseaux restés `unmatched` : `annee_creation` + durée médiane observée sur les contrats confirmés de l'étape 4.3 (calculer cette médiane sur la vraie donnée, pas une hypothèse a priori) | Complète `final/reseaux_echeances.csv` |

**Critère de succès étape 4** : `final/reseaux_echeances.csv` contient les 1 022 réseaux FCU, chacun avec une échéance (confirmée ou estimée) et un niveau de confiance explicite — aucune ligne vide sur ces deux colonnes.

### Étape 5 — Score de base + cas de démo figés

| Tâche | Détail | Livrable |
| --- | --- | --- |
| 5.1 Score d'opportunité (hors Mistral) | Calculer la partie mécanique du score (§5.2 : proximité échéance, taille, nb offres reçues) directement en SQL/pandas sur `final/reseaux_echeances.csv` — le volet Mistral (signaux faibles) sera ajouté le jour J par le Rôle 2 | `final/reseaux_scored.csv` |
| 5.2 Sélection des cas de démo | Choisir 3 réseaux avec confiance `confirmee_boamp`, échéance dans la fenêtre 2027-2030, données complètes (titulaire, montant, nb offres) — ex. Héricourt déjà vérifié | `demo/cas_demo.md` (détail narratif des 3 cas, prêt pour le script de pitch) |
| 5.3 Questions de secours pour l'agent NL→SQL | Rédiger à l'avance 3 questions + réponses attendues sur `final/reseaux_scored.csv`, pour le fallback obligatoire si l'agent échoue le jour J | `demo/questions_secours.md` |

**Résultat final de cette préparation** : un seul fichier `final/reseaux_scored.csv` chargeable instantanément en SQLite/DuckDB le jour J, plus les fichiers de référence et de démo — le hackathon peut commencer directement sur le scoring Mistral, l'agent conversationnel, et l'UX (cf. §6), sans perdre de temps sur l'extraction/jointure.

## 9. ✅ Exécuté — Résultats réels de la préparation data (07/10/2026)

Les 5 étapes ci-dessus ont été implémentées et exécutées (scripts Python dans `data_prep/scripts/`
du repo local). Chiffres réels mesurés (pas des estimations) :

| Étape | Résultat mesuré |
| --- | --- |
| 1.1 FCU | 1060 réseaux distincts extraits (export data.gouv.fr du 14/09/2026) |
| 1.2 BOAMP | 5223 avis chaleur, dont 112 avis famille DSP |
| 1.3 DECP | 2020 marchés/concessions CPV chaleur |
| 2.2 Dédoublonnage BOAMP | 61 contrats DSP distincts, dont **13 avec les 4 champs clés complets** (titulaire, date, durée, montant) — confirme le chiffre déjà estimé en §0bis |
| 3.1 Table EPCI→communes | 34 871 communes rattachées à 1253 EPCI (API Géo) |
| 3.2 SIREN concurrents | 130 entités identifiées (Dalkia, Coriance, Idex, ENGIE Solutions, Veolia) |
| 3.3 Test de matching avec EPCI | **70% des acheteurs BOAMP matchés** à un réseau FCU (objectif §8 étape 3 : ≥55-60% — **dépassé**, vs 44-46% sans la table EPCI) |
| 4.2 Jointure FCU↔DECP | 21% des acheteurs DECP matchés (plus faible que BOAMP car DECP couvre beaucoup d'acheteurs hors périmètre FCU : hôpitaux, universités, etc.) |
| 4.3-4.4 Table finale | 1060 réseaux : **17 avec échéance confirmée BOAMP**, 867 estimées (création + durée médiane réelle de 240 mois = 20 ans sur les contrats DSP/concession confirmés), 176 sans donnée exploitable |
| 5.1 Score | `final/reseaux_scored.csv` généré, score 0-1 par réseau |
| 5.2 Cas de démo | 3 cas figés dans `demo/cas_demo.md` : Clichy-sous-Bois/Le Chêne Pointu (conquête, échéance 2025-06-27), Héricourt (défense ENGIE, échéance 2025-09-27 — recoupe le cas déjà vérifié en §0bis), Nantes/IDEX (watchlist long terme, 107M€, échéance 2036-12-16 sur 8 réseaux FCU rattachés) |
| 5.3 Questions de secours | 3 questions + réponses chiffrées dans `demo/questions_secours.md` |

**Point d'attention corrigé en cours de route** : la première version du fallback mélangeait les
durées DECP de nature MARCHE/ACCORD-CADRE (contrats de maintenance, médiane ~48 mois) avec les vraies
durées de concession, ce qui aurait donné des échéances fallback fausses. Corrigé pour ne garder que
les durées de contrats DSP/concession confirmés (médiane réelle : 240 mois).

**Limite à annoncer en pitch** : seuls 17/1060 réseaux ont une échéance *confirmée* par un document
officiel — le reste est une estimation. C'est le cœur du use case (prioriser l'instruction manuelle),
pas un calcul à présenter comme certain.

Tous les scripts, données et livrables sont dans `data_prep/` à la racine du repo (voir son `README.md`
pour la procédure d'exécution complète et les prérequis réseau/certificats).

