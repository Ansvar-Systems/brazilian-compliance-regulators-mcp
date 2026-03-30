#!/usr/bin/env python3
"""
Ingest SUSEP (Superintendência de Seguros Privados) normative acts.

Source: susep.gov.br — SUSEP circulars, CNSP resolutions.

Usage:
    python ingestion/ingest_susep.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import get_db, upsert_document

SUSEP_KNOWN_ACTS = [
    {
        "id": "susep-circular-638-2021",
        "type": "circular",
        "number": "638",
        "year": 2021,
        "title": "Cybersecurity Requirements for Insurance Companies",
        "title_pt": "Requisitos de segurança cibernética para sociedades seguradoras",
        "topics": ["insurance", "cybersecurity", "incident_reporting"],
        "url": "https://www.susep.gov.br/legislacao-e-normas",
        "date": "2021-07-27",
    },
    {
        "id": "cnsp-res-415-2021",
        "type": "resolução",
        "number": "CNSP 415",
        "year": 2021,
        "title": "Open Insurance Framework",
        "title_pt": "Sistema de Seguros Aberto (Open Insurance)",
        "topics": ["insurance", "open_insurance", "data_sharing", "api"],
        "url": "https://www.susep.gov.br/legislacao-e-normas",
        "date": "2021-07-20",
    },
    {
        "id": "cnsp-res-432-2021",
        "type": "resolução",
        "number": "CNSP 432",
        "year": 2021,
        "title": "Solvency Requirements for Insurance Companies",
        "title_pt": "Requisitos de solvência para sociedades seguradoras",
        "topics": ["insurance", "solvency", "capital_requirements"],
        "url": "https://www.susep.gov.br/legislacao-e-normas",
        "date": "2021-12-15",
    },
    {
        "id": "susep-circular-621-2020",
        "type": "circular",
        "number": "621",
        "year": 2020,
        "title": "AML/CFT Requirements for Insurance Sector",
        "title_pt": "Requisitos de PLD/FTP para o setor de seguros",
        "topics": ["insurance", "aml", "kyc", "reporting_obligations"],
        "url": "https://www.susep.gov.br/legislacao-e-normas",
        "date": "2020-12-10",
    },
    {
        "id": "susep-circular-648-2022",
        "type": "circular",
        "number": "648",
        "year": 2022,
        "title": "Data Protection and Privacy Requirements for Insurers",
        "title_pt": "Requisitos de proteção de dados e privacidade para seguradoras",
        "topics": ["insurance", "data_protection", "lgpd", "privacy"],
        "url": "https://www.susep.gov.br/legislacao-e-normas",
        "date": "2022-03-15",
    },
]


def ingest_susep() -> None:
    """Ingest SUSEP/CNSP normative acts."""
    conn = get_db()
    total_docs = 0

    print(f"=== SUSEP Ingestion ({len(SUSEP_KNOWN_ACTS)} known acts) ===")

    for act in SUSEP_KNOWN_ACTS:
        print(f"  {act['type']} {act['number']}/{act['year']} — {act['title'][:60]}...")

        upsert_document(
            conn,
            doc_id=act["id"],
            regulator_id="susep",
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
    print(f"\nSUSEP: {total_docs} documents ingested")


if __name__ == "__main__":
    ingest_susep()
