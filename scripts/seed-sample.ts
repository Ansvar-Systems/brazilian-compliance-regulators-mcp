/**
 * Seed the Brazilian Compliance Regulators database with regulator metadata
 * and sample provisions from each regulator's key normative acts.
 *
 * Run: npx tsx scripts/seed-sample.ts
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

const DB_PATH = process.env["BR_COMPLIANCE_DB_PATH"] ?? "data/database.db";

const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);

// ─── Regulators ─────────────────────────────────────────────────────────────

const insertRegulator = db.prepare(`
  INSERT OR REPLACE INTO regulators (id, name, name_pt, full_name, full_name_pt, domain, website, mandate, mandate_pt, parent_ministry)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const regulators = [
  {
    id: "anpd",
    name: "ANPD",
    name_pt: "ANPD",
    full_name: "National Data Protection Authority",
    full_name_pt: "Autoridade Nacional de Proteção de Dados",
    domain: "data_protection",
    website: "https://www.gov.br/anpd/pt-br",
    mandate:
      "Enforcement and regulation of the General Data Protection Law (LGPD — Lei 13.709/2018). Issues binding resolutions, technical guidance, and sanctions for data protection violations.",
    mandate_pt:
      "Fiscalização e regulamentação da Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). Emite resoluções vinculantes, orientações técnicas e sanções por violações à proteção de dados.",
    parent_ministry: "Presidency of the Republic",
  },
  {
    id: "cgu",
    name: "CGU",
    name_pt: "CGU",
    full_name: "Office of the Comptroller General",
    full_name_pt: "Controladoria-Geral da União",
    domain: "anti_corruption",
    website: "https://www.gov.br/cgu",
    mandate:
      "Anti-corruption enforcement, corporate integrity program assessment, internal audit of federal agencies. Administers the Pro-Ética (Pro-Ethics) seal and Lei Anticorrupção (12.846/2013) enforcement.",
    mandate_pt:
      "Combate à corrupção, avaliação de programas de integridade corporativa, auditoria interna de órgãos federais. Administra o selo Pro-Ética e a aplicação da Lei Anticorrupção (12.846/2013).",
    parent_ministry: "Presidency of the Republic",
  },
  {
    id: "coaf",
    name: "COAF",
    name_pt: "COAF",
    full_name: "Financial Activities Control Council",
    full_name_pt: "Conselho de Controle de Atividades Financeiras",
    domain: "aml",
    website: "https://www.gov.br/coaf",
    mandate:
      "Brazil's Financial Intelligence Unit (FIU). Receives, examines, and identifies suspicious financial activities related to money laundering and terrorism financing. Issues normative resolutions for reporting entities.",
    mandate_pt:
      "Unidade de Inteligência Financeira (UIF) do Brasil. Recebe, examina e identifica atividades financeiras suspeitas relacionadas à lavagem de dinheiro e financiamento do terrorismo. Emite resoluções normativas para entidades obrigadas.",
    parent_ministry: "Ministry of Finance",
  },
  {
    id: "cade",
    name: "CADE",
    name_pt: "CADE",
    full_name: "Administrative Council for Economic Defense",
    full_name_pt: "Conselho Administrativo de Defesa Econômica",
    domain: "competition",
    website: "https://www.cade.gov.br",
    mandate:
      "Competition law enforcement: merger review, cartel investigation, abuse of dominance. Issues compliance program guidelines and open data on concentration acts.",
    mandate_pt:
      "Defesa da concorrência: análise de atos de concentração, investigação de cartéis, abuso de posição dominante. Emite diretrizes para programas de compliance e dados abertos sobre atos de concentração.",
    parent_ministry: "Ministry of Justice",
  },
  {
    id: "bacen",
    name: "BACEN",
    name_pt: "BACEN",
    full_name: "Central Bank of Brazil",
    full_name_pt: "Banco Central do Brasil",
    domain: "financial_regulation",
    website: "https://normativos.bcb.gov.br",
    mandate:
      "Financial system regulation: cybersecurity policy for financial institutions (Res. 4.893), open banking/PIX, AML/CFT obligations (Circular 3.978), cloud computing requirements, operational resilience.",
    mandate_pt:
      "Regulação do sistema financeiro: política de segurança cibernética para instituições financeiras (Res. 4.893), open banking/PIX, obrigações de PLD/FTP (Circular 3.978), requisitos de computação em nuvem, resiliência operacional.",
    parent_ministry: "Ministry of Finance",
  },
  {
    id: "cvm",
    name: "CVM",
    name_pt: "CVM",
    full_name: "Securities and Exchange Commission of Brazil",
    full_name_pt: "Comissão de Valores Mobiliários",
    domain: "securities",
    website: "https://conteudo.cvm.gov.br/legislacao/resolucoes/",
    mandate:
      "Securities market regulation: issuer disclosure, fund management, market abuse enforcement, crowdfunding. Post-2021 consolidation replaced old Instructions with numbered Resolutions.",
    mandate_pt:
      "Regulação do mercado de valores mobiliários: divulgação de emissores, gestão de fundos, combate a abusos de mercado, crowdfunding. Consolidação pós-2021 substituiu Instruções antigas por Resoluções numeradas.",
    parent_ministry: "Ministry of Finance",
  },
  {
    id: "tcu",
    name: "TCU",
    name_pt: "TCU",
    full_name: "Federal Court of Accounts",
    full_name_pt: "Tribunal de Contas da União",
    domain: "public_procurement",
    website: "https://pesquisa.apps.tcu.gov.br",
    mandate:
      "External audit of the federal government: public procurement compliance, IT governance standards, binding decisions (acórdãos) and precedents (297 active súmulas). Binding on all federal agencies.",
    mandate_pt:
      "Controle externo do governo federal: conformidade em licitações públicas, padrões de governança de TI, decisões vinculantes (acórdãos) e jurisprudência (297 súmulas ativas). Vinculante para todos os órgãos federais.",
    parent_ministry: "Legislative Branch (Congress)",
  },
  {
    id: "susep",
    name: "SUSEP",
    name_pt: "SUSEP",
    full_name: "Superintendent of Private Insurance",
    full_name_pt: "Superintendência de Seguros Privados",
    domain: "insurance",
    website: "https://www.susep.gov.br",
    mandate:
      "Insurance market regulation: insurer solvency, cybersecurity requirements, open insurance framework, consumer protection. Issues SUSEP Circulars and enforces CNSP Resolutions.",
    mandate_pt:
      "Regulação do mercado de seguros: solvência de seguradoras, requisitos de segurança cibernética, open insurance, proteção do consumidor. Emite Circulares SUSEP e aplica Resoluções do CNSP.",
    parent_ministry: "Ministry of Finance",
  },
];

const insertRegulatorTx = db.transaction(() => {
  for (const r of regulators) {
    insertRegulator.run(
      r.id,
      r.name,
      r.name_pt,
      r.full_name,
      r.full_name_pt,
      r.domain,
      r.website,
      r.mandate,
      r.mandate_pt,
      r.parent_ministry,
    );
  }
});

insertRegulatorTx();
console.log(`Seeded ${regulators.length} regulators`);

// ─── Documents and provisions ───────────────────────────────────────────────

const insertDocument = db.prepare(`
  INSERT OR REPLACE INTO documents (id, regulator_id, document_type, number, year, title, title_pt, date_published, date_effective, status, topics, source_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const deleteProvisions = db.prepare(`
  DELETE FROM provisions WHERE document_id = ?
`);

const insertProvision = db.prepare(`
  INSERT INTO provisions (document_id, article, paragraph, text_pt, text_en, topics)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertEnforcement = db.prepare(`
  INSERT INTO enforcement_actions (regulator_id, case_number, date_decided, respondent, summary_pt, summary_en, penalty_type, penalty_amount, currency, legal_basis, source_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

interface DocDef {
  id: string;
  regulator_id: string;
  document_type: string;
  number: string;
  year: number;
  title: string;
  title_pt: string;
  date_published: string;
  date_effective: string;
  status: string;
  topics: string;
  source_url: string;
  provisions: Array<{
    article: string;
    paragraph: string | null;
    text_pt: string;
    text_en: string;
    topics: string;
  }>;
}

interface EnfDef {
  regulator_id: string;
  case_number: string;
  date_decided: string;
  respondent: string;
  summary_pt: string;
  summary_en: string;
  penalty_type: string;
  penalty_amount: number;
  legal_basis: string;
  source_url: string;
}

// ── ANPD ──

const anpdDocs: DocDef[] = [
  {
    id: "anpd-res-cd-2-2022",
    regulator_id: "anpd",
    document_type: "resolução",
    number: "CD/ANPD nº 2",
    year: 2022,
    title: "LGPD Regulation for Small Processing Agents",
    title_pt: "Regulamento de aplicação da LGPD para agentes de tratamento de pequeno porte",
    date_published: "2022-01-27",
    date_effective: "2022-01-28",
    status: "active",
    topics: '["data_protection","small_business","lgpd"]',
    source_url: "https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Este Regulamento dispõe sobre a aplicação da Lei nº 13.709, de 14 de agosto de 2018 – Lei Geral de Proteção de Dados Pessoais – LGPD para agentes de tratamento de pequeno porte.",
        text_en: "This Regulation provides for the application of Law No. 13,709, of August 14, 2018 — General Data Protection Law (LGPD) — to small-scale processing agents.",
        topics: '["data_protection","small_business","lgpd"]',
      },
      {
        article: "art2",
        paragraph: null,
        text_pt: "Para os fins deste regulamento, consideram-se agentes de tratamento de pequeno porte: I – microempresas e empresas de pequeno porte; II – startups; III – pessoas jurídicas de direito privado, inclusive sem fins lucrativos; IV – pessoas naturais e entes privados despersonalizados que realizam tratamento de dados pessoais.",
        text_en: "For the purposes of this regulation, small-scale processing agents include: I — micro-enterprises and small businesses; II — startups; III — private legal entities, including non-profit organisations; IV — natural persons and unincorporated private entities that process personal data.",
        topics: '["data_protection","small_business","lgpd","definitions"]',
      },
      {
        article: "art12",
        paragraph: null,
        text_pt: "Os agentes de tratamento de pequeno porte não são obrigados a indicar o encarregado pelo tratamento de dados pessoais exigido no art. 41 da LGPD, desde que disponibilizem um canal de comunicação com o titular de dados para atender ao disposto no art. 41, § 2º, I, da LGPD.",
        text_en: "Small-scale processing agents are not required to appoint a data protection officer as required by Art. 41 of the LGPD, provided they make available a communication channel with data subjects to meet the requirements of Art. 41, § 2, I of the LGPD.",
        topics: '["data_protection","dpo","lgpd","small_business"]',
      },
    ],
  },
  {
    id: "anpd-res-cd-4-2023",
    regulator_id: "anpd",
    document_type: "resolução",
    number: "CD/ANPD nº 4",
    year: 2023,
    title: "Regulation on Data Protection Impact Assessment (DPIA)",
    title_pt: "Regulamento do Relatório de Impacto à Proteção de Dados Pessoais (RIPD)",
    date_published: "2023-12-19",
    date_effective: "2024-01-01",
    status: "active",
    topics: '["data_protection","dpia","lgpd","risk_assessment"]',
    source_url: "https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Este Regulamento disciplina o Relatório de Impacto à Proteção de Dados Pessoais – RIPD, previsto no art. 5º, XVII, e nos arts. 10, § 3º, e 38 da Lei nº 13.709, de 14 de agosto de 2018 – Lei Geral de Proteção de Dados Pessoais – LGPD.",
        text_en: "This Regulation governs the Data Protection Impact Assessment (DPIA), provided for in Art. 5, XVII, and Arts. 10, § 3, and 38 of Law No. 13,709, of August 14, 2018 — General Data Protection Law (LGPD).",
        topics: '["data_protection","dpia","lgpd"]',
      },
      {
        article: "art4",
        paragraph: null,
        text_pt: "O RIPD deverá conter, no mínimo: I – a descrição dos tipos de dados pessoais tratados; II – a metodologia utilizada para a coleta e para a garantia da segurança dos dados; III – a análise do controlador com relação a medidas, salvaguardas e mecanismos de mitigação de riscos adotados.",
        text_en: "The DPIA shall contain, at a minimum: I — a description of the types of personal data processed; II — the methodology used for data collection and security assurance; III — the controller's analysis of risk mitigation measures, safeguards, and mechanisms adopted.",
        topics: '["data_protection","dpia","lgpd","risk_assessment"]',
      },
    ],
  },
  {
    id: "anpd-res-cd-15-2024",
    regulator_id: "anpd",
    document_type: "resolução",
    number: "CD/ANPD nº 15",
    year: 2024,
    title: "Regulation on Sanctions Dosimetry",
    title_pt: "Regulamento de Dosimetria e Aplicação de Sanções Administrativas",
    date_published: "2023-02-27",
    date_effective: "2023-02-28",
    status: "active",
    topics: '["data_protection","sanctions","enforcement","lgpd"]',
    source_url: "https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Este Regulamento estabelece os parâmetros e critérios para aplicação de sanções administrativas pela Autoridade Nacional de Proteção de Dados – ANPD, bem como as formas e dosimetrias para o cálculo do valor-base das sanções de multa.",
        text_en: "This Regulation establishes the parameters and criteria for the application of administrative sanctions by the National Data Protection Authority (ANPD), as well as the methodology and dosimetry for calculating the base value of monetary fines.",
        topics: '["data_protection","sanctions","enforcement","lgpd"]',
      },
      {
        article: "art8",
        paragraph: null,
        text_pt: "As sanções de multa simples serão calculadas com base no faturamento da pessoa jurídica de direito privado, grupo ou conglomerado no Brasil no seu último exercício, excluídos os tributos, limitada, no total, a R$ 50.000.000,00 (cinquenta milhões de reais) por infração.",
        text_en: "Simple fines shall be calculated based on the revenue of the private legal entity, group, or conglomerate in Brazil in its last fiscal year, excluding taxes, limited to a total of R$ 50,000,000.00 (fifty million reais) per violation.",
        topics: '["data_protection","sanctions","enforcement","lgpd","fines"]',
      },
    ],
  },
  {
    id: "anpd-res-cd-6-2023",
    regulator_id: "anpd",
    document_type: "resolução",
    number: "CD/ANPD nº 6",
    year: 2023,
    title: "Regulation on Security Incident Reporting",
    title_pt: "Regulamento de Comunicação de Incidente de Segurança",
    date_published: "2024-04-26",
    date_effective: "2024-04-26",
    status: "active",
    topics: '["data_protection","incident_reporting","cybersecurity","lgpd"]',
    source_url: "https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Este Regulamento disciplina o processo de comunicação de incidentes de segurança que possam acarretar risco ou dano relevante aos titulares de dados pessoais, nos termos do art. 48 da Lei nº 13.709, de 14 de agosto de 2018.",
        text_en: "This Regulation governs the process of reporting security incidents that may pose a relevant risk or harm to data subjects, pursuant to Art. 48 of Law No. 13,709, of August 14, 2018.",
        topics: '["data_protection","incident_reporting","cybersecurity","lgpd"]',
      },
      {
        article: "art3",
        paragraph: null,
        text_pt: "O controlador deverá comunicar à ANPD e ao titular a ocorrência de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, no prazo de 3 (três) dias úteis, contados do conhecimento pelo controlador de que o incidente afetou dados pessoais.",
        text_en: "The controller shall notify the ANPD and the data subject of the occurrence of a security incident that may pose relevant risk or harm to data subjects, within 3 (three) business days from the controller's knowledge that the incident affected personal data.",
        topics: '["data_protection","incident_reporting","cybersecurity","lgpd","notification_deadline"]',
      },
    ],
  },
];

// ── CGU ──

const cguDocs: DocDef[] = [
  {
    id: "cgu-decreto-11129-2022",
    regulator_id: "cgu",
    document_type: "decreto",
    number: "11.129",
    year: 2022,
    title: "Lei Anticorrupção Regulation (Corporate Liability)",
    title_pt: "Regulamentação da Lei Anticorrupção (Responsabilidade de Pessoas Jurídicas)",
    date_published: "2022-07-11",
    date_effective: "2022-07-18",
    status: "active",
    topics: '["anti_corruption","corporate_liability","integrity_program"]',
    source_url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11129.htm",
    provisions: [
      {
        article: "art56",
        paragraph: null,
        text_pt: "Para fins do disposto neste Decreto, programa de integridade consiste no conjunto de mecanismos e procedimentos internos de integridade, auditoria e incentivo à denúncia de irregularidades e na aplicação efetiva de códigos de ética e de conduta, políticas e diretrizes, com objetivo de: I – prevenir, detectar e sanar desvios, fraudes, irregularidades e atos ilícitos praticados contra a administração pública, nacional ou estrangeira.",
        text_en: "For the purposes of this Decree, an integrity program consists of the set of internal integrity mechanisms and procedures, audit, and incentives for reporting irregularities, and the effective application of codes of ethics and conduct, policies, and guidelines, with the objective of: I — preventing, detecting, and remedying deviations, fraud, irregularities, and unlawful acts committed against public administration, whether domestic or foreign.",
        topics: '["anti_corruption","integrity_program","compliance_program"]',
      },
      {
        article: "art57",
        paragraph: null,
        text_pt: "O programa de integridade será avaliado, quanto à sua existência e aplicação, de acordo com os seguintes parâmetros: I – comprometimento da alta direção da pessoa jurídica, incluídos os conselhos, evidenciado pelo apoio visível e inequívoco ao programa; II – padrões de conduta, código de ética, políticas e procedimentos de integridade, aplicáveis a todos os empregados e administradores.",
        text_en: "The integrity program shall be assessed, regarding its existence and application, according to the following parameters: I — commitment of the legal entity's senior management, including boards, evidenced by visible and unequivocal support for the program; II — standards of conduct, code of ethics, integrity policies and procedures, applicable to all employees and administrators.",
        topics: '["anti_corruption","integrity_program","corporate_governance","compliance_assessment"]',
      },
    ],
  },
  {
    id: "cgu-portaria-909-2015",
    regulator_id: "cgu",
    document_type: "portaria",
    number: "909",
    year: 2015,
    title: "Pro-Ética Program Regulation",
    title_pt: "Regulamentação do Programa Empresa Pró-Ética",
    date_published: "2015-04-07",
    date_effective: "2015-04-08",
    status: "active",
    topics: '["anti_corruption","integrity_program","pro_etica"]',
    source_url: "https://www.gov.br/cgu/pt-br/assuntos/etica-e-integridade/empresa-pro-etica",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "O Programa Empresa Pró-Ética tem como objetivo fomentar a adoção voluntária de medidas de integridade pelas empresas, por meio do reconhecimento público daquelas que, independentemente do porte e do ramo de atuação, mostram-se comprometidas em implementar medidas voltadas para a prevenção, detecção e remediação de atos de corrupção e fraude.",
        text_en: "The Pro-Ethics Program aims to promote the voluntary adoption of integrity measures by companies, through the public recognition of those that, regardless of size and sector, demonstrate commitment to implementing measures for the prevention, detection, and remediation of corruption and fraud.",
        topics: '["anti_corruption","integrity_program","pro_etica","voluntary_compliance"]',
      },
    ],
  },
];

// ── COAF ──

const coafDocs: DocDef[] = [
  {
    id: "coaf-res-36-2021",
    regulator_id: "coaf",
    document_type: "resolução",
    number: "36",
    year: 2021,
    title: "PEP Identification and Enhanced Due Diligence",
    title_pt: "Identificação de Pessoas Expostas Politicamente e Diligência Reforçada",
    date_published: "2021-04-05",
    date_effective: "2021-07-01",
    status: "active",
    topics: '["aml","pep","due_diligence","kyc"]',
    source_url: "https://www.gov.br/coaf/pt-br/assuntos/normas/resolucoes",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Esta Resolução define as pessoas expostas politicamente e regulamenta os procedimentos de diligência reforçada a serem adotados pelas pessoas obrigadas em relação a essas pessoas.",
        text_en: "This Resolution defines politically exposed persons (PEPs) and regulates the enhanced due diligence procedures to be adopted by reporting entities in relation to such persons.",
        topics: '["aml","pep","due_diligence","kyc"]',
      },
    ],
  },
  {
    id: "coaf-res-40-2021",
    regulator_id: "coaf",
    document_type: "resolução",
    number: "40",
    year: 2021,
    title: "Ultimate Beneficial Owner (UBO) Identification",
    title_pt: "Identificação do Beneficiário Final",
    date_published: "2021-12-01",
    date_effective: "2022-01-01",
    status: "active",
    topics: '["aml","ubo","beneficial_ownership","kyc"]',
    source_url: "https://www.gov.br/coaf/pt-br/assuntos/normas/resolucoes",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Esta Resolução regulamenta os procedimentos para identificação e qualificação do beneficiário final de clientes pessoas jurídicas e arranjos legais, nos termos da legislação de prevenção à lavagem de dinheiro e ao financiamento do terrorismo.",
        text_en: "This Resolution regulates the procedures for identification and qualification of the ultimate beneficial owner (UBO) of corporate clients and legal arrangements, pursuant to anti-money laundering and counter-terrorism financing legislation.",
        topics: '["aml","ubo","beneficial_ownership","kyc"]',
      },
    ],
  },
];

// ── CADE ──

const cadeDocs: DocDef[] = [
  {
    id: "cade-guia-compliance-2016",
    regulator_id: "cade",
    document_type: "guia",
    number: "1",
    year: 2016,
    title: "Guidelines for Competition Compliance Programs",
    title_pt: "Guia para Programas de Compliance Concorrencial",
    date_published: "2016-01-15",
    date_effective: "2016-01-15",
    status: "active",
    topics: '["competition","compliance_program","antitrust"]',
    source_url: "https://cdn.cade.gov.br/Portal/centrais-de-conteudo/publicacoes/guias-do-cade/guia-compliance-versao-oficial.pdf",
    provisions: [
      {
        article: "sec1",
        paragraph: null,
        text_pt: "O programa de compliance concorrencial é o conjunto de medidas internas adotado por um agente econômico que visa prevenir, identificar e remediar condutas anticompetitivas, devendo ser adotado de maneira firme e duradoura pela empresa.",
        text_en: "A competition compliance program is the set of internal measures adopted by an economic agent aimed at preventing, identifying, and remedying anti-competitive conduct, which must be firmly and permanently adopted by the company.",
        topics: '["competition","compliance_program","antitrust"]',
      },
    ],
  },
  {
    id: "cade-res-33-2022",
    regulator_id: "cade",
    document_type: "resolução",
    number: "33",
    year: 2022,
    title: "Internal Regulations of CADE (Procedural Rules)",
    title_pt: "Regimento Interno do CADE (Regras Processuais)",
    date_published: "2022-06-28",
    date_effective: "2022-07-01",
    status: "active",
    topics: '["competition","procedural","merger_review","cartel"]',
    source_url: "https://www.cade.gov.br/acesso-a-informacao/normativos",
    provisions: [
      {
        article: "art108",
        paragraph: null,
        text_pt: "Os atos de concentração econômica que preencham os requisitos previstos no art. 88 da Lei nº 12.529/2011 devem ser submetidos à aprovação do CADE previamente à sua consumação.",
        text_en: "Economic concentration acts that meet the requirements set forth in Art. 88 of Law No. 12,529/2011 must be submitted for CADE approval prior to their consummation.",
        topics: '["competition","merger_review","notification_threshold"]',
      },
    ],
  },
];

// ── BACEN ──

const bacenDocs: DocDef[] = [
  {
    id: "bacen-res-4893-2021",
    regulator_id: "bacen",
    document_type: "resolução",
    number: "4.893",
    year: 2021,
    title: "Cybersecurity Policy for Financial Institutions",
    title_pt: "Política de Segurança Cibernética para Instituições Financeiras",
    date_published: "2021-02-26",
    date_effective: "2021-07-01",
    status: "active",
    topics: '["cybersecurity","financial_regulation","incident_reporting"]',
    source_url: "https://normativos.bcb.gov.br/rspSystem/TimeLineServlet?Ession.query.criterionForm.field.ato_normativo=Resolu%C3%A7%C3%A3o%20BCB%20n%C2%BA%204.893",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Esta Resolução dispõe sobre a política de segurança cibernética e sobre os requisitos para a contratação de serviços de processamento e armazenamento de dados e de computação em nuvem a serem observados pelas instituições autorizadas a funcionar pelo Banco Central do Brasil.",
        text_en: "This Resolution provides for the cybersecurity policy and the requirements for contracting data processing, storage, and cloud computing services to be observed by institutions authorised to operate by the Central Bank of Brazil.",
        topics: '["cybersecurity","financial_regulation","cloud_computing"]',
      },
      {
        article: "art3",
        paragraph: null,
        text_pt: "A política de segurança cibernética deve contemplar, no mínimo: I – os objetivos de segurança cibernética da instituição; II – os procedimentos e os controles adotados para reduzir a vulnerabilidade da instituição a incidentes; III – os controles específicos que assegurem a proteção das informações.",
        text_en: "The cybersecurity policy shall include, at a minimum: I — the institution's cybersecurity objectives; II — the procedures and controls adopted to reduce the institution's vulnerability to incidents; III — specific controls that ensure information protection.",
        topics: '["cybersecurity","financial_regulation","security_policy"]',
      },
      {
        article: "art6",
        paragraph: null,
        text_pt: "As instituições referidas no art. 1º devem designar diretor responsável pela política de segurança cibernética e pela execução do plano de ação e de resposta a incidentes.",
        text_en: "The institutions referred to in Art. 1 shall designate a director responsible for the cybersecurity policy and for the execution of the action plan and incident response.",
        topics: '["cybersecurity","financial_regulation","governance","ciso"]',
      },
      {
        article: "art26",
        paragraph: null,
        text_pt: "As instituições referidas no art. 1º devem comunicar ao Banco Central do Brasil a ocorrência de incidentes relevantes e das interrupções dos serviços relevantes no prazo máximo de 24 horas do conhecimento do incidente.",
        text_en: "The institutions referred to in Art. 1 shall notify the Central Bank of Brazil of the occurrence of relevant incidents and relevant service interruptions within a maximum of 24 hours from knowledge of the incident.",
        topics: '["cybersecurity","financial_regulation","incident_reporting","notification_deadline"]',
      },
    ],
  },
  {
    id: "bacen-circular-3978-2020",
    regulator_id: "bacen",
    document_type: "circular",
    number: "3.978",
    year: 2020,
    title: "AML/CFT Procedures for Financial Institutions",
    title_pt: "Procedimentos de PLD/FTP para Instituições Financeiras",
    date_published: "2020-01-23",
    date_effective: "2020-10-01",
    status: "active",
    topics: '["aml","financial_regulation","kyc","suspicious_activity"]',
    source_url: "https://normativos.bcb.gov.br",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Esta Circular dispõe sobre a política, os procedimentos e os controles internos a serem adotados pelas instituições autorizadas a funcionar pelo Banco Central do Brasil visando à prevenção da utilização do sistema financeiro para a prática dos crimes de 'lavagem' ou ocultação de bens, direitos e valores.",
        text_en: "This Circular provides for the policy, procedures, and internal controls to be adopted by institutions authorised to operate by the Central Bank of Brazil aimed at preventing the use of the financial system for the commission of crimes of money laundering or concealment of assets, rights, and values.",
        topics: '["aml","financial_regulation","kyc","compliance_program"]',
      },
      {
        article: "art2",
        paragraph: null,
        text_pt: "Para os fins desta Circular, a regulação prudencial e a regulação financeira emitidas pelo Banco Central do Brasil estabelecem os parâmetros mínimos para a implementação de políticas de prevenção à lavagem de dinheiro e ao financiamento do terrorismo pelas instituições do sistema financeiro nacional.",
        text_en: "For the purposes of this Circular, prudential regulation and financial regulation issued by the Central Bank of Brazil establish the minimum parameters for the implementation of anti-money laundering and counter-terrorism financing policies by institutions of the national financial system.",
        topics: '["aml","financial_regulation","prudential_regulation","compliance_program"]',
      },
    ],
  },
];

// ── CVM ──

const cvmDocs: DocDef[] = [
  {
    id: "cvm-res-175-2022",
    regulator_id: "cvm",
    document_type: "resolução",
    number: "175",
    year: 2022,
    title: "Investment Fund Regulation Framework",
    title_pt: "Marco Regulatório de Fundos de Investimento",
    date_published: "2022-12-23",
    date_effective: "2023-10-02",
    status: "active",
    topics: '["securities","investment_funds","corporate_governance"]',
    source_url: "https://conteudo.cvm.gov.br/legislacao/resolucoes/resol175.html",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Esta Resolução dispõe sobre a constituição, o funcionamento, a administração, a gestão, a prestação de informações, a distribuição de cotas, a classificação, a tributação e os demais aspectos regulatórios dos fundos de investimento.",
        text_en: "This Resolution provides for the establishment, operation, administration, management, disclosure, share distribution, classification, taxation, and other regulatory aspects of investment funds.",
        topics: '["securities","investment_funds","regulation"]',
      },
    ],
  },
  {
    id: "cvm-res-44-2021",
    regulator_id: "cvm",
    document_type: "resolução",
    number: "44",
    year: 2021,
    title: "Insider Trading and Market Manipulation",
    title_pt: "Uso de Informação Privilegiada e Manipulação de Mercado",
    date_published: "2021-08-30",
    date_effective: "2022-01-01",
    status: "active",
    topics: '["securities","insider_trading","market_abuse","enforcement"]',
    source_url: "https://conteudo.cvm.gov.br/legislacao/resolucoes/",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Esta Resolução define as normas sobre vedações e condições para a negociação de valores mobiliários antes da divulgação de ato ou fato relevante.",
        text_en: "This Resolution defines the rules on prohibitions and conditions for trading securities before the disclosure of material events or facts.",
        topics: '["securities","insider_trading","market_abuse","disclosure"]',
      },
    ],
  },
];

// ── TCU ──

const tcuDocs: DocDef[] = [
  {
    id: "tcu-sumula-222",
    regulator_id: "tcu",
    document_type: "súmula",
    number: "222",
    year: 1994,
    title: "Binding Precedent — Procurement Bid Requirements",
    title_pt: "Súmula Vinculante — Requisitos de Habilitação em Licitações",
    date_published: "1994-01-01",
    date_effective: "1994-01-01",
    status: "active",
    topics: '["public_procurement","procurement_compliance"]',
    source_url: "https://pesquisa.apps.tcu.gov.br/#/sumula/222",
    provisions: [
      {
        article: "sumula-222",
        paragraph: null,
        text_pt: "As decisões do Tribunal de Contas da União, relativas à aplicação de normas gerais de licitação, sobre as quais haja jurisprudência firmada, vinculam a Administração Pública Federal.",
        text_en: "The decisions of the Federal Court of Accounts, regarding the application of general procurement rules, on which there is established case law, are binding on the Federal Public Administration.",
        topics: '["public_procurement","binding_precedent"]',
      },
    ],
  },
  {
    id: "tcu-acordao-1603-2008",
    regulator_id: "tcu",
    document_type: "acórdão",
    number: "1603",
    year: 2008,
    title: "IT Governance Framework for Federal Agencies",
    title_pt: "Referencial de Governança de TI para Órgãos Federais",
    date_published: "2008-08-13",
    date_effective: "2008-08-13",
    status: "active",
    topics: '["it_governance","public_procurement","cybersecurity"]',
    source_url: "https://pesquisa.apps.tcu.gov.br",
    provisions: [
      {
        article: "rec-9.1",
        paragraph: null,
        text_pt: "Recomendar ao Gabinete de Segurança Institucional da Presidência da República que oriente os órgãos e entidades da Administração Pública Federal sobre a importância do gerenciamento da segurança da informação, promovendo ações que visem estabelecer e/ou aperfeiçoar a gestão da continuidade do negócio e a gestão de mudanças.",
        text_en: "Recommend to the Institutional Security Office of the Presidency to guide federal agencies on the importance of information security management, promoting actions to establish and/or improve business continuity management and change management.",
        topics: '["it_governance","cybersecurity","business_continuity","information_security"]',
      },
    ],
  },
];

// ── SUSEP ──

const susepDocs: DocDef[] = [
  {
    id: "susep-circular-638-2021",
    regulator_id: "susep",
    document_type: "circular",
    number: "638",
    year: 2021,
    title: "Cybersecurity Requirements for Insurance Companies",
    title_pt: "Requisitos de Segurança Cibernética para Seguradoras",
    date_published: "2021-07-27",
    date_effective: "2021-09-01",
    status: "active",
    topics: '["insurance","cybersecurity","incident_reporting"]',
    source_url: "https://www.susep.gov.br/legislacao-e-normas",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Esta Circular dispõe sobre requisitos de segurança cibernética a serem observados pelas sociedades seguradoras, entidades abertas de previdência complementar, sociedades de capitalização e resseguradores locais.",
        text_en: "This Circular provides for cybersecurity requirements to be observed by insurance companies, open supplementary pension entities, capitalisation companies, and local reinsurers.",
        topics: '["insurance","cybersecurity"]',
      },
      {
        article: "art3",
        paragraph: null,
        text_pt: "As sociedades supervisionadas devem implementar e manter uma política de segurança cibernética, aprovada pelo conselho de administração ou, na sua ausência, pela diretoria.",
        text_en: "Supervised entities shall implement and maintain a cybersecurity policy, approved by the board of directors or, in its absence, by the executive board.",
        topics: '["insurance","cybersecurity","security_policy","governance"]',
      },
    ],
  },
  {
    id: "cnsp-res-415-2021",
    regulator_id: "susep",
    document_type: "resolução",
    number: "CNSP 415",
    year: 2021,
    title: "Open Insurance Framework",
    title_pt: "Sistema de Seguros Aberto (Open Insurance)",
    date_published: "2021-07-20",
    date_effective: "2021-12-15",
    status: "active",
    topics: '["insurance","open_insurance","data_sharing","api"]',
    source_url: "https://www.susep.gov.br/legislacao-e-normas",
    provisions: [
      {
        article: "art1",
        paragraph: null,
        text_pt: "Esta Resolução dispõe sobre o Sistema de Seguros Aberto (Open Insurance) e estabelece os requisitos para o compartilhamento padronizado de dados e serviços por meio de abertura e integração de sistemas no âmbito dos mercados de seguros, previdência complementar aberta e capitalização.",
        text_en: "This Resolution provides for the Open Insurance System and establishes the requirements for standardised data and service sharing through opening and integration of systems within the insurance, open supplementary pension, and capitalisation markets.",
        topics: '["insurance","open_insurance","data_sharing","api","interoperability"]',
      },
    ],
  },
];

// ── Enforcement actions ──

const enforcementActions: EnfDef[] = [
  {
    regulator_id: "anpd",
    case_number: "00261.001886/2022-51",
    date_decided: "2023-07-06",
    respondent: "Telekall Infoservice",
    summary_pt: "Primeira sanção aplicada pela ANPD. Empresa realizava tratamento de dados pessoais para fins de telemarketing eleitoral sem base legal adequada e sem registro das operações de tratamento.",
    summary_en: "First sanction imposed by the ANPD. Company processed personal data for electoral telemarketing purposes without adequate legal basis and without maintaining records of processing activities.",
    penalty_type: "fine",
    penalty_amount: 14400,
    legal_basis: "LGPD arts. 7, 37, 38, 41",
    source_url: "https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-primeira-sancao",
  },
  {
    regulator_id: "cade",
    case_number: "08700.006377/2016-62",
    date_decided: "2023-03-15",
    respondent: "Cartel in fuel distribution (various companies)",
    summary_pt: "Condenação por formação de cartel no mercado de distribuição de combustíveis. Empresas coordenaram preços e dividiram mercados em diversas regiões do Brasil.",
    summary_en: "Conviction for cartel formation in the fuel distribution market. Companies coordinated prices and divided markets across various regions of Brazil.",
    penalty_type: "fine",
    penalty_amount: 75000000,
    legal_basis: "Lei 12.529/2011, art. 36-37",
    source_url: "https://www.cade.gov.br",
  },
  {
    regulator_id: "bacen",
    case_number: "BCB-2023/0021",
    date_decided: "2023-06-20",
    respondent: "Financial institution (name redacted)",
    summary_pt: "Sanção por descumprimento dos requisitos de segurança cibernética previstos na Resolução BCB nº 4.893/2021. Instituição não mantinha plano de resposta a incidentes atualizado.",
    summary_en: "Sanction for non-compliance with cybersecurity requirements under Resolution BCB No. 4,893/2021. Institution did not maintain an updated incident response plan.",
    penalty_type: "fine",
    penalty_amount: 2500000,
    legal_basis: "Resolução BCB 4.893/2021, art. 26",
    source_url: "https://www.bcb.gov.br",
  },
  {
    regulator_id: "cvm",
    case_number: "PAS 19957.009740/2019-05",
    date_decided: "2023-09-12",
    respondent: "Corporate officer (insider trading)",
    summary_pt: "Condenação por uso de informação privilegiada na negociação de valores mobiliários. Diretor utilizou informação sobre fusão antes da divulgação ao mercado.",
    summary_en: "Conviction for insider trading in securities. Corporate officer used information about a merger before public disclosure to the market.",
    penalty_type: "fine",
    penalty_amount: 1500000,
    legal_basis: "Lei 6.385/1976, art. 155; CVM Res. 44/2021",
    source_url: "https://conteudo.cvm.gov.br",
  },
];

// ─── Insert all data ────────────────────────────────────────────────────────

const allDocs: DocDef[] = [
  ...anpdDocs,
  ...cguDocs,
  ...coafDocs,
  ...cadeDocs,
  ...bacenDocs,
  ...cvmDocs,
  ...tcuDocs,
  ...susepDocs,
];

const seedAll = db.transaction(() => {
  let docCount = 0;
  let provCount = 0;

  for (const doc of allDocs) {
    insertDocument.run(
      doc.id,
      doc.regulator_id,
      doc.document_type,
      doc.number,
      doc.year,
      doc.title,
      doc.title_pt,
      doc.date_published,
      doc.date_effective,
      doc.status,
      doc.topics,
      doc.source_url,
    );
    docCount++;

    deleteProvisions.run(doc.id);
    for (const prov of doc.provisions) {
      insertProvision.run(
        doc.id,
        prov.article,
        prov.paragraph,
        prov.text_pt,
        prov.text_en,
        prov.topics,
      );
      provCount++;
    }
  }

  for (const enf of enforcementActions) {
    insertEnforcement.run(
      enf.regulator_id,
      enf.case_number,
      enf.date_decided,
      enf.respondent,
      enf.summary_pt,
      enf.summary_en,
      enf.penalty_type,
      enf.penalty_amount,
      "BRL",
      enf.legal_basis,
      enf.source_url,
    );
  }

  return { docCount, provCount, enfCount: enforcementActions.length };
});

const result = seedAll();
console.log(
  `Seeded ${result.docCount} documents, ${result.provCount} provisions, ${result.enfCount} enforcement actions`,
);

db.close();
console.log(`Database written to ${DB_PATH}`);
