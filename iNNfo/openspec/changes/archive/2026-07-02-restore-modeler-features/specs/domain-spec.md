# Restore Modeler Features — Specification

## Purpose

Restore three critical workflows in the FORMAT modeler: matrix navigation from the left sidebar, metamodel-driven guidance in the right panel, and file-level save with version bump. These features exist in the archived file-format repository but are missing or stubbed in the unified codebase.

## Requirements

### 1. LeftSidebar — Relations Section

| ID | Requirement | Strength |
|---|---|---|
| R1.1 | LeftSidebar MUST render a collapsible "Relations" section below the "Model" tree | MUST |
| R1.2 | The Relations section MUST list each configured matrix definition as a MatrixPill component | MUST |
| R1.3 | Each MatrixPill MUST show source concept, target concept, and a chevron indicator | MUST |
| R1.4 | Clicking a MatrixPill MUST navigate the user to that matrix in the matrices view | MUST |
| R1.5 | A "Metamatrix Config" button MUST be present in the Relations section header | MUST |
| R1.6 | Clicking "Metamatrix Config" MUST navigate to the MetamatrixConfig view | MUST |
| R1.7 | The Relations section MUST collapse/expand with a chevron toggle | SHOULD |
| R1.8 | When no matrix definitions exist, the Relations section MUST show an empty state | SHOULD |

#### Scenario: Happy path — select matrix from sidebar

- GIVEN a workspace with configured matrix definitions
- WHEN the user clicks a MatrixPill in the Relations section
- THEN uiStore.setActiveView('matrices') is called
- AND uiStore.setActiveMatrixIndex(idx) is called with the matching index

#### Scenario: Edge case — no matrix definitions

- GIVEN a workspace with zero matrix definitions
- WHEN the Relations section renders
- THEN a text indicator "No relations defined" is displayed
- AND the Metamatrix Config navigation button is still visible

### 2. MatricesGrid — Dropdown Visibility Fix

| ID | Requirement | Strength |
|---|---|---|
| R2.1 | The matrix dropdown selector MUST be visible at all times when matrix definitions exist | MUST |
| R2.2 | The dropdown MUST remain interactive even when no matrix is currently selected (activeMatrixIndex < 0) | MUST |

#### Scenario: Happy path — select first matrix

- GIVEN matrix definitions exist and activeMatrixIndex is -1
- WHEN the user opens the dropdown and clicks the first matrix
- THEN activeMatrixIndex is set to 0
- AND the matrix grid renders the selected matrix data

#### Scenario: Edge case — no matrix definitions, dropdown hidden

- GIVEN zero matrix definitions
- WHEN the matrices view renders
- THEN the dropdown is hidden (v-if="matrixDefs.length")
- AND an italic hint "No relational matrices defined" is shown
- AND the empty-state prompt below says "Define them in Metamatrix Config"

### 3. RightGuidanceSidebar — Dynamic Content

| ID | Requirement | Strength |
|---|---|---|
| R3.1 | RightGuidanceSidebar MUST wire to metamodelStore to resolve guidance for the selected concept | MUST |
| R3.2 | The sidebar MUST display the concept's methodology summary when available | MUST |
| R3.3 | The sidebar MUST display the concept's description from metamodel documentation | MUST |
| R3.4 | The sidebar MUST render a list of "Associated Matrices" that reference this concept type | MUST |
| R3.5 | Copyable suggested prompts MUST render with a code-copy button per prompt | SHOULD |
| R3.6 | When no concept is selected, the sidebar MUST show a fallback state | MUST |

#### Scenario: Happy path — concept with documentation

- GIVEN a concept node is selected and documentation.md exists for it
- WHEN the RightGuidanceSidebar renders
- THEN the summary section shows parsed summary content
- AND the description section shows parsed description content
- AND associated matrices are listed as clickable links

#### Scenario: Edge case — no documentation found

- GIVEN a concept node is selected but no documentation.md exists
- WHEN the RightGuidanceSidebar attempts to load guidance
- THEN it shows a helpful message: "No guidance available for this concept"
- AND the panel does not crash or show empty sections

### 4. metamodelStore — Documentation Loading

| ID | Requirement | Strength |
|---|---|---|
| R4.1 | metamodelStore MUST add a `documentation` state (Map or Record keyed by concept name) | MUST |
| R4.2 | metamodelStore MUST provide a `loadDocumentation()` action that reads from `docs/documentation/templates/{name}/{version}/documentation.md` | MUST |
| R4.3 | `loadDocumentation()` MUST use the workspaceStore handle and File System Access API | MUST |
| R4.4 | `loadDocumentation()` MUST call `parseMetamodelDocumentation()` on the raw markdown | MUST |
| R4.5 | metamodelStore MUST expose `getConceptGuidance(name)` returning parsed DocumentationEntry | MUST |
| R4.6 | metamodelStore MUST expose `getMatrixGuidance(matrixDef)` returning relevant documentation entries | MUST |
| R4.7 | Documentation loading MUST be lazy — triggered on first guidance access, not at store init | SHOULD |

