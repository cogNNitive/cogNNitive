# Delta for Workspace Directory Conventions

## ADDED Requirements

### Requirement: Series and Video Folder Layout

The workspace directory conventions MUST recognize a `series/` tree for video production: `series/{series-slug}/` holds a Series' registry file, script template, and shared series assets; `series/{series-slug}/videos/{video-slug}/` holds one Video's own files. This layout replaces the single-level `{modelDir}/assets/{video-slug}/` rule from the `video` template's V_0-2-1 prose for any workspace producing videos through a Series.

#### Scenario: Series tree present in a video-producing workspace
- GIVEN a workspace using the video/Series hierarchy
- WHEN inspecting its top-level layout
- THEN a `series/` directory exists containing one subdirectory per series, each with its own `videos/` subdirectory

#### Scenario: Legacy flat video layout still resolves for existing workspaces
- GIVEN an existing workspace with videos stored at `{modelDir}/assets/{video-slug}/` and no `series/` tree
- WHEN tooling resolves that workspace's video assets
- THEN it continues reading the legacy flat layout as a backward-compatible alias, consistent with this spec's existing alias-resolution pattern

### Requirement: Gitignored Ephemeral Engine Directories

The workspace directory conventions MUST list `renders/` and `.anydeo/` (wherever they occur inside a video or series folder) as gitignored, ephemeral engine-output directories that MUST NOT be scanned as knowledge inputs, sources, or exports.

#### Scenario: Engine directories excluded from workspace scans
- GIVEN a video folder containing `renders/` and `.anydeo/`
- WHEN a workspace-wide scan (e.g. `nn-trannsform`, manifest reconciliation) runs
- THEN neither directory is treated as a source, export, or discoverable model candidate
