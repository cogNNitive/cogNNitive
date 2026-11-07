# console-files-view Delta Spec

## MODIFIED Requirements

### Requirement: Split Explorer Layout With Categorized Tree Sidebar

The Files view MUST render a split explorer layout comprising a categorized collapsible tree sidebar on the left and a detail pane on the right.

The sidebar MUST organize workspace files into the canonical categories:
1. `Sources`: Imported and normalized source documents, interview transcripts, research notes, mirrored models under `sources/sync/`, and their associated sidecars (`<file>.<ext>_sidecar_NN.md`).
2. `Assets`: Multimedia assets (images, audio, video) under `assets/` or `sources/assets/`.
3. `Evidence`: Evidentiary artifacts supporting knowledge changes.
4. `Artifacts`: Generated outputs, exported reports, and delivery files.
5. `Unclassified`: Files that match no known layout. This category MUST be shown only when it contains at least one file.

Each category node MUST display its title, total file count, and an expand/collapse toggle. Clicking a category node MUST toggle its subtree. Clicking a file leaf node MUST select that file and update the detail pane.

The split explorer layout MUST remain responsive and preserve horizontal tree indentation for nested folder paths.
(Previously: the sidebar also listed `Watch Folders` and `Imported Domains` categories and had no `Unclassified` category.)

#### Scenario: Split explorer renders its categories
- GIVEN the console payload contains precomputed workspace files and no unclassified file
- WHEN the reviewer activates the Files view tab
- THEN the sidebar displays top-level categories "Sources", "Assets & Evidence", and "Artifacts"
- AND no "Watch Folders" or "Imported Domains" category exists
- AND the default detail pane displays the global workspace dashboard

#### Scenario: Unclassified category appears only when needed
- GIVEN a payload with one file of category `unclassified`
- WHEN the sidebar renders
- THEN an "Unclassified" category with count `1` is displayed

#### Scenario: Selecting a file updates the detail pane
- GIVEN the expanded "Sources" category in the sidebar
- WHEN the reviewer clicks file `sources/research/interview.md`
- THEN the detail pane replaces the global dashboard with the detail card for `sources/research/interview.md`
- AND the selected file row is highlighted in the sidebar

### Requirement: Default Workspace Files Dashboard

When no individual file is selected (the initial state or when selection is cleared), the detail pane MUST render the Workspace Files Dashboard displaying aggregate workspace statistics and health metrics.

The dashboard MUST display:
1. Key Performance Indicators (KPIs): Total file count, aggregate storage footprint (formatted in human-readable bytes/KB/MB), breakdown of counts and storage by category. The breakdown MUST NOT contain `watch_root` or `imported_domain`.
2. Origins: A card or list showing each Synchronization origin, its state (`active`, `paused` or `adhoc`), and the number of files it contributed. This card MUST be omitted when there are no origins.
3. Coverage Rates:
   - Source-to-Knowledge Coverage: Percentage of source-like files referenced by at least one knowledge unit citation or changeset evidence.
   - Sidecar Integrity: Counts of missing, invalid and digest-stale sidecars.
4. Storage Distribution: Visual summary representing bytes utilized per category.
(Previously: a "Monitored Watch Roots" card with `active`/`idle`/`offline` status.)

#### Scenario: Default view shows workspace KPI dashboard
- GIVEN the Files tab is activated with no file selected in the URL or UI
- WHEN the view mounts
- THEN the detail pane renders total file count, total storage size, and source coverage rate
- AND no individual file card is displayed

#### Scenario: Origins card follows the payload
- GIVEN a payload with `origins` holding one entry
- WHEN the dashboard renders
- THEN the Origins card lists that entry
- AND with an empty `origins` array the card is absent

#### Scenario: Clearing file selection restores workspace dashboard
- GIVEN an individual file is currently selected in the detail pane
- WHEN the reviewer deselects the file or clicks a "Workspace Overview" breadcrumb
- THEN the detail pane returns to the Workspace Files Dashboard

