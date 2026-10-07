# Cas de démo figés — Radar échéances DSP réseaux de chaleur

Sélectionnés dans `final/reseaux_scored.csv` (étape 5.2), tous avec `confiance = confirmee_boamp`
(donnée BOAMP réelle, pas une estimation) pour ne prendre aucun risque de donnée fausse en live.

## Cas 1 — Clichy-sous-Bois / Livry-Gargan : « Le Chêne Pointu » (conquête, échéance imminente)

- **Titulaire sortant** : société Dhuysienne de Chaleur (non-ENGIE)
- **Échéance estimée** : 2025-06-27 (attribution 2022-06-27, durée 36 mois)
- **Montant** : 13 518 364 €
- **Score d'opportunité** : 0,678 (le plus élevé de la sélection)
- **Narratif pitch** : contrat court (3 ans) arrivant déjà à échéance, titulaire non-ENGIE,
  montant significatif → cas d'école "conquête prioritaire à instruire immédiatement".

## Cas 2 — Héricourt : « Réseau d'Héricourt - Quartier Maunoury » (défense, échéance imminente)

- **Titulaire sortant** : ENGIE COFELY (ENGIE)
- **Échéance estimée** : 2025-09-27 (attribution 2019-09-27, durée 72 mois)
- **Montant** : 2 304 567 €
- **Vérifié manuellement** (cf. §0bis du plan) : le gestionnaire FCU du réseau ("COFELY SERVICES
  hericourt (ENGIE SOLUTIONS)") correspond bien au titulaire BOAMP.
- **Narratif pitch** : cas "défense" — réseau déjà géré par ENGIE, échéance dans moins d'un an,
  à sécuriser avant mise en concurrence.

## Cas 3 — Nantes Métropole : réseau multi-sites IDEX (conquête, échéance moyen terme, gros volume)

- **Titulaire sortant** : IDEX Infra (non-ENGIE)
- **Échéance estimée** : 2036-12-16 (attribution 2016-12-16, durée 240 mois)
- **Montant** : 107 251 894 € (le plus gros montant confirmé de la sélection)
- **8 réseaux FCU rattachés** au même contrat (Nantes, Rezé, Saint-Herblain, Bouguenais,
  Saint-Jean-de-Boiseau, Sainte-Luce-sur-Loire, Couëron, Indre, Orvault)
- **Narratif pitch** : cas "watchlist long terme" — montre que l'outil ne sert pas qu'aux échéances
  immédiates mais aussi à anticiper des très gros contrats encore loin dans le temps (10+ ans),
  utile pour la feuille de route commerciale pluriannuelle.

## Pourquoi ces 3 cas précisément

- Couvrent les 3 angles du pitch : conquête court terme / défense court terme / watchlist long terme
  sur un gros contrat.
- Aucune donnée inventée : les 3 proviennent directement de `boamp_dsp_dedup.csv` (complétude 4/4).
- Permettent de montrer le score d'opportunité dans 3 configurations différentes (titulaire ENGIE vs
  concurrent, montant petit vs gros, échéance proche vs lointaine).
