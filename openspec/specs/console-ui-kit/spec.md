# Console UI Kit Specification

## Purpose

Defines the shared semantic design tokens and the `InnfoUI` component layer that every console renderer composes, so the same concept renders identically in every console and works offline via `file://`. Includes the presentational review components consumed by change C (`2026-10-01-console-review-ux`); review state and controller behavior are NOT part of this capability.
## Requirements
### Requirement: Semantic Token Injection

The bundle MUST inject exactly one `<style data-innfo-tokens>` element carrying
`--innfo-surface`, `--innfo-text`, `--innfo-accent`, `--innfo-concept-1` through
`--innfo-concept-12`, a matching `--innfo-concept-1-bg` through
`--innfo-concept-12-bg` tint per concept, and
`--innfo-status-{pending,applied,rejected,stale}` plus a matching `-bg` token per
status. Injection MUST be idempotent. The CSS MUST be generated from
`InnfoUI.TOKEN_VALUES` (`{ light, dark }`), which MUST be exposed on the global.
Shells MUST NOT define color tokens.

#### Scenario: Tokens injected once
- GIVEN a console whose bundle boots twice in one document
- WHEN `document.querySelectorAll('style[data-innfo-tokens]')` is evaluated
- THEN exactly one element is found
- AND `--innfo-accent` resolves to a non-empty value

#### Scenario: TOKEN_VALUES is the source of the CSS
- GIVEN `InnfoUI.TOKEN_VALUES.dark['--innfo-status-pending']`
- WHEN the injected style text is read
- THEN the style contains that exact value for the dark theme

#### Scenario: Every status has a distinct token
- GIVEN `TOKEN_VALUES`
- WHEN resolving `pending`, `applied`, `rejected`, `stale` in light and in dark
- THEN each theme yields four distinct non-empty values

#### Scenario: Every concept has a tint token
- GIVEN `TOKEN_VALUES`
- WHEN resolving `--innfo-concept-1-bg` through `--innfo-concept-12-bg` in light and in dark
- THEN each theme yields twelve non-empty values

### Requirement: Status Color Contrast Floor

Every status foreground token MUST meet a WCAG contrast ratio of at least 4.5:1 against its matching `-bg` token, in both the light and dark themes. The ratio MUST be computed in a test from `TOKEN_VALUES` with an independent WCAG luminance implementation, not from hard-coded expected ratios. The shipped light foregrounds MUST be the contrast-checked values `pending #92400e`, `applied #166534`, `rejected #b91c1c`, `stale #4b5563` (on `-bg` `#fef3c7`, `#dcfce7`, `#fee2e2`, `#f3f4f6`); the dark values are `#fbbf24`, `#4ade80`, `#f87171`, `#94a3b8` (on `#451a03`, `#052e16`, `#450a0a`, `#1e293b`). The test MUST also assert the allowed text pairs at 4.5:1 and the origin icon tokens (`--innfo-origin-*`) against `--innfo-surface` at 3:1.

#### Scenario: All eight pairs pass
- GIVEN the four statuses in two themes
- WHEN the contrast ratio of each `status` against `status-bg` is computed
- THEN every ratio is at least 4.5

#### Scenario: Low-contrast token fails the test
- GIVEN `pending` foreground changed to a value below 4.5:1 against its background
- WHEN the contrast test runs
- THEN it fails naming the status and theme

### Requirement: Theming and Override

The default theme MUST follow `prefers-color-scheme`. `data-theme="light"` or `data-theme="dark"` on the document root MUST override the OS preference. The kit MUST NOT persist a theme choice.

#### Scenario: Dark override without OS preference
- GIVEN an OS preference of light and `data-theme="dark"`
- WHEN token values are read
- THEN dark values apply

#### Scenario: Light override under dark OS
- GIVEN an OS preference of dark and `data-theme="light"`
- THEN light values apply

#### Scenario: No attribute follows OS
- GIVEN no `data-theme` attribute and a dark OS preference
- THEN dark values apply

### Requirement: InnfoUI Component Contract

