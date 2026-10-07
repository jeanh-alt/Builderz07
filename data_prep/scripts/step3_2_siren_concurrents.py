"""Étape 3.2 — Construire la liste des SIREN des principaux opérateurs (concurrents + ENGIE) sur le marché
de la chaleur/DSP, pour la normalisation des titulaires et la détection "concurrent vs ENGIE" du score.

Source: API Recherche d'entreprises (recherche-entreprises.api.gouv.fr)
Produit: ref/siren_concurrents.csv
"""
import pandas as pd

from common import REF, get_session

# Groupes/marques à rechercher. "groupe" sert à regrouper les filiales, "est_engie" sert au scoring.
SEARCH_TERMS = [
    ("Dalkia", "Dalkia (EDF)", False),
    ("Coriance", "Coriance", False),
    ("Idex", "Idex", False),
    ("ENGIE Cofely", "ENGIE Solutions", True),
    ("ENGIE Solutions", "ENGIE Solutions", True),
    ("ENGIE Energie Services", "ENGIE Solutions", True),
    ("Veolia", "Veolia", False),
]

MIN_EFFECTIF_TRANCHES_GE = {"NN", "00", "01", "02", "03"}  # on filtre les tranches d'effectif les plus petites en bruit


def main():
    s = get_session()
    rows = []
    for term, groupe, est_engie in SEARCH_TERMS:
        r = s.get(
            "https://recherche-entreprises.api.gouv.fr/search",
            params={"q": term, "minimal": "true", "per_page": 25},
            timeout=20,
        )
        r.raise_for_status()
        results = r.json().get("results", [])
        print(f"[3.2] '{term}': {len(results)} résultats")
        for res in results:
            if res.get("etat_administratif") != "A":
                continue  # on ne garde que les entreprises actives
            rows.append(
                {
                    "siren": res.get("siren"),
                    "nom": res.get("nom_complet"),
                    "groupe": groupe,
                    "est_engie": est_engie,
                    "terme_recherche": term,
                    "nb_etablissements": res.get("nombre_etablissements"),
                    "activite_principale": res.get("activite_principale"),
                    "date_creation": res.get("date_creation"),
                }
            )

    df = pd.DataFrame(rows).drop_duplicates(subset=["siren"])
    out_path = REF / "siren_concurrents.csv"
    df.to_csv(out_path, index=False)
    print(f"[3.2] OK -> {out_path} ({len(df)} entreprises, {df['groupe'].nunique()} groupes)")
    print(df.groupby("groupe").size())


if __name__ == "__main__":
    main()
