"""Étape 1.1 — Télécharger et extraire les données FCU (France Chaleur Urbaine).

Source: dataset data.gouv.fr "Tracés des réseaux de chaleur et de froid" (org France Chaleur Urbaine)
Produit: raw/fcu_reseaux.csv (1 ligne par réseau, avec/sans trace géométrique confondus)
"""
import io
import json
import zipfile

import pandas as pd

from common import RAW, get_session

DATASET_ID = "64f05d3568e4d575eb454ffe"


def main():
    s = get_session()
    print(f"[1.1] Récupération metadata dataset {DATASET_ID} ...")
    meta = s.get(f"https://www.data.gouv.fr/api/1/datasets/{DATASET_ID}/", timeout=30).json()

    zip_url = None
    for res in meta.get("resources", []):
        if res.get("title", "").lower().startswith("opendata-fcu") or res.get("url", "").endswith("opendata-fcu.zip"):
            zip_url = res["url"]
            break
    if not zip_url:
        # fallback: prendre la première ressource .zip la plus récente
        zips = [r for r in meta.get("resources", []) if r.get("format") == "zip" or r.get("url", "").endswith(".zip")]
        zips.sort(key=lambda r: r.get("last_modified", ""), reverse=True)
        if zips:
            zip_url = zips[0]["url"]
    if not zip_url:
        raise RuntimeError("Aucune ressource zip FCU trouvée dans le dataset")

    print(f"[1.1] Téléchargement {zip_url} ...")
    r = s.get(zip_url, timeout=120)
    r.raise_for_status()
    zf = zipfile.ZipFile(io.BytesIO(r.content))
    print("[1.1] Fichiers dans le zip:", zf.namelist())

    def load_geojson(name):
        with zf.open(name) as f:
            gj = json.load(f)
        rows = []
        for feat in gj.get("features", []):
            props = feat.get("properties", {})
            has_geom = feat.get("geometry") is not None
            props["_has_geometry"] = has_geom
            rows.append(props)
        return pd.DataFrame(rows)

    names = zf.namelist()
    with_trace_name = next((n for n in names if n == "reseaux_de_chaleur.geojson"), None)
    without_trace_name = next(
        (n for n in names if n.endswith(".geojson") and "sans_traces" in n and "chaleur" in n), None
    )

    dfs = []
    if with_trace_name:
        df1 = load_geojson(with_trace_name)
        dfs.append(df1)
        print(f"[1.1] {with_trace_name}: {len(df1)} features")
    if without_trace_name:
        df2 = load_geojson(without_trace_name)
        dfs.append(df2)
        print(f"[1.1] {without_trace_name}: {len(df2)} features")

    if not dfs:
        raise RuntimeError("Impossible de trouver les geojson réseaux de chaleur dans le zip")

    df = pd.concat(dfs, ignore_index=True, sort=False)

    # Un réseau peut apparaître plusieurs fois dans le fichier "avec traces" (une ligne par segment de tracé).
    # On déduplique sur l'identifiant réseau en gardant la 1ère occurrence (les attributs sont identiques par réseau).
    id_col = "Identifiant reseau" if "Identifiant reseau" in df.columns else df.columns[0]
    before = len(df)
    df = df.drop_duplicates(subset=[id_col], keep="first")
    print(f"[1.1] Dédoublonnage sur '{id_col}': {before} -> {len(df)} réseaux distincts")

    out_path = RAW / "fcu_reseaux.csv"
    df.to_csv(out_path, index=False)
    print(f"[1.1] OK -> {out_path} ({len(df)} lignes, {len(df.columns)} colonnes)")


if __name__ == "__main__":
    main()