`console/ui-kit.js` MUST expose a UMD global `InnfoUI` whose components are pure
functions `(data, opts) -> HTMLElement`, each marked with `data-innfo-component`,
whose values are kebab-case: `concept-pill`, `element-pill`, `element-card`,
`marker-chip`, `status-badge`, `citation-icon`, `ku-badge`, `ku-actions`,
`ku-change-pip`, `draft-list`, `annotation-popover`, `reviewed-toggle`,
`rail-progress`. The legacy `field-row` component id is retired: a field is a
`ku-badge` of kind `field` and the stable field hook becomes
`[data-innfo-component="ku-badge"][data-ku-kind="field"][data-field]`. Components
MUST NOT use shadow DOM, `fetch(`, `type=module`, or global state, MUST expose state
through `data-*` attributes, and MUST render user text via text nodes (no
`innerHTML` with data). Invalid `data` MUST throw a `TypeError` naming the component.

#### Scenario: Purity and no shadow DOM
- GIVEN any component called twice with equal inputs
- THEN the results are distinct, structurally equal elements with `shadowRoot === null`

#### Scenario: Script-injection text is inert
- GIVEN `data.label` containing `<img src=x onerror=alert(1)>`
- WHEN rendered
- THEN the label appears as text and no `img` element exists

#### Scenario: Invalid input
- GIVEN `ConceptPill(null)`
- THEN it throws a `TypeError` mentioning `ConceptPill`

### Requirement: ConceptPill

`InnfoUI.ConceptPill({ id, label, index, color?, count? })` MUST return `data-innfo-component="concept-pill"` with `data-concept-id` and `data-concept-slot` in 1..12. The optional `color` (palette name, in token order: blue, violet, teal, amber, pink, green, orange, indigo, red, yellow, purple, gray; `grey` maps to gray) MUST select the slot; an unknown name falls back to `(index mod 12)+1`. The optional `count` MUST render a count suffix. `opts.onSelect` is optional: when given the root is a `button` and calls it on click, otherwise a `span`.

#### Scenario: Named color selects the slot
- GIVEN `{ id: "c1", label: "Revenue", index: 5, color: "violet" }`
- THEN `data-concept-slot="2"`

#### Scenario: Index wraps
- GIVEN `index: 13` and no color
- THEN `data-concept-slot="2"`

#### Scenario: Unknown color falls back
- GIVEN `color: "chartreuse"` and `index: 0`
- THEN `data-concept-slot="1"`

#### Scenario: Count shown
- GIVEN `{ id: "c1", label: "Revenue", index: 0, count: 3 }`
- THEN the text includes "Revenue" and "3"

#### Scenario: Optional fields omitted
- GIVEN `{ id: "c1", label: "Revenue", index: 0 }`
- THEN it renders without error and shows only "Revenue"

### Requirement: ElementPill

`InnfoUI.ElementPill({ id, label, origin? }, { href?, onSelect? })` MUST render `data-innfo-component="element-pill"` with `data-element-id`, and one origin icon with `data-origin` only when `origin` is provided. `origin` is one of `error`, `agent`, `human`, `reviewer`, `document`. The root is an `a` when `opts.href` is given, a `button` when `opts.onSelect` is given, otherwise a `span`.

#### Scenario: Origin icon present
- GIVEN `origin: "agent"`
- THEN the pill contains one icon with `data-origin="agent"`

#### Scenario: Origin omitted
- GIVEN no `origin`
- THEN no origin icon is rendered

### Requirement: ElementCard

