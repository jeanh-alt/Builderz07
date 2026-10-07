"""Étape 11 — Fusionner l'échéance calculée (TED XML, step10) dans la table finale.

Pour les réseaux en confiance "estimee" ou "inconnue" (fallback création+durée médiane, ou
aucune donnée contractuelle du tout), on dispose désormais pour certains d'entre eux d'une
échéance RÉELLE calculée à partir du XML complet d'un avis TED (durée du contrat + date de
conclusion/attribution, cf. step10_ted_xml_echeance.py). On remplace alors l'estimation par
cette valeur et on passe la confiance à "confirmee_ted" (preuve officielle UE, au même niveau
de fiabilité qu'un "confirmee_boamp"), tout en conservant l'ancienne valeur dans des colonnes
"*_avant_ted" pour la traçabilité.

Pour les réseaux déjà en "confirmee_boamp" (document officiel national), on NE écrase PAS
l'échéance : si un avis TED existe aussi, on le garde en information de contrôle via les
colonnes ted_dernier_avis / ted_echeance_depassee (step9), pas comme source de vérité.

Entrée: joined/fcu_ted_xml.csv (step10), final/reseaux_scored.csv
Sortie: final/reseaux_scored.csv (mis à jour), en place
"""
import pandas as pd

from common import FINAL, JOINED
from step5_1_score import NOW, score_echeance


def main():
    xml_path = JOINED / "fcu_ted_xml.csv"
    if not xml_path.exists():
        print("[11] ATTENTION: joined/fcu_ted_xml.csv absent, lancer step10_ted_xml_echeance.py d'abord. Abandon.")
        return
    fcu_ted_xml = pd.read_csv(
        xml_path, parse_dates=["ted_date_reference_xml", "ted_echeance_xml"]
    )
    fcu_ted_xml = fcu_ted_xml[fcu_ted_xml["ted_echeance_xml"].notna()]

    # 1 ligne par réseau : on garde l'avis dont la date de conclusion/attribution est la plus récente
    # (= le contrat actuellement en vigueur, pas un historique de renouvellement antérieur)
    best = (
        fcu_ted_xml.sort_values("ted_date_reference_xml")
        .groupby("Identifiant reseau")
        .tail(1)
        .rename(columns={"publication_number": "ted_publication_number_source"})
    )[
        [
            "Identifiant reseau",
            "ted_publication_number_source",
            "ted_duree_mois_xml",
            "ted_date_reference_xml",
            "ted_echeance_xml",
            "ted_format_xml",
        ]
    ]

    scored_path = FINAL / "reseaux_scored.csv"
    scored = pd.read_csv(scored_path, parse_dates=["echeance"])
    # Idempotence : on retire les colonnes ajoutées par un run précédent avant de refusionner.
    drop_cols = [
        "ted_publication_number_source",
        "ted_duree_mois_xml",
        "ted_date_reference_xml",
        "ted_echeance_xml",
        "ted_format_xml",
        "echeance_avant_ted",
        "confiance_avant_ted",
    ]
    scored = scored.drop(columns=[c for c in drop_cols if c in scored.columns])

    merged = scored.merge(best, on="Identifiant reseau", how="left")

    a_ameliorer = merged["confiance"].isin(["estimee", "inconnue"]) & merged["ted_echeance_xml"].notna()
    merged["echeance_avant_ted"] = merged["echeance"].where(a_ameliorer)
    merged["confiance_avant_ted"] = merged["confiance"].where(a_ameliorer)

    merged.loc[a_ameliorer, "echeance"] = merged.loc[a_ameliorer, "ted_echeance_xml"]
    merged.loc[a_ameliorer, "confiance"] = "confirmee_ted"
    merged.loc[a_ameliorer, "source_echeance"] = "TED (avis " + merged.loc[a_ameliorer, "ted_publication_number_source"] + ")"

    # Recalcul des scores dépendant de l'échéance (même formule que step5_1_score.py)
    merged["score_echeance"] = merged["echeance"].apply(score_echeance)
    merged["score_opportunite"] = (
        0.35 * merged["score_echeance"]
        + 0.25 * merged["score_titulaire"]
        + 0.20 * merged["score_concurrence"]
        + 0.20 * merged["score_taille"]
    ).round(3)

    merged = merged.sort_values("score_opportunite", ascending=False)
    merged.to_csv(scored_path, index=False)

    n_ameliores = int(a_ameliorer.sum())
    print(f"[11] OK -> {scored_path} mis à jour")
    print(f"[11] {n_ameliores} réseaux passés de 'estimee'/'inconnue' à 'confirmee_ted' (échéance réelle calculée via TED XML)")
    print(merged.loc[a_ameliorer, ["nom_reseau", "confiance_avant_ted", "echeance_avant_ted", "echeance", "ted_publication_number_source"]].head(10).to_string())


if __name__ == "__main__":
    main()
