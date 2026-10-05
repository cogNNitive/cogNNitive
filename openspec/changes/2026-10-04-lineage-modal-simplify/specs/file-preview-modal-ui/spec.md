# File Preview Modal UI Specification (delta)

## ADDED Requirements

### Requirement: Original File action is always visible

The modal MUST always show the `Original File` row with its "open in a new tab"
action. When the previewed file declares no `source_file`, the row MUST remain
visible with the action disabled (and a placeholder value), rather than being
hidden.

#### Scenario: Source file present

- GIVEN a previewed file whose frontmatter declares `source_file`
- WHEN the modal renders
- THEN the Original File row and its enabled open action are visible

#### Scenario: No source file present

- GIVEN a previewed file with no `source_file`
- WHEN the modal renders
- THEN the Original File row is visible
- AND its open action is disabled

### Requirement: Low-signal metadata is collapsed behind a more-menu

The SHA-256, Size/Status, and Normalized At cards MUST NOT occupy a permanent
horizontal strip. They MUST be reachable from a `⋯` (more) control in the modal
header. The metadata MUST still be present and readable when the control is opened.

#### Scenario: Metadata is not shown by default

- GIVEN the modal is open
- WHEN the header is rendered
- THEN the SHA-256, Size/Status, and Normalized At cards are not visible

#### Scenario: Metadata is reachable

- GIVEN the modal is open
- WHEN the user activates the more control
- THEN the SHA-256, Size/Status, and Normalized At values are shown

### Requirement: Mode toggles are compact icons

The view-mode controls (`Preview`, `Code`, `Lineage`) MUST be rendered as compact
icon buttons with accessible labels/tooltips, not as a row of three text buttons,
so the header stays small.

#### Scenario: Icons carry accessible names

- GIVEN the modal header
- WHEN the mode controls render
- THEN each control is an icon button with a title/aria-label naming its mode

### Requirement: The traceability affirmation is not a permanent footer band

The "Traceability verified with iNNFo specification" affirmation MUST NOT occupy a
persistent footer row together with a redundant Close button. Closing is provided
by the header close control.

#### Scenario: Close remains available

- GIVEN the modal is open
- WHEN the header close control is activated
- THEN the modal closes
