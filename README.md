# NODEX

**Advanced Intelligence Platform for Structured Data**

> Built by [Samin Yeasar](https://solez.vercel.app) &mdash; [GitHub](https://github.com/Solez-ai) &middot; [X / Twitter](https://x.com/Solez_None)

---

## Overview

Nodex is a high-performance, browser-native data visualization and intelligence platform. Paste or upload structured data in any supported format and instantly explore it through interactive graph and tree visualizations &mdash; with zero setup, no backend, and no data leaving your machine.

Beyond simple visualization, Nodex includes a suite of advanced intelligence features: AI-powered explanations via Google Gemini, automatic relationship detection across data tables, and a deep structural diff engine for comparing JSON versions side-by-side.

---

## Architecture

```
Next.js 14 (App)
  ├── reaflow          — graph canvas, nodes, edges
  ├── Monaco Editor    — text editor with syntax highlighting
  ├── Mantine UI       — component library
  ├── Zustand          — global state management
  └── styled-components — scoped CSS theming
```

All computation runs client-side. AI features use the browser to call Google's Gemini API directly &mdash; your API key is stored only in `localStorage` and is never transmitted to any Nodex server.

---

## Core Features

### Multi-Format Parsing

Nodex supports five structured data formats out of the box:

| Format | Extension | Notes                                    |
|--------|-----------|------------------------------------------|
| JSON   | `.json`   | Full support including JSONC comments    |
| YAML   | `.yaml`   | Complete YAML 1.2 specification          |
| CSV    | `.csv`    | Auto-detects headers and data types      |
| XML    | `.xml`    | Parses attributes and nested elements    |
| TOML   | `.toml`   | Configuration-friendly key-value format  |

### Interactive Graph View

The graph view renders your data as a directed node-edge canvas powered by reaflow and ELK layout engine.

- Pan and zoom with mouse or trackpad
- Long-press to enter drag mode
- Click any node to inspect its full value in a detail modal
- Direction control: Left, Right, Up, Down layout orientations
- Grid ruler overlay for precise navigation

### Tree View

A collapsible JSON tree view for hierarchical data exploration, with syntax-highlighted values and expandable nested objects and arrays.

### Live Transform

Edits in the text editor update the graph in real time (debounced at 400ms). Disable live transform for large datasets to edit without triggering redraws.

### Import and Export

- Drag-and-drop any supported file directly onto the canvas
- Import from a remote URL (fetches JSON from any public endpoint)
- Export the current document in its current format
- Download the graph as a PNG image

---

## Intelligence Features

### [AI] AI Data Explainer

Nodex integrates with Google Gemini to turn raw data into natural-language understanding.

**How it works:**

1. Open **Tools &rarr; AI Settings** and paste your Gemini API key
2. Open any dataset in the editor
3. Click **Tools &rarr; Explain Data (AI)**
4. The collapsible **AI Insights Panel** slides in on the right with three sections:

| Section    | Contents                                                   |
|------------|------------------------------------------------------------|
| Summary    | 2&ndash;3 sentence plain-English description of the dataset |
| Anomalies  | Detected outliers, missing fields, or structural issues    |
| Insights   | Actionable observations and patterns in the data           |

**Key design decisions:**

- The panel is **expandable** &mdash; click the expand icon in the header to widen it from 340px to 600px
- For large datasets, Nodex sends a **schema summary** (not raw data) to reduce token usage
- Supports fallback error messages for invalid keys, rate limits, and quota exceeded
- The API key is stored only in `localStorage` under the key `nodex_gemini_api_key`
- Model used: `gemini-2.0-flash`

**API Key privacy guarantee:** The key is read from `localStorage` in the browser, sent directly to `generativelanguage.googleapis.com`, and never passes through any Nodex infrastructure.

---

### [GRAPH] Relationship Auto-Detection

For CSV and JSON datasets containing foreign-key patterns, Nodex automatically infers relationships between entities.

**Detection heuristics:**

| Signal              | Description                                                        |
|---------------------|--------------------------------------------------------------------|
| Uniqueness ratio    | Columns with >= 95% unique values are candidate primary keys       |
| Name patterns       | Keys matching `_id`, `Id`, `ID`, `uuid`, `key` are FK candidates  |
| Value overlap       | FK candidate values intersecting a PK set at >= 60% = relationship |
| Cross-table         | Multi-table JSON objects are analyzed for inter-table FK links     |

**In the UI:**

- Toggle **View &rarr; Inferred Relationships** to show or hide inferred edges
- Inferred edges appear in a distinct amber (`#F59E0B`) dashed style, separate from structural edges
- Hover over an inferred edge to see the confidence percentage

This feature transforms Nodex from a structural viewer into a relational explorer, making it useful for analysing normalized datasets and database schemas exported to JSON or CSV.

---

### [DIFF] Time-Travel / Diff View

Compare two JSON documents with a deep structural diff engine and visualize changes directly in the graph.

**Opening the diff view:** File &rarr; Compare / Diff

**Workflow:**

1. The modal opens with two side-by-side editor panes
2. Click the **editor icon** next to either version label to instantly load your current editor content &mdash; no copy-paste required
3. Paste or type the alternate version in the other pane
4. Click **Compare** to run the diff
5. The **Diff Results** tab shows a summary: Added / Removed / Modified counts, plus a scrollable path-level change list
6. Click **View in Graph** to activate diff mode on the canvas

**In the graph canvas:**

Once diff mode is active, nodes are color-coded based on their change status:

| Color  | Status   |
|--------|----------|
| Green  | Added    |
| Red    | Removed  |
| Amber  | Modified |

A **Diff Summary Banner** appears below the toolbar showing the change counts. Click **Exit Diff View** to return to normal.

Additional controls:
- **Swap A / B** &mdash; reverses which version is treated as original vs new
- The diff algorithm is deterministic and path-indexed, producing consistent results for the same inputs

---

## Google Sheets Extension

Nodex ships with a **Google Sheets add-on** ([`google-sheets-addon/`](./google-sheets-addon)) that turns any selected spreadsheet table into an interactive Nodex-style graph inside a sidebar — no copy-paste required. The selection is converted to CSV by Apps Script and rendered client-side (Cytoscape + ELK layout); a header toggle, CSV export, column highlighting, and an **Open in Nodex** deep link are included.

The deep link hands the selection to this app over a **postMessage handshake** (see `src/hooks/useSheetsImport.ts`) — no URL-size limits — with a `?csv=` base64url query parameter kept as a direct-link fallback (`src/store/useFile.ts`). The sidebar is pre-configured with the launch deployment (`https://nodex-launch.vercel.app`) — note the deployed instance must include this postMessage handler or the button falls back to copying the CSV.

Install, usage, and local preview instructions: [`google-sheets-addon/README.md`](./google-sheets-addon/README.md).

---

## Configuration

### Settings

All settings persist across sessions via `localStorage` or `sessionStorage`.

| Setting                | Description                                        | Default |
|------------------------|----------------------------------------------------|---------|
| Dark Mode              | Toggle dark/light theme                            | Dark    |
| Live Transform         | Auto-update graph on editor changes                | On      |
| Image Preview          | Show image URLs as thumbnails in nodes             | On      |
| Gestures               | Two-finger trackpad gesture support                | Off     |
| Rulers                 | Grid background in graph canvas                    | On      |
| Inferred Relationships | Show auto-detected FK/PK edges in graph            | On      |

### Keyboard Shortcuts

| Shortcut        | Action                    |
|-----------------|---------------------------|
| `Ctrl + F`      | Search nodes              |
| `Ctrl + Scroll` | Zoom graph canvas         |
| `Drag`          | Pan the graph             |
| `Long-press`    | Enter drag-selection mode |

---

## Development

### Prerequisites

- Node.js >= 18.x
- npm or pnpm

### Running Locally

```bash
# Clone the repository
git clone https://github.com/Solez-ai/nodex.git
cd nodex/nodex

# Install dependencies
npm install

# Start the development server (port 3002)
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

### Project Structure

```
src/
  pages/              — Next.js pages (index, 404, _app, _document)
  features/
    editor/           — Main editor, toolbar, graph view, tree view
      Toolbar/        — File, View, Tools menus
      views/
        GraphView/    — reaflow canvas, custom nodes/edges, graph store
          lib/        — JSON parser, node size calculator
          CustomNode/ — Per-node renderer (text, object, diff overlay)
        TreeView/     — Collapsible JSON tree renderer
      InsightsPanel/  — Collapsible AI output panel
      DiffSummaryBanner.tsx — Active diff mode status bar
    modals/           — Modal components (Import, Download, Node, AI, Diff)
  lib/
    ai/               — Gemini service layer (schema extraction, prompts)
    diff/             — JSON deep diff algorithm
    analysis/         — Relationship detection heuristics
    utils/            — JSON adapter, helpers, node size calculator
  store/              — Zustand stores (file, graph, config, AI, diff, relationships)
  constants/          — Theme, SEO, graph limits
  types/              — TypeScript types for graph nodes and edges
  enums/              — File format and view mode enumerations
```

### Scripts

```bash
npm run dev       # Development server on port 3002
npm run build     # Production build
npm run lint      # TypeScript + ESLint + Prettier check
npm run lint:fix  # Auto-fix lint and formatting issues
npm run analyze   # Bundle size analysis
```

### Lint and Code Style

- **TypeScript** &mdash; strict mode, no `any` except for reaflow interop
- **ESLint** &mdash; next/core-web-vitals + prettier + unused-imports plugins
- **Prettier** &mdash; 2-space indent, double quotes, 100-char line width
- Import order is enforced via `@trivago/prettier-plugin-sort-imports`

---

## Technology Stack

| Layer           | Technology                                      |
|-----------------|-------------------------------------------------|
| Framework       | Next.js 14, React 18                            |
| Graph Engine    | reaflow + ELK layout                            |
| Code Editor     | Monaco Editor (`@monaco-editor/react`)          |
| UI Components   | Mantine 7                                       |
| Styling         | styled-components + Mantine CSS variables       |
| State           | Zustand (with `persist` middleware)             |
| AI              | `@google/generative-ai` (Gemini 2.0 Flash)      |
| Parsers         | jsonc-parser, js-yaml, fast-xml-parser, toml    |
| Layout          | Allotment (resizable panes)                     |
| Build Tool      | Next.js bundler + `@next/bundle-analyzer`       |

---

## Third-Party Libraries, APIs, Tools, Datasets, and Frameworks

This project uses the following external software and services.

### Frameworks

- Next.js 14
- React 18

### UI and Visualization Libraries

- Mantine (`@mantine/core`, `@mantine/hooks`, `@mantine/dropzone`, `@mantine/code-highlight`)
- reaflow (graph rendering and layout integration)
- react-zoomable-ui (canvas pan/zoom controls)
- Allotment (resizable split panes)
- Monaco Editor via `@monaco-editor/react`
- styled-components
- react-json-tree
- react-icons
- react-hot-toast

### Data Parsing and Transformation Libraries

- jsonc-parser
- js-yaml
- fast-xml-parser
- toml
- json-2-csv
- jsonpath-plus
- json_typegen_wasm

### API and Networking

- Google Gemini API (via `@google/generative-ai`)
- axios

### Utility Libraries and UI Helpers

- lodash.debounce
- dayjs
- html-to-image
- use-long-press
- react-linkify-it
- react-countup
- react-text-transition
- js-cookie
- gofmt.js

### State and Data-Fetching

- Zustand
- TanStack Query (`@tanstack/react-query`)

### Developer Tools

- TypeScript
- ESLint
- Prettier
- `@next/bundle-analyzer`
- `@trivago/prettier-plugin-sort-imports`

### Datasets

- Nodex does not bundle any third-party datasets.
- Users provide their own data through paste, upload, or URL import.

---

## License

Apache License 2.0 &mdash; see [LICENSE](./LICENSE) for full terms.

---

## Author

**Samin Yeasar**

- Portfolio: [solez.vercel.app](https://solez.vercel.app)
- GitHub: [github.com/Solez-ai](https://github.com/Solez-ai)
- X / Twitter: [@Solez_None](https://x.com/Solez_None)
