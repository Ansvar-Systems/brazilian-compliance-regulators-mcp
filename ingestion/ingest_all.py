#!/usr/bin/env python3
"""
Run all 8 regulator ingestion scripts sequentially.

Usage:
    python ingestion/ingest_all.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ingest_anpd import ingest_anpd
from ingest_cgu import ingest_cgu
from ingest_coaf import ingest_coaf
from ingest_cade import ingest_cade
from ingest_bacen import ingest_bacen
from ingest_cvm import ingest_cvm
from ingest_tcu import ingest_tcu
from ingest_susep import ingest_susep


def main() -> None:
    print("=" * 60)
    print("Brazilian Compliance Regulators — Full Ingestion")
    print("=" * 60)

    ingest_anpd()
    print()
    ingest_cgu()
    print()
    ingest_coaf()
    print()
    ingest_cade()
    print()
    ingest_bacen()
    print()
    ingest_cvm()
    print()
    ingest_tcu()
    print()
    ingest_susep()

    print()
    print("=" * 60)
    print("Ingestion complete. Run verification:")
    print("  node -e \"const D=require('better-sqlite3');const d=new D('data/database.db');")
    print("  console.table(d.prepare('SELECT r.id,COUNT(DISTINCT d.id) as docs,COUNT(p.id) as provs")
    print("  FROM regulators r LEFT JOIN documents d ON d.regulator_id=r.id")
    print("  LEFT JOIN provisions p ON p.document_id=d.id GROUP BY r.id').all())\"")
    print("=" * 60)


if __name__ == "__main__":
    main()
