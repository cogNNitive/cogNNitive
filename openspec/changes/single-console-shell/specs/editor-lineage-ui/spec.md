# Delta for editor-lineage-ui

## MODIFIED Requirements

### Requirement: Explorer classifies files by contract role

The editor explorer (`explorerClassify.ts`) MUST classify files through the `nn-naming-contract` role function, not by folder name or locally defined patterns. Sidecars MUST NOT be offered as models, MUST NOT count toward workspace detection, and MUST NOT appear in the home view's model list.
(Previously: the note said the `<stem>_console` family and latest-of-family resolution remain governed by `console-export-cli`. Console artifacts are now the whole-domaiNN `domaiNN_console.html` and scoped `<scope>_console` family members under `artifacts/`, governed by `console-export-cli`; the editor MUST NOT assume a per-model console family.)

#### Scenario: Artifact classified by name
- GIVEN `artifacts/report_20261002T101500Z.md` without a sidecar
- WHEN the explorer classifies it
- THEN it is an artifact

#### Scenario: Scoped console classified as an artifact
- GIVEN `artifacts/a_console/a_console_20261002T101500Z.html`
- WHEN the explorer classifies it
- THEN it is an artifact and not a model

#### Scenario: Sidecar hidden from models
- GIVEN `sources/import/report.pdf_sidecar_NN.md` in a loaded workspace
- WHEN the home view and workspace detection run
- THEN the sidecar is not listed as a model and does not make the folder a workspace
