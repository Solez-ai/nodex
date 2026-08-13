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

// ── valueType ──────────────────────────────────────────────────────────────
assert(core.valueType("150000"), "number", "numeric string → number");
assert(core.valueType("3.14"), "number", "decimal → number");
assert(core.valueType("-12"), "number", "negative → number");
assert(core.valueType("1e3"), "number", "exponent → number");
assert(core.valueType(" 42 "), "number", "trimmed numeric → number");
assert(core.valueType("true"), "boolean", "'true' → boolean");
assert(core.valueType("false"), "boolean", "'false' → boolean");
assert(core.valueType("null"), "null", "'null' → null");
assert(core.valueType("hello"), "string", "word → string");
assert(core.valueType(""), "string", "empty → string");

// ── estimateTextWidth ──────────────────────────────────────────────────────
assert(core.estimateTextWidth("abc", 12), 22, "monospace 12px: 3 chars × 7.2 → 22");
assert(core.estimateTextWidth("界", 12), 12, "wide char ≈ full size");

// ── SVG builders ───────────────────────────────────────────────────────────
const rowSvg = core.nodeSvgObject(
  [
    { key: "Name", value: "Ada", type: "string" },
    { key: "Salary", value: "150000", type: "number" },
  ],
  200,
  60
);
assert(rowSvg.startsWith("<svg"), true, "svg root element");
assert(rowSvg.includes('fill="#59b8ff"'), true, "key color (blue)");
assert(rowSvg.includes('fill="#e8c479"'), true, "number value color (amber)");
assert(rowSvg.includes('fill="#292929"'), true, "node fill");
assert(rowSvg.includes('stroke="#424242"'), true, "node stroke");
assert(rowSvg.includes('stroke="#383838"'), true, "row divider");
assert(rowSvg.includes("Name: "), true, "key text present");
assert(rowSvg.includes("150000"), true, "value text present");

const rootSvg = core.nodeSvgSingle("[2 items]", 100, 34);
assert(rootSvg.includes("[2 items]"), true, "root text");
assert(rootSvg.includes('text-anchor="middle"'), true, "centered text");

assert(
  core.nodeSvgObject([{ key: "x", value: "true", type: "boolean" }], 100, 30).includes(
    'fill="#00dc7d"'
  ),
  true,
  "true → green"
);
assert(
  core.nodeSvgObject([{ key: "x", value: "false", type: "boolean" }], 100, 30).includes(
    'fill="#f85c50"'
  ),
  true,
  "false → red"
);
assert(
  core.nodeSvgObject([{ key: "x", value: "null", type: "null" }], 100, 30).includes(
    'fill="#939598"'
  ),
  true,
  "null → gray"
);
assert(
  core.nodeSvgObject([{ key: "c", value: "#ff0000", type: "string" }], 120, 30).includes("<rect"),
  true,
  "color swatch rendered"
);

// ── buildGraphElements (mirrors the web app's CSV graph) ───────────────────
const table = core.normalizeTable("Name,Salary\nAda,150000\nAlan,120000", true);
const els = core.buildGraphElements(table, {});
assert(els.nodes.length, 3, "1 root + 2 row nodes");
assert(els.edges.length, 2, "2 edges");
assert(els.nodes[0].data.id, "root", "root id");
assert(els.nodes[0].data.kind, "root", "root kind");
assert("label" in els.nodes[0].data, false, "no label (text lives in the svg)");
assert(els.nodes[0].data.svg.includes("[2 items]"), true, "root shows item count");
assert(els.nodes[1].data.id, "row-0", "first row id");
assert(els.nodes[1].data.kind, "row", "first row kind");
assert(els.nodes[1].data.rowIndex, 0, "first row index");
assert(els.nodes[1].data.svg.includes("Name: "), true, "row renders key");
assert(els.nodes[1].data.svg.includes(">Ada<"), true, "row renders value");
assert(els.nodes[1].data.svg.includes("Salary: "), true, "row renders second key");
assert(els.nodes[1].data.svg.includes(">150000<"), true, "row renders second value");
assert(els.edges[0].data.source, "root", "edge source");
assert(els.edges[0].data.target, "row-0", "edge target");

// no headers → column letters as keys
const noHeader = core.buildGraphElements(core.normalizeTable("1,2\n3,4", false), {});
assert(noHeader.nodes[0].data.svg.includes("[2 items]"), true, "root count without header");
assert(noHeader.nodes[1].data.svg.includes("A: "), true, "letter keys without header");
assert(noHeader.nodes[1].data.svg.includes(">1<"), true, "first letter value");
assert(noHeader.nodes[1].data.svg.includes("B: "), true, "second letter key");
assert(noHeader.nodes[1].data.svg.includes(">2<"), true, "second letter value");

