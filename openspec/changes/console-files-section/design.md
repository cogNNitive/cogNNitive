# Technical Design: Domain Console Files Section

## Overview

The **Files Section** introduces a unified, read-only inspection dashboard in the iNNfo Domain Console to observe, audit, and trace workspace files and directories across their lifecycle and lineage. It integrates monitored watch roots, normalized source documents, imported domains, multimedia assets, evidentiary artifacts, and compiled deliverables into a cohesive navigation experience comprising a **Split Explorer** (categorized tree + detail pane), an interactive **5-Stage Pipeline Flow**, deep **Reverse Lineage Traceability**, and a **Native Modal File Previewer**.

All file inventory scanning, sidecar parsing, hash extraction, reverse lineage resolution, and gap metric computations are precomputed offline during the export pipeline (`payload-builder.ts` / `export-console.mjs`) and serialized into `payload.model.files`. This architecture delivers zero runtime filesystem dependencies, instant client-side interactions, and strict compliance with the Domain Console's Content Security Policy (CSP).

---

## Technical Approach

### 1. Offline Precomputation Architecture
The Domain Console is delivered as a single-file, self-contained HTML artifact (`domaiNN_console.html` or `artifacts/<scope>_console/<scope>_console.html`) designed to run offline in any browser via `file://` or static file server. The runtime environment possesses no server backend, no Node.js APIs, and no MCP server connectivity.

To achieve fast rendering and rich relationship tracing without client lag:
- The export toolchain (`scripts/export-console.mjs` and `packages/nn-core/src/console/payload-builder.ts`) inspects the workspace directory structure (`sources/` including `import/`, `assets/`, `conversations/`, `evidence/`, `artifacts/`, watch roots, imported domain snapshots).
- It extracts file sizes, last-modified timestamps, byte-exact SHA-256 hashes, MIME types, and sidecar descriptors (`<file>.<ext>_sidecar_NN.md`). Every file is streamed through the hasher, so large sources never load in memory.
- It cross-references file paths against knowledge element citations (`el.citations`) and changeset evidence (`changes[].evidence`), resolving inbound/outbound links, uncited source-like documents, sidecar integrity (missing / invalid / digest-stale), and end-to-end artifact reverse lineage (`Artifact <- Units <- Changes <- Original Files`).
- The assembled graph and aggregate statistics are embedded directly into the `#nn-model` JSON slot under `model.files`.
- File bodies are never embedded. A text preview is an excerpt capped at the citation excerpt cap (`EXCERPT_CHAR_CAP`, 500 chars) inside a global budget; binaries and images are metadata only. Console build outputs and `.jsonl` logs are excluded so two exports of an unchanged workspace produce identical payloads.

### 2. Runtime UI Integration
At console boot (`nn-runtime.js`):
- The runtime checks `model.files`. If present and populated, it registers a core tab `{ id: 'files', title: 'Files', icon: 'folder', tone: 'core', order: 25, panelId: 'nn-tab-files' }` positioned between Knowledge and Matrices.
- When activated, `#nn-tab-files` renders the primary Split Explorer layout:
  - **Left Sidebar:** Filterable hierarchical tree categorized into the canonical groups: *Watch Folders*, *Sources*, *Imported Domains*, *Assets*, *Evidence*, and *Artifacts*.
  - **Right Detail Pane:** Defaults to the *Workspace Files Dashboard* (KPIs, watch roots, storage distribution, source-to-knowledge coverage rate, and sidecar integrity). Selecting any file node displays its *File Detail Card* (metadata, hashes, sidecar status, citations, reverse lineage, and preview trigger).
- An action bar toggle switches between the **Split Explorer** and the **5-Stage Pipeline Flow** (`Origins -> Sources -> Changes -> Units -> Artifacts`).
- All unit references within file detail cards, reverse lineage chains, and pipeline stages are rendered using canonical `nnUI.Ku` (`.nn-ku`) badges with concept-specific icons and '+' action flyouts. Activating the `reveal` action switches to the Knowledge tab (`#explorer`), clears conflicting filters, and scrolls the target element into view (`#el-<id>`).
- Selecting "Open / Preview" opens the native `<dialog id="nn-file-preview-dialog">`, rendering text, code, markdown, and images in an inert, sanitised viewer.

