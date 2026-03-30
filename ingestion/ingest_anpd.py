#!/usr/bin/env python3
"""
Ingest ANPD (Autoridade Nacional de Proteção de Dados) normative acts.

Source: gov.br/anpd — resoluções, technical notes, enforcement decisions.
All published as HTML/PDF on the gov.br portal.

Usage:
    python ingestion/ingest_anpd.py
"""

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

# ANPD published regulations page
ANPD_BASE = "https://www.gov.br/anpd/pt-br/documentos-e-publicacoes"
ANPD_REGULATIONS_URL = f"{ANPD_BASE}/regulamentacoes-da-anpd"
ANPD_SANCTIONS_URL = f"{ANPD_BASE}/decisoes"

# Known key ANPD normative acts with stable URLs
ANPD_KNOWN_ACTS = [
    {
        "id": "anpd-res-cd-2-2022",
        "type": "resolução",
        "number": "CD/ANPD nº 2",
        "year": 2022,
        "title": "LGPD Regulation for Small Processing Agents",
        "title_pt": "Regulamento de aplicação da LGPD para agentes de tratamento de pequeno porte",
        "topics": ["data_protection", "small_business", "lgpd"],
        "url": f"{ANPD_BASE}/regulamentacoes-da-anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022",
        "date": "2022-01-27",
    },
    {
        "id": "anpd-res-cd-4-2023",
        "type": "resolução",
        "number": "CD/ANPD nº 4",
        "year": 2023,
        "title": "Regulation on Data Protection Impact Assessment (DPIA/RIPD)",
        "title_pt": "Regulamento do Relatório de Impacto à Proteção de Dados Pessoais (RIPD)",
        "topics": ["data_protection", "dpia", "lgpd", "risk_assessment"],
        "url": f"{ANPD_BASE}/regulamentacoes-da-anpd",
        "date": "2023-12-19",
    },
    {
        "id": "anpd-res-cd-15-2024",
        "type": "resolução",
        "number": "CD/ANPD nº 15",
        "year": 2024,
        "title": "Regulation on Sanctions Dosimetry",
        "title_pt": "Regulamento de Dosimetria e Aplicação de Sanções Administrativas",
        "topics": ["data_protection", "sanctions", "enforcement", "lgpd"],
        "url": f"{ANPD_BASE}/regulamentacoes-da-anpd",
        "date": "2023-02-27",
    },
    {
        "id": "anpd-res-cd-6-2023",
        "type": "resolução",
        "number": "CD/ANPD nº 6",
        "year": 2023,
        "title": "Regulation on Security Incident Reporting",
        "title_pt": "Regulamento de Comunicação de Incidente de Segurança",
        "topics": ["data_protection", "incident_reporting", "cybersecurity", "lgpd"],
        "url": f"{ANPD_BASE}/regulamentacoes-da-anpd",
        "date": "2024-04-26",
    },
    {
        "id": "anpd-res-cd-5-2023",
        "type": "resolução",
        "number": "CD/ANPD nº 5",
        "year": 2023,
        "title": "Regulation on International Data Transfer",
        "title_pt": "Regulamento de Transferência Internacional de Dados",
        "topics": ["data_protection", "international_transfer", "lgpd", "adequacy"],
        "url": f"{ANPD_BASE}/regulamentacoes-da-anpd",
        "date": "2024-08-23",
    },
    {
        "id": "anpd-res-cd-7-2024",
        "type": "resolução",
        "number": "CD/ANPD nº 7",
        "year": 2024,
        "title": "Regulation on the Rights of Data Subjects",
        "title_pt": "Regulamento sobre os Direitos dos Titulares de Dados Pessoais",
        "topics": ["data_protection", "data_subject_rights", "lgpd"],
        "url": f"{ANPD_BASE}/regulamentacoes-da-anpd",
        "date": "2024-10-15",
    },
    {
        "id": "anpd-guia-seguranca-2021",
        "type": "guia",
        "number": "1",
        "year": 2021,
        "title": "Information Security Guidance for LGPD Processing Agents",
        "title_pt": "Guia Orientativo de Segurança da Informação para Agentes de Tratamento de Pequeno Porte",
        "topics": ["data_protection", "cybersecurity", "lgpd", "security_guidance"],
        "url": f"{ANPD_BASE}/guias-de-seguranca",
        "date": "2021-10-04",
    },
    {
        "id": "anpd-guia-cookies-2022",
        "type": "guia",
        "number": "2",
        "year": 2022,
        "title": "Cookie and Tracker Guidance",
        "title_pt": "Guia Orientativo sobre Cookies e Rastreadores",
        "topics": ["data_protection", "cookies", "consent", "lgpd"],
        "url": f"{ANPD_BASE}/guias-de-seguranca",
        "date": "2022-10-18",
    },
]


