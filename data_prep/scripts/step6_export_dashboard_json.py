"""Étape 6 — Exporter un sous-ensemble de colonnes du dataset scoré pour le dashboard AG-Grid.

Source: final/reseaux_scored.csv (90 colonnes, sortie de step5_1_score.py)
Produit: final/reseaux_for_dashboard.json (20 colonnes utiles à l'affichage, 1 objet par réseau)
"""
import pandas as pd

from common import FINAL

COLUMNS = [
    "nom_reseau",
    "communes",
    "departement",
    "region",
    "MO",
    "Gestionnaire",
    "annee_creation",
    "longueur_reseau",
    "nb_pdl",
    "Taux EnR&R",
    "echeance",
    "confiance",
    "titulaire_connu",
    "titulaire_est_engie",
    "boamp_montant",
    "score_opportunite",
    "score_echeance",
    "score_titulaire",
    "score_concurrence",
    "score_taille",
    "ted_dernier_avis",
    "ted_nb_avis",
    "ted_lien",
    "ted_echeance_depassee",
    "ted_publication_number_source",
    "ted_date_reference_xml",
    "ted_duree_mois_xml",
    "ted_format_xml",
    "echeance_avant_ted",
    "confiance_avant_ted",
]


def main():
    df = pd.read_csv(FINAL / "reseaux_scored.csv")
    df = df[[c for c in COLUMNS if c in df.columns]].copy()

    # titulaire_est_engie (bool/NaN) -> libellé FR lisible dans la grille
    if "titulaire_est_engie" in df.columns:
        df["titulaire_est_engie"] = df["titulaire_est_engie"].map(
            {True: "ENGIE", False: "Concurrent"}
        ).fillna("Inconnu")

    # échéance en date ISO (string) pour le filtre date d'AG-Grid
    if "echeance" in df.columns:
        df["echeance"] = pd.to_datetime(df["echeance"], errors="coerce").dt.strftime("%Y-%m-%d")
    if "ted_dernier_avis" in df.columns:
        df["ted_dernier_avis"] = pd.to_datetime(df["ted_dernier_avis"], errors="coerce").dt.strftime("%Y-%m-%d")
    if "ted_date_reference_xml" in df.columns:
        df["ted_date_reference_xml"] = pd.to_datetime(df["ted_date_reference_xml"], errors="coerce").dt.strftime("%Y-%m-%d")
    if "echeance_avant_ted" in df.columns:
        df["echeance_avant_ted"] = pd.to_datetime(df["echeance_avant_ted"], errors="coerce").dt.strftime("%Y-%m-%d")

    df = df.where(pd.notnull(df), None)

    out_path = FINAL / "reseaux_for_dashboard.json"
    df.to_json(out_path, orient="records", force_ascii=False)
    print(f"[6] OK -> {out_path} ({len(df)} lignes, {len(df.columns)} colonnes)")


if __name__ == "__main__":
    main()
