# console-files-view Specification

## Purpose
TBD - created by archiving change console-files-section. Update Purpose after archive.
## Requirements
### Requirement: Split Explorer Layout With Categorized Tree Sidebar

The Files view MUST render a split explorer layout comprising a categorized collapsible tree sidebar on the left and a detail pane on the right.

The sidebar MUST organize workspace files into the canonical categories:
1. `Watch Folders`: Directories configured and monitored for automatic or external ingestion.
2. `Sources`: Imported and normalized source documents, interview transcripts, research notes, and their associated sidecars (`<file>.<ext>_sidecar_NN.md`).
3. `Imported Domains`: External domain modules or snapshots imported into the workspace.
4. `Assets`: Multimedia assets (images, audio, video) under `assets/` or `sources/assets/`.
5. `Evidence`: Evidentiary artifacts supporting knowledge changes.
6. `Artifacts`: Generated outputs, exported reports, and delivery files.

Each category node MUST display its title, total file count, and an expand/collapse toggle. Clicking a category node MUST toggle its subtree. Clicking a file leaf node MUST select that file and update the detail pane.

The split explorer layout MUST remain responsive and preserve horizontal tree indentation for nested folder paths.

#### Scenario: Split explorer renders with five categories
- GIVEN the console payload contains precomputed workspace files
- WHEN the reviewer activates the Files view tab
- THEN the sidebar displays top-level categories "Watch Folders", "Sources", "Imported Domains", "Assets & Evidence", and "Artifacts"
- AND the default detail pane displays the global workspace dashboard

#### Scenario: Selecting a file updates the detail pane
- GIVEN the expanded "Sources" category in the sidebar
- WHEN the reviewer clicks file `sources/research/interview.md`
- THEN the detail pane replaces the global dashboard with the detail card for `sources/research/interview.md`
- AND the selected file row is highlighted in the sidebar

### Requirement: Default Workspace Files Dashboard

When no individual file is selected (the initial state or when selection is cleared), the detail pane MUST render the Workspace Files Dashboard displaying aggregate workspace statistics and health metrics.

The dashboard MUST display:
1. Key Performance Indicators (KPIs): Total file count, aggregate storage footprint (formatted in human-readable bytes/KB/MB), breakdown of counts and storage by category.
2. Monitored Watch Roots: A card or list showing each configured watch directory, its synchronization status (`active`, `idle`, or `offline`), and detected file count.
3. Coverage Rates:
   - Source-to-Knowledge Coverage: Percentage of source-like files referenced by at least one knowledge unit citation or changeset evidence.
   - Sidecar Integrity: Counts of missing, invalid and digest-stale sidecars.
4. Storage Distribution: Visual summary representing bytes utilized per category.

#### Scenario: Default view shows workspace KPI dashboard
- GIVEN the Files tab is activated with no file selected in the URL or UI
- WHEN the view mounts
- THEN the detail pane renders total file count, total storage size, active watch roots, and source coverage rate
- AND no individual file card is displayed

#### Scenario: Clearing file selection restores workspace dashboard
- GIVEN an individual file is currently selected in the detail pane
- WHEN the reviewer deselects the file or clicks a "Workspace Overview" breadcrumb
- THEN the detail pane returns to the Workspace Files Dashboard

### Requirement: Per-File Detail Card and Metadata

Selecting a file in the sidebar MUST render its detail card in the detail pane. The detail card MUST be strictly read-only and MUST NOT expose file mutation, rename, or deletion controls.

The card MUST display:
1. File Header: File basename, POSIX path relative to workspace root, category badge, and MIME type.
2. Technical Attributes: File size (formatted in human-readable bytes/KB/MB), last modified timestamp (if available in payload), and SHA-256 hash (truncated to 16 characters with full hash in title/copy action).
3. Sidecar Information: For files in `Sources` or `Assets`, the status of the associated sidecar (`<file>.<ext>_sidecar_NN.md`): presence, frontmatter validity, and whether its recorded digest still matches the file.
4. Reference Links:
   - Inbound References: Knowledge units, changesets, or artifacts citing or utilizing this file.
   - Outbound References: Source files, sidecars, or units referenced by this file (applicable to sidecars, changesets, and artifacts).
5. Actions: An "Open / Preview" button to launch the modal file previewer.

#### Scenario: Detail card displays comprehensive metadata
- GIVEN a selected file `sources/reports/annual.pdf` with an accompanying sidecar
- WHEN the detail pane renders
- THEN it displays the relative path, file size, SHA-256 hash, sidecar status, and inbound citations
- AND it provides an "Open / Preview" action button

#### Scenario: Read-only invariant enforced
- GIVEN any selected file detail card
- WHEN the card DOM is inspected
- THEN no file edit, delete, rename, or write affordance is present

### Requirement: Interactive 5-Stage Pipeline Flow View

The Files view MUST provide a toggleable Pipeline Flow mode that visualizes workspace files and knowledge units across five sequential stages:
1. `Origins`: Ingest sources, watch roots, and external domain feeds.
2. `Sources`: Normalized local documents, transcripts, and sidecars in `sources/`.
3. `Changes`: Proposed, applied, and recorded changesets in `changes/`.
4. `Units`: Granular knowledge elements (`.nn-ku`) parsed into models.
5. `Artifacts`: Generated output files, consoles, and deliverables in `artifacts/`.

