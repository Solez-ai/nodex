# Nodex for Google Sheets

A Google Sheets extension that turns any selected table into an interactive
graph — powered by the [Nodex](../README.md) data visualizer.

Select a table in your sheet, run **Nodex → Visualize selected table**, and the
sidebar on the right converts your selection to CSV and renders it as an
interactive layered graph. No data ever leaves your spreadsheet except into
your browser, and the "Open in Nodex" button deep-links the data into the full
Nodex web app.

```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  Google Sheets               │  │  Nodex sidebar (this add-on) │
│  ┌──────┬──────┬──────┐      │  │  ⬡ Nodex · for Google Sheets │
│  │ Name │ Dept │ Sal  │      │  │  [x] First row is header     │
│  ├──────┼──────┼──────┤      │  │  ┌────────────────────────┐  │
│  │ Ada  │ Eng  │ 150k │ ◄──► │  │  │  interactive graph     │  │
│  │ Alan │ CS   │ 120k │      │  │  │  (Cytoscape + ELK)     │  │
│  └──────┴──────┴──────┘      │  │  └────────────────────────┘  │
│  selection                   │  │  ▸ Table preview             │
│                              │  │  [Open in Nodex] [Copy CSV]  │
└──────────────────────────────┘  └──────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `appsscript.json` | Apps Script manifest (V8 runtime, `spreadsheets.currentonly` scope) |
| `Code.gs` | Server: Nodex menu, sidebar host, selected-range → CSV conversion, column highlight |
| `Sidebar.html` | Client: interactive graph UI, header toggle, CSV export, Nodex deep link |
| `test/run-core-tests.mjs` | Unit tests for the sidebar's CSV/graph logic (`node .../run-core-tests.mjs`) |

## Installation (2 minutes)

1. Open the Google Sheet you want to use.
2. **Extensions → Apps Script**.
3. Delete the default `Code.gs` content and paste in the contents of `Code.gs`.
4. In the Apps Script editor, click **+ → HTML**, name it exactly `Sidebar`,
   and paste in the contents of `Sidebar.html`.
5. In **Project Settings**, make sure the manifest matches `appsscript.json`
   (the key setting is the `spreadsheets.currentonly` OAuth scope so the add-on
   only touches the file you're working in).
6. Refresh the spreadsheet. A **Nodex** menu appears next to Help.
7. Click **Nodex → Visualize selected table** and authorize when prompted.

### Install as a proper add-on (optional)

To install it like a real Marketplace add-on (e.g. for other users):

1. In the Apps Script editor, go to **Deploy → Test deployments**.
2. Select **Editor add-on**, pick a version/description, and click **Install**.
3. Follow the OAuth consent screen, then open any sheet → **Extensions →
   Nodex**.

## Usage

1. **Select a table** in the sheet (cells → header row optional). Selections are
   capped at 100,000 cells; pick a smaller range if you hit the limit.
2. Click **Nodex → Visualize selected table**. The sidebar reads your selection
   and renders the graph automatically. (Google Sheets sidebars are a fixed
   ~300px wide — the UI is a fluid layout that adapts.)
3. **Interact:**
   - Pan / zoom with the mouse or trackpad (buttons in the top-right of the
     canvas too).
   - **Click a column node to select that column in the sheet.**
   - Toggle **First row is header** to switch between header and
     letter-named columns (A, B, C…).
   - Expand **Table preview** to see the raw cells.
4. **Export:**
   - **Copy CSV** — clipboard.
   - **Download** — `.csv` file.
   - **Open in Nodex** — opens the data in the full Nodex web app (see below).

## Connecting the "Open in Nodex" button

The button opens a deployed instance of the Nodex web app in a new tab and
hands it the selection over a **postMessage handshake** — no URL-length limits,
so even very large selections transfer in full. The app side lives in
`src/hooks/useSheetsImport.ts` (wired in `src/pages/index.tsx`).

The handshake works like this:

```
sidebar ──{ nodex-sheets, status:"ping" }──▶ Nodex tab
Nodex   ──{ nodex-sheets, status:"ready" }──▶ sidebar
sidebar ──{ nodex-sheets, csv:"..." }──────▶ Nodex tab   (import)
Nodex   ──{ nodex-sheets, status:"loaded" }─▶ sidebar     (ack)
```

1. Deploy the Nodex web app somewhere public (see the main README). The
   sidebar ships pre-configured with the launch deployment
   (`https://nodex-launch.vercel.app`) — change `NODEX_APP_URL` at the top of
   `Sidebar.html` if you host it elsewhere, then re-paste the file into the
   Apps Script project.
