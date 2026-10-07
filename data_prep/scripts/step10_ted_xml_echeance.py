"""Étape 10 — Extraire une échéance calculée à partir du XML complet de chaque avis TED matché.

L'API de recherche TED (step8) n'expose quasi jamais les champs de durée pour les avis
pré-eForms. Mais le XML source de CHAQUE avis individuel (accessible via son lien
`links.xml`, un par avis, format Formex pré-2023 ou eForms/UBL 2023+) contient lui bien
la durée du contrat et sa date de conclusion/notification :

- Format Formex (jusqu'à ~2022) : <OBJECT_CONTRACT><DURATION TYPE="MONTH">N</DURATION></OBJECT_CONTRACT>
  et <AWARDED_CONTRACT><DATE_CONCLUSION_CONTRACT>YYYY-MM-DD</DATE_CONCLUSION_CONTRACT></AWARDED_CONTRACT>
- Format eForms/UBL (2023+) : <cbc:DurationMeasure unitCode="MONTH|YEAR">N</cbc:DurationMeasure>
  et <cbc:AwardDate>YYYY-MM-DD+TZ</cbc:AwardDate> (une valeur sentinelle "2000-01-01" apparaît
  pour les lots sans date réelle : à ignorer)

échéance_calculée = date_conclusion/award + durée

On ne requête que les ~330 avis déjà matchés à un réseau FCU (pas les 958 avis bruts), avec un
throttle pour éviter les 429 (rate limit TED).

Entrée: joined/fcu_ted.csv (production number + Identifiant reseau, depuis step8)
Sortie: joined/fcu_ted_xml.csv (1 ligne par avis avec durée/date extraites si trouvées)
"""
import re
import time

import pandas as pd
import requests

from common import JOINED, get_session

THROTTLE_SECONDS = 0.6
MAX_RETRIES = 4


def fetch_xml(session, publication_number: str) -> str | None:
    url = f"https://ted.europa.eu/en/notice/{publication_number}/xml"
    for attempt in range(MAX_RETRIES):
        try:
            r = session.get(url, timeout=20)
        except requests.exceptions.RequestException:
            time.sleep(2 * (attempt + 1))
            continue
        if r.status_code == 200:
            return r.text
        if r.status_code == 429:
            time.sleep(3 * (attempt + 1))
            continue
        return None
    return None


def parse_formex(xml: str):
    """Retourne (duree_mois, date_reference) à partir du format Formex pré-eForms, ou (None, None)."""
    m_dur = re.search(r'<DURATION TYPE="(MONTH|DAY|YEAR)">(\d+)</DURATION>', xml)
    m_date = re.search(r"<DATE_CONCLUSION_CONTRACT>([\d-]+)</DATE_CONCLUSION_CONTRACT>", xml)
    if not m_dur or not m_date:
        return None, None
    unit, value = m_dur.group(1), int(m_dur.group(2))
    duree_mois = {"DAY": value / 30.44, "MONTH": value, "YEAR": value * 12}[unit]
    return duree_mois, m_date.group(1)


def parse_eforms(xml: str):
    """Retourne (duree_mois, date_reference) à partir du format eForms/UBL 2023+, ou (None, None)."""
    m_dur = re.search(r'<cbc:DurationMeasure unitCode="(MONTH|DAY|YEAR)">(\d+)</cbc:DurationMeasure>', xml)
    dates = re.findall(r"<cbc:AwardDate>([\d-]+)", xml)
    dates = [d for d in dates if d != "2000-01-01"]  # valeur sentinelle = pas de date réelle
    if not m_dur or not dates:
        return None, None
    unit, value = m_dur.group(1), int(m_dur.group(2))
    duree_mois = {"DAY": value / 30.44, "MONTH": value, "YEAR": value * 12}[unit]
    return duree_mois, max(dates)  # date d'attribution la plus récente du lot


def extract_echeance(xml: str):
    duree_mois, date_ref = parse_formex(xml)
    fmt = "formex"
    if duree_mois is None:
        duree_mois, date_ref = parse_eforms(xml)
        fmt = "eforms"
    if duree_mois is None:
        return None
    try:
        ref = pd.Timestamp(date_ref)
    except (ValueError, TypeError):
        return None
    echeance = ref + pd.DateOffset(months=round(duree_mois))
    return {"ted_duree_mois_xml": round(duree_mois, 1), "ted_date_reference_xml": ref, "ted_echeance_xml": echeance, "ted_format_xml": fmt}


def main():
    fcu_ted = pd.read_csv(JOINED / "fcu_ted.csv")
    notices = fcu_ted[["publication_number", "Identifiant reseau"]].drop_duplicates()
    uniq_pub = notices["publication_number"].drop_duplicates().tolist()
    print(f"[10] {len(uniq_pub)} avis TED uniques à scraper (XML complet)...")

    session = get_session()
    results = []
    for i, pub in enumerate(uniq_pub, 1):
        xml = fetch_xml(session, pub)
        row = {"publication_number": pub}
        if xml:
            extracted = extract_echeance(xml)
            if extracted:
                row.update(extracted)
        results.append(row)
        if i % 25 == 0 or i == len(uniq_pub):
            n_ok = sum(1 for r in results if "ted_echeance_xml" in r)
            print(f"[10] {i}/{len(uniq_pub)} avis traités, {n_ok} échéances extraites")
        time.sleep(THROTTLE_SECONDS)

    xml_df = pd.DataFrame(results)
    out = notices.merge(xml_df, on="publication_number", how="left")
    out_path = JOINED / "fcu_ted_xml.csv"
    out.to_csv(out_path, index=False)

    n_extracted = out["ted_echeance_xml"].notna().sum() if "ted_echeance_xml" in out.columns else 0
    n_reseaux = out.loc[out["ted_echeance_xml"].notna(), "Identifiant reseau"].nunique() if n_extracted else 0
    print(f"[10] OK -> {out_path} : {n_extracted}/{len(out)} avis avec échéance extraite, {n_reseaux} réseaux FCU concernés")


if __name__ == "__main__":
    main()