// row cap → overflow node
const many = [];
for (let i = 0; i < 150; i++) many.push("v" + i);
const big = core.normalizeTable("h\n" + many.join("\n"), true);
const bigEls = core.buildGraphElements(big, { maxRowsShown: 100 });
assert(bigEls.nodes.length, 102, "100 rows + root + overflow");
assert(bigEls.nodes[101].data.id, "overflow", "overflow node id");
assert(bigEls.nodes[101].data.svg.includes("+50 more rows"), true, "overflow note");
assert(bigEls.nodes[100].data.rowIndex, 99, "last shown row index stays correct");
assert(bigEls.edges.length, 101, "100 row edges + overflow edge");

// long values truncated
const longVal = core.buildGraphElements(core.normalizeTable("h\n" + "x".repeat(500), true), {});
assert(longVal.nodes[1].data.svg.includes("…"), true, "long value truncated");

// embedded newlines flattened to spaces (SVG text is single-line)
const nl = core.buildGraphElements(core.normalizeTable("a\n\"x\ny\"", true), {});
assert(nl.nodes[1].data.svg.includes("x y"), true, "newline → space in display");
assert(nl.nodes[1].data.svg.includes("\n"), false, "no raw newline in svg");

// row with no cells at all → (empty row) fallback
const weird = core.buildGraphElements({ headers: null, dataRows: [[]] }, {});
assert(weird.nodes.length, 2, "root + 1 row node for empty cells");
assert(weird.nodes[1].data.svg.includes("(empty row)"), true, "empty-row fallback text");

// no data rows → root only
const empty = core.buildGraphElements(
  { headers: ["a", "b"], dataRows: [], totalRows: 1 },
  {}
);
assert(empty.nodes.length, 1, "headers-only table → root only");
assert(empty.nodes[0].data.svg.includes("[0 items]"), true, "root shows 0 items");

// column caps
const wide = core.buildGraphElements(core.normalizeTable("a,b,c,d\n1,2,3,4", true), {
  maxCols: 3,
});
assert(wide.nodes[1].data.svg.includes("a: "), true, "maxCols keeps first columns");
assert(wide.nodes[1].data.svg.includes("d: "), false, "maxCols drops later columns");

// ── findConnectors (smart engine) ──────────────────────────────────────────
const roster = core.normalizeTable(
  "Name,Class,Club\nArafat Rahman,8A,Robotics Club\nHasan Ali,8A,Chess Club\nNusrat Islam,7B,Robotics Club\nMehedi Hasan,8A,Robotics Club",
  true
);
const conns = core.findConnectors(roster, {});
assert(conns.length, 2, "connectors: 8A + Robotics Club only (7B/Chess are unique)");
assert(conns[0].colKey, "Class", "first connector column");
assert(conns[0].value, "8A", "first connector value");
assert(conns[0].rows, [0, 1, 3], "8A members");
assert(conns[1].colKey, "Club", "second connector column");
assert(conns[1].value, "Robotics Club", "second connector value");
assert(conns[1].rows, [0, 2, 3], "Robotics Club members");

// constant column (every row shares the value) → not discriminating
assert(
  core.findConnectors(core.normalizeTable("h,School\na,X\nb,X\nc,X", true), {}).length,
  0,
  "constant column → no connectors"
);

// boolean true/false flags are polarity, not entities → skipped
const flags = core.normalizeTable(
  "Name,Remote\nAda,true\nAlan,true\nGrace,false\nLinus,true\nMargaret,false",
  true
);
assert(core.findConnectors(flags, {}).length, 0, "boolean flags → no connectors");

// member cap: a value shared by too many rows is skipped
const bigClub = core.normalizeTable(
  "h,Club\na,C\nb,C\nc,C\nd,C\ne,C\nf,D",
  true
);
assert(core.findConnectors(bigClub, { maxHubMembers: 4 }).length, 0, "over-membered value skipped");
assert(core.findConnectors(bigClub, {}).length, 1, "value within member cap kept");

// hub cap
const manyCols = core.normalizeTable(
  "a,b,c,d,e,f,g\n1,2,3,4,5,6,7\n1,8,3,4,5,6,9\n1,2,3,9,5,6,9",
  true
);
assert(core.findConnectors(manyCols, { maxHubs: 2 }).length, 2, "maxHubs caps connectors");
assert(core.findConnectors(manyCols, {}).length, 3, "all discriminating connectors found");

