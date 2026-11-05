# Proposal: Domain Console Files Section

## Intent
Provide a unified, read-only inspection dashboard in the Domain Console to observe, audit, and trace workspace files and directories (monitored watch roots, imported sources, snapshots, assets, evidence, and artifacts) across their lifecycle and lineage.

## Scope

### In Scope
- **Navbar Integration:** New "Files" view tab positioned after Changes (`Knowledge -> Changes -> Files`).
- **Split Explorer View:** Categorized tree sidebar (Watch Folders, Sources, Imported Domains, Assets & Evidence, Artifacts) and detail pane.
- **Detail Pane:** Global workspace dashboard (KPIs, watch roots, storage, coverage rate) as default; per-file detailed card (metadata, modal dialog viewer).
- **Traceability:** Full reverse lineage on artifacts (`Artifact <- Units <- Changes <- Original Files`).
- **Unit Badges:** Rendered using canonical `nnUI.KuBadge` (`.nn-ku`) with '+' flyout and navigate action.
- **Pipeline Flow View:** Toggleable 5-stage flow (`Origins -> Sources -> Changes -> Units -> Artifacts`).
- **Gap Analysis:** Highlighting unquoted sidecar sections and uncited sources.
- **Offline Payload Precomputation:** Graph and stats precomputed in Node.js (`payload-builder.ts` / `export-console.mjs`).

### Out of Scope
- File mutation or deletion (strictly read-only).
- Modifying storage engines or sidecar schemas.

## Capabilities

### New Capabilities
- `console-files-view`: UI component implementing Split Explorer, Pipeline Flow, and modal file previewer.

### Modified Capabilities
- `console-payload-builder`: Ingests and precomputes file inventory, lineage, hashes, and gap metrics into console payload JSON.
- `innfo-console-runtime`: Registers the "Files" tab and routes view switches and element deep links.

## Approach
- **Precomputed Metadata:** `payload-builder.ts` and `export-console.mjs` scan watch directories, `sources/import/`, `assets/`, `evidence/`, and `artifacts/`, serializing hashes, sidecars, and cross-references into console payload JSON for zero client overhead.
- **UI Architecture:** Rendered in `bluepriNNts/console/` using existing tokens and native `<dialog>` modals for preview.
- **KuBadge Integration:** Unit references reuse standard `.nn-ku` UI elements.

## Affected Areas
- `iNNfo/packages/nn-core/src/console/payload-builder.ts`
- `scripts/export-console.mjs`
- `iNNfo/specs/bluepriNNts/console/artifact_shell.html`
- `iNNfo/specs/bluepriNNts/console/nn-runtime.js`
- Console test suites (`test/console-*.test.mjs`, `packages/nn-core/tests/console-*.ts`)

## Risks
- **Payload Bloat:** Large asset trees could inflate bundle size.
  *Mitigation:* Store metadata without raw contents; paginate deep trees.
- **Sidecar Desync:** Outdated sidecar formats may fail parsing.
  *Mitigation:* Graceful degradation with visible diagnostic badges.

## Rollback Plan
Revert commits touching `payload-builder.ts`, `export-console.mjs`, and console scripts. Console falls back to Knowledge/Changes tabs cleanly.

## Dependencies
- `nnUI.KuBadge` component and console modal dialog primitives.
- Node.js filesystem APIs in export tooling.

## Success Criteria
1. "Files" tab renders in Domain Console navbar after Changes.
2. Split Explorer and 5-stage Pipeline view switch smoothly with 0 client lag.
3. Artifact selection displays reverse lineage back to source files with clickable Ku badges.
4. Uncited sources and unquoted sidecars surface in gap diagnostics.
