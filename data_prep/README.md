# Data prep — Radar échéances DSP réseaux de chaleur

Pipeline de préparation data exécuté **avant** le hackathon, pour arriver le jour J avec une table
consolidée unique prête à requêter (`final/reseaux_scored.csv`), sans dépendance réseau live.

Détail complet du plan : voir `../Plan hackathon — Radar échéances DSP réseaux de chaleur (France).md`
(§8 — Plan d'exécution détaillé).

## Installation

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

> Note environnement ENGIE : le proxy corporate fait du MITM TLS. Un bundle CA combiné
> (certifi + certificat corporate exporté du trousseau macOS) est fourni dans
> `scripts/corp_ca_bundle.pem` et utilisé automatiquement par `scripts/common.py::get_session()`.
> Si ce fichier devient invalide (expiration du certificat), le régénérer avec :
> ```bash
> security find-certificate -a -p /Library/Keychains/System.keychain > /tmp/roots.pem
> security find-certificate -a -p /Users/$USER/Library/Keychains/login.keychain-db >> /tmp/roots.pem
> cat $(./.venv/bin/python3 -c "import certifi; print(certifi.where())") /tmp/roots.pem > scripts/corp_ca_bundle.pem
> ```

## Exécution (dans l'ordre)

```bash
cd scripts
../.venv/bin/python3 step1_1_fetch_fcu.py        # FCU : raw/fcu_reseaux.csv
../.venv/bin/python3 step1_2_fetch_boamp.py      # BOAMP : raw/boamp_notices_chaleur.jsonl
../.venv/bin/python3 step1_3_fetch_decp.py       # DECP : raw/decp_chaleur.csv

../.venv/bin/python3 step2_1_parse_boamp.py      # clean/boamp_dsp_parsed.csv
../.venv/bin/python3 step2_2_dedup_boamp.py      # clean/boamp_dsp_dedup.csv
../.venv/bin/python3 step2_3_clean_decp.py       # clean/decp_chaleur_clean.csv

../.venv/bin/python3 step3_1_epci_communes.py    # ref/epci_communes.csv (~5-10 min, API Géo)
../.venv/bin/python3 step3_2_siren_concurrents.py # ref/siren_concurrents.csv

../.venv/bin/python3 step4_join.py               # joined/*.csv + final/reseaux_echeances.csv
../.venv/bin/python3 step5_1_score.py            # final/reseaux_scored.csv

../.venv/bin/python3 step6_export_dashboard_json.py  # final/reseaux_for_dashboard.json
../.venv/bin/python3 step7_build_dashboard_html.py    # dashboard_reseaux_chaleur.html

../.venv/bin/python3 step1_4_fcu_kml.py          # raw/fcu_reseaux.kml + .kmz (indépendant, re-télécharge FCU)

../.venv/bin/python3 step8_fetch_ted.py          # ref/ted_notices_chaleur.jsonl + joined/fcu_ted.csv (indépendant, API TED)
../.venv/bin/python3 step9_merge_ted.py          # réinjecte le signal TED (dernier avis) dans final/reseaux_scored.csv
../.venv/bin/python3 step10_ted_xml_echeance.py  # joined/fcu_ted_xml.csv (scrape XML complet des avis matchés, ~5-6 min)
../.venv/bin/python3 step11_merge_ted_xml.py     # remplace les échéances estimee/inconnue par une échéance réelle quand trouvée dans le XML TED
```

**`final/reseaux_scored.csv` est le livrable à charger le jour J** (SQLite/DuckDB/pandas), cf.
`demo/cas_demo.md` et `demo/questions_secours.md` pour la démo et le fallback.

## Dashboard HTML (prototype AG-Grid)

Le tableau interactif `dashboard_reseaux_chaleur.html` (à la racine de `data_prep/`) est généré en 2 étapes :

| Fichier | Rôle |
| --- | --- |
| `scripts/step6_export_dashboard_json.py` | Lit `final/reseaux_scored.csv` (100+ colonnes), sélectionne les ~30 colonnes utiles à l'affichage (réseau, localisation, MO/gestionnaire, échéance, confiance, titulaire, scores, signal TED dont la durée/date de conclusion extraites du XML...), met en forme dates/libellés, écrit `final/reseaux_for_dashboard.json`. |
| `scripts/dashboard_template.html` | Template HTML/CSS/JS statique (AG-Grid 31.3.2 via CDN) avec un placeholder `__ROWDATA_JSON__` à la place des données. Contient la recherche rapide, le bouton de réinitialisation des filtres, les colonnes, les rendus personnalisés (badges confiance/titulaire, barre de score) et la barre de stats. |
| `scripts/step7_build_dashboard_html.py` | Injecte le contenu de `final/reseaux_for_dashboard.json` dans `scripts/dashboard_template.html` à la place de `__ROWDATA_JSON__` et écrit le résultat autonome dans `dashboard_reseaux_chaleur.html` (racine de `data_prep/`). |

Pour régénérer le dashboard après une mise à jour des données ou du template :

```bash
cd scripts
../.venv/bin/python3 step6_export_dashboard_json.py
../.venv/bin/python3 step7_build_dashboard_html.py
```

`dashboard_reseaux_chaleur.html` est un fichier unique, sans serveur ni build : ouvrable directement
en double-cliquant (`file://`), seules les librairies AG-Grid sont chargées depuis le CDN jsdelivr.

## Export géographique (KML/KMZ)

`scripts/step1_4_fcu_kml.py` re-télécharge le zip FCU (même source que `step1_1`) mais conserve
cette fois les géométries (tracés + points) pour produire une couche SIG complète :
- `raw/fcu_reseaux.kml` (118 Mo, non compressé)
- `raw/fcu_reseaux.kmz` (24 Mo, compressé — à privilégier, copié à la racine de `data_prep/` en
  `fcu_reseaux_chaleur.kmz`) — ouvrable dans Google Earth, QGIS, etc.

Contenu : 1033 tracés (MultiLineString) + 218 réseaux sans tracé (Point), avec toutes les
métadonnées FCU en description de chaque placemark.

## Vérification croisée des échéances via TED (Tenders Electronic Daily)

FCU ne contient aucune donnée contractuelle (ni date d'échéance, ni titulaire) : nos échéances
viennent uniquement de BOAMP/DECP, avec un fallback (année de création + durée médiane) pour les
réseaux sans contrat matché. Pour fiabiliser ce fallback, on interroge en plus **TED**, la base
européenne des marchés publics (seuils UE, donc surtout des grosses DSP/concessions) :

| Fichier | Rôle |
| --- | --- |
| `scripts/step8_fetch_ted.py` | Interroge l'API `api.ted.europa.eu/v3/notices/search` (CPV `09323000*` chauffage urbain, France), 958 avis récupérés, sauvegardés bruts dans `ref/ted_notices_chaleur.jsonl`. Matche l'acheteur de chaque avis aux communes/EPCI FCU (même logique que `step4_join.py`), écrit `joined/fcu_ted.csv` (clé stable `Identifiant reseau`, **pas** une position de ligne). |
| `scripts/step9_merge_ted.py` | Agrège par réseau le dernier avis TED matché (date, nombre d'avis, lien) et réinjecte 4 colonnes dans `final/reseaux_scored.csv` : `ted_dernier_avis`, `ted_nb_avis`, `ted_lien`, `ted_echeance_depassee`. À relancer après tout nouveau `step5_1_score.py`. |
| `scripts/step10_ted_xml_echeance.py` | Télécharge le **XML complet** de chacun des 329 avis TED uniques matchés (pas l'API de recherche, mais `https://ted.europa.eu/en/notice/{num}/xml`) et en extrait la durée du contrat + sa date de conclusion/attribution, dans les 2 formats TED existants : Formex pré-2023 (`<DURATION TYPE="MONTH">`, `<DATE_CONCLUSION_CONTRACT>`) et eForms/UBL 2023+ (`<cbc:DurationMeasure>`, `<cbc:AwardDate>`). Écrit `joined/fcu_ted_xml.csv`. Throttlé (0.6s/requête, retry sur 429) : ~5-6 min pour 329 avis. |
| `scripts/step11_merge_ted_xml.py` | Pour les réseaux en confiance `estimee`/`inconnue`, remplace l'échéance par celle calculée via TED XML (date de conclusion + durée) quand elle existe, passe la confiance à `confirmee_ted`, recalcule `score_echeance`/`score_opportunite`, et conserve l'ancienne valeur dans `echeance_avant_ted`/`confiance_avant_ted` pour traçabilité. Les réseaux déjà `confirmee_boamp` ne sont jamais écrasés. |

**Limite de l'API de recherche TED** : les avis antérieurs aux eForms (~2023/2024) n'exposent
quasiment jamais les champs de durée/date via l'API `v3/notices/search` (`step8`) — seule la date
de publication y est fiable en masse. **Mais le XML complet de chaque avis individuel, lui,
contient bien la durée et la date de conclusion/attribution**, dans les deux formats TED
(Formex et eForms) : c'est ce que `step10`/`step11` exploitent, en ne scrapant que les ~330 avis
déjà matchés à un réseau FCU (pas les 958 avis bruts).

**Résultats** :
- **324 des 1060 réseaux FCU** (≈30%) ont au moins un avis TED matché (`step8`/`step9`) ;
  pour **150 d'entre eux** (tous en confiance `estimee`), le dernier avis TED est postérieur à
  l'échéance calculée par le fallback — signe que `annee_creation + durée médiane` sous-estime
  l'échéance réelle pour un réseau déjà renouvelé depuis sa création. Marqué
  `ted_echeance_depassee = True`, badge ⚠ dans le dashboard.
- En poussant jusqu'au XML complet (`step10`/`step11`), **181 réseaux** passent d'une échéance
  `estimee`/`inconnue` à une échéance **réellement calculée et datée** (`confirmee_ted`), avec des
  dates très concrètes (ex. 2027-2028) au lieu d'un simple fallback statistique. Au total,
  **198 réseaux sur 1060 (≈19%) ont désormais une échéance confirmée par une source officielle**
  (17 `confirmee_boamp` + 181 `confirmee_ted`), contre 17 seulement sans TED.

## Résultats mesurés (run du 07/10/2026)

| Étape | Résultat |
| --- | --- |
| FCU | 1060 réseaux distincts |
| BOAMP (avis chaleur) | 5223 avis, dont 112 DSP |
| BOAMP DSP dédoublonnés | 61 contrats, dont 13 avec les 4 champs clés complets |
| DECP (CPV chaleur) | 2020 marchés/concessions |
| EPCI → communes | 34 871 communes rattachées à 1253 EPCI |
| SIREN concurrents | 130 entités (Dalkia, Coriance, Idex, ENGIE Solutions, Veolia) |
| Jointure FCU↔BOAMP | **70% des acheteurs BOAMP matchés** (vs 44-46% sans la table EPCI) |
| Jointure FCU↔DECP | 21% des acheteurs DECP matchés (attendu : DECP couvre bien plus de types d'acheteurs que FCU) |
| Échéances confirmées (BOAMP réel) | 17 réseaux |
| Échéances confirmées (TED XML, step10/11) | 181 réseaux |
| **Total échéances confirmées (source officielle)** | **198 réseaux (≈19%)** |
| Échéances estimées restantes (fallback création+durée médiane) | 712 réseaux |
| Échéances inconnues restantes | 150 réseaux |
| TED (CPV chauffage, France) | 958 avis bruts, 329 avis uniques matchés, 324 réseaux FCU concernés (≈30%) |
| Échéances "estimee" probablement sous-estimées (avis TED postérieur, non corrigées faute de durée XML) | 150 réseaux (recoupe en partie les 181 déjà corrigées) |

## Limites connues (à rappeler en pitch, cf. §0bis et §4 du plan)

- Seuls 198 réseaux ont une échéance **confirmée par une source officielle** (17 BOAMP + 181 TED
  XML) ; le reste (712) reste une estimation (fallback création+durée médiane), et 150 sont inconnues.
- Le titulaire sortant n'est identifié avec certitude que sur 14 réseaux (11 concurrents, 3 ENGIE).
- Certaines communes couvertes par des DSP connues (BOAMP) n'apparaissent pas dans l'export FCU
  actuel (réseau fermé, non recensé, ou hors périmètre) — non-match normal, pas un bug.
- TED (XML complet, step10/11) ne couvre que les réseaux dont l'acheteur a été correctement matché
  (≈30% du total) et dont le XML contient bien les champs durée+date (69/329 avis uniques, soit
  400/1386 lignes matchées) — les avis pré-eForms sans ces champs restent sur l'estimation
  `estimee`, seulement signalés "à vérifier" via `ted_echeance_depassee` quand un avis plus récent
  existe.