// degenerate inputs
assert(
  core.findConnectors(core.normalizeTable("a,b\n1,2", true), {}).length,
  0,
  "single row → no connectors"
);
assert(core.findConnectors({ headers: ["a"], dataRows: [] }, {}).length, 0, "no rows → none");

// case-insensitive grouping, trimmed values
const casy = core.normalizeTable("h,Club\na, Robotics \nb,robotics\nc,Chess", true);
const casyConns = core.findConnectors(casy, {});
assert(casyConns.length, 1, "case-insensitive connector");
assert(casyConns[0].value, "Robotics", "value stored trimmed");
assert(casyConns[0].rows, [0, 1], "case-insensitive members");

// ── rowName ─────────────────────────────────────────────────────────────────
assert(core.rowName(roster, 0), "Arafat Rahman", "row name from first cell");
assert(
  core.rowName(core.normalizeTable("a,b\n,2", true), 0),
  "2",
  "first non-empty cell used as name"
);
assert(
  core.rowName({ headers: ["a", "b"], dataRows: [["", ""]] }, 0),
  "row 1",
  "fallback name when every cell is empty"
);

// ── nodeSvgHub ──────────────────────────────────────────────────────────────
const hubSvg = core.nodeSvgHub("Robotics Club", "club", 160, 46);
assert(hubSvg.includes("Robotics Club"), true, "hub value text");
assert(hubSvg.includes(">club<"), true, "hub column text");
assert(hubSvg.includes('fill="#59b8ff"'), true, "hub column accent color");

// ── thereforeSentence / explainConnection ───────────────────────────────────
assert(
  core.thereforeSentence("Club", "Arafat Rahman", null, "Robotics Club"),
  "Arafat Rahman is a member of Robotics Club.",
  "single therefore (club)"
);
assert(
  core.thereforeSentence("Club", "Arafat Rahman", "Nusrat Islam", "Robotics Club"),
  "Arafat Rahman and Nusrat Islam are both members of Robotics Club.",
  "pair therefore (club)"
);
assert(
  core.thereforeSentence("Team", "A", "B", "Alpha"),
  "A and B are both members of Alpha.",
  "team keyword → member phrasing"
);
assert(
  core.thereforeSentence("Class", "A", null, "8A"),
  "A is in 8A.",
  "class keyword → 'is in' phrasing"
);
assert(
  core.thereforeSentence("random", "A", "B", "v"),
  "A and B share the value v.",
  "fallback phrasing"
);
const expl = core.explainConnection("Arafat Rahman", "Club", "Robotics Club", 3);
assert(expl.includes("Relationship detected"), true, "explanation header");
assert(expl.includes('Club = "Robotics Club"'), true, "explanation match line");
assert(
  expl.includes("Therefore: Arafat Rahman is a member of Robotics Club."),
  true,
  "explanation therefore line"
);

// ── buildGraphElements with connector hubs ──────────────────────────────────
const hubEls = core.buildGraphElements(roster, {});
const hubNodes = hubEls.nodes.filter((n) => n.data.kind === "hub");
assert(hubNodes.length, 2, "hub nodes for connectors");
assert(hubNodes[0].data.value, "8A", "hub value");
assert(hubNodes[0].data.colKey, "Class", "hub column");
assert(hubNodes[0].data.rows, [0, 1, 3], "hub members");
assert(hubNodes[0].data.svg.includes("8A"), true, "hub svg shows value");
const hubEdges = hubEls.edges.filter((e) => e.data.hubId);
assert(hubEdges.length, 6, "3 members × 2 hubs = 6 hub edges");
assert(
  hubEdges.some((e) => e.data.source === "hub-1" && e.data.target === "row-2"),
  true,
  "hub→row edge for Robotics Club / Nusrat"
);
const row0 = hubEls.nodes.find((n) => n.data.id === "row-0");
assert(row0.data.conns.length, 2, "row-0 belongs to both connectors");
assert(row0.data.conns[0].hubId, "hub-0", "row conn hub id");
assert(row0.data.conns[1].value, "Robotics Club", "row conn value");
assert(
  hubEls.nodes.some((n) => n.data.id === "row-4"),
  false,
  "roster has exactly 4 rows + root (no row-4)"
);

// data with no repeated values → no hubs, no extra edges
const noHubEls = core.buildGraphElements(table, {});
assert(noHubEls.nodes.every((n) => n.data.kind !== "hub"), true, "unique data → no hubs");
assert(noHubEls.edges.length, 2, "unique data → root edges only");

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
