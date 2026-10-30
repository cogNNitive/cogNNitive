# Video Folder Contract Specification

## Purpose

Defines the three-level asset scoping (workspace, series, video), the rule that a script's asset paths never escape its own Series folder, the ephemeral/gitignored engine directories, and the finalize/register step that promotes rendered output into Element-owned storage.
## Requirements
### Requirement: Three-Level Asset Scoping

Assets MUST be scoped at exactly three levels: workspace (shared across all series), series (shared across all videos of one series — e.g. `series/{series-slug}/assets/`), and video (owned by one video — e.g. `series/{series-slug}/videos/{video-slug}/`). Exact segment names MAY be refined during implementation as long as the three-level scoping and the containment rule below hold.

#### Scenario: Video-owned files resolve inside the video's own folder
- GIVEN a Video in Series `X`
- WHEN its `script`, `thumbnail`, `voiceover`, and `master` fields are resolved
- THEN all four resolve to files inside that Video's own folder under Series `X`

### Requirement: No-Upward-Escape Rule

A script's asset paths MUST NOT resolve above its scope root: the domaiNN root, or the
nearest `isolate` scope when one is in the chain. Paths MAY resolve into an ancestor scope
of the script (for example from a Video into its Series or into the domaiNN root) when the
resolved location is inside the scope root. Paths that climb outside the scope root, or
into a sibling scope's private folder, are invalid.
(Previously: asset paths MUST NOT resolve above the script's own Series folder, so
`../../assets/x.mp4` reaching a workspace-level folder was invalid.)

#### Scenario: In-scope asset path is accepted

- GIVEN a script referencing an asset inside its own video or series folder
- WHEN the folder-contract check runs
- THEN the reference is accepted

#### Scenario: Ancestor-scope asset path is accepted

- GIVEN a script in Series `X` referencing `../../assets/x.mp4` that resolves to `assets/x.mp4` inside the domaiNN root
- WHEN the folder-contract check runs
- THEN the reference is accepted

#### Scenario: Path above the scope root is rejected

- GIVEN a script referencing a path that resolves to a location above the domaiNN root
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

#### Scenario: Path beyond an isolate boundary is rejected

- GIVEN a Series scope with `isolate: true` and a script referencing an asset in the enclosing domaiNN root's `assets/`
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

#### Scenario: Sibling series folder is rejected

- GIVEN a script in Series `X` referencing a file under Series `Y`'s private folder
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

### Requirement: Ephemeral Engine Directories Are Not Artifacts

`renders/` and `.cognnitive-video/` MUST be gitignored and MUST NOT be treated as iNNfo Artifacts. They hold transient engine output, not workspace-owned deliverables.

#### Scenario: Engine directories excluded from artifact discovery
- GIVEN a video folder containing `renders/` and `.cognnitive-video/`
- WHEN artifact/manifest discovery runs
- THEN neither directory nor its contents are treated as candidate Artifacts

### Requirement: Finalize/Register Step Promotes Rendered Output

The generic procedure MUST include a finalize/register step that copies `master`, `thumbnail`, and `voiceover` out of `renders/<id>/` into the Video Element's own asset location, generalizing the "Resolve video assets" step used in iNNtrevistas.

#### Scenario: Rendered output is promoted on finalize
- GIVEN a completed render at `renders/<id>/master.mp4`
- WHEN the finalize/register step runs
- THEN `master.mp4` is copied into the Video's own folder and the Video Element's `master` field is set to reference it

#### Scenario: Ephemeral render directory is not itself referenced
- GIVEN the finalize/register step has completed
- WHEN the Video Element's fields are inspected
- THEN none of them reference a path inside `renders/` or `.cognnitive-video/`

