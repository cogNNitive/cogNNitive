# Delta for Console UI Kit

## MODIFIED Requirements

### Requirement: InnfoUI Component Contract

`console/ui-kit.js` MUST expose a UMD global `InnfoUI` whose components are pure functions `(data, opts) -> HTMLElement`, each marked with `data-innfo-component`, whose values are kebab-case: `ku-unit`, `ku-info-panel`, `element-card`, `status-badge`, `citation-icon`, `draft-list`, `annotation-popover`, `reviewed-toggle`, `rail-progress`. The legacy component ids `concept-pill`, `element-pill`, `marker-chip`, `qud-chip`, `ku-badge`, `ku-actions`, `ku-change-pip`, and `field-row` are deleted without aliases or delegating wrappers. Components MUST NOT use shadow DOM, `fetch(`, `type=module`, or global state, MUST expose state through `data-*` attributes, and MUST render user text via text nodes (no `innerHTML` with data). Invalid `data` or an unknown kind MUST throw a `TypeError` naming the component or kind.
(Previously: the contract listed `concept-pill`, `element-pill`, `marker-chip`, `ku-badge`, `ku-actions`, `ku-change-pip`.)

#### Scenario: Purity and no shadow DOM
- GIVEN any component called twice with equal inputs
- THEN the results are distinct, structurally equal elements with `shadowRoot === null`

#### Scenario: Script-injection text is inert
- GIVEN `data.label` containing `<img src=x onerror=alert(1)>`
- WHEN rendered
- THEN the label appears as text and no `img` element exists

#### Scenario: Invalid input or unknown kind throws
- GIVEN `Ku("unknown-kind", {})` or `describeUnit("unknown-kind", {})`
- THEN it throws a `TypeError` naming the unknown kind

#### Scenario: Legacy builders deleted
- GIVEN the built kit and console sources
- WHEN searched for `ConceptPill`, `ElementPill`, `MarkerChip`, `QudChip`, `KuBadge`, `KuActions`
- THEN no definition or export exists

---

### Requirement: Knowledge-Unit Badge Family

The kit MUST provide a pure descriptor generator `describeUnit(kind, ref, index)` and a single DOM builder `Ku(kind, ref, opts)` returning a wrapper element (`span.innfo-ku-wrap`, `data-innfo-component="ku-unit"`). Every unit is rendered across two orthogonal axes:
- **nature**: `container` (domain, document, section), `structure` (concept definition, field definition, matrix definition), or `content` (element, value, matrix cell, source unit).
- **home**: `domain`, `blueprint`, `knowledge`, or `source` (derived via `unitHome`).

Visual grammar:
- Container units use a double border.
- Structure units use a dashed border and monospace typography.
- Content units use a solid border.
- Source units use a warm paper background token (`--innfo-source-paper`, with contrast-tested light and dark variants).
- Concept identity is encoded via the concept color token.
- Badges carry `aria-label` spelling out nature and home (e.g., `"structure, lives in bluepriNNt: Field owner"`).

Allowed kinds: `domain`, `document`, `section`, `element`, `value`, `concept`, `field`, `matrix`, `source`.
- `value` units carry `vtype` from the declared L1 0-5-0 Field type or widget (`string`, `select`, `reference`, `number`, `boolean`, `markdown_inline`, `image`, etc.).
- When `opts.variant === 'block'`, `Ku` renders a framed block container (`data-ku-variant="block"`) for markdown, media, code, or reference blocks.
- Tags render as `value` badges of an ordinary `select` field, colored by a stable hash of the tag name (`UI.tagSlot`).
- Every badge carries `data-ku-address`, `data-ku-kind`, `data-ku-nature`, and `data-ku-home`.

No action control MUST be nested inside the badge root.

(Previously: `KuBadge` rendered kind-specific badges with kinds `document`, `element`, `concept`, `field`, `cell`, `marker`, `reference` and nested action clusters.)

