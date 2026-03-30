#!/usr/bin/env python3
"""
Ingest BACEN (Banco Central do Brasil) normative acts.

Source: normativos.bcb.gov.br — structured HTML search interface.
Focus: cybersecurity (Res. 4.893), AML/CFT (Circ. 3.978), open banking, cloud computing.

Usage:
    python ingestion/ingest_bacen.py [--focus cybersecurity,aml,open-banking]
"""

import argparse
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from common import (
    get_db,
    polite_get,
    upsert_document,
    insert_provision,
    parse_brazilian_articles,
)

# Key BACEN normative acts by focus area
BACEN_ACTS = {
    "cybersecurity": [
        {
            "type": "resolução",
            "number": "4.893",
            "year": 2021,
            "title_pt": "Política de segurança cibernética e requisitos para contratação de serviços de processamento e armazenamento de dados e de computação em nuvem",
            "title": "Cybersecurity policy and requirements for contracting data processing, storage, and cloud computing services",
            "topics": ["cybersecurity", "financial_regulation", "cloud_computing", "incident_reporting"],
            "url": "https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20BCB&numero=4893",
        },
        {
            "type": "resolução",
            "number": "4.658",
            "year": 2018,
            "title_pt": "Política de segurança cibernética e requisitos para contratação de serviços de processamento e armazenamento de dados e de computação em nuvem (revogada pela 4.893)",
            "title": "Cybersecurity policy — cloud computing requirements (revoked by 4.893)",
            "topics": ["cybersecurity", "financial_regulation", "cloud_computing"],
            "url": "https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=4658",
            "status": "revoked",
        },
        {
            "type": "resolução",
            "number": "85",
            "year": 2021,
            "title_pt": "Requisitos para compartilhamento de dados sobre incidentes de segurança cibernética",
            "title": "Requirements for sharing cybersecurity incident data",
            "topics": ["cybersecurity", "financial_regulation", "incident_sharing"],
            "url": "https://normativos.bcb.gov.br",
        },
    ],
    "aml": [
        {
            "type": "circular",
            "number": "3.978",
            "year": 2020,
            "title_pt": "Procedimentos de PLD/FTP: política, procedimentos e controles internos para prevenção à lavagem de dinheiro",
            "title": "AML/CFT procedures: policy, procedures and internal controls for money laundering prevention",
            "topics": ["aml", "financial_regulation", "kyc", "suspicious_activity"],
            "url": "https://normativos.bcb.gov.br",
        },
        {
            "type": "circular",
            "number": "3.979",
            "year": 2020,
            "title_pt": "Cadastro de clientes: procedimentos de identificação e qualificação",
            "title": "Customer registration: identification and qualification procedures (KYC)",
            "topics": ["aml", "financial_regulation", "kyc", "customer_due_diligence"],
            "url": "https://normativos.bcb.gov.br",
        },
    ],
    "open-banking": [
        {
            "type": "resolução",
            "number": "1",
            "year": 2020,
            "title_pt": "Regulamentação do Sistema Financeiro Aberto (Open Finance)",
            "title": "Open Finance system regulation",
            "topics": ["open_banking", "financial_regulation", "data_sharing", "api"],
            "url": "https://normativos.bcb.gov.br",
        },
        {
            "type": "resolução",
            "number": "32",
            "year": 2020,
            "title_pt": "Regulamentação do arranjo de pagamentos PIX",
            "title": "PIX instant payment arrangement regulation",
            "topics": ["pix", "financial_regulation", "payments", "cybersecurity"],
            "url": "https://normativos.bcb.gov.br",
        },
    ],
    "operational_resilience": [
        {
            "type": "resolução",
            "number": "4.557",
            "year": 2017,
            "title_pt": "Estrutura de gerenciamento de riscos e gerenciamento de capital",
            "title": "Risk management structure and capital management",
            "topics": ["risk_management", "financial_regulation", "operational_resilience"],
            "url": "https://normativos.bcb.gov.br",
        },
    ],
}


def fetch_normativo_text(url: str) -> str | None:
    """Try to fetch the full text of a BACEN normativo from its URL."""
    try:
        resp = polite_get(url)
        soup = BeautifulSoup(resp.text, "lxml")

        # BACEN normativo pages have the text in a specific div
        content_div = soup.find("div", class_="ExibeNormativo")
        if content_div:
            return content_div.get_text(separator="\n", strip=True)

        # Fallback: look for main content area
        main = soup.find("main") or soup.find("article")
        if main:
            return main.get_text(separator="\n", strip=True)

        return None
    except Exception as e:
        print(f"  Warning: could not fetch {url}: {e}")
        return None


def ingest_bacen(focus_areas: list[str] | None = None) -> None:
    """Ingest BACEN normative acts."""
    conn = get_db()

    if focus_areas is None:
        focus_areas = list(BACEN_ACTS.keys())

    total_docs = 0
    total_provs = 0

    for area in focus_areas:
        acts = BACEN_ACTS.get(area, [])
        if not acts:
            print(f"Unknown focus area: {area}")
            continue

        print(f"\n=== BACEN {area} ({len(acts)} acts) ===")

        for act in acts:
            doc_id = f"bacen-{act['type'][:3]}-{act['number'].replace('.', '')}-{act['year']}"
            status = act.get("status", "active")

            print(f"  {act['type']} {act['number']}/{act['year']} — {act['title'][:60]}...")

            upsert_document(
                conn,
                doc_id=doc_id,
                regulator_id="bacen",
                document_type=act["type"],
                number=act["number"],
                year=act["year"],
                title=act["title"],
                title_pt=act["title_pt"],
                date_published=f"{act['year']}-01-01",
                date_effective=f"{act['year']}-01-01",
                status=status,
                topics=act["topics"],
                source_url=act["url"],
            )
            total_docs += 1

            # Try to fetch and parse full text
            full_text = fetch_normativo_text(act["url"])
            if full_text:
                # Clear existing provisions for this doc
                conn.execute("DELETE FROM provisions WHERE document_id = ?", (doc_id,))

                articles = parse_brazilian_articles(full_text)
                for art in articles:
                    insert_provision(
                        conn,
                        document_id=doc_id,
                        article=art["article"],
                        paragraph=None,
                        text_pt=art["text"],
                        text_en=f"[Translation pending] {art['text'][:200]}",
                        topics=act["topics"],
                    )
                    total_provs += 1
                print(f"    Parsed {len(articles)} articles from full text")
            else:
                print(f"    No full text fetched — seed data only")

    conn.commit()
    conn.close()
    print(f"\nBACEN: {total_docs} documents, {total_provs} provisions ingested")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest BACEN normative acts")
    parser.add_argument(
        "--focus",
        type=str,
        default=None,
        help="Comma-separated focus areas: cybersecurity,aml,open-banking,operational_resilience",
    )
    args = parser.parse_args()

    focus = args.focus.split(",") if args.focus else None
    ingest_bacen(focus)
