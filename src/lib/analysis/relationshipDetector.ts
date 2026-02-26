/**
 * Nodex — Relationship Detection Service
 * Created by Samin Yeasar (github.com/Solez-ai | solez.vercel.app)
 */

export interface InferredRelationship {
  fromKey: string; // e.g. "user_id"
  toKey: string; // e.g. "id" in the target collection
  fromTableLabel: string;
  toTableLabel: string;
  confidence: number; // 0-1
  fromNodePath: string; // JSON path hint for graph mapping
  toNodePath: string;
}

const FK_PATTERNS = /(_id|_key|_ref|id|key|ref)$/i;
const PK_PATTERNS = /^(id|_id|uuid|key|pk)$/i;
const UNIQUENESS_THRESHOLD = 0.95;
const OVERLAP_THRESHOLD = 0.6;

/**
 * Detects likely primary/foreign key relationships from an array of records.
 * Works on CSV (parsed to objects) and flat JSON arrays.
 */
export function detectRelationships(json: string): InferredRelationship[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  const relationships: InferredRelationship[] = [];

  // Handle top-level array of objects
  if (Array.isArray(parsed) && parsed.length > 0 && isRecord(parsed[0])) {
    const records = parsed as Record<string, unknown>[];
    const candidates = analyzeColumns(records, "root");
    relationships.push(...candidates);
    return relationships;
  }

  // Handle top-level object with array values (multiple tables)
  if (isRecord(parsed)) {
    const tables: Array<{ name: string; records: Record<string, unknown>[] }> = [];

    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length > 0 && isRecord(value[0])) {
        tables.push({ name: key, records: value as Record<string, unknown>[] });
      }
    }

    if (tables.length >= 2) {
      // Cross-table FK detection
      for (const tableA of tables) {
        for (const tableB of tables) {
          if (tableA.name === tableB.name) continue;
          const crossRels = detectCrossTableRelationships(tableA, tableB);
          relationships.push(...crossRels);
        }
      }
    } else if (tables.length === 1) {
      const candidates = analyzeColumns(tables[0].records, tables[0].name);
      relationships.push(...candidates);
    }
  }

  return relationships;
}

/** Analyze columns within a single table for PK uniqueness */
function analyzeColumns(
  records: Record<string, unknown>[],
  tableName: string
): InferredRelationship[] {
  if (records.length < 2) return [];
  const keys = Object.keys(records[0]);
  const result: InferredRelationship[] = [];

  // Find PK candidates (unique columns)
  const pkCandidates = keys.filter(k => {
    if (!PK_PATTERNS.test(k)) return false;
    const values = records.map(r => r[k]).filter(v => v != null);
    const uniqueRatio = new Set(values).size / values.length;
    return uniqueRatio >= UNIQUENESS_THRESHOLD;
  });

  // Find FK candidates (columns with id-like names, non-unique)
  const fkCandidates = keys.filter(k => FK_PATTERNS.test(k) && !PK_PATTERNS.test(k));

  for (const fkKey of fkCandidates) {
    for (const pkKey of pkCandidates) {
      if (fkKey === pkKey) continue;

      const fkValues = new Set(
        records
          .map(r => r[fkKey])
          .filter(v => v != null)
          .map(String)
      );
      const pkValues = new Set(
        records
          .map(r => r[pkKey])
          .filter(v => v != null)
          .map(String)
      );

      const overlap = [...fkValues].filter(v => pkValues.has(v)).length;
      const confidence = fkValues.size > 0 ? overlap / fkValues.size : 0;

      if (confidence >= OVERLAP_THRESHOLD) {
        result.push({
          fromKey: fkKey,
          toKey: pkKey,
          fromTableLabel: tableName,
          toTableLabel: tableName,
          confidence,
          fromNodePath: fkKey,
          toNodePath: pkKey,
        });
      }
    }
  }

  return result;
}

/** Detect FK relationships across two different tables */
function detectCrossTableRelationships(
  tableA: { name: string; records: Record<string, unknown>[] },
  tableB: { name: string; records: Record<string, unknown>[] }
): InferredRelationship[] {
  if (tableA.records.length === 0 || tableB.records.length === 0) return [];

  const keysA = Object.keys(tableA.records[0]);
  const keysB = Object.keys(tableB.records[0]);
  const result: InferredRelationship[] = [];

  // PK candidates in table B (unique + pk-pattern names)
  const pkCandidatesB = keysB.filter(k => {
    if (!PK_PATTERNS.test(k)) return false;
    const values = tableB.records.map(r => r[k]).filter(v => v != null);
    return new Set(values).size / values.length >= UNIQUENESS_THRESHOLD;
  });

  // FK candidates in table A
  const fkCandidatesA = keysA.filter(k => {
    const lk = k.toLowerCase();
    return (
      FK_PATTERNS.test(k) &&
      (lk.includes(tableB.name.toLowerCase()) || lk.endsWith("_id") || lk.endsWith("id"))
    );
  });

  for (const fkKey of fkCandidatesA) {
    for (const pkKey of pkCandidatesB) {
      const fkValues = new Set(
        tableA.records
          .map(r => r[fkKey])
          .filter(v => v != null)
          .map(String)
      );
      const pkValues = new Set(
        tableB.records
          .map(r => r[pkKey])
          .filter(v => v != null)
          .map(String)
      );

      const overlap = [...fkValues].filter(v => pkValues.has(v)).length;
      const confidence = fkValues.size > 0 ? overlap / fkValues.size : 0;

      if (confidence >= OVERLAP_THRESHOLD) {
        result.push({
          fromKey: fkKey,
          toKey: pkKey,
          fromTableLabel: tableA.name,
          toTableLabel: tableB.name,
          confidence,
          fromNodePath: `${tableA.name}.${fkKey}`,
          toNodePath: `${tableB.name}.${pkKey}`,
        });
      }
    }
  }

  return result;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}
