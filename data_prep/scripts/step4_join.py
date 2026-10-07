"""Étape 4.1-4.3 — Joindre FCU <-> BOAMP <-> DECP et produire la table finale des échéances.

Entrées: raw/fcu_reseaux.csv, clean/boamp_dsp_dedup.csv, clean/decp_chaleur_clean.csv, ref/epci_communes.csv
Sorties: joined/fcu_boamp.csv, joined/fcu_decp.csv, final/reseaux_echeances.csv
"""
import pandas as pd

from common import CLEAN, FINAL, JOINED, RAW, REF, normalize_name, split_communes


def build_commune_to_fcu_index(fcu: pd.DataFrame) -> dict:
    """Index commune normalisée -> liste d'index de lignes FCU (un réseau peut couvrir plusieurs communes)."""
    index = {}
    for idx, row in fcu.iterrows():
        for commune in split_communes(str(row.get("communes") or "")):
            key = normalize_name(commune)
            if key:
                index.setdefault(key, []).append(idx)
    return index


def resolve_acheteur_to_communes(acheteur_norm: str, epci_lookup: dict) -> list:
    """Si l'acheteur est un EPCI (nom normalisé trouvé dans la table EPCI), retourne la liste de ses
    communes membres normalisées. Sinon retourne juste [acheteur_norm] (hypothèse: acheteur = commune)."""
    if acheteur_norm in epci_lookup:
        return epci_lookup[acheteur_norm]
    return [acheteur_norm]


