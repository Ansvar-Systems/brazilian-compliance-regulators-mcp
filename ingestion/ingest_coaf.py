#!/usr/bin/env python3
"""
Ingest COAF (Conselho de Controle de Atividades Financeiras) normative acts.

Source: gov.br/coaf — AML/CFT resolutions, typologies, PEP/UBO rules.

Usage:
    python ingestion/ingest_coaf.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import get_db, upsert_document

COAF_KNOWN_ACTS = [
    {
        "id": "coaf-res-36-2021",
        "type": "resolução",
        "number": "36",
        "year": 2021,
        "title": "PEP Identification and Enhanced Due Diligence",
        "title_pt": "Identificação de Pessoas Expostas Politicamente (PEP) e Diligência Reforçada",
        "topics": ["aml", "pep", "due_diligence", "kyc"],
        "url": "https://www.gov.br/coaf/pt-br/assuntos/normas/resolucoes",
        "date": "2021-04-05",
    },
    {
        "id": "coaf-res-40-2021",
        "type": "resolução",
        "number": "40",
        "year": 2021,
        "title": "Ultimate Beneficial Owner (UBO) Identification",
        "title_pt": "Identificação do Beneficiário Final",
        "topics": ["aml", "ubo", "beneficial_ownership", "kyc"],
        "url": "https://www.gov.br/coaf/pt-br/assuntos/normas/resolucoes",
        "date": "2021-12-01",
    },
    {
        "id": "coaf-res-29-2017",
        "type": "resolução",
        "number": "29",
        "year": 2017,
        "title": "AML/CFT Obligations for Real Estate Agents",
        "title_pt": "Obrigações de PLD/FTP para o setor imobiliário",
        "topics": ["aml", "real_estate", "reporting_obligations"],
        "url": "https://www.gov.br/coaf/pt-br/assuntos/normas/resolucoes",
        "date": "2017-12-07",
    },
    {
        "id": "coaf-res-31-2019",
        "type": "resolução",
        "number": "31",
        "year": 2019,
        "title": "AML/CFT Obligations for Accounting Professionals",
        "title_pt": "Obrigações de PLD/FTP para profissionais de contabilidade",
        "topics": ["aml", "accounting", "reporting_obligations"],
        "url": "https://www.gov.br/coaf/pt-br/assuntos/normas/resolucoes",
        "date": "2019-05-14",
    },
    {
        "id": "coaf-res-25-2013",
        "type": "resolução",
        "number": "25",
        "year": 2013,
        "title": "AML/CFT Obligations for the Securities Sector",
        "title_pt": "Obrigações de PLD/FTP para o setor de valores mobiliários",
        "topics": ["aml", "securities", "reporting_obligations"],
        "url": "https://www.gov.br/coaf/pt-br/assuntos/normas/resolucoes",
        "date": "2013-01-16",
    },
    {
        "id": "coaf-tipologias-2023",
        "type": "guia",
        "number": "tip-2023",
        "year": 2023,
        "title": "Suspicious Activity Typologies — Money Laundering Red Flags",
        "title_pt": "Tipologias de Atividades Suspeitas — Indicadores de Lavagem de Dinheiro",
        "topics": ["aml", "typologies", "suspicious_activity", "red_flags"],
        "url": "https://www.gov.br/coaf/pt-br/assuntos/informacoes-de-inteligencia-financeira/tipologias",
        "date": "2023-06-01",
    },
    {
        "id": "coaf-res-16-2007",
        "type": "resolução",
        "number": "16",
        "year": 2007,
        "title": "AML/CFT Obligations for Insurance and Private Pension Sectors",
        "title_pt": "Obrigações de PLD/FTP para seguros e previdência complementar aberta",
        "topics": ["aml", "insurance", "pension", "reporting_obligations"],
        "url": "https://www.gov.br/coaf/pt-br/assuntos/normas/resolucoes",
        "date": "2007-03-28",
    },
]


def ingest_coaf() -> None:
    """Ingest COAF normative acts."""
    conn = get_db()
    total_docs = 0

    print(f"=== COAF Ingestion ({len(COAF_KNOWN_ACTS)} known acts) ===")

    for act in COAF_KNOWN_ACTS:
        print(f"  {act['type']} {act['number']}/{act['year']} — {act['title'][:60]}...")

        upsert_document(
            conn,
            doc_id=act["id"],
            regulator_id="coaf",
            document_type=act["type"],
            number=act["number"],
            year=act["year"],
            title=act["title"],
            title_pt=act["title_pt"],
            date_published=act["date"],
            date_effective=act["date"],
            status="active",
            topics=act["topics"],
            source_url=act["url"],
        )
        total_docs += 1

    conn.commit()
    conn.close()
    print(f"\nCOAF: {total_docs} documents ingested (provision scraping requires PDF extraction)")


if __name__ == "__main__":
    ingest_coaf()
