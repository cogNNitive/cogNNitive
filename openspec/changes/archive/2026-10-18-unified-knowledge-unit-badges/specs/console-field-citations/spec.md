# Delta for console-field-citations

## MODIFIED Requirements

### Requirement: Native citation detail dialog

Clicking a citation icon MUST open a native `<dialog id="innfo-citation-dialog">` via `showModal()`.

Inside the dialog, each cited source MUST be rendered as a knowledge-unit badge using `Ku` with kind `'source'`. The Source badge:
- Displays the warm paper background token (`--innfo-source-paper`).
- Displays nature as `container` when it is a bare path, or `content` when it points to a specific subunit anchor (`path@unit`).
- Exposes an info button (`[data-ku-action="info"]`) opening `KuInfoPanel` with source metadata (path, anchor, version, sha256, exists flag).
- MUST NOT expose an edit pencil affordance (`editability === 'none'`).

Each entry in the dialog displays: the Source badge, excerpt (with a visible truncation mark when capped), author, version, sha256, and error. Missing optional fields MUST be omitted rather than replaced with placeholders.

(Previously: citations in the dialog were rendered as unbadged plain text with separate link elements.)

#### Scenario: Opening dialog renders Source badge
- GIVEN a citation icon clicked for field `"pricing"`
- WHEN `<dialog id="innfo-citation-dialog">` opens
- THEN each citation renders a `[data-innfo-component="ku-unit"][data-ku-kind="source"]` badge
- AND each Source badge carries its canonical citation address

#### Scenario: Source badge has info action and no edit pencil
- GIVEN a rendered Source badge inside the citation dialog
- WHEN inspected
- THEN an info action (`[data-ku-action="info"]`) exists
- AND no edit pencil (`[data-ku-action="edit"]`) exists
