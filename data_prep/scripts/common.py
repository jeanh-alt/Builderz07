"""Utilitaires partagés par les scripts de préparation data (hackathon Échéance)."""
import os
import unicodedata
import re
import pathlib

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
CLEAN = ROOT / "clean"
REF = ROOT / "ref"
JOINED = ROOT / "joined"
FINAL = ROOT / "final"
DEMO = ROOT / "demo"

CA_BUNDLE = str(pathlib.Path(__file__).resolve().parent / "corp_ca_bundle.pem")

for d in (RAW, CLEAN, REF, JOINED, FINAL, DEMO):
    d.mkdir(parents=True, exist_ok=True)


def get_session() -> requests.Session:
    """Session requests qui utilise le bundle CA corporate (proxy MITM) si besoin."""
    s = requests.Session()
    s.verify = CA_BUNDLE if pathlib.Path(CA_BUNDLE).exists() else True
    s.headers.update({"User-Agent": "hackathon-echeance-data-prep/1.0"})
    return s


_PREFIXES = re.compile(
    r"^(ville|commune|mairie|communaute d agglomeration|communaute de communes|"
    r"communaute urbaine|metropole|syndicat|siaed|siaved|ca|cc|cu|epci|departement|region)\s+(de|d|du|des)?\s*",
    re.IGNORECASE,
)


def normalize_name(name) -> str:
    """Normalise un nom de commune / acheteur public pour faciliter le matching.

    - minuscule, suppression accents
    - suppression des articles de type "Ville de", "Commune d'", "CC du", etc.
    - suppression des codes postaux/parenthèses
    - alphanumérique uniquement (espaces compris)
    """
    if not name or not isinstance(name, str):
        return ""
    s = name.strip().lower()
    s = re.sub(r"\([^)]*\)", " ", s)  # parenthèses (ex: codes postaux, sigles)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = s.replace("'", " ").replace("-", " ")
    s = _PREFIXES.sub("", s)
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def split_communes(raw_field: str) -> list[str]:
    """Sépare un champ FCU 'communes' (plusieurs communes séparées par , ; /)."""
    if not raw_field:
        return []
    parts = re.split(r"[;,/]", raw_field)
    return [p.strip() for p in parts if p.strip()]