---

## Architecture Decisions

### ADR-1: Precomputing in Node.js vs. Runtime Ingestion
- **Context:** Workspaces contain hundreds or thousands of files, large media assets, and deep directory trees. Reading files at runtime in the browser is prohibited by security sandbox constraints (`file://` origin isolation, CSP restrictions).
- **Decision:** Precompute all file inventory, SHA-256 digests, sidecar integrity verdicts, cross-model citations, and reverse lineage mappings during the Node.js build step (`export-console.mjs` / `payload-builder.ts`).
- **Consequences:**
  - *Pros:* Zero runtime lag; instant switching between tree nodes and pipeline views; deterministic and reproducible state; works completely offline without local file server or MCP.
  - *Cons:* File modifications made after console export require a console re-export to appear in the dashboard.
  - *Payload Guard:* To prevent payload bloat, file bodies are omitted; only metadata, sidecars, and short snippets are serialized.

### ADR-2: Split Explorer + 5-Stage Pipeline Dual-Mode Layout
- **Context:** Reviewers have two divergent cognitive goals: (1) auditing specific files in familiar directory hierarchies (inventory inspection), and (2) tracing how external information flows through changes into knowledge units and final deliverables (lineage inspection).
- **Decision:** Provide two distinct, toggleable views inside `#nn-tab-files`:
  1. *Split Explorer:* 5-category hierarchical tree sidebar on the left with sticky selection; workspace KPI dashboard (unselected) or per-file detail card (selected) on the right.
  2. *Pipeline Flow:* Horizontal 5-column stage graph (`Origins -> Sources -> Changes -> Units -> Artifacts`) with hover-based ancestor/descendant highlighting and click-to-focus filtering.
- **Consequences:**
  - Preserves explorer state (selected file, tree node expansions, scroll position) when toggling between modes.
  - Toggling is performed purely via DOM class switches (`.view-mode-explorer` vs `.view-mode-pipeline`) with no data refetching.

### ADR-3: Native `<dialog>` Modal Previewer Reuse
- **Context:** The console requires an in-app preview for source text, markdown notes, sidecar JSON, and image evidence without forcing external tab transitions.
- **Decision:** Reuse the native HTML5 `<dialog>` element (`#nn-file-preview-dialog`), consistent with `#nn-ref-dialog` and `#nn-feedback-modal`.
- **Consequences:**
  - Built-in accessible focus trapping, native backdrop handling (`::backdrop`), ESC key dismiss, and `.showModal()` / `.close()` API.
  - Security / CSP Compliance: Text and code are rendered through safe DOM text nodes (`textContent` or escaped text fragments) so that embedded script tags (`<script>`) or malformed markup remain completely inert.
  - Media Handling: Supported image formats (PNG, JPG, SVG, WebP) are rendered via `<img>` tags pointing to relative workspace paths or data URIs; binary formats display a metadata fallback card.

### ADR-4: Canonical `nnUI.Ku` Badge Reuse
- **Context:** Knowledge units referenced in reverse lineage chains, pipeline stages, and gap diagnostics must maintain visual and functional consistency with units in the Knowledge explorer.
- **Decision:** Delegate all unit badge rendering to `ctx.ui.Ku('element', elementRef, options)` producing `.nn-ku-wrap` elements.
- **Consequences:**
  - Automatic concept-specific icon, concept color token (`--c`), nature styling, and '+' flyout menu (`.nn-ku-more`).
  - Unified action handling: `reveal` triggers cross-tab routing to `#explorer` and card activation (`#el-<id>`); `copy` copies the unit reference slug/id.

---

## Data Flow