`InnfoUI.ElementCard({ id, name, conceptId?, description?, fields, markers? }, { domId?, collapsible?, open?, head?, body?, onRef?, onCite?, actions? })` MUST
return `data-innfo-component="element-card"` with `data-element-id`. The head
(`.innfo-card-head`) is a one-line Dense Row: an image chip
(`.innfo-card-thumb`), the name as a `ku-badge` of kind `element`, one
`marker-chip` per `markers` entry, up to two facts (`.innfo-card-fact`, the name
in `<b>` followed by the value), a field count when there are fields
(`.innfo-card-count`, `"N field"`/`"N fields"`), and a chevron toggle
(`button.innfo-card-toggle`). The image chip is an `<img>` sourced from the first
field whose value looks like an image (a `data:image/`/`blob:` URL, or a path
ending in an image extension); with no such field it is a dashed placeholder
(`.innfo-card-thumb--empty`). The facts skip the image field and empty values.
Each field MUST render as a `ku-badge` of kind `field` (`name: value`) inside a
wrapped `.innfo-card-fields` row, and MUST NOT render as a `<dt>/<dd>` pair.
`description` renders as a facet paragraph (`.innfo-card-desc`) in the body.
`opts.head` and `opts.body` are arrays of nodes appended to the head and body
containers (`.innfo-card-head`, `.innfo-card-body`). The card exposes `data-open`;
when `collapsible` is not `false` (the default) a toggle button with
`aria-expanded` and a click on the bar both flip it. An empty `fields` array MUST
render no field badges and no count.

#### Scenario: Card with fields
- GIVEN three fields
- THEN the card has one head and three `ku-badge[data-ku-kind=field]` children in one `.innfo-card-fields` row
- AND no `<dt>` exists

#### Scenario: Card without fields
- GIVEN `fields: []`
- THEN the card has a head, no field badges and no `.innfo-card-count`

#### Scenario: Name is an element badge
- GIVEN a card with `name: "Slimer"` and `conceptId: "paranormal-threat"`
- THEN `.innfo-card-head` contains a `ku-badge[data-ku-kind=element]` whose text is `Slimer`

#### Scenario: Dense bar image chip
- GIVEN a field whose value ends in `.png`
- THEN `.innfo-card-head img.innfo-card-thumb` has that value as its `src`
- AND a card with no image-looking field renders `.innfo-card-thumb--empty`

#### Scenario: Collapsed by default
- GIVEN `{ open: false }`
- THEN `data-open="false"` and the toggle reports `aria-expanded="false"`
- AND activating the toggle sets `data-open="true"`

### Requirement: MarkerChip

`InnfoUI.MarkerChip({ id, label, kind })` MUST render `data-innfo-component="marker-chip"` with `data-marker-id` and `data-kind`.

#### Scenario: Marker render
- GIVEN `{ id: "m1", label: "Risk", kind: "risk" }`
- THEN `data-marker-id="m1"` and `data-kind="risk"`

### Requirement: StatusBadge

`InnfoUI.StatusBadge({ status, count? })` MUST accept only `pending`, `applied`, `rejected`, `stale`, render `data-innfo-component="status-badge"` with `data-status`, and color it from the matching status tokens. Any other value MUST throw a `TypeError`. When `count` is provided the visible text MUST be the count and `aria-label` MUST be `"<count> <status>"`. Status MUST also be conveyed by text or label, never by color alone.

#### Scenario: Count shown
- GIVEN `{ status: "pending", count: 4 }`
- THEN text is "4", `data-status="pending"`, `aria-label="4 pending"`

#### Scenario: No count
- GIVEN `status: "applied"`
- THEN visible text is "applied"

#### Scenario: Unknown status rejected
- GIVEN `status: "done"`
- THEN it throws a `TypeError`

### Requirement: CitationIcon and FieldRow

`InnfoUI.CitationIcon({ variant, field }, { onOpen })` (a `button` with `data-origin=<variant>`, `data-field` and `aria-label "<Label>: <field>"`; click stops propagation) MUST keep its contract. `InnfoUI.FieldRow({ name, value,
citations?, ref? }, { onRef?, onCite? })` MUST return a `ku-badge` of kind `field`
(with `data-ku-kind="field"` and `data-field=<name>`), and MUST preserve the
origin-typed behavior of `console-field-citations`: one `CitationIcon` per distinct
origin variant present among its citations, in the order `error, agent, human,
reviewer, document`; when `ref` is given the value renders as an
`ElementPill`/`reference` badge. `InnfoUI.icon(name, size?, cls?)` MUST be exported
by the kit and MUST NOT remain in the runtime; an unknown name MUST fall back to a
generic SVG (never throw).

