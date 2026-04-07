/**
 * Tool definitions and handler for Brazilian Compliance Regulators MCP.
 *
 * Shared between stdio (index.ts) and HTTP (http-server.ts) entry points.
 */

import { z } from "zod";
import {
  listRegulators,
  getRegulatorSummary,
  searchProvisions,
  getProvision,
  searchEnforcement,
  listTopics,
  getStats,
} from "./db.js";
import { buildCitation } from "./citation.js";

export { SERVER_NAME, pkgVersion } from "./constants.js";

// ─── Tool definitions ────────────────────────────────────────────────────────

export const TOOLS = [
  {
    name: "br_comp_search_regulations",
    description:
      "Full-text search across Brazilian compliance regulator normative acts (ANPD, CGU, COAF, CADE, BACEN, CVM, TCU, SUSEP). Searches Portuguese and English text. Returns matching provisions with regulator and document context.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query in Portuguese or English (e.g., 'proteção de dados', 'cybersecurity', 'lavagem de dinheiro')",
        },
        regulator: {
          type: "string",
          enum: ["anpd", "cgu", "coaf", "cade", "bacen", "cvm", "tcu", "susep"],
          description: "Filter by regulator. Optional.",
        },
        topic: {
          type: "string",
          description:
            "Filter by compliance topic (e.g., 'data_protection', 'aml', 'cybersecurity', 'anti_corruption', 'competition', 'securities'). Optional.",
        },
        status: {
          type: "string",
          enum: ["active", "revoked", "amended"],
          description: "Filter by document status. Defaults to all.",
        },
        limit: {
          type: "number",
          description: "Maximum results (default 20, max 100).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "br_comp_get_provision",
    description:
      "Get a specific provision by document ID and article number. Returns Portuguese and English text.",
    inputSchema: {
      type: "object" as const,
      properties: {
        document_id: {
          type: "string",
          description:
            "Document identifier (e.g., 'anpd-res-cd-2-2022', 'bacen-res-4893-2021')",
        },
        article: {
          type: "string",
          description: "Article reference (e.g., 'art1', 'art5-ii')",
        },
      },
      required: ["document_id", "article"],
    },
  },
  {
    name: "br_comp_list_regulators",
    description:
      "List all 8 covered Brazilian compliance regulators with domains and provision counts.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "br_comp_get_regulator_summary",
    description:
      "Get detailed summary of a specific regulator: mandate, domain, document count, provision count, enforcement actions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        regulator: {
          type: "string",
          enum: ["anpd", "cgu", "coaf", "cade", "bacen", "cvm", "tcu", "susep"],
          description: "Regulator identifier",
        },
      },
      required: ["regulator"],
    },
  },
  {
    name: "br_comp_search_enforcement",
    description:
      "Search enforcement actions — sanctions, fines, warnings, bans — across all Brazilian compliance regulators.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query (company name, violation type, e.g., 'insider trading', 'cartel')",
        },
        regulator: {
          type: "string",
          enum: ["anpd", "cgu", "coaf", "cade", "bacen", "cvm", "tcu", "susep"],
          description: "Filter by regulator. Optional.",
        },
        penalty_type: {
          type: "string",
          enum: ["fine", "warning", "suspension", "ban", "cease_and_desist"],
          description: "Filter by penalty type. Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum results (default 20, max 100).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "br_comp_list_topics",
    description:
      "List all compliance topics with provision counts. Topics include: data_protection, aml, cybersecurity, anti_corruption, competition, securities, insurance, public_procurement, corporate_governance, open_banking.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "br_comp_about",
    description:
      "Return metadata about this MCP server: version, coverage, regulators, tool list.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "br_comp_list_sources",
    description:
      "List all primary data sources: regulator websites, legislation portals, and open data endpoints.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ─── Zod schemas ────────────────────────────────────────────────────────────

const SearchRegulationsArgs = z.object({
  query: z.string().min(1),
  regulator: z
    .enum(["anpd", "cgu", "coaf", "cade", "bacen", "cvm", "tcu", "susep"])
    .optional(),
  topic: z.string().optional(),
  status: z.enum(["active", "revoked", "amended"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const GetProvisionArgs = z.object({
  document_id: z.string().min(1),
  article: z.string().min(1),
});

const GetRegulatorSummaryArgs = z.object({
  regulator: z.enum([
    "anpd",
    "cgu",
    "coaf",
    "cade",
    "bacen",
    "cvm",
    "tcu",
    "susep",
  ]),
});

const SearchEnforcementArgs = z.object({
  query: z.string().min(1),
  regulator: z
    .enum(["anpd", "cgu", "coaf", "cade", "bacen", "cvm", "tcu", "susep"])
    .optional(),
  penalty_type: z
    .enum(["fine", "warning", "suspension", "ban", "cease_and_desist"])
    .optional(),
  limit: z.number().int().positive().max(100).optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function textContent(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

// ─── Tool handler ───────────────────────────────────────────────────────────

export function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): { content: Array<{ type: "text"; text: string }>; isError?: true } {
  try {
    switch (name) {
      case "br_comp_search_regulations": {
        const parsed = SearchRegulationsArgs.parse(args);
        const results = searchProvisions({
          query: parsed.query,
          regulator: parsed.regulator,
          topic: parsed.topic,
          status: parsed.status,
          limit: parsed.limit,
        }).map((r) => ({
          ...r,
          _citation: buildCitation(
            `${r.document_id} Art. ${r.article}`,
            `${r.document_title} Art. ${r.article}`,
            "br_comp_get_provision",
            { document_id: r.document_id, article: r.article },
          ),
        }));
        return textContent({ results, count: results.length });
      }

      case "br_comp_get_provision": {
        const parsed = GetProvisionArgs.parse(args);
        const provision = getProvision(parsed.document_id, parsed.article);
        if (!provision) {
          return errorContent(
            `Provision not found: ${parsed.document_id} ${parsed.article}`,
          );
        }
        return textContent({
          ...provision,
          _citation: buildCitation(
            `${parsed.document_id} Art. ${parsed.article}`,
            `${provision.document_title} Art. ${parsed.article}`,
            "br_comp_get_provision",
            { document_id: parsed.document_id, article: parsed.article },
          ),
        });
      }

      case "br_comp_list_regulators": {
        const regulators = listRegulators();
        const stats = getStats();
        return textContent({
          regulators,
          count: regulators.length,
          total_provisions: stats.provisions,
          total_documents: stats.documents,
          total_enforcement_actions: stats.enforcement_actions,
        });
      }

      case "br_comp_get_regulator_summary": {
        const parsed = GetRegulatorSummaryArgs.parse(args);
        const summary = getRegulatorSummary(parsed.regulator);
        if (!summary) {
          return errorContent(`Regulator not found: ${parsed.regulator}`);
        }
        return textContent(summary);
      }

      case "br_comp_search_enforcement": {
        const parsed = SearchEnforcementArgs.parse(args);
        const results = searchEnforcement({
          query: parsed.query,
          regulator: parsed.regulator,
          penalty_type: parsed.penalty_type,
          limit: parsed.limit,
        }).map((e) => ({
          ...e,
          _citation: buildCitation(
            `${e.regulator_id} ${e.case_number || "enforcement"}`,
            `${e.respondent || "Enforcement action"} (${e.regulator_id})`,
            "br_comp_search_enforcement",
            { query: e.respondent || parsed.query },
          ),
        }));
        return textContent({ results, count: results.length });
      }

      case "br_comp_list_topics": {
        const topics = listTopics();
        return textContent({ topics, count: topics.length });
      }

      case "br_comp_about": {
        const stats = getStats();
        return textContent({
          name: "brazilian-compliance-regulators-mcp",
          version: "0.1.0",
          description:
            "Brazilian compliance regulators MCP. Covers 8 key regulators: ANPD (data protection/LGPD enforcement), CGU (anti-corruption), COAF (AML/CFT), CADE (competition/antitrust), BACEN (financial regulation/cybersecurity), CVM (securities), TCU (public audit/procurement), SUSEP (insurance). Provides normative acts at provision level with enforcement actions.",
          jurisdiction: "BR",
          regulators: [
            "ANPD — Autoridade Nacional de Proteção de Dados (data protection)",
            "CGU — Controladoria-Geral da União (anti-corruption)",
            "COAF — Conselho de Controle de Atividades Financeiras (AML/CFT)",
            "CADE — Conselho Administrativo de Defesa Econômica (competition)",
            "BACEN — Banco Central do Brasil (financial regulation)",
            "CVM — Comissão de Valores Mobiliários (securities)",
            "TCU — Tribunal de Contas da União (public audit)",
            "SUSEP — Superintendência de Seguros Privados (insurance)",
          ],
          stats,
          tools: TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
          })),
        });
      }

      case "br_comp_list_sources": {
        return textContent({
          sources: [
            {
              name: "ANPD — Autoridade Nacional de Proteção de Dados",
              url: "https://www.gov.br/anpd/pt-br",
              organisation: "ANPD",
              description:
                "LGPD enforcement: resoluções, technical notes, DPIA guidance, enforcement sanctions, security incident requirements",
            },
            {
              name: "CGU — Controladoria-Geral da União",
              url: "https://www.gov.br/cgu",
              organisation: "CGU",
              description:
                "Anti-corruption: corporate integrity programs (Pro-Ética), Lei Anticorrupção (12.846/2013) guidance, Clean Company assessment",
            },
            {
              name: "COAF — Conselho de Controle de Atividades Financeiras",
              url: "https://www.gov.br/coaf",
              organisation: "COAF",
              description:
                "AML/CFT: normative resolutions, suspicious activity typologies, PEP identification, UBO requirements",
            },
            {
              name: "CADE — Conselho Administrativo de Defesa Econômica",
              url: "https://www.cade.gov.br",
              organisation: "CADE",
              description:
                "Competition: merger review guidelines, compliance programs, cartel enforcement, concentration act open data (CC BY-ND 3.0)",
            },
            {
              name: "BACEN — Banco Central do Brasil",
              url: "https://normativos.bcb.gov.br",
              organisation: "BACEN",
              description:
                "Financial regulation: Res. 4.893 (cybersecurity), open banking/PIX, AML circulars, cloud computing requirements",
            },
            {
              name: "CVM — Comissão de Valores Mobiliários",
              url: "https://conteudo.cvm.gov.br/legislacao/resolucoes/",
              organisation: "CVM",
              description:
                "Securities: resoluções (post-2021 consolidation), ofícios-circulares, enforcement decisions (Processos Administrativos Sancionadores)",
            },
            {
              name: "TCU — Tribunal de Contas da União",
              url: "https://pesquisa.apps.tcu.gov.br",
              organisation: "TCU",
              description:
                "Public audit: acórdãos (binding decisions), 297 súmulas (binding precedents), procurement audit standards, IT governance criteria",
            },
            {
              name: "SUSEP — Superintendência de Seguros Privados",
              url: "https://www.susep.gov.br",
              organisation: "SUSEP",
              description:
                "Insurance: SUSEP circulars, CNSP resolutions, cybersecurity requirements for insurers, open insurance framework",
            },
          ],
          count: 8,
          legal_basis:
            "All regulatory acts are public domain under Lei 9.610/1998, Art. 8 IV (legislative texts, court decisions, and regulatory acts excluded from copyright protection).",
        });
      }

      default:
        return errorContent(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorContent(`Error executing ${name}: ${message}`);
  }
}
