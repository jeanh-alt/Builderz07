"""Étape 5.1 — Score d'opportunité mécanique (hors signaux faibles Mistral).

Pondérations reprises du brief hackathon (§5.2 de plan.md) :
  - proximité échéance (35%)
  - titulaire sortant = concurrent vs ENGIE (25%)
  - concurrence / nb d'offres reçues à la dernière attribution (20%)
  - taille du réseau / montant du contrat (20%)

Entrée: final/reseaux_echeances.csv, ref/siren_concurrents.csv
Sortie: final/reseaux_scored.csv
"""
from datetime import datetime

import pandas as pd

from common import FINAL, REF, normalize_name

NOW = pd.Timestamp.now()


def score_echeance(echeance) -> float:
    """1.0 si échéance dans les 12 prochains mois, décroît linéairement jusqu'à 0 à 5 ans, 0 au-delà
    (et pour les échéances déjà passées on applique une décote : signal moins fiable mais toujours
    prioritaire car "overdue" = déjà potentiellement en renouvellement non capté)."""
    if pd.isna(echeance):
        return 0.0
    mois_restants = (echeance - NOW).days / 30.44
    if mois_restants < 0:
        return 0.5  # échéance déjà dépassée selon notre estimation : signal à vérifier, score moyen
    if mois_restants <= 12:
        return 1.0
    if mois_restants >= 60:
        return 0.0
    return 1 - (mois_restants - 12) / 48


def score_titulaire(est_engie) -> float:
    """1.0 si le titulaire sortant est un concurrent identifié (opportunité de conquête),
    0.0 si c'est déjà ENGIE (opportunité de défense, pas de conquête), 0.5 si titulaire inconnu."""
    if est_engie is True:
        return 0.0
    if est_engie is False:
        return 1.0
    return 0.5


def score_concurrence(nb_offres) -> float:
    """Plus il y a eu d'offres à la dernière attribution, plus le marché est contesté/attractif."""
    if pd.isna(nb_offres):
        return 0.5
    return min(float(nb_offres) / 5.0, 1.0)


def score_taille(montant) -> float:
    """Normalisation log du montant (évite qu'un très gros contrat écrase tout le classement)."""
    if pd.isna(montant) or montant <= 0:
        return 0.3
    import math

    return min(math.log10(max(montant, 1)) / 8.0, 1.0)  # 10^8 = 100M€ -> score 1.0


def main():
    df = pd.read_csv(FINAL / "reseaux_echeances.csv")
    df["echeance"] = pd.to_datetime(df["echeance"], errors="coerce")

    siren = pd.read_csv(REF / "siren_concurrents.csv")
    siren["nom_norm"] = siren["nom"].apply(normalize_name)
    engie_names_norm = set(siren.loc[siren["est_engie"], "nom_norm"])
    concurrent_names_norm = set(siren.loc[~siren["est_engie"], "nom_norm"])

    def classify_titulaire(titulaire):
        if pd.isna(titulaire):
            return None
        t_norm = normalize_name(str(titulaire))
        if any(e in t_norm or t_norm in e for e in engie_names_norm if e):
            return True
        if any(c in t_norm or t_norm in c for c in concurrent_names_norm if c):
            return False
        # heuristique simple sur le nom brut si pas de match SIREN exact
        if "engie" in t_norm or "cofely" in t_norm:
            return True
        return None

    df["titulaire_est_engie"] = df["titulaire_connu"].apply(classify_titulaire)

    df["score_echeance"] = df["echeance"].apply(score_echeance)
    df["score_titulaire"] = df["titulaire_est_engie"].apply(score_titulaire)
    df["score_concurrence"] = df.get("boamp_duree_mois").notna().astype(float) * 0.5 + 0.5  # proxy faute de nb_offre_recu systématique
    montant_col = "boamp_montant" if "boamp_montant" in df.columns else None
    df["score_taille"] = df[montant_col].apply(score_taille) if montant_col else 0.3

    df["score_opportunite"] = (
        0.35 * df["score_echeance"]
        + 0.25 * df["score_titulaire"]
        + 0.20 * df["score_concurrence"]
        + 0.20 * df["score_taille"]
    ).round(3)

    out_path = FINAL / "reseaux_scored.csv"
    df.sort_values("score_opportunite", ascending=False).to_csv(out_path, index=False)
    print(f"[5.1] OK -> {out_path} ({len(df)} réseaux scorés)")
    print("[5.1] Top 10 opportunités:")
    cols = ["nom_reseau", "communes", "confiance", "echeance", "titulaire_connu", "score_opportunite"]
    cols = [c for c in cols if c in df.columns]
    print(df.sort_values("score_opportunite", ascending=False)[cols].head(10).to_string())


if __name__ == "__main__":
    main()
