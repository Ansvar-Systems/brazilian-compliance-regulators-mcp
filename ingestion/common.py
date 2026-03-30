"""
Common utilities for Brazilian compliance regulator ingestion scripts.

Shared database access, HTTP helpers, and text processing.
"""

import json
import os
import re
import sqlite3
import time
from pathlib import Path
from typing import Any

import requests

DB_PATH = os.environ.get(
    "BR_COMPLIANCE_DB_PATH",
    str(Path(__file__).parent.parent / "data" / "database.db"),
)

# Polite request defaults
SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": "AnsvarMCPIngestion/1.0 (compliance research; hello@ansvar.ai)",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }
)

REQUEST_DELAY = 1.5  # seconds between requests


def get_db() -> sqlite3.Connection:
    """Open SQLite database with WAL mode."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def polite_get(url: str, **kwargs: Any) -> requests.Response:
    """HTTP GET with delay and retry."""
    time.sleep(REQUEST_DELAY)
    for attempt in range(3):
        try:
            resp = SESSION.get(url, timeout=30, **kwargs)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            if attempt == 2:
                raise
            print(f"  Retry {attempt + 1}/3 for {url}: {e}")
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("Unreachable")


def polite_post(url: str, **kwargs: Any) -> requests.Response:
    """HTTP POST with delay and retry."""
    time.sleep(REQUEST_DELAY)
    for attempt in range(3):
        try:
            resp = SESSION.post(url, timeout=30, **kwargs)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            if attempt == 2:
                raise
            print(f"  Retry {attempt + 1}/3 for {url}: {e}")
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("Unreachable")


def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def make_document_id(regulator: str, doc_type: str, number: str, year: int) -> str:
    """Generate a document ID like 'anpd-res-cd-2-2022'."""
    slug = slugify(f"{regulator}-{doc_type}-{number}")
    return f"{slug}-{year}"


def upsert_document(
    conn: sqlite3.Connection,
    doc_id: str,
    regulator_id: str,
    document_type: str,
    number: str | None,
    year: int | None,
    title: str,
    title_pt: str,
    date_published: str | None,
    date_effective: str | None,
    status: str,
    topics: list[str],
    source_url: str | None,
) -> None:
    """Insert or replace a document."""
    conn.execute(
        """INSERT OR REPLACE INTO documents
           (id, regulator_id, document_type, number, year, title, title_pt,
            date_published, date_effective, status, topics, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            doc_id,
            regulator_id,
            document_type,
            number,
            year,
            title,
            title_pt,
            date_published,
            date_effective,
            status,
            json.dumps(topics),
            source_url,
        ),
    )


def insert_provision(
    conn: sqlite3.Connection,
    document_id: str,
    article: str,
    paragraph: str | None,
    text_pt: str,
    text_en: str,
    topics: list[str],
) -> None:
    """Insert a provision (does not deduplicate — caller should clear first)."""
    conn.execute(
        """INSERT INTO provisions (document_id, article, paragraph, text_pt, text_en, topics)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (document_id, article, paragraph, text_pt, text_en, json.dumps(topics)),
    )


def insert_enforcement(
    conn: sqlite3.Connection,
    regulator_id: str,
    case_number: str | None,
    date_decided: str | None,
    respondent: str | None,
    summary_pt: str | None,
    summary_en: str | None,
    penalty_type: str | None,
    penalty_amount: float | None,
    legal_basis: str | None,
    source_url: str | None,
) -> None:
    """Insert an enforcement action."""
    conn.execute(
        """INSERT INTO enforcement_actions
           (regulator_id, case_number, date_decided, respondent, summary_pt, summary_en,
            penalty_type, penalty_amount, currency, legal_basis, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BRL', ?, ?)""",
        (
            regulator_id,
            case_number,
            date_decided,
            respondent,
            summary_pt,
            summary_en,
            penalty_type,
            penalty_amount,
            legal_basis,
            source_url,
        ),
    )


def parse_brazilian_articles(text: str) -> list[dict[str, str]]:
    """
    Parse Brazilian legislative text into articles.

    Brazilian normative acts follow a standard structure:
      Art. 1º ...
      § 1º ...
      I - ...
      II - ...
      Art. 2º ...

    Returns list of {article, text} dicts.
    """
    articles: list[dict[str, str]] = []
    current_article = ""
    current_text_lines: list[str] = []

    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Match "Art. N" pattern
        art_match = re.match(
            r"^Art\.\s*(\d+)[º°]?\s*[-–.]?\s*(.*)", line, re.IGNORECASE
        )
        if art_match:
            # Save previous article
            if current_article and current_text_lines:
                articles.append(
                    {
                        "article": current_article,
                        "text": "\n".join(current_text_lines),
                    }
                )
            current_article = f"art{art_match.group(1)}"
            current_text_lines = [line]
        else:
            current_text_lines.append(line)

    # Save last article
    if current_article and current_text_lines:
        articles.append(
            {"article": current_article, "text": "\n".join(current_text_lines)}
        )

    return articles
