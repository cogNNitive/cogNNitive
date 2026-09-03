# Template Ghost Concepts Specification

## Purpose

Expose template concepts absent from the model as ghost groups in the sidebar, with type-aware presence detection and a 3-state filter toggle.

## Requirements

### R-TGC-01: Ghost Concept Groups

Template concepts with zero instances in the model MUST render as ghost groups in the sidebar when the active filter mode is `All` or `Template only`.

#### Scenario: Absent concept renders ghost in "All" mode

- GIVEN filter mode is `All` and a template concept has zero instances
- WHEN the sidebar tree renders
- THEN the concept appears as a ghost group

#### Scenario: Present concept never renders ghost

- GIVEN a concept with one or more instances in the model
- WHEN the sidebar tree renders in any filter mode
- THEN the concept does NOT render as a ghost group

### R-TGC-02: Type-Aware Presence Detection

The system MUST determine concept "presence" using type-specific rules:
- `text`: present if a `# NN <Concept>` raw section exists on a root Element, or (as a fallback) if any Element's type matches the concept
- `weight`/`list`/`steps`/`sequence`: present if one or more Elements of that concept type exist
- `category`: present if one or more Elements of that concept type exist and at least one of them has children

#### Scenario: Text concept detected via raw section

- GIVEN a `text` concept `Goal` with a `# NN Goal` raw section on a root Element
- WHEN presence is computed
- THEN `Goal` is NOT listed as a ghost

#### Scenario: List concept detected via its Elements

- GIVEN a `list` concept `Milestone` with one or more Elements of type `Milestone`
- WHEN presence is computed
- THEN `Milestone` is NOT listed as a ghost

#### Scenario: Category present when an Element of that type has children

- GIVEN a `category` concept `Main` with an Element of type `Main` that has one or more children
- WHEN presence is computed
- THEN `Main` is NOT listed as a ghost

#### Scenario: Category ghost when no Element of that type has children

- GIVEN a `category` concept `EmptyCat` where no Element of type `EmptyCat` has children (or no such Element exists)
- WHEN presence is computed
- THEN `EmptyCat` IS listed as a ghost

### R-TGC-03: 3-State Filter Toggle

The sidebar MUST include a filter toggle control that cycles through three view modes: `Model only` (present concepts only), `Template only` (ghost concepts only), and `All` (present + ghost concepts together). The current mode MUST be persisted in `uiStore.ghostFilterMode`.

#### Scenario: Toggle cycles through all three modes

- GIVEN the filter toggle is at `Model only`
- WHEN the user clicks the toggle
- THEN the mode advances to `Template only` — only ghost concepts visible
- AND a second click advances to `All` — both present and ghost visible
- AND a third click returns to `Model only` — only present concepts visible

#### Scenario: "Model only" hides all ghosts

- GIVEN filter mode is `Model only`
- WHEN the sidebar tree renders
- THEN no ghost groups appear in the tree

### R-TGC-04: Add Action on Ghost Groups

Each ghost group MUST provide an "Add" action that creates the corresponding concept section and first element via `apply_change({ op: "add_element" })`, transitioning the group from ghost to present.

#### Scenario: Add creates element and removes ghost state

- GIVEN a ghost group for concept `Milestone`
- WHEN the user clicks "Add" and provides element name `M1`
- THEN `apply_change({ op: "add_element", conceptName: "Milestone", elementName: "M1" })` is invoked
- AND the group transitions from ghost to present

### R-TGC-05: Ghost Group Visual State

Ghost concept groups MUST render with `opacity: 0.55`, a dashed left border (`2px dashed` in concept color), italicized name, and a muted empty-state indicator.

#### Scenario: Ghost group renders with distinct visual style

- GIVEN a ghost group for concept `Milestone` (resolved color `blue`)
- WHEN the group header renders
- THEN the header has `opacity: 0.55`
- AND the left border is `2px dashed blue`
- AND the concept name is italicized
- AND a muted "Add first element" indicator is visible
