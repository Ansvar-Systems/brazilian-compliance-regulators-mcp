#!/usr/bin/env python3
"""
Ingest CADE (Conselho Administrativo de Defesa Econômica) data.

Sources:
  - cade.gov.br/acesso-a-informacao/normativos — resolutions and guidelines
  - Open data CSVs for concentration acts (CC BY-ND 3.0)

Usage:
    python ingestion/ingest_cade.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import get_db, upsert_document

CADE_KNOWN_ACTS = [
    {
        "id": "cade-guia-compliance-2016",
        "type": "guia",
        "number": "compliance-1",
        "year": 2016,
        "title": "Guidelines for Competition Compliance Programs",
        "title_pt": "Guia para Programas de Compliance Concorrencial",
        "topics": ["competition", "compliance_program", "antitrust"],
        "url": "https://cdn.cade.gov.br/Portal/centrais-de-conteudo/publicacoes/guias-do-cade/guia-compliance-versao-oficial.pdf",
        "date": "2016-01-15",
    },
    {
        "id": "cade-res-33-2022",
        "type": "resolução",
        "number": "33",
        "year": 2022,
        "title": "CADE Internal Regulations (Procedural Rules)",
        "title_pt": "Regimento Interno do CADE",
        "topics": ["competition", "procedural", "merger_review", "cartel"],
        "url": "https://www.cade.gov.br/acesso-a-informacao/normativos",
        "date": "2022-06-28",
    },
    {
        "id": "cade-guia-gun-jumping-2015",
        "type": "guia",
        "number": "gun-jumping-1",
        "year": 2015,
        "title": "Gun Jumping Guidelines — Pre-Merger Coordination",
        "title_pt": "Guia para Análise de Consumação Prévia de Atos de Concentração (Gun Jumping)",
        "topics": ["competition", "merger_review", "gun_jumping"],
        "url": "https://cdn.cade.gov.br/Portal/centrais-de-conteudo/publicacoes/guias-do-cade",
        "date": "2015-05-01",
    },
    {
        "id": "cade-guia-remedios-2018",
        "type": "guia",
        "number": "remedios-1",
        "year": 2018,
        "title": "Merger Remedies Guidelines",
        "title_pt": "Guia de Remédios Antitruste",
        "topics": ["competition", "merger_review", "remedies", "divestiture"],
        "url": "https://cdn.cade.gov.br/Portal/centrais-de-conteudo/publicacoes/guias-do-cade",
        "date": "2018-10-01",
    },
    {
        "id": "cade-res-24-2019",
        "type": "resolução",
        "number": "24",
        "year": 2019,
        "title": "Leniency Agreement Regulation for Cartel Cases",
        "title_pt": "Regulamento do Acordo de Leniência em casos de cartel",
        "topics": ["competition", "cartel", "leniency"],
        "url": "https://www.cade.gov.br/acesso-a-informacao/normativos",
        "date": "2019-07-08",
    },
    {
        "id": "cade-notification-thresholds-2022",
        "type": "portaria",
        "number": "994",
        "year": 2022,
        "title": "Merger Notification Revenue Thresholds (updated annually)",
        "title_pt": "Valores de faturamento para notificação de atos de concentração",
        "topics": ["competition", "merger_review", "notification_threshold"],
        "url": "https://www.cade.gov.br",
        "date": "2022-12-15",
    },
]


def ingest_cade() -> None:
    """Ingest CADE normative acts and guidelines."""
    conn = get_db()
    total_docs = 0

    print(f"=== CADE Ingestion ({len(CADE_KNOWN_ACTS)} known acts) ===")

    for act in CADE_KNOWN_ACTS:
        print(f"  {act['type']} {act['number']}/{act['year']} — {act['title'][:60]}...")

        upsert_document(
            conn,
            doc_id=act["id"],
            regulator_id="cade",
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
    print(f"\nCADE: {total_docs} documents ingested")


if __name__ == "__main__":
    ingest_cade()
