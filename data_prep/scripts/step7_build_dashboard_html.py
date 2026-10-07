"""Étape 7 — Générer le dashboard HTML autonome (AG-Grid) à partir du template + des données.

Source: scripts/dashboard_template.html (template avec placeholder __ROWDATA_JSON__)
        final/reseaux_for_dashboard.json (produit par step6_export_dashboard_json.py)
Produit: ../dashboard_reseaux_chaleur.html (fichier HTML unique, ouvrable en local via file://,
         sans serveur ni dépendance réseau autre que le CDN AG-Grid)
"""
from pathlib import Path

from common import FINAL

SCRIPTS_DIR = Path(__file__).parent
DATA_PREP_DIR = SCRIPTS_DIR.parent
TEMPLATE_PATH = SCRIPTS_DIR / "dashboard_template.html"
DATA_PATH = FINAL / "reseaux_for_dashboard.json"
OUT_PATH = DATA_PREP_DIR / "dashboard_reseaux_chaleur.html"


def main():
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    data_json = DATA_PATH.read_text(encoding="utf-8")

    assert "__ROWDATA_JSON__" in template, "placeholder introuvable dans le template"

    out = template.replace("__ROWDATA_JSON__", data_json)
    OUT_PATH.write_text(out, encoding="utf-8")
    print(f"[7] OK -> {OUT_PATH} ({len(out)} octets)")


if __name__ == "__main__":
    main()
