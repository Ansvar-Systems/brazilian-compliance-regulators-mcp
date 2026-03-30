#!/usr/bin/env python3
"""
Ingest CGU (Controladoria-Geral da União) normative acts.

Source: gov.br/cgu — anti-corruption guidance, integrity programs, Pro-Ética.

Usage:
    python ingestion/ingest_cgu.py
"""

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

CGU_KNOWN_ACTS = [
    {
        "id": "cgu-decreto-11129-2022",
        "type": "decreto",
        "number": "11.129",
        "year": 2022,
        "title": "Lei Anticorrupção Regulation — Corporate Administrative Liability",
        "title_pt": "Regulamentação da Lei Anticorrupção — Responsabilização administrativa de pessoas jurídicas",
        "topics": ["anti_corruption", "corporate_liability", "integrity_program"],
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11129.htm",
        "date": "2022-07-11",
    },
    {
        "id": "cgu-portaria-909-2015",
        "type": "portaria",
        "number": "909",
        "year": 2015,
        "title": "Pro-Ética Program Regulation",
        "title_pt": "Regulamentação do Programa Empresa Pró-Ética",
        "topics": ["anti_corruption", "integrity_program", "pro_etica"],
        "url": "https://www.gov.br/cgu/pt-br/assuntos/etica-e-integridade/empresa-pro-etica",
        "date": "2015-04-07",
    },
    {
        "id": "cgu-portaria-1089-2018",
        "type": "portaria",
        "number": "1.089",
        "year": 2018,
        "title": "Integrity Program Assessment Parameters",
        "title_pt": "Parâmetros de avaliação de Programas de Integridade de pessoas jurídicas",
        "topics": ["anti_corruption", "integrity_program", "compliance_assessment"],
        "url": "https://www.gov.br/cgu/pt-br/assuntos/etica-e-integridade",
        "date": "2018-04-25",
    },
    {
        "id": "cgu-in-1-2015",
        "type": "instrução normativa",
        "number": "1",
        "year": 2015,
        "title": "Administrative Accountability Process (PAR) Procedures",
        "title_pt": "Procedimentos do Processo Administrativo de Responsabilização (PAR)",
        "topics": ["anti_corruption", "administrative_process", "corporate_liability"],
        "url": "https://www.gov.br/cgu/pt-br/assuntos/responsabilizacao-de-empresas",
        "date": "2015-04-07",
    },
    {
        "id": "cgu-in-13-2019",
        "type": "instrução normativa",
        "number": "13",
        "year": 2019,
        "title": "Leniency Agreement Procedures",
        "title_pt": "Procedimentos para celebração de Acordos de Leniência",
        "topics": ["anti_corruption", "leniency", "corporate_liability"],
        "url": "https://www.gov.br/cgu/pt-br/assuntos/responsabilizacao-de-empresas/lei-anticorrupcao/acordo-de-leniencia",
        "date": "2019-08-14",
    },
    {
        "id": "cgu-guia-integridade-2015",
        "type": "guia",
        "number": "1",
        "year": 2015,
        "title": "Integrity Program Guide for Private Companies",
        "title_pt": "Programa de Integridade — Diretrizes para Empresas Privadas",
        "topics": ["anti_corruption", "integrity_program", "compliance_program", "guidance"],
        "url": "https://www.gov.br/cgu/pt-br/centrais-de-conteudo/publicacoes/integridade/arquivos/programa-de-integridade-diretrizes-para-empresas-privadas.pdf",
        "date": "2015-09-01",
    },
    {
        "id": "cgu-decreto-9203-2017",
        "type": "decreto",
        "number": "9.203",
        "year": 2017,
        "title": "Public Governance Policy — Integrity in Federal Administration",
        "title_pt": "Política de Governança da Administração Pública Federal — Integridade",
        "topics": ["anti_corruption", "public_governance", "integrity_program"],
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/decreto/d9203.htm",
        "date": "2017-11-22",
    },
]


def scrape_planalto_law(url: str) -> str | None:
    """Scrape a planalto.gov.br law page."""
    try:
        resp = polite_get(url)
        soup = BeautifulSoup(resp.text, "lxml")
        # Planalto pages have law text in the main body
        body = soup.find("body")
        if body:
            text = body.get_text(separator="\n", strip=True)
            # Remove navigation/header noise
            lines = text.split("\n")
            # Find first "Art." line
            start = 0
            for i, line in enumerate(lines):
                if line.strip().startswith("Art."):
                    start = i
                    break
            return "\n".join(lines[start:])
        return None
    except Exception as e:
        print(f"  Warning: could not scrape {url}: {e}")
        return None


def ingest_cgu() -> None:
    """Ingest CGU normative acts."""
    conn = get_db()
    total_docs = 0
    total_provs = 0

    print(f"=== CGU Ingestion ({len(CGU_KNOWN_ACTS)} known acts) ===")

    for act in CGU_KNOWN_ACTS:
        print(f"  {act['type']} {act['number']}/{act['year']} — {act['title'][:60]}...")

        upsert_document(
            conn,
            doc_id=act["id"],
            regulator_id="cgu",
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

        # Try to scrape planalto.gov.br URLs
        if "planalto.gov.br" in act["url"]:
            full_text = scrape_planalto_law(act["url"])
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
                print(f"    Parsed {len(articles)} articles from planalto")

    conn.commit()
    conn.close()
    print(f"\nCGU: {total_docs} documents, {total_provs} provisions ingested")


if __name__ == "__main__":
    ingest_cgu()
