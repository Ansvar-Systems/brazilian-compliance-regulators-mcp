/**
 * SQLite database access layer for the Brazilian Compliance Regulators MCP.
 *
 * Schema:
 *   - regulators           — 8 Brazilian compliance regulators (ANPD, CGU, COAF, etc.)
 *   - documents            — normative acts (resoluções, circulares, portarias, etc.)
 *   - provisions           — individual articles/paragraphs with Portuguese + English text
 *   - enforcement_actions  — sanctions, fines, warnings, bans
 *   - compliance_topics    — tagged topics (aml, cybersecurity, data_protection, etc.)
 *
 * FTS5 virtual tables back full-text search on provisions and enforcement actions.
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH =
  process.env["BR_COMPLIANCE_DB_PATH"] ?? "data/database.db";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS regulators (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  name_pt         TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  full_name_pt    TEXT NOT NULL,
  domain          TEXT NOT NULL,
  website         TEXT NOT NULL,
  mandate         TEXT,
  mandate_pt      TEXT,
  parent_ministry TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id              TEXT PRIMARY KEY,
  regulator_id    TEXT NOT NULL,
  document_type   TEXT NOT NULL,
  number          TEXT,
  year            INTEGER,
  title           TEXT NOT NULL,
  title_pt        TEXT NOT NULL,
  date_published  TEXT,
  date_effective  TEXT,
  status          TEXT DEFAULT 'active',
  topics          TEXT,
  source_url      TEXT,
  FOREIGN KEY (regulator_id) REFERENCES regulators(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_regulator ON documents(regulator_id);
CREATE INDEX IF NOT EXISTS idx_documents_status    ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_year      ON documents(year);

CREATE TABLE IF NOT EXISTS provisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id  TEXT    NOT NULL,
  article      TEXT    NOT NULL,
  paragraph    TEXT,
  text_pt      TEXT    NOT NULL,
  text_en      TEXT    NOT NULL,
  topics       TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE INDEX IF NOT EXISTS idx_provisions_document ON provisions(document_id);

CREATE VIRTUAL TABLE IF NOT EXISTS provisions_fts USING fts5(
  text_pt, text_en, topics,
  content='provisions',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS provisions_ai AFTER INSERT ON provisions BEGIN
  INSERT INTO provisions_fts(rowid, text_pt, text_en, topics)
  VALUES (new.id, new.text_pt, new.text_en, COALESCE(new.topics, ''));
END;

CREATE TRIGGER IF NOT EXISTS provisions_ad AFTER DELETE ON provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, text_pt, text_en, topics)
  VALUES ('delete', old.id, old.text_pt, old.text_en, COALESCE(old.topics, ''));
END;

CREATE TRIGGER IF NOT EXISTS provisions_au AFTER UPDATE ON provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, text_pt, text_en, topics)
  VALUES ('delete', old.id, old.text_pt, old.text_en, COALESCE(old.topics, ''));
  INSERT INTO provisions_fts(rowid, text_pt, text_en, topics)
  VALUES (new.id, new.text_pt, new.text_en, COALESCE(new.topics, ''));
END;

CREATE TABLE IF NOT EXISTS enforcement_actions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  regulator_id   TEXT    NOT NULL,
  case_number    TEXT,
  date_decided   TEXT,
  respondent     TEXT,
  summary_pt     TEXT,
  summary_en     TEXT,
  penalty_type   TEXT,
  penalty_amount REAL,
  currency       TEXT    DEFAULT 'BRL',
  legal_basis    TEXT,
  source_url     TEXT,
  FOREIGN KEY (regulator_id) REFERENCES regulators(id)
);

CREATE INDEX IF NOT EXISTS idx_enforcement_regulator ON enforcement_actions(regulator_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_date      ON enforcement_actions(date_decided);
CREATE INDEX IF NOT EXISTS idx_enforcement_type      ON enforcement_actions(penalty_type);

CREATE VIRTUAL TABLE IF NOT EXISTS enforcement_fts USING fts5(
  summary_pt, summary_en, respondent,
  content='enforcement_actions',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS enforcement_ai AFTER INSERT ON enforcement_actions BEGIN
  INSERT INTO enforcement_fts(rowid, summary_pt, summary_en, respondent)
  VALUES (new.id, COALESCE(new.summary_pt, ''), COALESCE(new.summary_en, ''), COALESCE(new.respondent, ''));
END;

CREATE TRIGGER IF NOT EXISTS enforcement_ad AFTER DELETE ON enforcement_actions BEGIN
  INSERT INTO enforcement_fts(enforcement_fts, rowid, summary_pt, summary_en, respondent)
  VALUES ('delete', old.id, COALESCE(old.summary_pt, ''), COALESCE(old.summary_en, ''), COALESCE(old.respondent, ''));
END;

CREATE TRIGGER IF NOT EXISTS enforcement_au AFTER UPDATE ON enforcement_actions BEGIN
  INSERT INTO enforcement_fts(enforcement_fts, rowid, summary_pt, summary_en, respondent)
  VALUES ('delete', old.id, COALESCE(old.summary_pt, ''), COALESCE(old.summary_en, ''), COALESCE(old.respondent, ''));
  INSERT INTO enforcement_fts(rowid, summary_pt, summary_en, respondent)
  VALUES (new.id, COALESCE(new.summary_pt, ''), COALESCE(new.summary_en, ''), COALESCE(new.respondent, ''));
END;
`;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Regulator {
  id: string;
  name: string;
  name_pt: string;
  full_name: string;
  full_name_pt: string;
  domain: string;
  website: string;
  mandate: string | null;
  mandate_pt: string | null;
  parent_ministry: string | null;
}

export interface Document {
  id: string;
  regulator_id: string;
  document_type: string;
  number: string | null;
  year: number | null;
  title: string;
  title_pt: string;
  date_published: string | null;
  date_effective: string | null;
  status: string;
  topics: string | null;
  source_url: string | null;
}

export interface Provision {
  id: number;
  document_id: string;
  article: string;
  paragraph: string | null;
  text_pt: string;
  text_en: string;
  topics: string | null;
}

export interface EnforcementAction {
  id: number;
  regulator_id: string;
  case_number: string | null;
  date_decided: string | null;
  respondent: string | null;
  summary_pt: string | null;
  summary_en: string | null;
  penalty_type: string | null;
  penalty_amount: number | null;
  currency: string;
  legal_basis: string | null;
  source_url: string | null;
}

// ─── Database singleton ─────────────────────────────────────────────────────

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(SCHEMA_SQL);

  return _db;
}

// ─── Regulator queries ──────────────────────────────────────────────────────

export function listRegulators(): Regulator[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM regulators ORDER BY id")
    .all() as Regulator[];
}

export function getRegulator(id: string): Regulator | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM regulators WHERE id = ?")
      .get(id.toLowerCase()) as Regulator | undefined) ?? null
  );
}

export function getRegulatorSummary(
  id: string,
): { regulator: Regulator; document_count: number; provision_count: number; enforcement_count: number } | null {
  const db = getDb();
  const regulator = getRegulator(id);
  if (!regulator) return null;

  const docCount = db
    .prepare("SELECT COUNT(*) as cnt FROM documents WHERE regulator_id = ?")
    .get(id.toLowerCase()) as { cnt: number };

  const provCount = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM provisions p
       JOIN documents d ON p.document_id = d.id
       WHERE d.regulator_id = ?`,
    )
    .get(id.toLowerCase()) as { cnt: number };

  const enfCount = db
    .prepare("SELECT COUNT(*) as cnt FROM enforcement_actions WHERE regulator_id = ?")
    .get(id.toLowerCase()) as { cnt: number };

  return {
    regulator,
    document_count: docCount.cnt,
    provision_count: provCount.cnt,
    enforcement_count: enfCount.cnt,
  };
}

// ─── FTS5 helpers ───────────────────────────────────────────────────────────

/**
 * Sanitize a user-supplied query for FTS5 MATCH.
 * Wraps each whitespace-separated token in double-quotes so that FTS5
 * syntax characters (AND, OR, NOT, NEAR, *, ", (, )) are treated as
 * literals and don't cause a SQLite parse error.
 */
function sanitizeFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token.replace(/"/g, "")}"`)
    .join(" ");
}

// ─── Provision queries ──────────────────────────────────────────────────────

export interface SearchProvisionsOptions {
  query: string;
  regulator?: string | undefined;
  topic?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
}

export function searchProvisions(opts: SearchProvisionsOptions): Array<Provision & { regulator_id: string; document_title: string }> {
  const db = getDb();
  const limit = opts.limit ?? 20;

  const conditions: string[] = [];
  const params: Record<string, unknown> = { query: sanitizeFtsQuery(opts.query), limit };

  if (opts.regulator) {
    conditions.push("d.regulator_id = :regulator");
    params["regulator"] = opts.regulator.toLowerCase();
  }
  if (opts.topic) {
    conditions.push("p.topics LIKE :topic_pattern");
    params["topic_pattern"] = `%${opts.topic}%`;
  }
  if (opts.status) {
    conditions.push("d.status = :status");
    params["status"] = opts.status;
  }

  const where = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  return db
    .prepare(
      `SELECT p.*, d.regulator_id, d.title as document_title
       FROM provisions_fts f
       JOIN provisions p ON p.id = f.rowid
       JOIN documents d ON p.document_id = d.id
       WHERE provisions_fts MATCH :query ${where}
       ORDER BY rank
       LIMIT :limit`,
    )
    .all(params) as Array<Provision & { regulator_id: string; document_title: string }>;
}

export function getProvision(
  documentId: string,
  article: string,
): (Provision & { regulator_id: string; document_title: string }) | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.*, d.regulator_id, d.title as document_title
       FROM provisions p
       JOIN documents d ON p.document_id = d.id
       WHERE p.document_id = ? AND p.article = ?
       LIMIT 1`,
    )
    .get(documentId, article) as
    | (Provision & { regulator_id: string; document_title: string })
    | undefined;

  if (row) return row;

  // Fuzzy fallback: case-insensitive match on article
  return (
    (db
      .prepare(
        `SELECT p.*, d.regulator_id, d.title as document_title
         FROM provisions p
         JOIN documents d ON p.document_id = d.id
         WHERE p.document_id = ? AND LOWER(p.article) = LOWER(?)
         LIMIT 1`,
      )
      .get(documentId, article) as
      | (Provision & { regulator_id: string; document_title: string })
      | undefined) ?? null
  );
}