```
+-----------------------------------------------------------------------------------------+
|                                  WORKSPACE FILE SYSTEM                                  |
|   sources/        assets/        evidence/        artifacts/        watch roots         |
|   *.md, *.pdf    *.png, *.svg   *.csv, *.json    *.html, *.pdf     configured dirs      |
|   *_sidecar_NN.md (sidecars)                                                       |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                         OFFLINE EXPORT PIPELINE (Node.js)                               |
|   scripts/export-console.mjs  &  packages/nn-core/src/console/payload-builder.ts        |
|                                                                                         |
|   1. Directory Scan: Catalog files into 5 categories, stat size & mtime                |
|   2. Hashing & MIME: Compute SHA-256 digests and detect MIME types                      |
|   3. Sidecar Validation: Parse *_sidecar_NN.md frontmatter & verify digest    |
|   4. Citation Linker: Map unit citations & changeset evidence -> target source files   |
|   5. Lineage Resolver: Trace Artifacts <- Units <- Changes <- Original Sources         |
|   6. Gap Diagnostics: Calculate uncited sources, sidecar integrity & coverage rates |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                              CONSOLE PAYLOAD (JSON)                                     |
|                               payload.model.files                                       |
|   { inventory: [...], watchRoots: [...], stats: {...}, lineage: {...} }                 |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v Inlined into #nn-model slot
+-----------------------------------------------------------------------------------------+
|                           DOMAIN CONSOLE RUNTIME (Browser)                              |
|                          nn-runtime.js (window.nnConsole)                               |
|                                                                                         |
|   1. Tab Registration: Adds 'Files' (order 25, tone: 'core', panel: #nn-tab-files)      |
|   2. URL Hash Routing: Handles #files and #files&path=<encoded-path>                    |
|   3. View Rendering:                                                                    |
|      +-----------------------------------+------------------------------------------+   |
|      |         SPLIT EXPLORER            |              PIPELINE FLOW               |   |
|      | Left: Collapsible Category Tree   | 5 Columns: Origins -> Sources -> Changes |   |
|      | Right: Global Dashboard / Card    |            -> Units -> Artifacts         |   |
|      +-----------------------------------+------------------------------------------+   |
|   4. Unit Badges: UI.Ku rendered for all units -> On 'reveal': Switch to #explorer      |
|   5. Native Preview: #nn-file-preview-dialog renders inert text, code, or images        |
+-----------------------------------------------------------------------------------------+
```

---

## File Changes Table

| File Path | Change Type | Purpose / Responsibilities |
| :--- | :--- | :--- |
| `iNNfo/packages/nn-core/src/console/payload-builder.ts` | Modified | Add TypeScript interfaces (`ConsolePayloadFiles`, `FileInventoryEntry`, `WatchRootDescriptor`, `FilesStats`, `ArtifactReverseLineage`) to `ConsolePayload`; export helper functions to resolve and embed file metadata. |
| `iNNfo/packages/nn-core/src/console/files-inventory.ts` | Added | Pure helper functions to classify files, validate sidecar frontmatter and digests, compute gap statistics (coverage rate, sidecar integrity, excerpt count), and compute reverse lineage mappings. |
| `scripts/export-console.mjs` | Modified | Scan workspace files across directories (`sources/`, `assets/`, `evidence/`, `artifacts/`, watch roots); call `files-inventory` / `payload-builder` to attach `model.files` to the multi-model domain payload. |
| `iNNfo/specs/bluepriNNts/console/artifact_shell.html` | Modified | Add `#nn-file-preview-dialog` markup, tab panel placeholder `#nn-tab-files`, and core CSS styles for split explorer and pipeline flow layout. |
| `iNNfo/specs/bluepriNNts/console/nn-runtime.js` | Modified | Register `'files'` view tab in `builtinViews` (order 25, tone 'core', icon 'folder'); mount `#nn-tab-files`; implement Split Explorer, Workspace Dashboard, File Detail Card, Pipeline Flow, Reverse Lineage with `UI.Ku`, URL hash routing, and file preview modal dialog. |
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` | Modified (if needed) | Ensure Ku components and dialog helper functions expose required handlers for file view actions. |
| `iNNfo/packages/nn-core/tests/console-files-payload.test.ts` | Added | Unit tests for payload builder `model.files`: inventory categorization, sidecar parsing resilience, reverse lineage resolution, and stats calculation. |
| `test/console-export-files.test.mjs` | Added | Integration tests verifying that `scripts/export-console.mjs` builds valid console HTML with populated `model.files` and handles uncited files/corrupt sidecars gracefully. |
| `test/console-files-runtime.test.mjs` | Added | Console runtime tests verifying Files tab registration, ordering, Split Explorer tree navigation, Workspace Dashboard KPIs, Pipeline Flow highlighting, and KuBadge reveal routing. |

---

## Interfaces / JSON Schema of `model.files`

### TypeScript Interfaces

```ts
export type FileCategory =
  | 'watch_root'
  | 'source'
  | 'imported_domain'
  | 'asset'
  | 'evidence'
  | 'artifact'