#### Scenario: Happy path — load and access documentation

- GIVEN a valid workspace with documentation/templates/{name}/{version}/documentation.md
- WHEN getConceptGuidance('myConcept') is called
- THEN loadDocumentation() fetches and parses the file
- AND returns the DocumentationEntry for 'myConcept'

#### Scenario: Edge case — docs directory missing

- GIVEN a workspace with no docs/documentation/templates/ directory
- WHEN loadDocumentation() is called
- THEN it MUST catch the error gracefully
- AND documentation state remains empty (no crash)

### 5. workspaceStore — Save Actions

| ID | Requirement | Strength |
|---|---|---|
| R5.1 | workspaceStore MUST implement a `saveActiveFile()` action | MUST |
| R5.2 | `saveActiveFile()` MUST call `recursiveSerialize()` with the workspace handle, dirtyIds, and model graph | MUST |
| R5.3 | After successful write, `saveActiveFile()` MUST clear all dirtyIds | MUST |
| R5.4 | workspaceStore MUST implement a `saveActiveFileWithVersionBump(level)` action | MUST |
| R5.5 | The version bump action MUST parse the current filename using `parseFormatFilename()` | MUST |
| R5.6 | The version bump action MUST compute a new SemVer using `bumpVersion(v, level)` | MUST |
| R5.7 | The version bump action MUST build the new filename with `buildFormatFilename()` | MUST |
| R5.8 | The version bump action MUST create a new file with the bumped name via File System Access API | MUST |
| R5.9 | The version bump action MUST update the root node's frontmatter `version` field | MUST |
| R5.10 | Both actions MUST handle File System Access permission errors with a user-facing message | MUST |

#### Scenario: Happy path — save with no version bump

- GIVEN dirty nodes exist and a valid workspace handle is held
- WHEN saveActiveFile() is called
- THEN recursiveSerialize writes all dirty nodes to disk
- AND dirtyIds is cleared
- AND the Header status updates to "Saved"

#### Scenario: Happy path — save with version bump (patch)

- GIVEN a current file "MyModel_V_0-1-0_business_FORMAT.md"
- WHEN saveActiveFileWithVersionBump('patch') is called
- THEN the new file "MyModel_V_0-1-1_business_FORMAT.md" is created
- AND the root node's rawContent frontmatter is updated to V_0-1-1
- AND the original file is preserved (not deleted)

#### Scenario: Edge case — File System permission revoked

- GIVEN the user revoked write permission on the workspace handle
- WHEN saveActiveFile() is called
- THEN the action catches the DOMException
- AND a user-facing toast/error message is displayed
- AND dirtyIds are NOT cleared

### 6. Header — Version Bump Wiring

| ID | Requirement | Strength |
|---|---|---|
| R6.1 | The version bump dropdown buttons (major/minor/patch) MUST call workspaceStore.saveActiveFileWithVersionBump(level) | MUST |
| R6.2 | The "Save" button MUST call workspaceStore.saveActiveFile() | MUST |
| R6.3 | The Save dropdown MUST close after a successful version bump | SHOULD |
| R6.4 | The Header SHOULD show a brief success toast after save or version bump | SHOULD |

#### Scenario: Happy path — version bump via dropdown

- GIVEN the user has dirty nodes and clicks the dropdown chevron
- WHEN the user clicks "patch" in the version bump dropdown
- THEN saveActiveFileWithVersionBump('patch') is dispatched to workspaceStore
- AND the header shows the updated version number

#### Scenario: Edge case — version bump with no root node

- GIVEN hasRootNode is false (no model loaded)
- WHEN the user clicks any version bump button
- THEN nothing happens (button clicks are no-ops)
- AND no error is thrown

## Acceptance Criteria

| Component | Criterion | Verification |
|---|---|---|
| LeftSidebar | Relations section renders MatrixPills, click navigates to matrix view | Manual: open matrices view from sidebar pill |
| MatricesGrid | Dropdown visible when matrixDefs exist but activeMatrixIndex = -1 | Visual: dropdown appears above empty-state text |
| RightGuidanceSidebar | Shows concept summary + description from documentation.md | Visual: no placeholder text, real content renders |
| metamodelStore | loadDocumentation reads docs path; getConceptGuidance returns entries | Unit: mock FS handle, verify parsed output |
| workspaceStore | saveActiveFile writes dirty nodes; saveActiveFileWithVersionBump creates bumped copy | Integration: test with fake DirectoryHandleLike |
| Header | Version bump buttons dispatch to workspaceStore | Unit: spy on workspaceStore action |
