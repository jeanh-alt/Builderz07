"""Étape 2.2 — Dédoublonner les avis BOAMP liés (initial/rectificatif/résultat) en 1 ligne = 1 contrat.

Entrée: clean/boamp_dsp_parsed.csv
Sortie: clean/boamp_dsp_dedup.csv
Règle: regrouper par (nomacheteur normalisé, cpv), garder la ligne avec la meilleure complétude
       (résultat de marché > avis de marché), en reportant titulaire/date/duree/montant du meilleur avis trouvé
       dans le groupe si l'avis "principal" retenu ne les a pas tous.
"""
import pandas as pd

from common import CLEAN, normalize_name

PRIORITY = {
    "Résultat de marché/Concession": 0,
    "Résultat de marché/": 1,
    "Rectificatif/": 2,
    "Avis d'intention de conclure/": 3,
    "Avis de marché/Concession": 4,
    "Avis de marché/": 5,
    "Annulation/": 6,
}


def main():
    df = pd.read_csv(CLEAN / "boamp_dsp_parsed.csv")
    df["acheteur_norm"] = df["nomacheteur"].fillna(df["denomination_acheteur"]).apply(normalize_name)
    df["priority"] = df["nature_categorise_libelle"].map(PRIORITY).fillna(99)

    groups = []
    for acheteur_norm, grp in df.groupby("acheteur_norm", dropna=False):
        if not acheteur_norm:
            # pas de nom d'acheteur exploitable -> on garde chaque avis isolément (pas de dédup possible)
            for _, row in grp.iterrows():
                groups.append(row.to_dict())
            continue
        grp_sorted = grp.sort_values(["priority", "completude"], ascending=[True, False])
        best = grp_sorted.iloc[0].to_dict()
        # compléter les champs manquants du "best" avec les autres avis du même acheteur (ex: duree
        # mentionnée seulement dans l'avis de marché initial, titulaire seulement dans le résultat)
        for field in ("titulaire", "date_attribution", "duree_mois", "montant", "nb_offre_recu", "objet_complet"):
            if pd.isna(best.get(field)) or best.get(field) in (None, ""):
                for _, row in grp_sorted.iterrows():
                    val = row.get(field)
                    if pd.notna(val) and val not in (None, ""):
                        best[field] = val
                        break
        best["nb_avis_regroupes"] = len(grp)
        groups.append(best)

    out = pd.DataFrame(groups)
    out["completude_finale"] = out[["titulaire", "date_attribution", "duree_mois", "montant"]].notna().sum(axis=1)
    out_path = CLEAN / "boamp_dsp_dedup.csv"
    out = out.sort_values("completude_finale", ascending=False)
    out.to_csv(out_path, index=False)
    print(f"[2.2] {len(df)} avis -> {len(out)} contrats dédoublonnés")
    print("[2.2] répartition complétude finale (0-4):")
    print(out["completude_finale"].value_counts().sort_index())
    usable = out[out["completude_finale"] >= 3]
    print(f"[2.2] {len(usable)} contrats avec >= 3/4 champs clés (utilisables pour l'échéance)")
    print(f"[2.2] OK -> {out_path}")


if __name__ == "__main__":
    main()
