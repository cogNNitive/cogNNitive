# Archive Report: 2026-10-02-cognitivize-in-place

Archived: 2026-10-04 · Mode: openspec

## Outcome

All 65 tasks are marked done. Slices S-pre to S5 landed through chained work-unit commits on
`session/cognitivize-in-place`; S6 and S7 landed through a sibling session on the same branch
(`4bb20874`, `e6ae4325`, `e7493461`, `cd678a4d`, `de0898b5`, `468dd230`); the closing docs and
record-name fixes are `387acf04`, `11ede0b0` and `55c9a4e3`. `origin/dev` and `origin/main`
were aligned and green before archiving.

## Delta specs

28 delta specs were synced into `openspec/specs/` (merged by requirement heading, done in
`468dd230`):

- 27 living specs exist and carry the change's requirements: `canonical-vocabulary`,
  `citation-parser-resolver`, `cognitivize-in-place`, `console-export-cli`,
  `conversations-lifecycle`, `document-citations`, `dynamic-sources-impact-check`,
  `editor-lineage-ui`, `generic-source-integrity-audit`, `lineage-drift-gate`,
  `lineage-record-sync`, `lineage-single-edge`, `lineage-version-status`,
  `model-discovery-predicate`, `nn-naming-contract`, `nn-trannsform-lineage-checks`,
  `sample-workspaces`, `scanner-destination-collision-guard` (ownership requirement removed,
  deduplication kept), `sidecar-blueprint`, `source-normalization-pipeline`, `source-sidecar`,
  `template-procedures-manifest-and-discovery`, `typed-source-references`,
  `workspace-directory-conventions`, `workspace-sources-resolution`,
  `workspace-template-upgrade`, `write-once-artifacts`.
- `source-versioning-archive` was a capability removal: its living spec was deleted.

## Known residuals (carried to `openspec/backlog.md` item 28)

- The `sources` bluepriNNt still names `sources/original/` and `sources/nn/`.
- Decisions to confirm: `sources/archive` is not a detector signal; GC never proposes
  `sources/archive/`; `workspace-index` `index.md` keeps a fixed name; four published `_V_`
  Ghostbusters samples were edited by `sync-samples`.
- Smaller items are listed in backlog item 28.