2. **Important:** the deployed app must include this repo's postMessage
   handler (`src/hooks/useSheetsImport.ts`) and `?csv=` support — redeploy the
   latest code, or the button silently falls back to copying the CSV.

If `NODEX_APP_URL` is empty, the popup is blocked, or Nodex never confirms
receipt (~12s), the button falls back to copying the CSV to your clipboard.

**Tab reuse** — the button reuses an already-open Nodex tab instead of
spawning a new one: within a session it hands the data to the same tab (no
reload); across sessions it reopens a browser-level named window
(`nodex-sheets-deeplink`), so repeated clicks never pile up tabs.

The Nodex app also still accepts a `?csv=` base64url query parameter
(`src/store/useFile.ts`) as a no-handshake fallback for direct links.

> **Requirements & tradeoffs**
> - `NODEX_APP_URL` must be the **exact origin** of the deployed app (including
>   `www` vs apex, and no redirects to another domain) — browsers silently drop
>   `postMessage` across mismatched origins, which would only trigger the 12s
>   copy fallback.
> - The button opens the tab without `noopener`, so the Nodex tab holds a
>   `window.opener` reference to this sidebar (needed for the handshake). This
>   is only a risk if the deployed Nodex app itself were compromised — it can
>   only post messages here, never read spreadsheet data directly.

## Notes & decisions

- **Sidebar width** — Google Sheets fixes sidebar width at ~300px; Apps Script's
  `setWidth()` only applies to dialogs, so the sidebar uses a fluid layout.
  The local preview iframe mirrors the 300px width.
- **CSV formula safety** — **Download** sanitizes cells that begin with `=`,
  `+`, `-`, or `@` by prefixing a single quote, so the exported file can't
  execute formulas when opened in Excel/Sheets. The graph, clipboard copy, and
  deep link pass the data through unchanged.
- **Deep-link transport** — "Open in Nodex" transfers the CSV over a
  postMessage handshake, so there is no URL-size cap. The sidebar only sends
  data to the configured Nodex origin (validated on every inbound message); the
  app only replies to the sender of each message. Messages that aren't part of
  the `nodex-sheets` protocol are ignored.
- **`json-2-csv` note** — the CSV conversion in the sidebar is self-contained
  (no runtime dependency on `json-2-csv`, which is a Node-only package).

## Local preview (no Google account needed)

The sidebar UI can be previewed in a plain browser with sample data:

```bash
npx serve .        # or: python -m http.server 8080
# open http://localhost:3000/sidebar-preview.html
```

This opens `sidebar-preview.html` — a fake spreadsheet next to the real
`Sidebar.html#preview=1`, which swaps `google.script.run` for sample data.
(Preview mode is detected via `?preview=1` or `#preview=1`.)

## Tests

The CSV parsing, header handling, graph-element building, CSV sanitizing, and
base64url logic in `Sidebar.html` are isolated in the `nodex-core` script block
and unit-tested:

```bash
node google-sheets-addon/test/run-core-tests.mjs
```

## Privacy

- The add-on requests only `spreadsheets.currentonly` — it can read and
  highlight cells in the spreadsheet you have open, and nothing else.
- The CSV is produced in Apps Script and rendered entirely in your browser.
  "Open in Nodex" sends the data to the Nodex web app over postMessage (not
  secret — treat it like pasting your data into a web app).