def scrape_anpd_regulation_page(url: str) -> str | None:
    """Scrape a gov.br ANPD regulation page for its text content."""
    try:
        resp = polite_get(url)
        soup = BeautifulSoup(resp.text, "lxml")

        # gov.br pages use #content-core for main content
        content = soup.find(id="content-core") or soup.find("article") or soup.find("main")
        if content:
            return content.get_text(separator="\n", strip=True)
        return None
    except Exception as e:
        print(f"  Warning: could not scrape {url}: {e}")
        return None


def discover_additional_acts() -> list[dict]:
    """Try to discover additional ANPD acts from the regulations listing page."""
    discovered = []
    try:
        resp = polite_get(ANPD_REGULATIONS_URL)
        soup = BeautifulSoup(resp.text, "lxml")

        # Look for links to individual resolution pages
        links = soup.find_all("a", href=re.compile(r"resolucao-cd-anpd"))
        for link in links:
            href = link.get("href", "")
            text = link.get_text(strip=True)
            if href and text:
                # Try to extract resolution number
                num_match = re.search(r"n[oº°]\s*(\d+)", text, re.IGNORECASE)
                if num_match:
                    discovered.append(
                        {"url": href, "text": text, "number": num_match.group(1)}
                    )
    except Exception as e:
        print(f"  Warning: could not discover acts: {e}")

    return discovered


def ingest_anpd() -> None:
    """Ingest ANPD normative acts."""
    conn = get_db()
    total_docs = 0
    total_provs = 0

    print(f"=== ANPD Ingestion ({len(ANPD_KNOWN_ACTS)} known acts) ===")

    for act in ANPD_KNOWN_ACTS:
        print(f"  {act['type']} {act['number']} — {act['title'][:60]}...")

        upsert_document(
            conn,
            doc_id=act["id"],
            regulator_id="anpd",
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

        # Try to scrape full text
        full_text = scrape_anpd_regulation_page(act["url"])
        if full_text and len(full_text) > 200:
            conn.execute("DELETE FROM provisions WHERE document_id = ?", (act["id"],))
            articles = parse_brazilian_articles(full_text)
            for art in articles:
                insert_provision(
                    conn,
                    document_id=act["id"],
                    article=art["article"],
                    paragraph=None,
                    text_pt=art["text"],
                    text_en=f"[Translation pending] {art['text'][:200]}",
                    topics=act["topics"],
                )
                total_provs += 1
            print(f"    Parsed {len(articles)} articles from web page")
        else:
            print(f"    No full text scraped — using seed data")

    # Discover additional acts
    print("\n  Discovering additional acts from listing page...")
    additional = discover_additional_acts()
    known_ids = {a["id"] for a in ANPD_KNOWN_ACTS}
    new_count = 0
    for disc in additional:
        act_id = f"anpd-res-cd-{disc['number']}-discovered"
        if act_id not in known_ids:
            print(f"    Found: {disc['text'][:60]}")
            new_count += 1
    print(f"  {new_count} additional acts discovered (manual review needed)")

    conn.commit()
    conn.close()
    print(f"\nANPD: {total_docs} documents, {total_provs} provisions ingested")


if __name__ == "__main__":
    ingest_anpd()
