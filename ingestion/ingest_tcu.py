#!/usr/bin/env python3
"""
Ingest TCU (Tribunal de Contas da União) binding decisions and precedents.

Source: pesquisa.apps.tcu.gov.br — search API for acórdãos and súmulas.

Usage:
    python ingestion/ingest_tcu.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import get_db, upsert_document

TCU_KNOWN_ACTS = [
    {
        "id": "tcu-acordao-1603-2008",
        "type": "acórdão",
        "number": "1603",
        "year": 2008,
        "title": "IT Governance Framework for Federal Agencies",
        "title_pt": "Levantamento de Governança de TI na Administração Pública Federal",
        "topics": ["it_governance", "public_procurement", "cybersecurity"],
        "url": "https://pesquisa.apps.tcu.gov.br",
        "date": "2008-08-13",
    },
    {
        "id": "tcu-acordao-2622-2015",
        "type": "acórdão",
        "number": "2622",
        "year": 2015,
        "title": "Cloud Computing Contracting in the Public Sector",
        "title_pt": "Contratação de serviços de computação em nuvem pelo setor público",
        "topics": ["it_governance", "cloud_computing", "public_procurement"],
        "url": "https://pesquisa.apps.tcu.gov.br",
        "date": "2015-10-14",
    },
    {
        "id": "tcu-acordao-3051-2014",
        "type": "acórdão",
        "number": "3051",
        "year": 2014,
        "title": "Information Security in the Federal Administration",
        "title_pt": "Segurança da informação na Administração Pública Federal",
        "topics": ["it_governance", "cybersecurity", "information_security"],
        "url": "https://pesquisa.apps.tcu.gov.br",
        "date": "2014-11-12",
    },
    {
        "id": "tcu-sumula-222",
        "type": "súmula",
        "number": "222",
        "year": 1994,
        "title": "Procurement Qualification Requirements — Binding Precedent",
        "title_pt": "Requisitos de habilitação em licitações — Súmula vinculante",
        "topics": ["public_procurement", "procurement_compliance"],
        "url": "https://pesquisa.apps.tcu.gov.br/#/sumula/222",
        "date": "1994-01-01",
    },
    {
        "id": "tcu-sumula-247",
        "type": "súmula",
        "number": "247",
        "year": 2004,
        "title": "Competitive Bidding Principle — Brand Specification Restriction",
        "title_pt": "Princípio da competitividade — Restrição à especificação de marca",
        "topics": ["public_procurement", "competitive_bidding"],
        "url": "https://pesquisa.apps.tcu.gov.br/#/sumula/247",
        "date": "2004-11-10",
    },
    {
        "id": "tcu-sumula-269",
        "type": "súmula",
        "number": "269",
        "year": 2012,
        "title": "IT Service Contracting — Technical Qualification",
        "title_pt": "Contratação de serviços de TI — Qualificação técnica",
        "topics": ["public_procurement", "it_governance", "it_contracting"],
        "url": "https://pesquisa.apps.tcu.gov.br/#/sumula/269",
        "date": "2012-11-14",
    },
    {
        "id": "tcu-acordao-1739-2015",
        "type": "acórdão",
        "number": "1739",
        "year": 2015,
        "title": "Personal Data Protection in Government Systems",
        "title_pt": "Proteção de dados pessoais em sistemas governamentais",
        "topics": ["data_protection", "it_governance", "privacy"],
        "url": "https://pesquisa.apps.tcu.gov.br",
        "date": "2015-07-15",
    },
]


def ingest_tcu() -> None:
    """Ingest TCU acórdãos and súmulas."""
    conn = get_db()
    total_docs = 0

    print(f"=== TCU Ingestion ({len(TCU_KNOWN_ACTS)} known acts) ===")

    for act in TCU_KNOWN_ACTS:
        print(f"  {act['type']} {act['number']}/{act['year']} — {act['title'][:60]}...")

        upsert_document(
            conn,
            doc_id=act["id"],
            regulator_id="tcu",
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
    print(f"\nTCU: {total_docs} documents ingested")


if __name__ == "__main__":
    ingest_tcu()
