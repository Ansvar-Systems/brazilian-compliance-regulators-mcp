# Brazilian Compliance Regulators MCP

MCP server providing access to normative acts, provisions, and enforcement actions from 8 key Brazilian compliance regulators.

## Regulators Covered

| Regulator | Domain | Key Acts |
|-----------|--------|----------|
| **ANPD** | Data protection (LGPD enforcement) | Resoluções CD/ANPD, DPIA regulation, sanctions dosimetry, incident reporting |
| **CGU** | Anti-corruption | Lei Anticorrupção guidance, Pro-Ética, integrity program assessment |
| **COAF** | AML/CFT | PEP identification, UBO requirements, suspicious activity typologies |
| **CADE** | Competition/antitrust | Merger review guidelines, compliance programs, leniency agreements |
| **BACEN** | Financial regulation | Res. 4.893 (cybersecurity), Circ. 3.978 (AML), open banking, PIX |
| **CVM** | Securities | Investment fund regulation, insider trading, crowdfunding, governance |
| **TCU** | Public audit/procurement | IT governance acórdãos, binding súmulas, procurement standards |
| **SUSEP** | Insurance | Cybersecurity requirements, open insurance, solvency, AML |

## Tools

| Tool | Description |
|------|-------------|
| `br_comp_search_regulations` | Full-text search across all regulator provisions (PT/EN) |
| `br_comp_get_provision` | Get specific provision by document ID and article |
| `br_comp_list_regulators` | List all 8 regulators with provision counts |
| `br_comp_get_regulator_summary` | Detailed regulator summary with statistics |
| `br_comp_search_enforcement` | Search enforcement actions (fines, sanctions, bans) |
| `br_comp_list_topics` | List compliance topics with provision counts |
| `br_comp_about` | Server metadata and coverage description |
| `br_comp_list_sources` | Data source listing with URLs |

## Usage

```bash
# stdio (local)
npx @ansvar/brazilian-compliance-regulators-mcp

# HTTP (Docker)
docker run -p 3000:3000 ghcr.io/ansvar-systems/brazilian-compliance-regulators-mcp:latest
```

## Development

```bash
npm install
npx tsx scripts/seed-sample.ts   # Create database with seed data
npm run dev                       # Start dev server
npm run build                     # Build TypeScript
```

## Ingestion

```bash
pip install -r ingestion/requirements.txt
python ingestion/ingest_all.py    # Run all 8 regulator ingestion scripts
```

## Legal Basis

All regulatory acts are public domain under Lei 9.610/1998, Art. 8 IV (legislative texts, court decisions, and regulatory acts excluded from copyright protection).

## License

Apache-2.0
