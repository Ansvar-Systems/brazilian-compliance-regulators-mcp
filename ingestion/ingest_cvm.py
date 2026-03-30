#!/usr/bin/env python3
"""
Ingest CVM (Comissão de Valores Mobiliários) resoluções.

Source: conteudo.cvm.gov.br/legislacao/resolucoes/ — structured HTML pages.

Usage:
    python ingestion/ingest_cvm.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import get_db, upsert_document

CVM_KNOWN_ACTS = [
    {
        "id": "cvm-res-175-2022",
        "type": "resolução",
        "number": "175",
        "year": 2022,
        "title": "Investment Fund Regulation Framework",
        "title_pt": "Marco Regulatório de Fundos de Investimento",
        "topics": ["securities", "investment_funds", "corporate_governance"],
        "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes/resol175.html",
        "date": "2022-12-23",
    },
    {
        "id": "cvm-res-44-2021",
        "type": "resolução",
        "number": "44",
        "year": 2021,
        "title": "Insider Trading and Material Information Disclosure",
        "title_pt": "Uso de informação privilegiada e divulgação de fato relevante",
        "topics": ["securities", "insider_trading", "market_abuse", "disclosure"],
        "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes/",
        "date": "2021-08-30",
    },
    {
        "id": "cvm-res-80-2022",
        "type": "resolução",
        "number": "80",
        "year": 2022,
        "title": "Equity Crowdfunding Regulation",
        "title_pt": "Regulamentação do Crowdfunding de Investimento",
        "topics": ["securities", "crowdfunding", "fintech", "investor_protection"],
        "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes/",
        "date": "2022-03-29",
    },
    {
        "id": "cvm-res-160-2022",
        "type": "resolução",
        "number": "160",
        "year": 2022,
        "title": "Administrative Sanctions Process (PAS) Rules",
        "title_pt": "Regras do Processo Administrativo Sancionador (PAS)",
        "topics": ["securities", "enforcement", "administrative_sanctions"],
        "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes/",
        "date": "2022-07-13",
    },
    {
        "id": "cvm-res-59-2021",
        "type": "resolução",
        "number": "59",
        "year": 2021,
        "title": "Corporate Governance Code for Publicly-Traded Companies",
        "title_pt": "Código de Governança Corporativa para companhias abertas",
        "topics": ["securities", "corporate_governance", "disclosure", "board_composition"],
        "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes/",
        "date": "2021-12-22",
    },
    {
        "id": "cvm-res-135-2022",
        "type": "resolução",
        "number": "135",
        "year": 2022,
        "title": "Cybersecurity for Market Infrastructure",
        "title_pt": "Segurança cibernética em infraestruturas de mercado",
        "topics": ["securities", "cybersecurity", "market_infrastructure"],
        "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes/",
        "date": "2022-09-08",
    },
]


def ingest_cvm() -> None:
    """Ingest CVM resoluções."""
    conn = get_db()
    total_docs = 0

    print(f"=== CVM Ingestion ({len(CVM_KNOWN_ACTS)} known acts) ===")

    for act in CVM_KNOWN_ACTS:
        print(f"  {act['type']} {act['number']}/{act['year']} — {act['title'][:60]}...")

        upsert_document(
            conn,
            doc_id=act["id"],
            regulator_id="cvm",
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
    print(f"\nCVM: {total_docs} documents ingested")


if __name__ == "__main__":
    ingest_cvm()
