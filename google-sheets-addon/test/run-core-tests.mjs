/**
 * Unit tests for the pure core logic embedded in google-sheets-addon/Sidebar.html
 * (the <script id="nodex-core"> block).
 *
 * Run with:  node google-sheets-addon/test/run-core-tests.mjs
 */
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const sidebarHtml = readFileSync(join(here, "..", "Sidebar.html"), "utf8");

const match = sidebarHtml.match(/<script id="nodex-core">([\s\S]*?)<\/script>/);
if (!match) {
  console.error("FAIL: could not find <script id=\"nodex-core\"> block in Sidebar.html");
  process.exit(1);
}

// Sandbox: the core script only uses window, TextEncoder, btoa.
const sandbox = { TextEncoder, btoa, atob, console };
sandbox.window = sandbox;
createContext(sandbox);
runInContext(match[1], sandbox);
const core = sandbox.__nodexCore;

let passed = 0;
let failed = 0;

function assert(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${label}\n  expected ${e}\n  actual   ${a}`);
  }
}

// ── csvToRows ──────────────────────────────────────────────────────────────
assert(core.csvToRows("a,b,c\n1,2,3"), [["a", "b", "c"], ["1", "2", "3"]], "basic csv");
assert(core.csvToRows("a,\"b,c\",d"), [["a", "b,c", "d"]], "quoted comma");
assert(core.csvToRows("\"say \"\"hi\"\"\",x"), [["say \"hi\"", "x"]], "escaped quotes");
assert(core.csvToRows("a,b\r\nc,d"), [["a", "b"], ["c", "d"]], "CRLF");
assert(core.csvToRows("a,b\n"), [["a", "b"]], "trailing newline");
assert(core.csvToRows(""), [], "empty input");
assert(core.csvToRows("\"multi\nline\",x"), [["multi\nline", "x"]], "quoted newline");

// ── columnToLetter ─────────────────────────────────────────────────────────
assert(core.columnToLetter(0), "A", "col 0 → A");
assert(core.columnToLetter(25), "Z", "col 25 → Z");
assert(core.columnToLetter(26), "AA", "col 26 → AA");
assert(core.columnToLetter(51), "AZ", "col 51 → AZ");

// ── dedupeHeaders ──────────────────────────────────────────────────────────
assert(core.dedupeHeaders(["name", "", "name"]), ["name", "Column B", "name_2"], "dedupe + empty");
assert(core.dedupeHeaders(["id", "id", "id"]), ["id", "id_2", "id_3"], "repeated headers");

// ── normalizeTable ─────────────────────────────────────────────────────────
assert(
  core.normalizeTable("a,b\n1,2\n", true),
  { headers: ["a", "b"], dataRows: [["1", "2"]], totalRows: 2 },
  "normalize with header"
);
assert(
  core.normalizeTable("1,2\n3,4", false),
  { headers: null, dataRows: [["1", "2"], ["3", "4"]], totalRows: 2 },
  "normalize without header"
);
assert(
  core.normalizeTable("a,b\n1,2\n\n\n", true),
  { headers: ["a", "b"], dataRows: [["1", "2"]], totalRows: 2 },
  "trailing empty rows dropped"
);

// ── buildGraphElements ─────────────────────────────────────────────────────
const table = core.normalizeTable("Name,Salary\nAda,150000\nAlan,120000", true);
const els = core.buildGraphElements(table, { rootLabel: "People" });
assert(els.nodes.length, 3, "1 root + 2 columns");
assert(els.edges.length, 2, "2 edges");
assert(els.nodes[0].data.id, "root", "root id");
assert(els.nodes[0].data.label, "People", "root label");
assert(els.nodes[1].data.id, "col-0", "first column id");
assert(els.nodes[1].data.colIndex, 0, "first column index");
assert(els.nodes[1].data.label.includes("1: Ada"), true, "column shows row values");
assert(els.edges[0].data.source, "root", "edge source");
assert(els.edges[0].data.target, "col-0", "edge target");
assert(els.edges[0].data.label, "Name", "edge label is header");

// truncation
const many = [];
for (let i = 0; i < 150; i++) many.push("v" + i);
const big = core.normalizeTable("h\n" + many.join("\n"), true);
const bigEls = core.buildGraphElements(big, { maxRowsShown: 100 });
assert(bigEls.nodes[1].data.label.includes("+50 more rows"), true, "row overflow note");
assert(bigEls.nodes[1].data.label.includes("100: v99"), true, "row numbers stay correct");
assert(bigEls.nodes[1].data.label.includes("1: v0"), true, "first row present");

// long values truncated
const longVal = core.buildGraphElements(core.normalizeTable("h\n" + "x".repeat(500), true), {});
assert(longVal.nodes[1].data.label.includes("…"), true, "long value truncated");

// no data rows
const empty = core.buildGraphElements(
  { headers: ["a", "b"], dataRows: [], totalRows: 1 },
  {}
);
assert(empty.nodes.length, 3, "headers-only table still renders columns");
assert(empty.nodes[1].data.label.includes("(no data rows)"), true, "no-data placeholder");

// column caps
const wide = core.buildGraphElements(core.normalizeTable("a,b,c,d", true), { maxCols: 3 });
assert(wide.nodes.length, 4, "maxCols caps columns (1 + 3)");

// ── rowsToCsv round-trip ───────────────────────────────────────────────────
assert(
  core.rowsToCsv([["a", "b,c"], ["d", '"q"']]),
  'a,"b,c"\r\nd,"""q"""',
  "rowsToCsv quoting"
);

// ── toBase64Url ────────────────────────────────────────────────────────────
assert(core.toBase64Url("hello"), "aGVsbG8", "base64url (hello)");
assert(
  core.toBase64Url("Nodex 🚀"),
  "Tm9kZXgg8J-agA",
  "base64url utf-8 + emoji"
);

// ── sanitizeCsv (formula injection hardening) ───────────────────────────────
assert(
  core.sanitizeCsv("a,b\n=1+1,-2\nplain,@SUM(A1:A2)"),
  "a,b\r\n'=1+1,'-2\r\nplain,'@SUM(A1:A2)",
  "formula chars prefixed with apostrophe"
);
assert(
  core.sanitizeCsv("plain,value\n1,2"),
  "plain,value\r\n1,2",
  "normal cells untouched"
);
assert(
  core.sanitizeCsv('a\n"=quoted,cell"'),
  'a\r\n"\'=quoted,cell"',
  "quoted formula cell sanitized"
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
