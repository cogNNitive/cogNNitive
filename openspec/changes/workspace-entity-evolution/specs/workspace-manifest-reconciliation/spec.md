# Workspace Manifest Reconciliation

## Purpose

Keep `## NN ModelRef` entries in the workspace manifest additively synchronized with discovered Level-3 model files via a pure, ownership-marked reconciliation function, reachable from both the editor's save path and an `innfo-mcp` `sync_workspace_manifest` tool, without ever touching hand-authored entries or reordering the manifest.

## Requirements

### Requirement: Pure Additive Reconciliation Function

`innfo-core` MUST expose a pure `reconcileManifest(manifestContent: string, discovered: DiscoveredModel[]) => { content: string; changes: ManifestChange[] }` in `src/workspace/reconcileManifest.ts`. It MUST perform no file I/O. Because `ModelNode.rawSections` never carries element-bearing sections (a `# NN ModelRef` section, which contains elements, is never captured there — verified during design), it MUST round-trip untouched entries byte-identically by locating existing entries via a read-only parse and splicing only the changed spans into the original string, rather than re-serializing the whole document. When no change is needed for a given manifest, `reconcileManifest` MUST return the exact same string reference it was given (`result.content === manifestContent`), not merely an equal value.

#### Scenario: Untouched entries round-trip byte-identically
- GIVEN a manifest with a hand-authored `## 03 ModelRef: Legacy System` entry and a discovered set that already includes it
- WHEN `reconcileManifest()` runs
- THEN the entry's raw content in the returned `content` is byte-identical to the input

### Requirement: Discovery Scope for Level-3 Model Files

Reconciliation MUST discover candidate files by: frontmatter `level: 3` with `parent_spec` present, filename matching `*_NN.md`, located outside `{backups, archive, specs}`, excluding the manifest itself and any model conforming to a `cogNNitive` template. Discovery MUST NOT run against ingested sources (`## NN Sources:` elements in a provenance model are never treated as `ModelRef` candidates).

#### Scenario: Level-3 domain model is discovered
- GIVEN a file `startups/acme_business_NN.md` with `level: 3` and `parent_spec: business_V_0-2-0`, outside `backups/archive/specs`
- WHEN discovery runs
- THEN it is included as a candidate for manifest reconciliation

#### Scenario: cogNNitive provenance model and ingested sources excluded
- GIVEN `acme_cogNNitive_NN.md` (conforms to a `cogNNitive` template) and its `## NN Sources:` elements
- WHEN discovery runs
- THEN neither the provenance model nor its ingested sources are treated as `ModelRef` candidates

### Requirement: Explicit Ownership Marker and Additive Entry Changes

Reconciliation MUST only modify entries carrying an explicit `<!-- nn:auto -->` ownership marker. New entries for newly discovered files MUST be appended to the end of the `## NN ModelRef` section, never inserted or reordered among existing entries. A deleted file's corresponding owned entry MUST have its `status` set to `archived` and MUST NOT be removed from the manifest.

#### Scenario: New model file appends a marked entry
- GIVEN a newly created `startups/beta_business_NN.md` not yet present in the manifest
- WHEN `reconcileManifest()` runs
- THEN a new `## NN ModelRef: Beta Business` entry carrying `<!-- nn:auto -->` is appended after the last existing entry
- AND no existing entry is reordered

#### Scenario: Deleted model file archives its entry instead of deleting it
- GIVEN an owned, marked `## NN ModelRef: Acme Business` entry whose `path` no longer resolves to an existing file
- WHEN `reconcileManifest()` runs
- THEN the entry's `status` is set to `archived`
- AND the entry itself remains present in the manifest content

#### Scenario: Hand-authored entry without the ownership marker is never modified
- GIVEN a `## NN ModelRef: Manual Entry` without `<!-- nn:auto -->`, whose `path` no longer resolves to a file
- WHEN `reconcileManifest()` runs
- THEN the entry is left completely unmodified, including its `status`

### Requirement: Matching Key Between Discovered Files and Existing Entries

Reconciliation MUST match a discovered file to an existing `ModelRef` entry using `normalizePathKey` applied to both the discovered file's path and the entry's `path` field.

#### Scenario: Path normalization matches despite casing or prefix differences
- GIVEN a discovered file at `Startups/Acme_Business_NN.md` and an existing entry with `path:: ./startups/acme_business_NN.md`
- WHEN `reconcileManifest()` matches discovered files to entries
- THEN both normalize to the same key and are treated as the same model, avoiding a duplicate entry

### Requirement: Editor and MCP Tool Callers Over the Shared Pure Function

Both `innfo-editor` and an `innfo-mcp` `sync_workspace_manifest` tool MUST call `reconcileManifest()` and write the returned `content` back to disk only when at least one non-`skipped-not-owned` change is present. There is no native filesystem-watch primitive available to the editor (the browser File System Access API exposes none), so the editor MUST trigger reconciliation from its own save path instead. The MCP tool MUST support a `dry_run` mode (default `true`) that reports `changes` (and a diff) without writing, and is the sanctioned headless/CLI-equivalent entry point — there is no separate actioNN binary for this.

#### Scenario: Editor reconciles the manifest after saving a model file
- GIVEN the editor saves a new Level-3 model file to disk
- WHEN the save completes
- THEN it calls `reconcileManifest()` and persists the updated manifest content only if a change was produced

#### Scenario: MCP tool dry-run reports without writing
- GIVEN `sync_workspace_manifest` is invoked with `dry_run: true` (the default)
- WHEN it runs `reconcileManifest()` against the workspace
- THEN it reports the computed `changes` and a diff
- AND the manifest file on disk is not modified
