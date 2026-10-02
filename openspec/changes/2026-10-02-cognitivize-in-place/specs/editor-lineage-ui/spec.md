# Editor Lineage UI (Delta against the base-change capability)

Note: `editor-lineage-ui` is introduced by the in-flight change `2026-10-01-lineage-single-edge`. Treat that delta as the current text.

## RENAMED Requirements

- FROM: `### Requirement: Explorer classifies `export/` as artifact`
- TO: `### Requirement: Explorer classifies files by contract role`

## MODIFIED Requirements

### Requirement: Explorer classifies files by contract role

The editor explorer (`explorerClassify.ts`) MUST classify files through the `nn-naming-contract` role function, not by folder name or locally defined patterns. Sidecars MUST NOT be offered as models, MUST NOT count toward workspace detection, and MUST NOT appear in the home view's model list. The `ConsoleHubView` MUST locate console artifacts as members of the `<stem>_console` family under `artifacts/`, resolved by latest-of-family, without hand-written candidate paths.
(Previously: classified `export/` as artifact and probed about 40 hand-written candidate paths.)

#### Scenario: Artifact classified by name
- GIVEN `artifacts/report_20261002T101500Z.md` without a sidecar
- WHEN the explorer classifies it
- THEN it is an artifact

#### Scenario: Sidecar hidden from models
- GIVEN `sources/import/report.pdf_sidecar_NN.md` in a loaded workspace
- WHEN the home view and workspace detection run
- THEN the sidecar is not listed as a model and does not make the folder a workspace

#### Scenario: Console hub finds the latest console
- GIVEN two members of a console family in `artifacts/`
- WHEN the hub looks up the console for a model
- THEN it opens the later member