The view MUST render each stage as a distinct column containing item cards or aggregated group nodes, connected by directional flow indicators showing item counts.

Interactivity:
- Hovering over an item in any stage MUST visually highlight all its upstream ancestor items and downstream descendant items across all stages.
- Clicking an item in any stage MUST filter or focus the pipeline view on its connected lineage sub-graph.
- The user MUST be able to toggle smoothly between Split Explorer and Pipeline Flow modes without client lag or reloading.

#### Scenario: Switching to Pipeline Flow view
- GIVEN the Files section is open in Split Explorer mode
- WHEN the user clicks the "Pipeline Flow" view toggle
- THEN the split explorer layout switches to the 5-stage horizontal column layout displaying Origins, Sources, Changes, Units, and Artifacts
- AND stage columns display item counts and flow connection paths

#### Scenario: Highlighting item traces end-to-end lineage
- GIVEN the Pipeline Flow view is active
- WHEN the user hovers over an item in the `Sources` column
- THEN connected items in `Origins`, `Changes`, `Units`, and `Artifacts` are highlighted
- AND unconnected items are dimmed

### Requirement: Reverse Lineage Traceability for Artifacts

When an artifact file is inspected in either Split Explorer or Pipeline Flow mode, the view MUST render its full reverse lineage chain resolving:
`Artifact <- Units <- Changes <- Original Files`

1. The reverse lineage section MUST display the generating knowledge units, the changesets in which those units were authored or modified, and the originating source files.
2. Every Unit along the reverse lineage chain MUST be rendered using the canonical `nnUI.KuBadge` (`.nn-ku`) component.
3. The KuBadge MUST display its canonical label, concept icon, and the '+' flyout button.
4. Activating the navigate/reveal action on any KuBadge MUST route the reviewer to the element's card in the Knowledge view (`#el-<id>`), switching tabs automatically.

#### Scenario: Artifact renders full reverse lineage chain
- GIVEN an artifact file `artifacts/summary.pdf` generated from units `Goal: Expansion` and `Initiative: Launch`
- WHEN the detail pane renders for `artifacts/summary.pdf`
- THEN the reverse lineage section displays both units
- AND for each unit, displays the applying changeset and the original source files
- AND each unit is rendered as a `.nn-ku` badge with '+' flyout

#### Scenario: KuBadge navigate action routes to Knowledge tab
- GIVEN a KuBadge for unit `Goal: Expansion` rendered in the artifact reverse lineage section
- WHEN the reviewer clicks the navigate/reveal action on the KuBadge
- THEN the console switches to the Knowledge tab (`#explorer`)
- AND scrolls the card for `Goal: Expansion` into view

### Requirement: Gap Analysis and Diagnostic Badges

The Files view MUST identify and surface gap metrics and anomalies in workspace integrity:
1. `Uncited Sources`: Source-like files (`source` or `imported_domain`) not cited by any knowledge unit and not referenced in any changeset.
2. `Missing Sidecars`: Source-like files with no `<file>.<ext>_sidecar_NN.md` companion.
3. `Invalid or Stale Sidecars`: Sidecars whose frontmatter fails validation, or whose recorded digest no longer matches the file.

Gaps MUST be flagged with visible warning diagnostic badges in:
- The tree sidebar next to affected file nodes.
- The Workspace Files Dashboard integrity signal widgets.
- The per-file detail card under its sidecar section.

#### Scenario: Uncited source displays warning badge
- GIVEN a source file `sources/legacy/notes.txt` not cited by any unit or change
- WHEN the Files view renders
- THEN `notes.txt` displays an "Uncited" warning badge in the sidebar
- AND the Workspace Files Dashboard KPI lists `1 uncited source`

#### Scenario: Stale sidecar surfaced in detail card
- GIVEN a source file whose sidecar records a digest that no longer matches the file
- WHEN the source file's detail card is viewed
- THEN the sidecar section states that the digest does not match the file
- AND the dashboard counts it under stale sidecars

### Requirement: Native Modal File Previewer

The Files view MUST provide a native `<dialog>` modal previewer for inspecting a file excerpt without leaving the console:
1. Triggering "Open / Preview" on a file detail card MUST display the `<dialog>` modal (`#nn-file-preview-dialog`).
2. Text, Markdown, and JSON files MUST render the precomputed excerpt as clean preformatted text with a copy-to-clipboard button, and MUST state when the excerpt is truncated.
3. Images and binaries are never inlined in the offline payload: the modal MUST render an informational card with the MIME type, SHA-256 hash and workspace path.
4. All rendered text content MUST be treated as untrusted text and rendered via `textContent` to prevent script execution and preserve CSP compliance.

#### Scenario: Previewing markdown source in modal dialog
- GIVEN a selected file `sources/brief.md`
- WHEN the reviewer clicks the "Open / Preview" button
- THEN `#nn-file-preview-dialog` opens natively
- AND renders the text content safely escaped with a copy button
- AND closing the dialog returns focus to the preview trigger button

#### Scenario: Untrusted file content renders inert
- GIVEN a source file containing `<script>alert(1)</script>` and `<img>` tags
- WHEN previewed in the modal dialog
- THEN the script and tags render literally as escaped text
- AND no DOM script execution occurs

