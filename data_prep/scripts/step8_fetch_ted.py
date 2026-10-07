"""Étape 8 — Croiser les échéances avec TED (Tenders Electronic Daily, marchés publics UE).

TED référence les avis de concession/DSP au-dessus du seuil européen (marchés significatifs,
souvent le cas des grosses DSP réseaux de chaleur). Contrairement à BOAMP, TED couvre une
fenêtre temporelle plus large (depuis ~2010) et permet de repérer :
  - des avis d'attribution plus récents que notre échéance estimée => signal de renouvellement
    déjà intervenu (notre estimation serait alors trop ancienne/fausse)
  - une confirmation indépendante qu'un acheteur FCU a bien eu une procédure DSP chauffage urbain
    récemment, cohérente ou non avec BOAMP/l'estimation fallback.

Source: API TED v3 (https://api.ted.europa.eu/v3/notices/search), CPV 09323000* (chauffage urbain),
        place-of-performance=FRA. Pas d'authentification requise.
Produit: ref/ted_notices_chaleur.jsonl (tous les avis bruts)
         joined/fcu_ted.csv (avis matchés à un réseau FCU, 1 ligne par avis matché)
"""
import json

import pandas as pd

from common import JOINED, REF, RAW, get_session, normalize_name, split_communes

CPV_QUERY = "classification-cpv=09323000* AND place-of-performance=FRA"
PAGE_SIZE = 250


def fetch_all_notices(session):
    fields = ["notice-title", "publication-date", "buyer-name", "contract-nature", "links"]
    page = 1
    notices = []
    while True:
        body = {"query": CPV_QUERY, "fields": fields, "page": page, "limit": PAGE_SIZE, "scope": "ALL"}
        r = session.post("https://api.ted.europa.eu/v3/notices/search", json=body, timeout=60)
        r.raise_for_status()
        d = r.json()
        batch = d.get("notices", [])
        notices.extend(batch)
        total = d.get("totalNoticeCount", len(notices))
        print(f"[8] page {page}: +{len(batch)} avis (total cumulé {len(notices)}/{total})")
        if len(batch) < PAGE_SIZE or len(notices) >= total:
            break
        page += 1
    return notices


def build_commune_to_fcu_index(fcu: pd.DataFrame) -> dict:
    index = {}
    for idx, row in fcu.iterrows():
        for commune in split_communes(str(row.get("communes") or "")):
            key = normalize_name(commune)
            if key:
                index.setdefault(key, []).append(idx)
    return index


def resolve_acheteur_to_communes(acheteur_norm: str, epci_lookup: dict) -> list:
    if acheteur_norm in epci_lookup:
        return epci_lookup[acheteur_norm]
    return [acheteur_norm]


def main():
    s = get_session()
    print("[8] Interrogation TED (CPV chauffage urbain, France) ...")
    notices = fetch_all_notices(s)

    raw_path = REF / "ted_notices_chaleur.jsonl"
    with open(raw_path, "w", encoding="utf-8") as f:
        for n in notices:
            f.write(json.dumps(n, ensure_ascii=False, default=str) + "\n")
    print(f"[8] OK -> {raw_path} ({len(notices)} avis bruts)")

    # Mise en forme : 1 ligne par avis avec les champs utiles
    rows = []
    for n in notices:
        buyer = n.get("buyer-name") or {}
        buyer_fra = (buyer.get("fra") or buyer.get("eng") or next(iter(buyer.values()), [None]))[0] if buyer else None
        title = n.get("notice-title") or {}
        title_fra = (title.get("fra") or next(iter(title.values()), None)) if title else None
        link = (n.get("links", {}).get("html", {}) or {}).get("FRA")
        rows.append(
            {
                "publication_number": n.get("publication-number"),
                "publication_date": n.get("publication-date"),
                "buyer_name": buyer_fra,
                "contract_nature": ",".join(n.get("contract-nature", []) or []),
                "notice_title": title_fra,
                "lien": link,
            }
        )
    ted = pd.DataFrame(rows)
    # Format TED "YYYY-MM-DD+HH:MM" (date + offset sans heure) : pandas ne l'infère pas bien, on tronque à la date.
    ted["publication_date"] = pd.to_datetime(ted["publication_date"].astype(str).str[:10], errors="coerce")
    ted["acheteur_norm"] = ted["buyer_name"].apply(normalize_name)

    # ---- Matching sur les communes/EPCI FCU (même logique que step4_join.py) ----
    # NB: on utilise "Identifiant reseau" (clé stable) et non la position de ligne, car
    # final/reseaux_scored.csv est trié différemment de raw/fcu_reseaux.csv (tri par score).
    fcu = pd.read_csv(RAW / "fcu_reseaux.csv").reset_index().rename(columns={"index": "fcu_idx"})
    epci_path = REF / "epci_communes.csv"
    epci_lookup = {}
    if epci_path.exists():
        epci_df = pd.read_csv(epci_path)
        epci_df["epci_nom_norm"] = epci_df["epci_nom"].apply(normalize_name)
        epci_df["commune_nom_norm"] = epci_df["commune_nom"].apply(normalize_name)
        for epci_nom_norm, grp in epci_df.groupby("epci_nom_norm"):
            epci_lookup[epci_nom_norm] = grp["commune_nom_norm"].tolist()

    commune_index = build_commune_to_fcu_index(fcu)

    match_rows = []
    for _, t in ted.iterrows():
        acheteur_norm = t["acheteur_norm"]
        candidate_communes = resolve_acheteur_to_communes(acheteur_norm, epci_lookup)
        fcu_idxs = []
        for c in candidate_communes:
            if c in commune_index:
                fcu_idxs.extend(commune_index[c])
        fcu_idxs = sorted(set(fcu_idxs))
        for idx in fcu_idxs:
            match_rows.append({**t.to_dict(), "fcu_idx": idx})

    fcu_ted = pd.DataFrame(match_rows)
    if len(fcu_ted):
        id_map = fcu[["fcu_idx", "Identifiant reseau"]]
        fcu_ted = fcu_ted.merge(id_map, on="fcu_idx", how="left").drop(columns=["fcu_idx"])
    out_path = JOINED / "fcu_ted.csv"
    fcu_ted.to_csv(out_path, index=False)

    n_matched_acheteurs = fcu_ted["acheteur_norm"].nunique() if len(fcu_ted) else 0
    n_total_acheteurs = ted["acheteur_norm"].nunique()
    n_reseaux_matches = fcu_ted["Identifiant reseau"].nunique() if len(fcu_ted) else 0
    print(
        f"[8] OK -> {out_path} : {len(fcu_ted)} avis TED matchés, "
        f"{n_matched_acheteurs}/{n_total_acheteurs} acheteurs TED reconnus dans FCU, "
        f"{n_reseaux_matches} réseaux FCU concernés"
    )


if __name__ == "__main__":
    main()
