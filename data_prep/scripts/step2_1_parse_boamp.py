"""Étape 2.1 — Parser les avis BOAMP (schéma JSON variable selon le type d'avis).

Entrée: raw/boamp_notices_chaleur.jsonl
Sortie: clean/boamp_dsp_parsed.csv (uniquement la famille "Délégation de service public")
        avec un flag de complétude (nb de champs clés trouvés sur 4: titulaire, date, duree, montant).
"""
import json

import pandas as pd

from common import CLEAN, RAW


def dig(d, *path, default=None):
    """Parcourt un dict imbriqué en tolérant les clés manquantes."""
    cur = d
    for key in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
        if cur is None:
            return default
    return cur


def get_lot(donnees: dict):
    """LOTS.LOT peut être un dict (1 lot) ou une liste (plusieurs lots) selon l'avis."""
    lot = dig(donnees, "OBJET", "LOTS", "LOT")
    if isinstance(lot, list):
        return lot[0] if lot else {}
    if isinstance(lot, dict):
        return lot
    return {}


def extract_amount(val):
    if isinstance(val, dict):
        return val.get("#text")
    return val


def parse_record(rec: dict) -> dict:
    """Extrait les champs clés d'un avis BOAMP (top-level opendatasoft + donnees JSON imbriqué)."""
    try:
        donnees = json.loads(rec.get("donnees") or "{}")
    except json.JSONDecodeError:
        donnees = {}

    lot = get_lot(donnees)
    decision = dig(donnees, "ATTRIBUTION", "DECISION", default={})
    titulaire = dig(decision, "TITULAIRE", "DENOMINATION")
    date_attribution = dig(decision, "RENSEIGNEMENT", "DATE_ATTRIBUTION")
    nb_offre_recu = dig(decision, "RENSEIGNEMENT", "NB_OFFRE_RECU")
    montant = extract_amount(dig(decision, "RENSEIGNEMENT", "MONTANT")) or extract_amount(
        dig(donnees, "OBJET", "CARACTERISTIQUES", "VALEUR")
    )
    duree_mois = lot.get("DUREE_MOIS") or dig(donnees, "OBJET", "DUREE_DELAI", "DUREE_MOIS")
    cpv = dig(donnees, "OBJET", "CPV", "PRINCIPAL") or lot.get("CPV", {}).get("PRINCIPAL") if isinstance(
        lot.get("CPV"), dict
    ) else dig(donnees, "OBJET", "CPV", "PRINCIPAL")
    objet_complet = dig(donnees, "OBJET", "OBJET_COMPLET") or dig(donnees, "OBJET", "TITRE_MARCHE")
    denomination_acheteur = dig(donnees, "IDENTITE", "DENOMINATION") or rec.get("nomacheteur")
    ville_acheteur = dig(donnees, "IDENTITE", "VILLE")
    cp_acheteur = dig(donnees, "IDENTITE", "CP")

    champs_cles = [titulaire, date_attribution, duree_mois, montant]
    completude = sum(1 for c in champs_cles if c not in (None, ""))

    return {
        "id": rec.get("id"),
        "idweb": rec.get("idweb"),
        "nature_categorise_libelle": rec.get("nature_categorise_libelle"),
        "nomacheteur": rec.get("nomacheteur"),
        "denomination_acheteur": denomination_acheteur,
        "ville_acheteur": ville_acheteur,
        "cp_acheteur": cp_acheteur,
        "code_departement": rec.get("code_departement"),
        "objet_complet": objet_complet,
        "cpv": cpv or rec.get("descripteur_code"),
        "titulaire": titulaire,
        "date_attribution": date_attribution,
        "duree_mois": duree_mois,
        "montant": montant,
        "nb_offre_recu": nb_offre_recu,
        "dateparution": rec.get("dateparution"),
        "url_avis": rec.get("url_avis"),
        "completude": completude,
    }


def main():
    in_path = RAW / "boamp_notices_chaleur.jsonl"
    with open(in_path, encoding="utf-8") as f:
        all_records = [json.loads(line) for line in f]

    dsp_records = [r for r in all_records if "délégation" in (r.get("famille_libelle") or "").lower()]
    print(f"[2.1] {len(dsp_records)} avis DSP sur {len(all_records)} avis chaleur totaux")

    parsed = [parse_record(r) for r in dsp_records]
    df = pd.DataFrame(parsed)
    out_path = CLEAN / "boamp_dsp_parsed.csv"
    df.to_csv(out_path, index=False)
    print(f"[2.1] OK -> {out_path} ({len(df)} lignes)")
    print("[2.1] répartition complétude (0-4 champs clés trouvés):")
    print(df["completude"].value_counts().sort_index())
    print("[2.1] répartition par type d'avis:")
    print(df["nature_categorise_libelle"].value_counts())


if __name__ == "__main__":
    main()