export interface FileSidecarStatus {
  path: string
  exists: boolean
  valid: boolean
  sourceFile?: string
  sha256?: string
  sha256Matches?: boolean        // false when the recorded digest drifted
  sourceFormat?: string
  author?: string
  normalizedAt?: string
  error?: string
}

export interface FileInventoryEntry {
  id: string                     // POSIX path relative to workspace root (e.g. "sources/import/interview.pdf")
  path: string                   // POSIX path relative to workspace root
  category: FileCategory         // Exactly one of the six allowed categories
  size: number                   // File size in bytes
  sha256: string                 // Full 64-char hex digest of the raw bytes
  mimeType: string               // Detected MIME type (e.g. "text/markdown", "application/pdf")
  mtime?: string                 // ISO 8601 last-modified timestamp
  sidecar?: FileSidecarStatus    // Present for source-like files and assets
  citationsCount: number         // Number of knowledge unit citations targeting this file
  excerptCount: number           // Citations that carry an excerpt (the "used section" signal)
  changesCount: number           // Number of changesets referencing this file as evidence
  uncited: boolean               // True for source-like files with no citation and no change
  snippet?: string               // Bounded text excerpt (EXCERPT_CHAR_CAP = 500 chars)
  snippetTruncated?: boolean     // True when the excerpt was cut
}

export interface WatchRootDescriptor {
  path: string                   // Configured path (e.g. "sources")
  status: 'active' | 'idle' | 'offline'
  fileCount: number              // Number of detected files under this root
  lastSync?: string              // Newest observed mtime (never wall-clock)
}

export interface FilesStats {
  totalFiles: number             // Total count of files in the inventory
  totalBytes: number             // Combined byte size of all files in inventory
  categoryCounts: Record<FileCategory, number>
  storageByCategory: Record<FileCategory, number>
  sourceCoverageRate: number     // 0..1, cited source-like files / source-like files
  uncitedSourceCount: number     // Count of source-like files with uncited === true
  sidecarMissingCount: number    // Source-like files with no sidecar
  sidecarInvalidCount: number    // Sidecars failing frontmatter validation
  sidecarMismatchCount: number   // Valid sidecars whose recorded digest drifted
  excerptCount: number           // Total citations carrying an excerpt
}

export interface ArtifactReverseLineageEntry {
  artifactId: string             // Artifact file id (e.g. "artifacts/exec-summary.html")
  artifactPath: string           // Relative POSIX path
  unitIds: string[]              // IDs of knowledge units generating or contributing to this artifact
  changesetIds: string[]         // Changesets where those units were created or modified
  sourcePaths: string[]          // Originating source file paths cited by units or changes
}

export interface ConsolePayloadFiles {
  inventory: FileInventoryEntry[]
  watchRoots: WatchRootDescriptor[]
  stats: FilesStats
  lineage: Record<string, ArtifactReverseLineageEntry>
}

// Extension to existing ConsolePayload in payload-builder.ts:
export interface ConsolePayloadModel {
  meta: ConsolePayloadMeta
  elements: ConsolePayloadElement[]
  matrices: ConsolePayloadMatrix[]
  changes?: ChangesetRecord[]
  files?: ConsolePayloadFiles    // ADDED
}
```

### Payload contract summary

The authoritative JSON shape of `model.files` is the TypeScript contract above, exported from
`@cognnitive/nn-core/console` and mirrored into `console-payload.generated.cjs` for the export CLI.
A JSON-Schema copy is not maintained here: it drifted from the implementation once already, and the
tests (`console-files-payload.test.ts`, `console-export-files.test.mjs`) are the executable contract.

Invariants enforced by those tests:
- `sha256` hashes raw bytes (a binary file never goes through a UTF-8 round-trip).
- Sidecars are `<file>.<ext>_sidecar_NN.md` documents with `source_file` + `sha256` frontmatter.
- Sidecar documents, console build outputs and `.jsonl` logs never appear as inventory entries.
- Two exports of an unchanged workspace produce an identical `model.files` payload.

---

## Detailed Component Specifications

### 1. Split Explorer Component
- **Tree Sidebar (`.nn-files-sidebar`):**
  - Displays the canonical categories, each hidden when empty:
    1. `Watch Folders`
    2. `Sources`
    3. `Imported Domains`
    4. `Assets`
    5. `Evidence`
    6. `Artifacts`
  - A live path filter narrows the tree (`input[type=search]`).
  - Each item displays: basename, size badge, and a diagnostic warning badge when `uncited === true` or `sidecar.exists === false`.
  - Clicking a category toggle expands or collapses its sub-tree.
  - Clicking a file row selects that file, adds `.active`, updates the URL hash to `#files&path=<encoded-path>`, and displays its detail card.
