"""Étape 1.3 — Extraire les marchés/concessions DECP liés à la chaleur.

Source: data.economie.gouv.fr, dataset "decp_augmente"
Produit: raw/decp_chaleur.csv (marchés + concessions confondus, colonne `nature` permet de distinguer)
"""
import pandas as pd

from common import RAW, get_session

BASE = "https://data.economie.gouv.fr/api/records/1.0/search/"
DATASET = "decp_augmente"
PAGE_SIZE = 1000

CPV_PREFIXES = ["09323000", "71314000", "50720000"]
QUERY = " OR ".join(f"codecpv:{p}*" for p in CPV_PREFIXES)


def fetch_all():
    s = get_session()
    offset = 0
    total = None
    out = []
    while True:
        params = {"dataset": DATASET, "q": QUERY, "rows": PAGE_SIZE, "start": offset}
        r = s.get(BASE, params=params, timeout=60)
        r.raise_for_status()
        data = r.json()
        if total is None:
            total = data.get("nhits", 0)
            print(f"[1.3] nhits total = {total}")
        records = data.get("records", [])
        if not records:
            break
        out.extend(rec.get("fields", {}) for rec in records)
        offset += len(records)
        print(f"[1.3] récupéré {offset}/{total}")
        if offset >= total or len(records) < PAGE_SIZE:
            break
    return out


def main():
    rows = fetch_all()
    df = pd.DataFrame(rows)
    out_path = RAW / "decp_chaleur.csv"
    df.to_csv(out_path, index=False)
    print(f"[1.3] OK -> {out_path} ({len(df)} lignes, {len(df.columns)} colonnes)")
    if "nature" in df.columns:
        print("[1.3] répartition par nature:")
        print(df["nature"].value_counts())


if __name__ == "__main__":
    main()