#### Scenario: Every kind renders nature, home, and address
- GIVEN `describeUnit` and `Ku` called with valid units for each of the nine kinds
- THEN each returns `data-innfo-component="ku-unit"` with matching `data-ku-kind`, `data-ku-nature`, `data-ku-home`, and `data-ku-address`
- AND `aria-label` describes both nature and home

#### Scenario: Block variant for structured values
- GIVEN `Ku("value", ref, { variant: "block", body: contentNode })`
- THEN the container has `data-ku-variant="block"` and wraps `contentNode`

#### Scenario: Tag renders as select value badge
- GIVEN a tag value `"pricing"` on field `"tags"`
- THEN it renders as a `value` badge with `data-ku-kind="value"`, `data-field="tags"`, and a color slot derived from `"pricing"`

#### Scenario: Script-injection text is inert
- GIVEN `data.label` containing `<img src=x onerror=alert(1)>`
- WHEN an `element` badge renders it
- THEN the label appears as text and no `img` element exists

---

### Requirement: Unit Action Cluster

`Ku` MUST render the unit's action controls immediately outside the badge root, in a sibling container (`span.innfo-ku-actions`).
- Action cluster inline width MUST be reserved inside cell or row padding to ensure zero layout shift when revealing controls.
- Action icons MUST reveal on `:hover` or `:focus-within` of `.innfo-ku-wrap`, and remain visible while pointer is over the cluster until Escape or blur.
- Under `@media (hover: none)`, action controls MUST remain permanently visible in normal static flow.
- Every action button MUST meet WCAG 2.2 AA 2.5.8 target size (minimum 24x24 px).
- The **info** button (`[data-ku-action="info"]`) MUST be present for EVERY kind, opening `KuInfoPanel`.
- The **edit** button (`[data-ku-action="edit"]`, pencil) MUST be emitted whenever `editability !== 'none'`.
- Review-mode gating is enforced via CSS: `html:not([data-innfo-review=on])` and `html:not([data-innfo-structure=on])` set `display: none` on edit buttons.
- Keyboard navigation within any `[data-ku-group]` (card, table row, matrix row) MUST use a single tab stop with roving `tabindex`. Arrow keys move between units and action buttons.

(Previously: `KuActions` was a standalone component that was omitted when callbacks were absent.)

#### Scenario: Action width reserved with no layout shift
- GIVEN a table cell rendering a `Ku` badge
- WHEN hovered or focused
- THEN `.innfo-ku-actions` becomes visible without shifting adjacent text or badges

#### Scenario: Target size satisfies WCAG 2.5.8
- GIVEN rendered action buttons in `.innfo-ku-actions`
- WHEN their bounding box is evaluated
- THEN every target is at least 24x24 px

#### Scenario: Info action exists for every kind
- GIVEN any unit kind rendered via `Ku`
- THEN `[data-ku-action="info"]` exists in its action cluster

#### Scenario: Mobile touch keeps actions visible
- GIVEN `@media (hover: none)`
- WHEN `Ku` renders
- THEN `.innfo-ku-actions` is statically positioned and visible without hover

---

### Requirement: Pending-Change Pip

`Ku` MUST render a pending-change pip (`button[data-innfo-component="ku-change-pip"]`) beside the badge whenever pending changes exist for that unit's address:
- Pip count MUST equal the pending draft count for `data-ku-address`.
- The pip MUST carry `aria-label="<n> pending changes on <unit-label>"`.
- Activating the pip MUST trigger the changes action for that address.
- `setUnitChanges(root, countsByAddress)` MUST update pip counts across the DOM keyed by canonical address.

(Previously: pips were children of `KuBadge` and keyed only by local element/field context.)

#### Scenario: Pip reflects count by address
- GIVEN unit address `"strategy@vision&statement"` with 2 pending drafts
- WHEN `setUnitChanges` updates the tree
- THEN the badge carries `data-ku-changes="2"` and the pip text is `"2"`

#### Scenario: Matrix cell receives pip
- GIVEN matrix cell address `"swot@swot-matrix&strength-1&opportunity-1"` with 1 draft
- WHEN `setUnitChanges` runs
- THEN the cell badge renders a pip with count `1`

---

### Requirement: ElementCard

