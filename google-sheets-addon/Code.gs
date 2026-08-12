/**
 * Nodex for Google Sheets — server-side (Apps Script)
 *
 * Converts the user's selected spreadsheet range into RFC 4180 CSV and serves
 * it to the sidebar, which renders an interactive graph. Also provides a
 * helper to re-select a row in the sheet when a graph node is clicked.
 */

const MENU_NAME = "Nodex";

// Guards: the sidebar visualizes only the first rows/columns of a selection,
// so oversized ranges just waste time and memory.
const MAX_CELLS = 100000; // e.g. 1000 rows × 100 columns
const MAX_CSV_CHARS = 2000000;

/**
 * Called automatically when the spreadsheet opens (or when the user reloads
 * after authorizing). Adds the Nodex menu to the spreadsheet UI.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(MENU_NAME)
    .addItem("Visualize selected table", "openSidebar")
    .addSeparator()
    .addItem("About", "showAbout")
    .addToUi();
}

/**
 * Opens the Nodex sidebar on the right side of Google Sheets.
 */
function openSidebar() {
  // Note: sidebar width is fixed by Google Sheets (~300px); setWidth() only
  // applies to dialogs, so the sidebar uses a fluid layout instead.
  const html = HtmlService.createHtmlOutputFromFile("Sidebar").setTitle("Nodex — Visualize Selection");
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Small about dialog.
 */
function showAbout() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    "Nodex for Google Sheets",
    "Select a table in your sheet, then choose Nodex \u2192 Visualize selected table.\n\n" +
      "The sidebar converts your selection to CSV and renders it as an interactive " +
      "graph. Click a row node to select that row in the sheet, or open the " +
      "data in the full Nodex web app.",
    ui.ButtonSet.OK
  );
}

/**
 * Reads the active (selected) range and returns it as CSV plus metadata.
 * Uses display values, so the CSV matches exactly what the user sees.
 *
 * @returns {{csv?: string, sheetName?: string, rangeA1?: string, startRow?: number,
 *            startCol?: number, rowCount?: number, colCount?: number, error?: string}}
 */
function getSelectionAsCsv() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = sheet.getActiveRange();
    if (!range) {
      return { error: "No range selected. Select a table in the sheet, then open the sidebar." };
    }

    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();

    if (numRows === 1 && numCols === 1) {
      return {
        error: "Single-cell selections can't be visualized as a table. Select a range of cells.",
      };
    }

    if (numRows * numCols > MAX_CELLS) {
      return {
        error:
          "Selection too large (" +
          numRows +
          "\u00d7" +
          numCols +
          " cells). Select a smaller range (up to " +
          MAX_CELLS +
          " cells).",
      };
    }

    const values = range.getDisplayValues();
    const csv = toCsv(values);

    if (csv.length > MAX_CSV_CHARS) {
      return { error: "Selection produces a CSV that is too large. Select a smaller range." };
    }

    return {
      csv: csv,
      sheetId: sheet.getSheetId(),
      sheetName: sheet.getName(),
      rangeA1: range.getA1Notation(),
      startRow: range.getRow(),
      startCol: range.getColumn(),
      rowCount: numRows,
      colCount: numCols,
      error: null,
    };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Highlights a single row (within the user's original selection) in the sheet.
 * Called from the sidebar when a row node is clicked. Targets the sheet the
 * data came from (even if the user has since switched to another sheet).
 *
 * @param {number} sheetId id of the source sheet
 * @param {number} row row number of the selection top edge
 * @param {number} startCol column of the selection left edge
 * @param {number} numCols width of the selection
 */
function activateRow(sheetId, row, startCol, numCols) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetById(sheetId) || spreadsheet.getActiveSheet();
    sheet.getRange(row, startCol, 1, numCols).activate();
  } catch (err) {
    // Non-critical; ignore failures (e.g. selection changed while sidebar open).
  }
}

/**
 * Converts a 2D array of cell display values into RFC 4180 CSV.
 * Fields containing commas, quotes, or newlines are quoted; quotes are escaped.
 *
 * @param {any[][]} values
 * @returns {string}
 */
function toCsv(values) {
  const lines = [];
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    const cells = [];
    for (let c = 0; c < row.length; c++) {
      let cell = row[c];
      if (cell === null || cell === undefined) {
        cell = "";
      } else {
        cell = String(cell);
      }
      if (/[",\r\n]/.test(cell)) {
        cell = '"' + cell.replace(/"/g, '""') + '"';
      }
      cells.push(cell);
    }
    lines.push(cells.join(","));
  }
  return lines.join("\r\n");
}