def main():
    fcu = pd.read_csv(RAW / "fcu_reseaux.csv")
    boamp = pd.read_csv(CLEAN / "boamp_dsp_dedup.csv")
    decp = pd.read_csv(CLEAN / "decp_chaleur_clean.csv")

    epci_path = REF / "epci_communes.csv"
    epci_lookup = {}
    if epci_path.exists():
        epci_df = pd.read_csv(epci_path)
        epci_df["epci_nom_norm"] = epci_df["epci_nom"].apply(normalize_name)
        epci_df["commune_nom_norm"] = epci_df["commune_nom"].apply(normalize_name)
        for epci_nom_norm, grp in epci_df.groupby("epci_nom_norm"):
            epci_lookup[epci_nom_norm] = grp["commune_nom_norm"].tolist()
        print(f"[4] Table EPCI chargée: {len(epci_lookup)} EPCI")
    else:
        print("[4] ATTENTION: ref/epci_communes.csv absent, résolution EPCI désactivée")

    commune_index = build_commune_to_fcu_index(fcu)
    print(f"[4] Index communes FCU: {len(commune_index)} communes distinctes référencées")

    # ---- 4.1 Jointure FCU <-> BOAMP ----
    boamp["acheteur_norm"] = boamp["nomacheteur"].fillna(boamp.get("denomination_acheteur")).apply(normalize_name)

    rows = []
    for _, b in boamp.iterrows():
        acheteur_norm = b["acheteur_norm"]
        candidate_communes = resolve_acheteur_to_communes(acheteur_norm, epci_lookup)
        fcu_idxs = []
        statut = "unmatched"
        for c in candidate_communes:
            if c in commune_index:
                fcu_idxs.extend(commune_index[c])
                statut = "matched_exact" if c == acheteur_norm else "matched_epci"
        fcu_idxs = sorted(set(fcu_idxs))
        if not fcu_idxs:
            rows.append({**b.to_dict(), "fcu_idx": None, "statut_match": "unmatched"})
        else:
            for idx in fcu_idxs:
                rows.append({**b.to_dict(), "fcu_idx": idx, "statut_match": statut})

    fcu_boamp = pd.DataFrame(rows)
    fcu_boamp.to_csv(JOINED / "fcu_boamp.csv", index=False)
    n_matched = fcu_boamp[fcu_boamp["statut_match"] != "unmatched"]["acheteur_norm"].nunique()
    n_total = boamp["acheteur_norm"].nunique()
    print(f"[4.1] OK -> joined/fcu_boamp.csv : {n_matched}/{n_total} acheteurs BOAMP matchés ({100*n_matched/n_total:.0f}%)")

    # ---- 4.2 Jointure FCU <-> DECP ----
    decp["acheteur_norm"] = decp["nomacheteur"].apply(normalize_name)
    rows2 = []
    for _, d in decp.iterrows():
        acheteur_norm = d["acheteur_norm"]
        candidate_communes = resolve_acheteur_to_communes(acheteur_norm, epci_lookup)
        fcu_idxs = []
        statut = "unmatched"
        for c in candidate_communes:
            if c in commune_index:
                fcu_idxs.extend(commune_index[c])
                statut = "matched_exact" if c == acheteur_norm else "matched_epci"
        fcu_idxs = sorted(set(fcu_idxs))
        if not fcu_idxs:
            rows2.append({**d.to_dict(), "fcu_idx": None, "statut_match": "unmatched"})
        else:
            for idx in fcu_idxs:
                rows2.append({**d.to_dict(), "fcu_idx": idx, "statut_match": statut})
    fcu_decp = pd.DataFrame(rows2)
    fcu_decp.to_csv(JOINED / "fcu_decp.csv", index=False)
    n_matched2 = fcu_decp[fcu_decp["statut_match"] != "unmatched"]["acheteur_norm"].nunique()
    n_total2 = decp["acheteur_norm"].nunique()
    print(f"[4.2] OK -> joined/fcu_decp.csv : {n_matched2}/{n_total2} acheteurs DECP matchés ({100*n_matched2/n_total2:.0f}%)")

    # ---- 4.3 Fusion : 1 ligne par réseau FCU, priorité BOAMP > DECP > estimé ----
    id_col = "Identifiant reseau" if "Identifiant reseau" in fcu.columns else fcu.columns[0]
    fcu = fcu.reset_index().rename(columns={"index": "fcu_idx"})

    boamp_best = (
        fcu_boamp[fcu_boamp["statut_match"] != "unmatched"]
        .dropna(subset=["fcu_idx"])
        .sort_values("completude_finale", ascending=False)
        .drop_duplicates(subset=["fcu_idx"], keep="first")
    )
    # Pour DECP, on ne retient comme "échéance confirmée" que les lignes de nature concession/DSP :
    # une échéance de marché de maintenance (nature=MARCHE, ~48 mois) n'est pas un proxy fiable de la
    # fin de la délégation de service public du réseau.
    decp_concession = fcu_decp[
        fcu_decp["nature"].astype(str).str.contains("CONCESSION|DELEGATION", case=False, na=False)
    ]
    decp_best = (
        decp_concession[decp_concession["statut_match"] != "unmatched"]
        .dropna(subset=["fcu_idx"])
        .sort_values("datenotification", ascending=False)
        .drop_duplicates(subset=["fcu_idx"], keep="first")
    )

    merged = fcu.merge(
        boamp_best[
            ["fcu_idx", "nomacheteur", "titulaire", "date_attribution", "duree_mois", "montant", "statut_match"]
        ].rename(columns=lambda c: f"boamp_{c}" if c != "fcu_idx" else c),
        on="fcu_idx",
        how="left",
    )
    merged = merged.merge(
        decp_best[
            ["fcu_idx", "nomacheteur", "datenotification", "dureemois", "montant", "echeance_estimee", "statut_match"]
        ].rename(columns=lambda c: f"decp_{c}" if c != "fcu_idx" else c),
        on="fcu_idx",
        how="left",
    )

    def compute_row(row):
        # priorité 1: BOAMP avec date + durée
        if pd.notna(row.get("boamp_date_attribution")) and pd.notna(row.get("boamp_duree_mois")):
            date_att = pd.to_datetime(row["boamp_date_attribution"], errors="coerce")
            if pd.notna(date_att):
                echeance = date_att + pd.DateOffset(months=int(row["boamp_duree_mois"]))
                return pd.Series(
                    {
                        "echeance": echeance,
                        "confiance": "confirmee_boamp",
                        "titulaire_connu": row.get("boamp_titulaire"),
                        "source_echeance": "BOAMP",
                    }
                )
        # priorité 2: DECP avec échéance déjà calculée en étape 2.3
        if pd.notna(row.get("decp_echeance_estimee")):
            return pd.Series(
                {
                    "echeance": row["decp_echeance_estimee"],
                    "confiance": "confirmee_decp",
                    "titulaire_connu": row.get("decp_nomacheteur"),  # DECP n'expose pas toujours le titulaire exploitant
                    "source_echeance": "DECP",
                }
            )
        return pd.Series({"echeance": pd.NaT, "confiance": "sans_source", "titulaire_connu": None, "source_echeance": None})

    computed = merged.apply(compute_row, axis=1)
    merged = pd.concat([merged, computed], axis=1)

    # ---- 4.4 Fallback estimé pour les réseaux restants ----
    # Important: ne pas mélanger avec les durées DECP de nature MARCHE/ACCORD-CADRE (contrats de
    # maintenance/services, médiane ~48 mois) qui n'ont rien à voir avec une durée de concession DSP.
    # On ne retient que les durées de vrais contrats de délégation/concession (BOAMP DSP + DECP
    # nature concession/DSP).
    confirmed_durations = []
    if "boamp_duree_mois" in merged.columns:
        confirmed_durations.extend(merged["boamp_duree_mois"].dropna().tolist())
    if "decp_dureemois" in merged.columns and "decp_nature" in decp.columns:
        concession_mask = decp["nature"].str.contains("CONCESSION|DELEGATION", case=False, na=False)
        confirmed_durations.extend(decp.loc[concession_mask, "dureemois"].dropna().tolist())
    if confirmed_durations:
        duree_mediane = pd.Series(confirmed_durations).median()
    else:
        duree_mediane = 240  # 20 ans, valeur de repli si aucune durée confirmée n'est disponible
    print(f"[4.4] Durée médiane observée sur contrats DSP/concession confirmés (n={len(confirmed_durations)}): {duree_mediane:.0f} mois")

    annee_col = "annee_creation" if "annee_creation" in merged.columns else None

    def fallback_row(row):
        if row["confiance"] != "sans_source":
            return row["echeance"]
        if annee_col and pd.notna(row.get(annee_col)):
            try:
                annee = int(float(row[annee_col]))
                date_creation = pd.Timestamp(year=annee, month=1, day=1)
                return date_creation + pd.DateOffset(months=int(duree_mediane))
            except (ValueError, TypeError):
                return pd.NaT
        return pd.NaT

    merged["echeance"] = merged.apply(fallback_row, axis=1)
    merged.loc[(merged["confiance"] == "sans_source") & merged["echeance"].notna(), "confiance"] = "estimee"
    merged.loc[(merged["confiance"] == "sans_source") & merged["echeance"].isna(), "confiance"] = "inconnue"

    out_path = FINAL / "reseaux_echeances.csv"
    merged.to_csv(out_path, index=False)
    print(f"[4] OK -> {out_path} ({len(merged)} réseaux)")
    print("[4] répartition par niveau de confiance:")
    print(merged["confiance"].value_counts())


if __name__ == "__main__":
    main()
