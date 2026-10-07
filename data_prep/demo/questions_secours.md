# Questions de secours — Agent NL→SQL (fallback obligatoire)

À utiliser si l'agent conversationnel Mistral échoue en live le jour J. Réponses calculées sur
`final/reseaux_scored.csv` (1060 réseaux), vérifiées manuellement à l'avance.

## Q1 — « Quels sont les réseaux avec l'échéance la plus proche et le meilleur score d'opportunité ? »

**Réponse attendue** : top de la table triée par `score_opportunite` décroissant — en tête,
« Le Chêne Pointu » (Clichy-sous-Bois/Livry-Gargan, score 0,678, échéance 2025-06-27, titulaire
non-ENGIE), suivi du réseau d'Héricourt (score 0,534, échéance 2025-09-27, titulaire ENGIE COFELY).

**Requête SQL de référence** :
```sql
SELECT nom_reseau, communes, echeance, titulaire_connu, score_opportunite
FROM reseaux_scored
ORDER BY score_opportunite DESC
LIMIT 10;
```

## Q2 — « Combien de réseaux ont une échéance avant 2030 ? »

**Réponse attendue** : 443 réseaux sur 1060 (confirmés + estimés confondus — préciser à l'oral que
cela inclut des estimations par défaut, pas uniquement des échéances confirmées par un document
officiel).

**Requête SQL de référence** :
```sql
SELECT COUNT(*) FROM reseaux_scored WHERE strftime('%Y', echeance) < '2030';
```

## Q3 — « Sur combien de réseaux connaît-on déjà le titulaire, et est-ce ENGIE ou un concurrent ? »

**Réponse attendue** : 14 réseaux avec titulaire identifié avec certitude (via le nom BOAMP) :
11 opérés par un concurrent (Dalkia, IDEX, société locale), 3 par ENGIE (Héricourt, Bar-le-Duc,
Sainte-Menehould). Les ~1046 autres réseaux n'ont pas de titulaire confirmé dans notre échantillon
BOAMP (soit pas trouvé dans BOAMP, soit DSP non publiée avec titulaire visible) — c'est l'un des
axes d'enrichissement du score par Mistral (signaux faibles) pendant le hackathon.

**Requête SQL de référence** :
```sql
SELECT titulaire_est_engie, COUNT(*) FROM reseaux_scored
WHERE titulaire_connu IS NOT NULL
GROUP BY titulaire_est_engie;
```

## Note de transparence à dire à l'oral (anticiper la question du jury)

« Sur 1060 réseaux, seuls 17 ont une échéance confirmée par un document BOAMP officiel. Les ~870
autres sont des estimations (création du réseau + durée médiane observée sur les contrats confirmés),
et ~176 restent sans aucune donnée exploitable. C'est précisément le use case du radar : prioriser
l'instruction manuelle sur les réseaux à score élevé plutôt que de prétendre à une échéance certaine
partout. »
