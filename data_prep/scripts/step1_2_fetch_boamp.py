"""Étape 1.2 — Extraire les avis BOAMP liés à la chaleur (DSP + marchés).

Source: opendatasoft boamp-datadila.opendatasoft.com, dataset "boamp"
Produit: raw/boamp_notices_chaleur.jsonl (1 ligne JSON = 1 avis brut, champ "donnees" inclus)
"""
import json

from common import RAW, get_session

BASE = "https://boamp-datadila.opendatasoft.com/api/records/1.0/search/"
DATASET = "boamp"
PAGE_SIZE = 100

# Mots-clés objet (large, affinage fait en étape 2 au parsing)
QUERY = '(objet:"chaleur" OR objet:"chauffage urbain" OR objet:"reseau de chaleur")'


def fetch_all():
    s = get_session()
    offset = 0
    total = None
    out = []
    while True:
        params = {
            "dataset": DATASET,
            "q": QUERY,
            "rows": PAGE_SIZE,
            "start": offset,
        }
        r = s.get(BASE, params=params, timeout=60)
        r.raise_for_status()
        data = r.json()
        if total is None:
            total = data.get("nhits", 0)
            print(f"[1.2] nhits total = {total}")
        records = data.get("records", [])
        if not records:
            break
        out.extend(records)
        offset += len(records)
        print(f"[1.2] récupéré {offset}/{total}")
        if offset >= total or len(records) < PAGE_SIZE:
            break
    return out


def main():
    records = fetch_all()
    out_path = RAW / "boamp_notices_chaleur.jsonl"
    with open(out_path, "w", encoding="utf-8") as f:
        for rec in records:
            # on garde tous les champs top-level opendatasoft (nomacheteur, famille_libelle,
            # perimetre, descripteur_code...) + le champ "donnees" (JSON string détaillé),
            # qui sera parsé en étape 2.
            f.write(json.dumps(rec.get("fields", {}), ensure_ascii=False) + "\n")
    print(f"[1.2] OK -> {out_path} ({len(records)} avis)")

    # Repère rapide du volume DSP vs marché, pour vérification immédiate du volume attendu
    n_dsp = sum(1 for rec in records if "délégation" in (rec.get("fields", {}).get("famille_libelle") or "").lower())
    print(f"[1.2] dont {n_dsp} avis famille 'Délégation de service public'")


if __name__ == "__main__":
    main()
