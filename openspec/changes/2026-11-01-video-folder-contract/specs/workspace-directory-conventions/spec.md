# Delta for workspace-directory-conventions

Scope: the video series tree anchored by scope documents and the gitignored engine directories of the new layout. This capability is not named in the proposal; it carries two requirements that contradict the new layout. Design decision ids refer to `design.md` of change `2026-11-01-video-folder-contract`.

## MODIFIED Requirements

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