- **Detail Pane (`.nn-files-detail`):**
  - **State A: Workspace Files Dashboard (Default / No Selection):**
    - Renders 4 KPI cards: total files; total footprint; source coverage rate with the uncited count; sidecar problems (missing + invalid + digest-stale).
    - Monitored Watch Roots table (exempt from the Ku tree guard, since rows are filesystem facts): root, status, file count, newest observed change.
    - Storage Distribution bar proportional to category byte sizes, with a legend.
    - Integrity signals: uncited sources, files without a sidecar, invalid sidecars, digest-stale sidecars.
  - **State B: File Detail Card (File Selected):**
    - Breadcrumb bar with a "Workspace overview" link back to State A.
    - Header: basename, category badge, POSIX path.
    - Technical attributes: size, MIME type, ISO modified time, 16-character SHA-256 with click-to-copy.
    - Sidecar section: missing, invalid (`error`) or digest-stale verdict.
    - Knowledge units section: every citing unit rendered as a canonical `Ku` badge (with the `+` flyout and reveal action).
    - Reverse Lineage section (for artifacts): generating units, changesets and original source paths.
    - Action button: "Open / Preview" launching `#nn-file-preview-dialog`.
    - Read-Only Invariant: no mutation, editing, renaming or deleting controls.

### 2. Pipeline Flow Component (`.nn-files-pipeline`)
- A horizontal 5-column stage container:
  - Column 1: `Origins` (watch roots, ingest feeds)
  - Column 2: `Sources` (documents, notes, sidecars in `sources/`)
  - Column 3: `Changes` (recorded and proposed changesets in `changes/`)
  - Column 4: `Units` (knowledge units `.nn-ku`)
  - Column 5: `Artifacts` (exported consoles, summaries in `artifacts/`)
- Column headers indicate stage name, total item count, and directional connector arrows.
- Item Nodes: Compact card elements representing files or units.
- Interactive Highlighting:
  - Hovering on an item node highlights all upstream ancestors and downstream descendants across all 5 columns by tracing connections in `model.files.lineage`, element citations, and change records. Non-connected nodes receive `.dimmed`.
  - Clicking an item node locks the focus to that item's connected sub-graph; clicking empty canvas or a "Clear Filter" button resets the focus.
- Mode Switching: An action bar toggle button allows instant, lag-free switching between `.view-mode-explorer` and `.view-mode-pipeline`. Explorer selection and scroll position are preserved across toggles.

### 3. KuBadge Integration & Cross-Tab Navigation
- Any unit rendered in the reverse lineage chain, pipeline flow, or gap diagnostic list is rendered via `UI.Ku('element', elementRef)`.
- The KuBadge includes:
  - Concept icon and concept color CSS variables.
  - Unit title / label.
  - '+' flyout trigger button (`.nn-ku-more`).
  - Action flyout: info, reveal, copy.
- **Cross-Tab Reveal Handler:**
  - Clicking `reveal` (or clicking the badge body when configured) dispatches an event that:
    1. Switches the active navbar tab to Knowledge (`#explorer`).
    2. Clears any active facet filter or search query that would conceal the unit.
    3. Locates `#el-<id>`, removes its collapsed state if collapsed, adds `.nn-highlight` pulse animation, and calls `scrollIntoView({ behavior: 'smooth', block: 'center' })`.

