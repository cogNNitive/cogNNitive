# Delta: FORMAT V_0-1-3 Unified

Patches `specs/FORMAT_V_0-1-2_FORMAT.md` → V_0-1-3. Removes FILE/FOLDER mode dichotomy, introduces workspace `index.md`, adds `asset_mode` and `slug` frontmatter.

## ADDED Requirements

### FR-001: Workspace index.md

A FORMAT workspace MUST have an `index.md` at root. The application SHALL read `index.md` as the single entry point — no filesystem scanning.

`index.md` SHALL use `_F index` syntax with wikilinks listing all workspace models:

```markdown
# _F index
* [[Business Model_V_1-0-0_business_FORMAT.md]]
* [[KB Model_V_1-0-0_kb_FORMAT.md]]
```

(Reason: Replaces FOLDER-mode filesystem discovery with declarative membership.)

#### Scenario: Workspace with valid index.md

- GIVEN a workspace root with `index.md` containing valid wikilinks to existing `*_FORMAT.md` files
- WHEN the parser reads the workspace
- THEN all listed models are loaded into the graph

#### Scenario: Missing index.md

- GIVEN a workspace root with no `index.md`
- WHEN the application starts
- THEN the application SHALL return an error

#### Scenario: index.md lists non-existent model

- GIVEN an `index.md` wikilink referencing a file that does not exist
- WHEN the parser resolves the link
- THEN the parser SHALL emit a warning and skip the missing file

### FR-002: Element slug

Elements MAY declare an optional `slug` in their YAML frontmatter. If absent, the parser SHALL derive the slug from the element name: kebab-case, no accents, spaces → hyphens.

#### Scenario: Slug declared

- GIVEN an element with `slug: "my-element"` in YAML fields
- WHEN the element is parsed
- THEN `my-element` is used as the slug

#### Scenario: Slug derived from name

- GIVEN an element named `"My Great Element"` with no declared slug
- WHEN the element is parsed
- THEN the slug SHALL be `my-great-element`

#### Scenario: Colliding derived slugs

- GIVEN two elements whose names derive to the same slug (e.g., `"My Element"` and `"my element"`)
- WHEN the parser normalizes elements
- THEN it SHALL raise an error

### FR-003: Asset field types

Concept field schemas MAY declare `type: image | file | video | audio`. Paths are relative to the model file's directory. Asset resolution uses the literal field value as the path.

#### Scenario: Image field renders thumbnail

- GIVEN a field with `type: "image"` and value `"assets/photo.png"`
- WHEN the widget renders
- THEN it SHALL display an image thumbnail

#### Scenario: File field renders icon

- GIVEN a field with `type: "file"` and value `"docs/report.pdf"`
- WHEN the widget renders
- THEN it SHALL display a file icon with the filename

#### Scenario: Missing asset file

- GIVEN a field with a path to a non-existent file
- WHEN the application resolves the asset
- THEN it SHALL emit a warning

### FR-004: Asset mode declaration

Models MAY declare `asset_mode: "centralized" | "per-element"` in frontmatter. Default is `"centralized"`.

- `"centralized"`: All assets resolved from `assets/` directory relative to model file
- `"per-element"`: Assets resolved from `<slug>/` subdirectory

#### Scenario: Centralized mode

- GIVEN a model with `asset_mode: "centralized"` (or absent) and element with `assets/photo.png`
- WHEN the asset is resolved
- THEN the path is `<model-dir>/assets/photo.png`

#### Scenario: Per-element mode

- GIVEN a model with `asset_mode: "per-element"` and element slug `"my-el"` with field value `photo.png`
- WHEN the asset is resolved
- THEN the path is `<model-dir>/my-el/photo.png`

### FR-005: Unique element names across workspace

Element names SHALL be globally unique across all models in a workspace.

#### Scenario: Colliding names across models