### Requirement: Interactive 5-Stage Pipeline Flow View

The Files view MUST provide a toggleable Pipeline Flow mode that visualizes workspace files and knowledge units across five sequential stages:
1. `Origins`: The Synchronization origins declared in the sources model and the origins recorded in sidecars. The column MUST NOT contain entries synthesized from folder names, and MUST be hidden when there are no origins.
2. `Sources`: Normalized local documents, transcripts, and sidecars in `sources/`, and mirrored models in `sources/sync/`.
3. `Changes`: Proposed, applied, and recorded changesets in `changes/`.
4. `Units`: Granular knowledge elements (`.nn-ku`) parsed into models.
5. `Artifacts`: Generated output files, consoles, and deliverables in `artifacts/`.

The view MUST render each stage as a distinct column containing item cards or aggregated group nodes, connected by directional flow indicators showing item counts.

Interactivity:
- Hovering over an item in any stage MUST visually highlight all its upstream ancestor items and downstream descendant items across all stages.
- Clicking an item in any stage MUST filter or focus the pipeline view on its connected lineage sub-graph.
- The user MUST be able to toggle smoothly between Split Explorer and Pipeline Flow modes without client lag or reloading.
(Previously: Origins held watch roots and external domain feeds, and the column was always shown.)

#### Scenario: Switching to Pipeline Flow view
- GIVEN the Files section is open in Split Explorer mode and the payload has at least one origin
- WHEN the user clicks the "Pipeline Flow" view toggle
- THEN the split explorer layout switches to the 5-stage horizontal column layout displaying Origins, Sources, Changes, Units, and Artifacts
- AND stage columns display item counts and flow connection paths

#### Scenario: Origins column is hidden when empty
- GIVEN a payload with no origins
- WHEN the Pipeline Flow view renders
- THEN the columns are Sources, Changes, Units and Artifacts
- AND no placeholder Origins column is shown

#### Scenario: No folder-name origins
- GIVEN a workspace with an external folder name in its paths and no Synchronization or sidecar origin
- WHEN the Pipeline Flow view renders
- THEN no origin entry is derived from that folder name

#### Scenario: Highlighting item traces end-to-end lineage
- GIVEN the Pipeline Flow view is active
- WHEN the user hovers over an item in the `Sources` column
- THEN connected items in `Origins`, `Changes`, `Units`, and `Artifacts` are highlighted
- AND unconnected items are dimmed

### Requirement: Gap Analysis and Diagnostic Badges

The Files view MUST identify and surface gap metrics and anomalies in workspace integrity:
1. `Uncited Sources`: Source-like files (category `source`) not cited by any knowledge unit and not referenced in any changeset.
2. `Missing Sidecars`: Source-like files with no `<file>.<ext>_sidecar_NN.md` companion.
3. `Invalid or Stale Sidecars`: Sidecars whose frontmatter fails validation, or whose recorded digest no longer matches the file.

Gaps MUST be flagged with visible warning diagnostic badges in:
- The tree sidebar next to affected file nodes.
- The Workspace Files Dashboard integrity signal widgets.
- The per-file detail card under its sidecar section.
(Previously: source-like files were `source` or `imported_domain`.)

#### Scenario: Uncited source displays warning badge
- GIVEN a source file `sources/legacy/notes.txt` not cited by any unit or change
- WHEN the Files view renders
- THEN `notes.txt` displays an "Uncited" warning badge in the sidebar
- AND the Workspace Files Dashboard KPI lists `1 uncited source`

#### Scenario: Unclassified file is not a source gap
- GIVEN an unclassified file with no citations
- WHEN the gap metrics are computed
- THEN it counts neither as an uncited source nor as a missing sidecar

#### Scenario: Stale sidecar surfaced in detail card
- GIVEN a source file whose sidecar records a digest that no longer matches the file
- WHEN the source file's detail card is viewed
- THEN the sidecar section states that the digest does not match the file
- AND the dashboard counts it under stale sidecars
