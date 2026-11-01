# Workspace Directory Conventions

## Purpose

Folders are write destinations; roles come from names. The layout drops `sources/nn`, `sources/original`, `sources/export`, `sources/archive`, and `export/`, and adds `artifacts/` and a text policy.

## Requirements

### Requirement: Canonical domaiNN layout

The conventions MUST define these write destinations: `kNNowledge/` (documents), `sources/import/` (the only canonical raw-import location), `sources/conversations/` (promoted transcripts), `conversations/` (live session transcripts), `artifacts/` (every producer output), `procedures/`, and `staging/` (scratch). `sources/nn/`, `sources/original/`, `sources/export/`, `sources/archive/`, and `export/` MUST NOT be part of the layout. Sidecars live next to their raw file; there is no mirror tree.

#### Scenario: Fresh bootstrap
- GIVEN a new domaiNN bootstrapped by `nn-trannsform`
- WHEN the directory tree is listed
- THEN `sources/import/`, `sources/conversations/`, `artifacts/`, and `staging/` exist
- AND none of the retired folders exist

### Requirement: Retired layouts are never resolved at runtime

Runtime code MUST NOT read or fall back to retired folders. Existing `sources/archive/` content is inert: it is not walked, not part of any family chain, and a citation into it still resolves as a plain path. Only the migration detector and rewriter MAY refer to them.

#### Scenario: Retired folder present
- GIVEN a workspace that still contains `export/report.md`
- WHEN the lineage projection and discovery run
- THEN `export/report.md` is ignored and the detector (not the runtime) reports the legacy layout

### Requirement: Text policy for byte-stable hashing

Bootstrap MUST ensure the domaiNN root `.gitattributes` contains the line `* -text`, preserving existing lines. Hashing MUST use raw bytes only.

#### Scenario: Bootstrap writes the policy
- GIVEN a new domaiNN
- WHEN bootstrap completes
- THEN `.gitattributes` contains `* -text`

#### Scenario: Existing file preserved
- GIVEN an existing `.gitattributes` without the policy
- WHEN bootstrap runs
- THEN `* -text` is added and the existing lines remain

#### Scenario: CRLF fixture keeps its hash
- GIVEN a CRLF CSV committed with `* -text`
- WHEN it is checked out on Windows and cognitivized
- THEN its sidecar `sha256` equals the hash of the committed bytes

### Requirement: Staging is scratch

`staging/` MUST NOT be discovered, cited, or projected as a lineage node, and write-once rules MUST NOT apply to it.

#### Scenario: Staging ignored
- GIVEN files in `staging/`
- WHEN scans and projections run
- THEN they are not listed or hashed into the record

### Requirement: Series and Video Folder Layout

The workspace directory conventions MUST recognize a `series/` tree for video production: `series/{series-slug}/` holds a Series' scope document `{series-slug}_scope_NN.md` (frontmatter `scope: true`), its shared series assets and its optional `sounds/`, `components/` and `frames/`. The standard `{modelDir}/assets/{video-slug}/` rule then places each Video's own files at `series/{series-slug}/assets/{video-slug}/`.
(Previously: the series folder held a `video-script`-template model file carrying a `series:` frontmatter block and a script template, and the Series model file was said to be the Video Element's `{modelDir}`.)

Source: D1, D9.

#### Scenario: Series tree present in a video-producing workspace
- GIVEN a workspace using the video/Series hierarchy
- WHEN inspecting its top-level layout
- THEN a `series/` directory exists containing one subdirectory per series, each holding a scope document and an `assets/` subdirectory holding that series's Video Elements' folders

#### Scenario: Legacy flat video layout still resolves for existing workspaces
- GIVEN an existing workspace with videos stored at `{modelDir}/assets/{video-slug}/` and no `series/` tree
- WHEN tooling resolves that workspace's video assets
- THEN it continues reading the legacy flat layout as a backward-compatible alias, consistent with this spec's existing alias-resolution pattern

### Requirement: Gitignored Ephemeral Engine Directories

The workspace directory conventions MUST list `build/` and `draft_thumbs/` (inside a video folder) and `.cognnitive/cache/` (at the domain root) as gitignored, ephemeral engine-output directories that MUST NOT be scanned as knowledge inputs, sources, or exports.
(Previously: `renders/` and `.cognnitive-video/`.)

Source: D2.

#### Scenario: Engine directories excluded from workspace scans
- GIVEN a video folder containing `build/` and `draft_thumbs/`
- WHEN a workspace-wide scan (e.g. `nn-trannsform`, manifest reconciliation) runs
- THEN neither directory is treated as a source, export, or discoverable model candidate

#### Scenario: Cache folder excluded
- GIVEN `.cognnitive/cache/` at the domain root
- WHEN a workspace-wide scan runs
- THEN it is not scanned
