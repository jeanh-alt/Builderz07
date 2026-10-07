"""Étape 1.4 — Exporter la couche géographique complète des réseaux FCU en KML.

Source: même dataset data.gouv.fr que step1_1 ("Tracés des réseaux de chaleur et de froid"),
mais ici on conserve les géométries (LineString des tracés + Point des réseaux sans tracé)
au lieu de ne garder que les attributs.

Produit: raw/fcu_reseaux.kml (1 dossier "Tracés" + 1 dossier "Réseaux sans tracé")
"""
import io
import json
import zipfile
import shutil

import simplekml

from common import RAW, ROOT, get_session

DATASET_ID = "64f05d3568e4d575eb454ffe"


def add_geometry(kml, name_folder, geojson_features, name_field):
    folder = kml.newfolder(name=name_folder)
    n_line, n_point, n_multiline, n_skipped = 0, 0, 0, 0
    for feat in geojson_features:
        geom = feat.get("geometry")
        if geom is None:
            n_skipped += 1
            continue
        props = feat.get("properties", {}) or {}
        label = str(props.get(name_field, "Réseau"))
        gtype = geom.get("type")
        coords = geom.get("coordinates")

        desc_lines = [f"<b>{k}</b>: {v}" for k, v in props.items() if v not in (None, "")]
        description = "<br/>".join(desc_lines)

        if gtype == "LineString":
            ls = folder.newlinestring(name=label, description=description)
            ls.coords = [(c[0], c[1]) for c in coords]
            n_line += 1
        elif gtype == "MultiLineString":
            multi = folder.newmultigeometry(name=label, description=description)
            for line in coords:
                ls = multi.newlinestring()
                ls.coords = [(c[0], c[1]) for c in line]
            n_multiline += 1
        elif gtype == "Point":
            pt = folder.newpoint(name=label, description=description)
            pt.coords = [(coords[0], coords[1])]
            n_point += 1
        else:
            n_skipped += 1
    print(
        f"[1.4] {name_folder}: {n_line} lignes, {n_multiline} multi-lignes, "
        f"{n_point} points, {n_skipped} sans géométrie exploitable"
    )


def main():
    s = get_session()
    print(f"[1.4] Récupération metadata dataset {DATASET_ID} ...")
    meta = s.get(f"https://www.data.gouv.fr/api/1/datasets/{DATASET_ID}/", timeout=30).json()

    zip_url = None
    for res in meta.get("resources", []):
        if res.get("title", "").lower().startswith("opendata-fcu") or res.get("url", "").endswith("opendata-fcu.zip"):
            zip_url = res["url"]
            break
    if not zip_url:
        zips = [r for r in meta.get("resources", []) if r.get("format") == "zip" or r.get("url", "").endswith(".zip")]
        zips.sort(key=lambda r: r.get("last_modified", ""), reverse=True)
        if zips:
            zip_url = zips[0]["url"]
    if not zip_url:
        raise RuntimeError("Aucune ressource zip FCU trouvée dans le dataset")

    print(f"[1.4] Téléchargement {zip_url} ...")
    r = s.get(zip_url, timeout=120)
    r.raise_for_status()
    zf = zipfile.ZipFile(io.BytesIO(r.content))
    names = zf.namelist()

    with_trace_name = next((n for n in names if n == "reseaux_de_chaleur.geojson"), None)
    without_trace_name = next(
        (n for n in names if n.endswith(".geojson") and "sans_traces" in n and "chaleur" in n), None
    )
    if not with_trace_name or not without_trace_name:
        raise RuntimeError(f"Fichiers geojson attendus introuvables dans le zip: {names}")

    def load_geojson(name):
        with zf.open(name) as f:
            return json.load(f).get("features", [])

    traces = load_geojson(with_trace_name)
    sans_traces = load_geojson(without_trace_name)
    print(f"[1.4] {with_trace_name}: {len(traces)} features")
    print(f"[1.4] {without_trace_name}: {len(sans_traces)} features")

    kml = simplekml.Kml(name="Réseaux de chaleur FCU (France)")
    name_field = "nom_reseau" if traces and "nom_reseau" in (traces[0].get("properties") or {}) else "Identifiant reseau"

    add_geometry(kml, "Tracés des réseaux", traces, name_field)
    add_geometry(kml, "Réseaux sans tracé (points)", sans_traces, name_field)

    out_path = RAW / "fcu_reseaux.kml"
    kml.save(str(out_path))
    print(f"[1.4] OK -> {out_path}")

    kmz_path = RAW / "fcu_reseaux.kmz"
    kml.savekmz(str(kmz_path))
    print(f"[1.4] OK (compressé) -> {kmz_path}")

    # Copie à la racine de data_prep/ pour un accès facile (fichier léger, le .kml brut reste dans raw/)
    dashboard_kmz = ROOT / "fcu_reseaux_chaleur.kmz"
    shutil.copy(kmz_path, dashboard_kmz)
    print(f"[1.4] OK (copie) -> {dashboard_kmz}")


if __name__ == "__main__":
    main()
