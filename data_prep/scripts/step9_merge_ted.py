"""Étape 9 — Fusionner le signal TED dans la table finale des échéances.

TED ne donne pas systématiquement une durée structurée exploitable (beaucoup d'avis pré-eForms
n'exposent pas les champs de durée via l'API v3), mais la DATE DE PUBLICATION du dernier avis
matché à un réseau est en soi un signal fort et indépendant :
  - si cette date est postérieure à notre échéance calculée (fallback création+durée médiane),
    c'est un signe que le réseau a probablement déjà été retendu/renouvelé depuis sa création et
    que notre estimation (basée sur une durée moyenne depuis la création d'origine) est trop
    ancienne / sous-estime l'échéance réelle ;
  - un avis TED récent (<3 ans) signale une activité contractuelle actuelle sur le réseau, utile
    pour prioriser même quand la confiance échéance reste "estimee"/"inconnue".

Entrée: joined/fcu_ted.csv (produit par step8_fetch_ted.py), final/reseaux_scored.csv
Sortie: final/reseaux_scored.csv (mis à jour avec 4 colonnes ted_*), en place
"""
import pandas as pd

from common import FINAL, JOINED

RECENT_WINDOW_YEARS = 3


def main():
    scored_path = FINAL / "reseaux_scored.csv"
    scored = pd.read_csv(scored_path, parse_dates=["echeance"])
    # Idempotence: si un run précédent a déjà ajouté les colonnes ted_*, on les retire avant de refusionner.
    scored = scored.drop(columns=[c for c in scored.columns if c.startswith("ted_")], errors="ignore")

    ted_path = JOINED / "fcu_ted.csv"
    if not ted_path.exists():
        print("[9] ATTENTION: joined/fcu_ted.csv absent, lancer step8_fetch_ted.py d'abord. Abandon.")
        return
    fcu_ted = pd.read_csv(ted_path, parse_dates=["publication_date"])

    last_ted = (
        fcu_ted.sort_values("publication_date")
        .groupby("Identifiant reseau")
        .agg(
            ted_dernier_avis=("publication_date", "max"),
            ted_nb_avis=("publication_number", "nunique"),
            ted_lien=("lien", "last"),
        )
        .reset_index()
    )

    merged = scored.merge(last_ted, on="Identifiant reseau", how="left")

    merged["ted_echeance_depassee"] = (
        merged["ted_dernier_avis"].notna()
        & merged["echeance"].notna()
        & (merged["ted_dernier_avis"] > merged["echeance"])
    )
    cutoff = pd.Timestamp.now() - pd.DateOffset(years=RECENT_WINDOW_YEARS)
    merged["ted_avis_recent"] = merged["ted_dernier_avis"].notna() & (merged["ted_dernier_avis"] > cutoff)

    merged.to_csv(scored_path, index=False)

    n_matched = merged["ted_dernier_avis"].notna().sum()
    n_depassee = merged["ted_echeance_depassee"].sum()
    n_recent = merged["ted_avis_recent"].sum()
    print(f"[9] OK -> {scored_path} mis à jour avec signal TED")
    print(f"[9] {n_matched} réseaux avec >=1 avis TED matché")
    print(f"[9] {n_depassee} réseaux où l'échéance calculée est déjà dépassée par un avis TED plus récent")
    print(f"[9] {n_recent} réseaux avec un avis TED publié dans les {RECENT_WINDOW_YEARS} dernières années")


if __name__ == "__main__":
    main()