### 4. Native Modal File Previewer (`#nn-file-preview-dialog`)
- Implemented as `<dialog id="nn-file-preview-dialog" class="nn-edit-modal">`.
- Triggered by the "Open / Preview" button in the file detail card.
- Modal Header: Basename, category badge, file size, and close button (`&times;`).
- Modal Body:
  - **Text / Code / Markdown / JSON:** Rendered within `<pre class="nn-file-preview-code"><code>`. Text is safely escaped using text nodes (`textContent = content`) preventing HTML injection or script execution. Includes a floating "Copy Content" button.
  - **Images (PNG, JPG, SVG, WebP):** Rendered within `<div class="nn-file-preview-image"><img src="..." alt="..." /></div>` with zoom/contain controls.
  - **Large Binary / External:** Renders an informational banner with file metadata, SHA-256 hash, and a notice that raw binary contents are not bundled in the offline console, providing the local relative path for external viewing.
- Dialog closes on ESC key, clicking the close button, or clicking the dialog backdrop.

---

## Testing Strategy

### 1. Unit Tests (`iNNfo/packages/nn-core/tests/console-files-payload.test.ts`)
- **Inventory Assembly:** Verifies that workspace files in `sources/`, `assets/`, `evidence/`, `artifacts/`, and watch roots are correctly mapped to their respective categories.
- **Payload Bloat Invariant:** Verifies that large files have accurate sizes and hashes but raw file contents are not bundled into the JSON payload.
- **Sidecar Parsing Resilience:** Tests that sidecars with missing or malformed frontmatter do not crash payload generation, increment `stats.sidecarInvalidCount`, and set `sidecar.valid: false` with the error message.
- **Reverse Lineage Resolution:** Tests full multi-tier lineage resolution (`Artifact -> Units -> Changes -> Sources`). Verifies graceful fallback with empty arrays when upstream links are missing.
- **Gap Diagnostics:** Asserts that uncited source-like files, missing sidecars and drifted digests are identified and that coverage and integrity counts are exact.

### 2. Integration Tests (`test/console-export-files.test.mjs`)
- Runs `scripts/export-console.mjs` against a fixture workspace.
- Asserts that the compiled console HTML artifact contains `payload.model.files` in `#nn-model`.
- Validates the JSON against the `ConsolePayloadFiles` JSON schema.
- Verifies that scoped exports (`--filter`, `--stale`, `--domain`) preserve or scope file inventory appropriately.

### 3. Runtime & DOM Tests (`test/console-files-runtime.test.mjs`)
- **Navbar Registration & Ordering:** Tests that the "Files" tab is rendered immediately after Knowledge and Changes, carries `tone-core` class, and is omitted when `model.files` is empty or missing.
- **Scoped Console:** Tests that when `meta.consoleScope.view === 'files'`, only `#nn-tab-files` is mounted.
- **Split Explorer Interactions:** Tests expanding/collapsing category nodes, selecting files, updating the detail card, and returning to the workspace dashboard.
- **Pipeline Flow Interactions:** Tests toggling into pipeline view, item hover lineage highlighting, and item focus filtering.
- **KuBadge Navigation:** Tests that clicking `reveal` on a reverse-lineage KuBadge activates `#nn-tab-explorer`, clears search filters, and focuses `#el-<id>`.
- **Preview Dialog & XSS Guard:** Tests that previewing a markdown file containing `<script>alert(1)</script>` renders the script inertly as escaped text without DOM execution.

---

## Migration & Rollout

- **Backward Compatibility:**
  - Existing console artifacts without `model.files` will continue to boot normally. In `nn-runtime.js`, `builtinViews` inspects `model && model.files && ...`; if `model.files` is absent or has 0 files, the Files tab and `#nn-tab-files` are not rendered.
  - No breaking schema changes are introduced to existing models, elements, changesets, or matrix specifications.
- **Rollback Plan:**
  - If regressions occur, reverting changes to `payload-builder.ts`, `export-console.mjs`, and `nn-runtime.js` cleanly restores previous console behavior without database migrations or data loss.
- **Feature Flagging:**
  - Can be conditionally disabled in export CLI via `--no-files` flag if a lightweight export without file scanning is desired.
