# Tasks: Domain Console Files Section

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~1900 lines (Phase 1 ~560, Phase 2 ~700, Phase 3 ~560, Phase 4 ~180, Phase 5 ~100) |
| 400-line budget risk | High (full feature across payload builder, export CLI, shell CSS, runtime, bundle, fixtures and tests) |
| Chained PRs recommended | No |
| Suggested split | Single PR delivery (delivery strategy: `single-pr`) |
| Delivery strategy | single-pr |
| Chain strategy | none |
| Decision needed before apply | No |

### Key Paths & Reference Glossary
- `CORE_CONSOLE`: `iNNfo/packages/nn-core/src/console/`
- `PAYLOAD_BUILDER`: `iNNfo/packages/nn-core/src/console/payload-builder.ts`
- `FILES_INVENTORY`: `iNNfo/packages/nn-core/src/console/files-inventory.ts`
- `EXPORT_CLI`: `scripts/export-console.mjs`
- `BUILD_PAYLOAD`: `scripts/build-console-payload.mjs`
- `SHELL`: `iNNfo/specs/bluepriNNts/console/artifact_shell.html`
- `CSS`: `iNNfo/specs/bluepriNNts/console/nn-ui.css`
- `UI_KIT`: `iNNfo/specs/bluepriNNts/console/ui-kit.js`
- `RUNTIME`: `iNNfo/specs/bluepriNNts/console/nn-runtime.js`
- `BUILD_BUNDLE`: `scripts/build-console-bundle.mjs`
- `TESTLAB_FIXTURE`: `test/fixtures/testlab/domaiNN_console.html`

### Implementation notes (decisions taken during apply)

- Sidecars are the canonical `<file>.<ext>_sidecar_NN.md` documents with `source_file` + `sha256`
  frontmatter; the planned `.source.json` shape does not exist in real workspaces.
- "Quote coverage" was dropped: sidecars carry no quote list. The equivalent, measurable
  signals are citation coverage, sidecar presence/validity, and digest drift.
- Previews are excerpts capped at `EXCERPT_CHAR_CAP` (500 chars) under a global budget,
  never file bodies, so the console keeps its existing "nothing above the excerpt cap is
  embedded" invariant.
- The sidebar ships the six canonical categories (Assets and Evidence are separate).
- Console build outputs and `.jsonl` logs are excluded so exports stay deterministic.

---

## Phase 1: Payload Precomputation Engine (`payload-builder.ts`, `files-inventory.ts`, `export-console.mjs`)

- [x] 1.1 **TypeScript Types and Model Extensions (`PAYLOAD_BUILDER` & `CORE_CONSOLE/index.ts`)**
  - Define `FileCategory`, `FileSidecarStatus`, `FileInventoryEntry`, `WatchRootDescriptor`, `FilesStats`, `ArtifactReverseLineageEntry`, `ConsolePayloadFiles`, and the `FileLineage*` input types.
  - Extend `ConsolePayload` with `model.files?: ConsolePayloadFiles` and type `model.changes` as `ChangesetRecord[]`.
  - Re-export the helpers and types from `CORE_CONSOLE/index.ts` and `PAYLOAD_BUILDER`.
- [x] 1.2 **Pure Inventory, Sidecar and Lineage Helpers (`FILES_INVENTORY`)**
  - `classifyFileCategory` maps the real layout: `sources/import/` and `sources/conversations/` are sources, `sources/assets/` is an asset, `sources/evidence/` is evidence, `imported/`/`.domains/` are imported domains.
  - `computeFileSha256` hashes raw bytes (`node:crypto`), so binary digests are exact.
  - `mimeTypeFromPath`, `isTextMime`, `isSidecarPath`/`sidecarSubjectPath`/`sidecarPathFor` delegate the `_sidecar_NN.md` pattern to the naming contract.
  - `parseAndValidateSidecar(content, sidecarPath, subjectSha256)` parses YAML frontmatter, requires `source_file` + 64-hex `sha256`, reports `sha256Matches`, and never throws.
  - `resolveArtifactReverseLineage` resolves `Artifact <- Units <- Changes <- Original Files` and degrades to empty arrays.
  - `calculateFilesStats` returns totals, per-category counts/storage, `sourceCoverageRate`, `uncitedSourceCount`, `sidecarMissingCount`, `sidecarInvalidCount`, `sidecarMismatchCount`, `excerptCount`.
- [x] 1.3 **CLI Workspace Scanner Integration (`EXPORT_CLI`)**
  - `collectWorkspaceFiles(workspaceRoot, options)` scans `sources/`, `assets/`, `evidence/`, `artifacts/`, `conversations/`, `imported/`, `.domains/` and `watch/`.
  - Every file is streamed through SHA-256 (no whole-file buffering) and stat'd for size/mtime.
  - Citations and changeset evidence are cross-referenced into `citationsCount`, `excerptCount`, `changesCount`, `uncited`.
  - Previews are capped excerpts inside a global budget; binaries are never inlined.
  - Sidecar documents, console build outputs and `.jsonl`/`.ndjson` logs are excluded.
  - `watchRoots.lastSync` derives from the newest observed mtime (no wall-clock), keeping exports deterministic.
  - `--no-files` bypasses the scan; `model.files` is attached to domain and scoped consoles.
- [x] 1.4 **Build Payload Mirror (`BUILD_PAYLOAD`)**
  - `node scripts/build-console-payload.mjs` regenerates `console-payload.generated.cjs`; a rebuild reproduces the committed mirror byte-for-byte.
