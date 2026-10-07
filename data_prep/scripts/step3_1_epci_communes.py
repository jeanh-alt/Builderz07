"""Étape 3.1 — Construire la table EPCI -> communes membres (pour résoudre les acheteurs intercommunaux).

Source: API Géo (geo.api.gouv.fr)
Produit: ref/epci_communes.csv (1 ligne = 1 commune membre, avec le nom + code de son EPCI de rattachement)
"""
import time

import pandas as pd

from common import REF, get_session


def main():
    s = get_session()
    print("[3.1] Récupération de la liste des EPCI ...")
    epcis = s.get("https://geo.api.gouv.fr/epcis", params={"fields": "nom,code,nature"}, timeout=30).json()
    print(f"[3.1] {len(epcis)} EPCI trouvés")

    rows = []
    for i, epci in enumerate(epcis):
        code = epci["code"]
        try:
            communes = s.get(
                "https://geo.api.gouv.fr/communes",
                params={"codeEpci": code, "fields": "nom,code"},
                timeout=30,
            ).json()
        except Exception as e:
            print(f"[3.1] erreur EPCI {code}: {e}")
            continue
        for c in communes:
            rows.append(
                {
                    "epci_code": code,
                    "epci_nom": epci.get("nom"),
                    "epci_nature": epci.get("nature"),
                    "commune_code": c.get("code"),
                    "commune_nom": c.get("nom"),
                }
            )
        if (i + 1) % 100 == 0:
            print(f"[3.1] {i + 1}/{len(epcis)} EPCI traités ...")

    df = pd.DataFrame(rows)
    out_path = REF / "epci_communes.csv"
    df.to_csv(out_path, index=False)
    print(f"[3.1] OK -> {out_path} ({len(df)} lignes, {df['epci_code'].nunique()} EPCI couverts)")


if __name__ == "__main__":
    main()
