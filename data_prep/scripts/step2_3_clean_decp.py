"""Étape 2.3 — Nettoyer les données DECP chaleur (marchés + concessions).

Entrée: raw/decp_chaleur.csv
Sortie: clean/decp_chaleur_clean.csv (dates/montants typés, colonnes utiles conservées)
"""
import pandas as pd

from common import CLEAN, RAW


def main():
    df = pd.read_csv(RAW / "decp_chaleur.csv")
    print(f"[2.3] {len(df)} lignes brutes DECP")

    # Typage
    df["datenotification"] = pd.to_datetime(df.get("datenotification"), errors="coerce")
    df["dureemois"] = pd.to_numeric(df.get("dureemois"), errors="coerce")
    df["montant"] = pd.to_numeric(df.get("montant"), errors="coerce")

    df["echeance_estimee"] = df.apply(
        lambda r: r["datenotification"] + pd.DateOffset(months=int(r["dureemois"]))
        if pd.notna(r["datenotification"]) and pd.notna(r["dureemois"])
        else pd.NaT,
        axis=1,
    )

    keep_cols = [
        "id",
        "nomacheteur",
        "libellecommuneacheteur",
        "codecommuneacheteur",
        "codedepartementexecution",
        "lieuexecutionnom",
        "objetmarche",
        "codecpv",
        "nature",
        "procedure",
        "denominationunitelegale",
        "denominationsocialeetablissement",
        "siretetablissement",
        "datenotification",
        "dureemois",
        "montant",
        "echeance_estimee",
        "source",
    ]
    keep_cols = [c for c in keep_cols if c in df.columns]
    out = df[keep_cols].copy()

    out_path = CLEAN / "decp_chaleur_clean.csv"
    out.to_csv(out_path, index=False)
    print(f"[2.3] OK -> {out_path} ({len(out)} lignes, {len(out.columns)} colonnes)")
    print("[2.3] lignes avec échéance calculable:", out["echeance_estimee"].notna().sum())
    print("[2.3] répartition par nature:")
    print(out["nature"].value_counts())


if __name__ == "__main__":
    main()