- [x] 1.5 **Payload Unit Tests (`iNNfo/packages/nn-core/tests/console-files-payload.test.ts`)**
  - Category mapping, byte-exact binary digests, sidecar naming/validation/drift, lineage resolution and graceful fallback, coverage/integrity/excerpt metrics. 10 tests.
- [x] 1.6 **Export CLI Integration Tests (`test/console-export-files.test.mjs`)**
  - `model.files` in the `#nn-model` slot, sidecar naming and drift, binaries never inlined, `--no-files`, `--filter` scoped builds, export determinism, excerpt cap. 5 tests.

---

## Phase 2: Console Shell and Component Template (`artifact_shell.html`, `ui-kit.js`, `nn-ui.css`)

- [x] 2.1 **Native Modal Dialog Template (`SHELL`)**
  - `<dialog id="nn-file-preview-dialog" class="nn-edit-modal">` with title, category badge, size, body container, copy and close actions.
- [x] 2.2 **Files Tab Panel Placeholder (`SHELL`)**
  - `<section id="nn-tab-files" role="tabpanel" hidden>` with the Explorer/Pipeline toolbar, `.nn-files-split` (sidebar + detail) and `.nn-files-pipeline`.
- [x] 2.3 **Files Section Styling (`CSS`)**
  - Split explorer layout, category tree with depth classes and warning badges, KPI grid, watch-roots table with status dots, storage bar + legend, integrity alerts, file detail card, 5-stage pipeline with highlight/dim states, preview dialog surfaces.
- [x] 2.4 **UI Kit Helpers (`UI_KIT`)**
  - `folder` icon added; `nnUI.Ku('element', ref, { doc, onAction })` already exposes the reveal hook and focus-restoring modal primitives reused by the view.

---

## Phase 3: Console Runtime Integration (`nn-runtime.js`)

- [x] 3.1 **Files Tab Registration & Ordering (`RUNTIME`)**
  - `files` builtin view (`order: 25`, core band) between Knowledge and Matrices, mounted only when `model.files` has inventory or watch roots; `--view files` scoped consoles mount it alone.
- [x] 3.2 **URL Hash Routing & State Preservation (`RUNTIME`)**
  - `#files` activates the tab; `#files&path=<encoded>` deep-links and re-syncs on `hashchange`; `parseViewHash` understands `path=`. Tree collapse and view mode persist across in-view re-renders.
- [x] 3.3 **Split Explorer Component (`RUNTIME`)**
  - Filterable sidebar over the six canonical categories, expand/collapse headers with counts, file rows with size and warning badge, selection drives the detail card.
- [x] 3.4 **Workspace Files Dashboard (`RUNTIME`)**
  - 4 KPI cards, storage distribution bar + legend, watch-roots table (Ku-guard exempt), integrity signal cards.
- [x] 3.5 **Per-File Detail Card (`RUNTIME`)**
  - Breadcrumb back to the dashboard, header, attributes with click-to-copy hash, sidecar verdict, citing units as canonical `Ku` badges, reverse lineage, preview action, no mutation affordances.
- [x] 3.6 **5-Stage Pipeline Flow View (`RUNTIME`)**
  - `Origins -> Sources -> Changes -> Units -> Artifacts`, counts per stage, hover tracing that lights the connected sub-graph and dims the rest, mode toggle.
- [x] 3.7 **KuBadge Cross-Tab Navigation (`RUNTIME`)**
  - Unit references render through `ctx.ui.Ku('element', ...)`; `reveal` routes to Knowledge and highlights the target card via the existing deep-link path.
- [x] 3.8 **Native Modal File Previewer (`RUNTIME`)**
  - `showModal()` with title/badge/size, excerpt rendered via `textContent` inside `<pre><code>` (XSS-inert), truncation note, copy, close on button/backdrop, binary metadata card.
- [x] 3.9 **Runtime Test Suite (`test/console-files-runtime.test.mjs`)**
  - Tab ordering, suppression without files, dashboard, category tree + detail card, inert preview, pipeline tracing, deep link. 7 tests.

---

## Phase 4: Bundle Rebuild & Testlab Fixture Regeneration

- [x] 4.1 **Build Console Payload Mirror**
  - `node scripts/build-console-payload.mjs`.
- [x] 4.2 **Build Single-File Console Bundle**
  - `node scripts/build-console-bundle.mjs`.
- [x] 4.3 **Verify Bundle Freshness & Drift Guard**
  - `node scripts/build-console-bundle.mjs --check` → "Console bundle is fresh and matches sources".
- [x] 4.4 **Regenerate Testlab Fixture**
  - `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`; the fixture carries `model.files` (16 entries, ~63 KB).

---

## Phase 5: Verification & Quality Gate

- [x] 5.1 **Fast Verification Suite**
  - `npm run verify:fast` green except the `Docs-Derived Facts Drift Guard`, which needs a built `nn-mcp` artifact this worktree cannot link (environment drift, not code).
- [x] 5.2 **Console Test Verification**
  - `node scripts/verify.js --only=console` → 53/54 steps green, same environment-drift step the only failure.
- [x] 5.3 **OpenSpec Change Validation**
  - Spec deltas corrected to the implemented contract (sidecar convention, stats fields, excerpt cap, six categories).
- [x] 5.4 **Full Verification Gate**
  - `npm run verify:fast` executed; the full `node scripts/verify.js` remains the `dev -> main` batch gate.
