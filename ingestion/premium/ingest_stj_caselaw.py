#!/usr/bin/env python3
"""
Ingest STJ (Superior Tribunal de Justiça) case law from CKAN Open Data Portal.

Source: dadosabertos.web.stj.jus.br/dataset/
License: CC BY — bulk download, no scraping needed.

The STJ is the highest court for infra-constitutional matters (below STF).
Full-text decisions with CC BY licensing make this the best starting point
for Brazilian case law ingestion.

Usage:
    python ingestion/premium/ingest_stj_caselaw.py [--output /data/premium-dbs/br/case_law.db]
"""

import argparse
import io
import json
import os
import sqlite3
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from common import polite_get

# STJ CKAN API
STJ_CKAN_URL = "https://dadosabertos.web.stj.jus.br/api/3"
STJ_DECISIONS_DATASET = "integras-de-decisoes-terminativas-e-acordaos-do-diario-da-justica"

CASE_LAW_SCHEMA = """
CREATE TABLE IF NOT EXISTS case_law (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    court TEXT NOT NULL DEFAULT 'STJ',
    case_type TEXT,
    decision_date TEXT,
    publication_date TEXT,
    rapporteur TEXT,
    chamber TEXT,
    subject TEXT,
    summary TEXT,
    full_text TEXT,
    source_url TEXT,
    source_dataset TEXT,
    UNIQUE(case_id, court)
);

CREATE INDEX IF NOT EXISTS idx_case_law_court ON case_law(court);
CREATE INDEX IF NOT EXISTS idx_case_law_date ON case_law(decision_date);
CREATE INDEX IF NOT EXISTS idx_case_law_type ON case_law(case_type);

CREATE VIRTUAL TABLE IF NOT EXISTS case_law_fts USING fts5(
    case_id, subject, summary, full_text,
    content='case_law',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS case_law_ai AFTER INSERT ON case_law BEGIN
    INSERT INTO case_law_fts(rowid, case_id, subject, summary, full_text)
    VALUES (new.id, new.case_id, COALESCE(new.subject, ''), COALESCE(new.summary, ''), COALESCE(new.full_text, ''));
END;
"""


def get_stj_datasets() -> list[dict]:
    """List available STJ CKAN datasets."""
    try:
        resp = polite_get(f"{STJ_CKAN_URL}/action/package_list")
        data = resp.json()
        if data.get("success"):
            return data["result"]
    except Exception as e:
        print(f"Warning: could not list STJ datasets: {e}")
    return []


def get_dataset_resources(dataset_id: str) -> list[dict]:
    """Get downloadable resources for a CKAN dataset."""
    try:
        resp = polite_get(
            f"{STJ_CKAN_URL}/action/package_show",
            params={"id": dataset_id},
        )
        data = resp.json()
        if data.get("success"):
            return data["result"].get("resources", [])
    except Exception as e:
        print(f"Warning: could not get resources for {dataset_id}: {e}")
    return []


def download_and_extract_zip(url: str) -> list[dict]:
    """Download a ZIP resource and extract JSON records."""
    records = []
    try:
        print(f"  Downloading {url}...")
        resp = polite_get(url)

        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            for name in zf.namelist():
                if name.endswith(".json"):
                    with zf.open(name) as f:
                        content = f.read().decode("utf-8", errors="replace")
                        try:
                            data = json.loads(content)
                            if isinstance(data, list):
                                records.extend(data)
                            elif isinstance(data, dict):
                                records.append(data)
                        except json.JSONDecodeError:
                            # Try line-delimited JSON
                            for line in content.split("\n"):
                                line = line.strip()
                                if line:
                                    try:
                                        records.append(json.loads(line))
                                    except json.JSONDecodeError:
                                        continue
                elif name.endswith(".csv"):
                    print(f"    CSV file: {name} (skipping — JSON preferred)")
    except Exception as e:
        print(f"  Warning: could not download/extract {url}: {e}")

    return records


def ingest_stj_caselaw(output_path: str) -> None:
    """Ingest STJ case law from CKAN Open Data Portal."""
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    conn = sqlite3.connect(output_path)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(CASE_LAW_SCHEMA)

    print("=== STJ Case Law Ingestion ===")
    print(f"Source: {STJ_CKAN_URL}")
    print(f"Output: {output_path}")

    # Step 1: List datasets
    print("\nListing STJ CKAN datasets...")
    datasets = get_stj_datasets()
    print(f"  Found {len(datasets)} datasets")

    if not datasets:
        print("  Warning: no datasets returned — API may be rate-limited or down")
        print("  Proceeding with known dataset ID...")
        datasets = [STJ_DECISIONS_DATASET]

    # Step 2: Get resources for decision datasets
    total_records = 0
    for dataset_id in datasets:
        if not any(
            keyword in dataset_id.lower()
            for keyword in ["decisao", "decisoes", "acordao", "acordaos", "integra", "jurisprudencia"]
        ):
            continue

        print(f"\n  Dataset: {dataset_id}")
        resources = get_dataset_resources(dataset_id)
        print(f"    Resources: {len(resources)}")

        for resource in resources:
            fmt = resource.get("format", "").upper()
            url = resource.get("url", "")
            name = resource.get("name", "unknown")

            if not url:
                continue

            if fmt in ("ZIP", "JSON"):
                print(f"    Resource: {name} ({fmt})")

                if fmt == "ZIP":
                    records = download_and_extract_zip(url)
                else:
                    try:
                        resp = polite_get(url)
                        data = resp.json()
                        records = data if isinstance(data, list) else [data]
                    except Exception as e:
                        print(f"      Warning: {e}")
                        records = []

                if records:
                    insert_count = 0
                    for record in records:
                        case_id = (
                            record.get("numero_processo")
                            or record.get("numero")
                            or record.get("id", "")
                        )
                        if not case_id:
                            continue

                        try:
                            conn.execute(
                                """INSERT OR IGNORE INTO case_law
                                   (case_id, court, case_type, decision_date, publication_date,
                                    rapporteur, chamber, subject, summary, full_text,
                                    source_url, source_dataset)
                                   VALUES (?, 'STJ', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                                (
                                    str(case_id),
                                    record.get("classe") or record.get("tipo"),
                                    record.get("data_julgamento") or record.get("data_decisao"),
                                    record.get("data_publicacao"),
                                    record.get("relator") or record.get("ministro_relator"),
                                    record.get("orgao_julgador") or record.get("turma"),
                                    record.get("assunto") or record.get("tema"),
                                    record.get("ementa") or record.get("resumo"),
                                    record.get("integra") or record.get("texto") or record.get("conteudo"),
                                    url,
                                    dataset_id,
                                ),
                            )
                            insert_count += 1
                        except sqlite3.Error as e:
                            print(f"      DB error: {e}")
                            continue

                    conn.commit()
                    total_records += insert_count
                    print(f"      Inserted {insert_count} records")
            else:
                print(f"    Skipping {name} ({fmt})")

    # Verify
    count = conn.execute("SELECT COUNT(*) FROM case_law").fetchone()[0]
    print(f"\nTotal case law records in database: {count}")

    conn.close()
    print(f"\nSTJ case law ingestion complete → {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest STJ case law from CKAN")
    parser.add_argument(
        "--output",
        type=str,
        default="data/premium/case_law.db",
        help="Output SQLite database path",
    )
    args = parser.parse_args()
    ingest_stj_caselaw(args.output)
