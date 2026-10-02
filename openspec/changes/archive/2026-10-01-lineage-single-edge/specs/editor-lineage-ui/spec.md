# Editor Lineage UI (Delta, new capability)

## ADDED Requirements

### Requirement: Pills and modal use the core parser and resolver

`iNNfo/apps/innfo-editor/src/utils/sourceRef.ts` MUST NOT define `parseForPill`; pill rendering MUST use innfo-core `parseCitation`. `knowledgeStore.ts` `getSourceCitations` MUST resolve citations through the core resolver, not a case-insensitive basename-suffix match. The stale header comment at `sourceRef.ts:8-13` MUST be corrected.

#### Scenario: `@` citation renders a pill
- GIVEN an element with `sources:: sources/nn/interview.md@## Clients`
- WHEN the editor renders the source pill
- THEN the pill shows the file and heading and opens the preview modal

#### Scenario: Ambiguous basename is not fuzzy-matched
- GIVEN `sources/nn/a/report.md` and `sources/nn/b/report.md`, and an element citing `sources/nn/a/report.md@## Intro`
- WHEN `getSourceCitations` is called for `sources/nn/b/report.md`
- THEN the element is not returned as a downstream citation of `b/report.md`
- AND when called for `sources/nn/a/report.md` it is returned

#### Scenario: Unresolved ambiguous bare name
- GIVEN a bare citation `report.md@## Intro` matching two Sources
- WHEN the editor resolves it
- THEN it is shown as unresolved or ambiguous, not silently bound to one file

### Requirement: Explorer classifies `export/` as artifact

`utils/explorerClassify.ts` MUST classify files under `export/` as artifacts and MUST NOT classify `artifacts/` as artifacts (no fallback). `FileTreeNode.vue` and `WorkspaceExplorer.vue` MUST show `export/` items in the artifact group.

#### Scenario: Export file classified
- GIVEN `export/report.md`
- WHEN `explorerClassify` runs
- THEN it returns the artifact classification

#### Scenario: No `artifacts/` fallback
- GIVEN `artifacts/report.md`
- WHEN `explorerClassify` runs
- THEN it does not return the artifact classification

### Requirement: Preview modal UI strings are English

`components/editor/FilePreviewModal.vue` MUST present all user-visible strings in English, including the replacements for "Archivo Original", "Linaje", "normalizado", and "cita".

#### Scenario: No Spanish UI strings
- GIVEN the modal component source
- WHEN user-visible template and script strings are scanned for the former Spanish labels
- THEN none remain, and the equivalent English labels render in a component test

### Requirement: Lineage tab uses the single edge

The Lineage tab upstream list MUST come from the sidecar's origin metadata and the file's `sources` citation; downstream MUST come from citations resolved with the core resolver.

#### Scenario: Upstream from artifact `sources:`
- GIVEN an artifact preview whose frontmatter has `sources: [kNNowledge/x_NN.md@## NN Concept: A]`
- WHEN the Lineage tab opens
- THEN upstream shows `kNNowledge/x_NN.md` at that heading

### Requirement: Editor reverse lookup uses canonical path equality

`getSourceCitations` MUST match citers by exact canonical `filePath` equality, as normalized by `parseCitation`. A bare name resolves to `sources/nn/<name>`, so ambiguity surfaces as unresolved.

#### Scenario: Exact path only
- GIVEN citations to `sources/nn/a/report.md` and `sources/nn/b/report.md`
- WHEN downstream citers of `a/report.md` are requested
- THEN only citers with canonical path `sources/nn/a/report.md` are returned

### Requirement: New bluepriNNt versions are registered

Every bluepriNNt version bumped by this change that is not in `frozen_blueprints` MUST be registered through the generated `SHIPPED_BLUEPRINT_VERSIONS` (`npm run sync:versions`), never by hand.

#### Scenario: Registration test passes
- GIVEN domaiNN and the artifacts catalog bumped `blueprint_version`
- WHEN `sync-versions --check` and the editor test suite run
- THEN both pass