#### Scenario: Field row with citations
- GIVEN a field with two citations of different origins (`agent`, `human`)
- THEN the row is `data-innfo-component="ku-badge"` with `data-ku-kind="field"` and `data-field`, contains the name and value, and two `citation-icon` children, one per origin

#### Scenario: Same origin collapses
- GIVEN a field with two citations of the same origin
- THEN the row contains exactly one `citation-icon` for that origin

#### Scenario: Field row without citations
- GIVEN `citations: []`
- THEN the row has name and value and no `citation-icon`

### Requirement: Review Components

The kit MUST provide presentational review components. They MUST hold no review state, MUST NOT read storage, and MUST emit changes only through callbacks in `opts`. Review behavior (mode toggle, draft store, `ReviewToggle`, controller) is out of scope and belongs to change C.

- `DraftList({ drafts, byId }, { onDelete })`: one row per draft showing kind, target, and text, with a delete control. A draft whose target hash differs from `byId[element_id].hash`, or whose element is absent, MUST show a "target changed" text label using the stale status token. It MUST NOT render any status control.
- `AnnotationPopover({ label, kinds, original? }, { onSave, onCancel })`: `div[role=dialog][aria-modal=true]` offering only the given `kinds`; Tab/Shift+Tab wrap inside it; Escape calls `onCancel` and nothing else; when `kinds` includes `correction` it shows `original` read-only and a `proposed` input.
- `ReviewedToggle({ state })`: `state` is `none`, `reviewed` or `changed`; exposes `data-state` and `aria-pressed` (true only for `reviewed`).
- `RailProgress({ reviewed, total, pending })`: shows the literal text `reviewed/total` and the pending count; `data-reviewed`, `data-total`, `data-pending` attributes.

#### Scenario: Draft list rows
- GIVEN two drafts and a matching `byId`
- THEN two rows render, each with a delete control and no status selector

#### Scenario: Target changed label
- GIVEN a draft with `base_hash: "h1"` and `byId[id].hash === "h2"`
- THEN the row shows the "target changed" label

#### Scenario: Target missing
- GIVEN a draft whose element id is absent from `byId`
- THEN the row shows the "target changed" label

#### Scenario: Popover cancel
- GIVEN an open popover
- WHEN Escape is pressed
- THEN `onCancel` is called once and `onSave` is not

#### Scenario: Popover focus trap
- GIVEN focus on the last control
- WHEN Tab is pressed
- THEN focus moves to the first control

#### Scenario: Popover kinds
- GIVEN `kinds: ["comment", "delete"]`
- THEN no `correction` option or `proposed` input exists

#### Scenario: Reviewed toggle states
- GIVEN `state: "changed"`
- THEN `data-state="changed"` and `aria-pressed="false"`

#### Scenario: Rail progress
- GIVEN `{ reviewed: 2, total: 4, pending: 2 }`
- THEN the text includes `2/4` and the pending count `2`

#### Scenario: Invalid review input
- GIVEN `RailProgress({ reviewed: "x" })`
- THEN it throws a `TypeError` mentioning `RailProgress`

### Requirement: Renderers Consume the Kit