- GIVEN two models in the same workspace each containing an element named `"Database"`
- WHEN the parser merges elements into the graph
- THEN it SHALL error with a suggestion: `"Database (ModelName)"`

#### Scenario: All names unique

- GIVEN a workspace where every element name is unique
- WHEN the parser merges
- THEN no collision error is emitted

### FR-006: No individual element files on disk

The parser SHALL NOT read `_FORMAT.md` files found in subdirectories unless they are explicitly listed in `index.md`. Element data exists only within the root model file body.

#### Scenario: Orphan _FORMAT.md in subdirectory

- GIVEN a subdirectory containing an `_FORMAT.md` not listed in `index.md`
- WHEN the parser runs
- THEN it SHALL ignore the orphan file

## MODIFIED Requirements

### FR-007: Level 3 frontmatter (previously: included `mode`)

A level 3 model frontmatter MUST NOT include `mode: "FILE" | "FOLDER"`. It MAY include `asset_mode: "centralized" | "per-element"` (optional, default `"centralized"`).

(Previously: required `mode: "FILE"` or `mode: "FOLDER"` or `mode: ["FILE", "FOLDER"]`.)

Frontmatter for level 3:

```yaml
specification_version: "V_0-1-3"
specification_url: "..."
level: 3
parent:
  name: "<template>_V_x-y-z"
  url: "<immutable-url>"
model_version: "V_x-y-z"
title: "..."
asset_mode: "centralized"       # optional, default "centralized"
```

#### Scenario: Model with no mode or asset_mode

- GIVEN a level 3 model with no `mode` or `asset_mode` in frontmatter
- WHEN the parser reads it
- THEN the parser SHALL accept it (graceful ignore for absent `mode`, default `asset_mode` to `"centralized"`)

#### Scenario: Model with `mode: "FILE"`

- GIVEN a level 3 model declaring `mode: "FILE"`
- WHEN the parser reads it
- THEN the parser SHALL accept it with graceful ignore (deprecated field, no error)

#### Scenario: Model with `mode: "FOLDER"`

- GIVEN a level 3 model declaring `mode: "FOLDER"`
- WHEN the parser reads it
- THEN the parser SHALL reject with an error (FOLDER mode is removed)

### FR-008: Body syntax (previously: FILE mode body syntax)

§5 renamed from "FILE Mode Body Syntax" to "Model Body Syntax". All references to "FILE mode" in the document SHALL be replaced with "model" or removed. The body syntax itself is unchanged.

(Previously: §5 titled "FILE Mode Body Syntax", every section qualified with "FILE mode".)

#### Scenario: Body syntax remains unchanged

- GIVEN a level 3 model with valid concept blocks, index block, and matrix block
- WHEN the parser reads the body
- THEN the existing body parsing logic for Document Notice, Index Block, Concept Block, Matrix Block SHALL work identically

### FR-009: Relationship type representation

Relationship types MUST NOT include `folder_representation` property. Only `representation` SHALL remain.

(Previously: each relationship type had both `file_representation` and `folder_representation`.)

#### Scenario: Relationship declaration without folder_representation

- GIVEN a template declaring `representation: "index block (wikilinks)"` for `hierarchy`
- WHEN the template is validated
- THEN it SHALL pass validation (no `folder_representation` expected)

## REMOVED Requirements

### FR-010: Representation mode system (§2, §2.1, §2.2)

(Reason: FILE/FOLDER mode dichotomy eliminated. Single-file format is the only representation.)
(Migration: All FOLDER-mode models must be converted to single-file format with `index.md` at workspace root.)

### FR-011: FOLDER mode body structure (§6)

(Reason: FOLDER mode removed — §6 (FOLDER mode body structure) is no longer applicable.)
(Migration: Element `_FORMAT.md` subdirectory files are replaced by element body syntax in the root model file.)

### FR-012: Template mode declaration

(Reason: Templates no longer need to declare supported modes since only one mode exists.)
(Migration: Remove `mode` from template frontmatter.)