// ─── Enforcement queries ────────────────────────────────────────────────────

export interface SearchEnforcementOptions {
  query: string;
  regulator?: string | undefined;
  penalty_type?: string | undefined;
  limit?: number | undefined;
}

export function searchEnforcement(
  opts: SearchEnforcementOptions,
): EnforcementAction[] {
  const db = getDb();
  const limit = opts.limit ?? 20;

  const conditions: string[] = [];
  const params: Record<string, unknown> = { query: sanitizeFtsQuery(opts.query), limit };

  if (opts.regulator) {
    conditions.push("e.regulator_id = :regulator");
    params["regulator"] = opts.regulator.toLowerCase();
  }
  if (opts.penalty_type) {
    conditions.push("e.penalty_type = :penalty_type");
    params["penalty_type"] = opts.penalty_type;
  }

  const where = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  return db
    .prepare(
      `SELECT e.* FROM enforcement_fts f
       JOIN enforcement_actions e ON e.id = f.rowid
       WHERE enforcement_fts MATCH :query ${where}
       ORDER BY rank
       LIMIT :limit`,
    )
    .all(params) as EnforcementAction[];
}

// ─── Topic queries ──────────────────────────────────────────────────────────

export function listTopics(): Array<{ topic: string; provision_count: number }> {
  const db = getDb();

  // Extract distinct topics from JSON arrays stored in provisions.topics
  const rows = db
    .prepare(
      `SELECT DISTINCT value as topic, COUNT(*) as provision_count
       FROM provisions, json_each(provisions.topics)
       WHERE provisions.topics IS NOT NULL AND provisions.topics != ''
       GROUP BY value
       ORDER BY provision_count DESC`,
    )
    .all() as Array<{ topic: string; provision_count: number }>;

  return rows;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export function getStats(): {
  regulators: number;
  documents: number;
  provisions: number;
  enforcement_actions: number;
} {
  const db = getDb();
  const r = db.prepare("SELECT COUNT(*) as cnt FROM regulators").get() as { cnt: number };
  const d = db.prepare("SELECT COUNT(*) as cnt FROM documents").get() as { cnt: number };
  const p = db.prepare("SELECT COUNT(*) as cnt FROM provisions").get() as { cnt: number };
  const e = db.prepare("SELECT COUNT(*) as cnt FROM enforcement_actions").get() as { cnt: number };

  return {
    regulators: r.cnt,
    documents: d.cnt,
    provisions: p.cnt,
    enforcement_actions: e.cnt,
  };
}