`InnfoConsole` MUST build concept pills, element pills, element cards, marker chips, and icons exclusively through `InnfoUI`. `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, and the `.chip` / `.el-head` / `.el-name` builders MUST be deleted with no aliases or shims.
(Previously: the requirement also covered `InnfoModelViewer`, a second renderer that no longer exists.)

#### Scenario: No duplicate builders
- GIVEN the `console/*.js` sources and bundle
- WHEN searched for `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, `className = 'chip'`, `el-head`
- THEN no occurrence exists outside `ui-kit.js`

#### Scenario: Same concept, same markup
- GIVEN one concept rendered by `InnfoConsole` in a whole-domaiNN console and in a console scoped to that concept's model
- THEN `data-innfo-component` and `data-concept-id` are identical

### Requirement: Offline Invariant

The bundle including `ui-kit.js` MUST contain no `fetch(` and no `type=module`, and MUST render with no network.

#### Scenario: Offline scan
- GIVEN the built bundle
- THEN neither `fetch(` nor `type=module` appears

### Requirement: Kitchen-Sink Fixture and Component Tests

A kitchen-sink fixture MUST render every component, including the review components, in light and dark. Each component MUST have at least one DOM test, run under happy-dom or jsdom (Vitest pragma) where happy-dom diverges.

#### Scenario: Fixture covers all components
- GIVEN the fixture
- WHEN queried for each `data-innfo-component` value in the contract
- THEN each appears under both `data-theme="light"` and `data-theme="dark"`

#### Scenario: Tests can go red
- GIVEN a component whose `data-status` attribute is removed
- WHEN its test runs
- THEN the test fails

### Requirement: Reuse by Generated Consoles

Token names, component signatures, and every `data-*` hook MUST be documented in `docs/innfo/documentation/console-ui-kit.md`, with no extension or plugin registry.

#### Scenario: Contract documented
- GIVEN the documentation
- THEN it lists every token, component signature, and `data-*` hook

### Requirement: Knowledge-Unit Badge Family

`console/ui-kit.js` MUST expose `InnfoUI.KuBadge(data, opts)` returning
`data-innfo-component="ku-badge"` with `data-ku-kind` set to one of `document`,
`element`, `concept`, `field`, `cell`, `marker`, `reference`. All variants share
one grammar: the badge shape encodes the unit kind, the concept color encodes the
concept, and the unit's identity is the slug — there MUST be exactly one
presentation per canonical address. `data` MUST be an object or the component MUST
throw a `TypeError` naming `KuBadge`.

Presentation per kind:

- `document` and `concept`: a concept-tinted fill (`--innfo-concept-<slot>-bg`), a
  concept-colored border, the concept icon and the label. `data-concept-id` and
  `data-concept-slot` (1..12) MUST be set.
- `element`: a neutral fill, a border in the concept color, the concept icon and
  the label. `data-element-id` and `data-concept-slot` MUST be set.
- `field`: literal `name: value` text (name muted, value normal) in a neutral
  border. `data-field` MUST equal the field name.
- `cell`: the value only, in a neutral border.
- `marker`: the marker label and, when present, its value. `data-marker-id` and
  `data-kind` MUST be set.
- `reference`: the `element` presentation, and it MUST be navigable when
  `opts.href` is given.

The badge root MUST be non-interactive (`span`) when it carries any action, so that
an action control is never nested inside an interactive root. When `opts.href` or
`opts.onSelect` is given and there is no action, the root MAY be `a` / `button`.

#### Scenario: Every kind renders its data hook
- GIVEN `KuBadge` called with each of the seven kinds
- THEN each returns `data-innfo-component="ku-badge"` and the matching `data-ku-kind`
- AND the kind-specific hook (`data-element-id`, `data-field`, `data-marker-id`, `data-concept-id`) is present

#### Scenario: Field renders name and value
- GIVEN `{ kind: "field", name: "owner", value: "Slimer" }`
- THEN the text contains `owner` and `Slimer` and `data-field="owner"`

#### Scenario: Invalid data
- GIVEN `KuBadge(null)`
- THEN it throws a `TypeError` mentioning `KuBadge`

#### Scenario: Script-injection text is inert
- GIVEN `data.label` containing `<img src=x onerror=alert(1)>`
- WHEN an `element` badge renders it
- THEN the label appears as text and no `img` element exists

### Requirement: Unit Action Cluster

`InnfoUI.KuActions(data, opts)` MUST return
`data-innfo-component="ku-actions"`, a non-interactive `span` holding the unit's
action controls to the right of the badge. It MUST render the info control
(`[data-ku-action="info"]`) when `opts.onInfo` is given, and the edit control
(`[data-ku-action="edit"]`, a pencil) when `opts.onEdit` is given. The kit holds no
mode state: an edit control exists only because the caller passed `onEdit`, so
review-mode gating lives outside the kit. Actions MUST NOT be nested inside an
interactive badge root.

#### Scenario: Info only
- GIVEN `KuActions({}, { onInfo })`
- THEN one `[data-ku-action=info]` exists and no `[data-ku-action=edit]` exists

#### Scenario: Edit present only with callback
- GIVEN `KuActions({}, { onInfo, onEdit })`
- THEN both controls exist and clicking edit calls `onEdit` once

### Requirement: Pending-Change Pip

`KuBadge` MUST render a pending-change pip when `data.changes` is an integer `> 0`:
a child `[data-innfo-component="ku-change-pip"]` carrying the count text, and it
MUST set `data-ku-changes="<n>"` on the badge. The badge border MUST use the
aggregate status token when changes are pending. The pip is the clickable
affordance to the unit's changes and MUST call `opts.onChanges` when given.

#### Scenario: Pip shows the count
- GIVEN `{ kind: "field", name: "x", value: "v", changes: 2 }`
- THEN `data-ku-changes="2"` and the pip text is `2`

#### Scenario: No pip without changes
- GIVEN `data.changes` absent
- THEN no `[data-innfo-component=ku-change-pip]` exists

### Requirement: Type-Aware Field Value Rendering

`FieldRow` MUST render a field's read value through `FieldValue`, a type-aware
renderer that dispatches on the field's declared type, as resolved by the caller
from the pair (concept, field) (`innfo-console-runtime` "Declared Field Lookup by
Concept and Field"): `boolean` as Yes/No (`data-value="true|false"`), `http(s)` urls
as links with `rel="noopener noreferrer"`, `select` as a pill (see "Select Field View
and Edit"), `markdown`/`markdown_inline` through the safe markdown subset renderer
(see "Markdown Inline View and Edit"), `image`/`video`/`audio` through the media
renderers (see "Declared Media Rendering"), `knowledge` as a pill whose action is
supplied by the caller (`opts.onKnowledge`), `code` as a `<code>`, and array values
joined by `, `. `FieldValue` MUST return `null` for plain types (string, number, an
undeclared type, and `reference` without `ref`) so the plain `KuBadge` text output is
preserved unchanged. `KuBadge` (kind `field`) MUST accept a `valueNode` and append it
in place of the text value span. (Previously: `markdown`/`markdown_inline` rendered as
preformatted text and `select` returned `null`; in exported consoles no declared-type
branch fired because declared types never reached the console.)

#### Scenario: Boolean rendered as Yes/No
- GIVEN `FieldValue({ value: true, type: 'boolean' })`
- THEN the node text is `Yes` with `data-value="true"`

#### Scenario: Plain string unchanged
- GIVEN `FieldRow({ name: 'f', value: 'v' })`
- THEN the badge text is `f:v` and no typed value node exists

#### Scenario: Declared select renders a pill
- GIVEN `FieldValue({ name: 'stage', value: 'build', type: 'select' })`
- THEN an `.innfo-field-select` node with `data-value="build"` is returned

#### Scenario: Undeclared type stays plain
- GIVEN `FieldValue({ name: 'note', value: 'hello', type: '' })`
- THEN it returns `null`

### Requirement: Modal Connections Sankey

`SankeyFlow` MUST render a three-column relation flow — incoming nodes, a centre
node, outgoing nodes — as inline SVG with no external dependency, and MUST
render an empty state when there are no relations. The knowledge-unit
`EditModal` MUST expose a `Connections` tab that mounts the flow from
`data.connections` (`{ center, incoming[], outgoing[] }`).

#### Scenario: Flow renders
- GIVEN `SankeyFlow({ center, incoming: [...], outgoing: [...] })`
- THEN one node per entry plus the centre render, with a link per relation

#### Scenario: Empty flow
- GIVEN `SankeyFlow({ incoming: [], outgoing: [] })`
- THEN only the empty state renders

### Requirement: Edit Modal Value Type Safety

The `EditModal` MUST NOT change the type of the value it edits. A `number` value MUST be edited in an `input type=number` and proposed as a JavaScript number (`Number(input)`); an empty or non-finite number input MUST show an inline error and MUST NOT call `onSave`. A `select` widget MUST contain a blank option (value `""`) and, when the current value is not among the declared options, one extra option carrying that value (marked as not in the options) that is selected; saving without a change MUST propose the original value. An array or object value MUST NOT be passed to `String()` or to a text input: the modal MUST open in comment mode with the Propose control disabled and a note saying list and object values are proposed as a comment. A string containing a newline or longer than 70 characters MUST be edited in a `textarea` and proposed verbatim; other strings keep the single-line input. (S3b P0-2.)

#### Scenario: A number stays a number
- GIVEN `EditModal({ type: 'number', value: 5 })`
- WHEN the value is changed to `7` and saved
- THEN `onSave` receives `proposed === 7` (a number, not `"7"`)

#### Scenario: Empty number is refused
- GIVEN `EditModal({ type: 'number', value: 5 })`
- WHEN the input is cleared and Save is pressed
- THEN an inline error is shown and `onSave` is not called

#### Scenario: Unknown select value is preserved
- GIVEN `EditModal({ type: 'select', value: 'legacy', options: ['a', 'b'] })`
- WHEN Save is pressed without a change
- THEN `onSave` receives `proposed === 'legacy'` (today it silently becomes `'a'`)

#### Scenario: Blank select value is preserved
- GIVEN `EditModal({ type: 'select', value: '', options: ['a', 'b'] })`
- WHEN Save is pressed without a change
- THEN `onSave` receives `proposed === ''`

#### Scenario: Arrays are comment-only
- GIVEN `EditModal({ type: 'string', value: ['a', 'b'] })`
- WHEN the modal opens
- THEN it is in comment mode, the Propose control is disabled, and no input holds `a,b`

#### Scenario: Objects never become "[object Object]"
- GIVEN `EditModal({ type: 'string', value: { w: 1 } })`
- WHEN the modal opens and is saved
- THEN no proposed value equals `[object Object]` and only a comment can be saved

#### Scenario: Multi-line string uses a textarea
- GIVEN `EditModal({ type: 'string', value: 'line one\nline two' })`
- WHEN Save is pressed without a change
- THEN the widget is a `textarea` and `proposed` contains the newline unchanged

### Requirement: Select Field View and Edit

A field declared `select` MUST render its non-empty value as a pill (`.innfo-field-select`, `data-value`) and an empty value as nothing (no pill, no `null` text). The edit modal for a declared `select` field MUST offer exactly the declared `options` plus the blank option and the preserved current value of "Edit Modal Value Type Safety", so a value outside the options can only be proposed when it was already the current value. (S3b P1-5.)

#### Scenario: Declared select edits through a select
- GIVEN an element of concept `Initiative` with `stage: build` and `stage` declared `select` with options `[idea, build, run]`
- WHEN the reviewer opens the edit modal on `stage`
- THEN the widget is `select[data-innfo-widget=select]` with options `""`, `idea`, `build`, `run` and `build` selected

#### Scenario: Free text cannot be proposed for a select (regression)
- GIVEN the same field
- WHEN the modal opens
- THEN no `input[type=text]` is offered for the value (today the declared type never arrives and a free-text input is shown)

#### Scenario: Empty select renders nothing
- GIVEN `FieldValue({ value: '', type: 'select' })`
- THEN no `.innfo-field-select` node is produced

### Requirement: Markdown Inline View and Edit

The kit MUST provide `InnfoUI.Markdown(text, opts)`, a renderer for a safe markdown subset that builds DOM nodes only (`createElement`, `textContent`, `setAttribute`): paragraphs and line breaks, headings, `-`/`*`/`1.` lists, `**strong**`, `*em*`/`_em_`, inline code, block quotes (including `> [!NOTE]`-style callouts) and links. A link MUST render as an `a` only when its target is an `http:`/`https:` URL or a relative path (the scheme allowlist of `innfo-console-runtime` "Source URL link with a safe-scheme allowlist"), with `target="_blank"` and `rel="noopener noreferrer"`; any other target MUST render as plain text. Any other syntax, including raw HTML, MUST render as literal text. The renderer MUST NOT assign any part of its input through `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`. `FieldValue` MUST use it for `markdown` and `markdown_inline`; `markdown_file` stays a path pill. The edit modal for a declared `markdown`/`markdown_inline` field MUST use a `textarea` and propose its text verbatim. The XSS scenarios MUST run under jsdom (not happy-dom). (S3b P1-6.)

#### Scenario: Subset renders as structure
- GIVEN `Markdown('## Goal\n\n- **fast**\n- *cheap*')`
- THEN the result contains a heading with text `Goal`, a list of two items, a `strong` with `fast` and an `em` with `cheap`

#### Scenario: Raw HTML is inert
- GIVEN the input `<img src=x onerror=alert(1)><script>x()</script><b>bold</b>`
- WHEN it is rendered
- THEN no `img`, `script` or `b` element exists and the text appears literally

#### Scenario: Unsafe link schemes are text
- GIVEN the links `[a](javascript:alert(1))`, `[b](JaVaScRiPt:alert(1))`, `[c](data:text/html,<b>x</b>)` and `[d](vbscript:x)`
- WHEN they are rendered
- THEN no `a` element exists and no element is parsed from the targets

#### Scenario: Safe link is a link
- GIVEN `[docs](https://example.com/x)`
- THEN an `a` with `href="https://example.com/x"`, `target="_blank"` and `rel="noopener noreferrer"` exists

#### Scenario: No HTML sink in the renderer
- GIVEN the source of the markdown renderer in `ui-kit.js`
- WHEN it is scanned
- THEN it contains no `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`

#### Scenario: Markdown field edits in a textarea
- GIVEN a field declared `markdown_inline` with a value containing a newline
- WHEN the edit modal opens and is saved unchanged
- THEN the widget is a `textarea` and `proposed` equals the original text

### Requirement: Element Card Tag Row

`ElementCard` MUST render `TagRow` from `element.tags` when the array is non-empty, one chip (`[data-tag]`) per tag, and MUST render no tag row when it is empty or absent (today an empty array still yields an empty row). The runtime MUST pass the payload's `element.tags` to the card. Tag text MUST be inert text. Clicking a chip MUST call `opts.onTag(tag)`; the runtime wires it to add `tag:<tag>` to the active filter. The existing tag-proposal decoration (`review.js`, a comment draft) is unchanged. (S3b P1-7.)

#### Scenario: Tags show on the card
- GIVEN an element with `tags: ["pricing", "ai"]`
- WHEN its card renders
- THEN a `[data-innfo-component=tag-row]` holds chips with `data-tag="pricing"` and `data-tag="ai"`

#### Scenario: No tags, no row
- GIVEN an element with `tags: []`
- THEN no tag row exists

#### Scenario: Chip click filters
- GIVEN a rendered `pricing` chip in a booted console
- WHEN it is clicked
- THEN the active filter contains `tag:pricing` and only elements tagged `pricing` are listed

#### Scenario: Hostile tag is inert
- GIVEN a tag `<img src=x onerror=alert(1)>`
- THEN it renders as text and no `img` element exists

### Requirement: Declared Media Rendering

A field declared `image`, `video` or `audio` MUST render through the media renderers by its declared type, not only by value shape: `image` as an `img` with its path, `video` as `<video controls preload="metadata">`, `audio` as `<audio controls preload="metadata">`, each followed by the path. A media `src` MUST be set only when the value is a relative path or an `http:`/`https:` URL; any other value MUST render as plain text. (S3b P1-10.)

#### Scenario: Declared video renders a player
- GIVEN a field declared `video` with value `sources/demo.mp4`
- WHEN `FieldValue` renders it
- THEN a `video[controls]` with `src` ending in `sources/demo.mp4` exists (today it falls back to a file pill)

#### Scenario: Declared audio renders a player
- GIVEN a field declared `audio` with value `sources/note.m4a`
- THEN an `audio[controls]` exists

#### Scenario: Unsafe media source is text
- GIVEN a field declared `video` with value `javascript:alert(1)`
- THEN no `video` element exists and the value is shown as text

## Deferred Items

- Persisting a reviewer theme choice; deriving tokens from `design-presets`; a component extension registry (YAGNI).
- `ReviewToggle` and all review state/controller behavior: change C.