`InnfoUI.ElementCard({ id, name, conceptId?, description?, fields }, opts)` MUST return `data-innfo-component="element-card"` with `data-element-id`.
- The element name in `.innfo-card-head` MUST render as a `Ku` badge of kind `element`.
- Each field MUST render as a `Ku` badge of kind `value` (or `Ku` block variant for complex types) with actions outside.
- An inherited concept-level field value MUST render labelled `"inherited from <Concept>"` and MUST have editability `none` (info only).
- `.innfo-card-head` MUST NOT contain `marker-chip` or legacy pill components.
(Previously: the card accepted `markers` and rendered `marker-chip` elements in the head.)

#### Scenario: Element name and fields rendered via Ku
- GIVEN an element with name `"Slimer"` and two fields
- WHEN `ElementCard` renders
- THEN `.innfo-card-head` contains `[data-innfo-component="ku-unit"][data-ku-kind="element"]`
- AND field values render as `[data-innfo-component="ku-unit"][data-ku-kind="value"]`

#### Scenario: Inherited value is info-only on element card
- GIVEN a card displaying an inherited concept-level value `"core"` from concept `"Threat"`
- WHEN rendered
- THEN the value badge shows `"inherited from Threat"`
- AND no edit pencil is rendered or enabled on that card

---

### Requirement: Renderers Consume the Kit

All console renderers (`mountElementTable`, `renderMatrices`, cards, rail, facets, guide, dialogs, stepper, timeline, and custom views) MUST build knowledge units exclusively through `ctx.ui.Ku`.
- A two-layer guard (static file scan + jsdom tree check) MUST fail CI if any table cell (`td`, `th`), definition list item (`dd`, `dt`), or unit container renders bare unbadged unit text without carrying `data-ku-exempt="<reason>"`.
- `data-ku-exempt` MUST be restricted to the frozen reasons in `KU_EXEMPT_REASONS`: `metamodel-svg`, `chart`, `numeric-aggregate`, `csv-subunit-label`.
- The guard MUST verify that every `data-ku-address` in the console parses with `parseUnitAddress` and that no address is associated with two different kinds.
(Previously: the requirement only forbade duplicate legacy builders in `console/*.js`.)

#### Scenario: Guard detects unbadged unit cell
- GIVEN a table cell rendering raw element text without `Ku` and without `data-ku-exempt`
- WHEN the jsdom guard runs over the testlab console
- THEN the guard fails reporting the unbadged cell

#### Scenario: Valid exempt element passes
- GIVEN a chart series carrying `data-ku-exempt="chart"`
- WHEN the guard runs
- THEN it passes without requiring an addressed badge

## ADDED Requirements

### Requirement: KuInfoPanel

The kit MUST provide `InnfoUI.KuInfoPanel(descriptor)` rendering an accessible dialog (`dialog[data-innfo-component="ku-info-panel"][role="dialog"]`) displaying unit metadata for any unit kind:
- Header containing the unit label, nature, and home.
- Rows for: kind, nature, Lives in, canonical address (with a Copy Address button), Location (human header form or file URL), and editability with human reason.
- Kind-specific facts:
  - `concept`, `field`, `matrix`: declaring bluepriNNt and version, type/options/widget, and usage count in the domaiNN.
  - `section`: element count.
  - `document`: bluepriNNt family, version, element count, change count, sha256.
  - `domain`: model count, Source count.
  - `source`: path, anchor, version, sha256, exists flag.
  - `element`, `value`: "Open lineage" link targeting `EditModal` history.
- Focus MUST move to the panel heading on open; Escape MUST close the dialog and restore focus to the triggering info button.

#### Scenario: Info panel opens for structure unit
- GIVEN a `field` definition unit badge
- WHEN the info action is triggered
- THEN `KuInfoPanel` opens showing its declaring bluepriNNt, type, and usage count

#### Scenario: Focus management on open and close
- GIVEN focus on an info button
- WHEN activated
- THEN focus moves inside the opened dialog
- AND WHEN Escape is pressed
- THEN the dialog closes and focus returns to that info button
