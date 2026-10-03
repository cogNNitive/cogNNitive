# Console UI Kit Specification

## Purpose

Defines the shared semantic design tokens and the `InnfoUI` component layer that every console renderer composes, so the same concept renders identically in every console and works offline via `file://`. Includes the presentational review components consumed by change C (`2026-10-01-console-review-ux`); review state and controller behavior are NOT part of this capability.

## Requirements

### Requirement: Semantic Token Injection

The bundle MUST inject exactly one `<style data-innfo-tokens>` element carrying `--innfo-surface`, `--innfo-text`, `--innfo-accent`, `--innfo-concept-1` through `--innfo-concept-12`, and `--innfo-status-{pending,applied,rejected,stale}` plus a matching `-bg` token per status. Injection MUST be idempotent. The CSS MUST be generated from `InnfoUI.TOKEN_VALUES` (`{ light, dark }`), which MUST be exposed on the global. Shells MUST NOT define color tokens.

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

`console/ui-kit.js` MUST expose a UMD global `InnfoUI` whose components are pure functions `(data, opts) -> HTMLElement`, each marked with `data-innfo-component`, whose values are kebab-case: `concept-pill`, `element-pill`, `element-card`, `marker-chip`, `status-badge`, `citation-icon`, `field-row`, `draft-list`, `annotation-popover`, `reviewed-toggle`, `rail-progress`. Components MUST NOT use shadow DOM, `fetch(`, `type=module`, or global state, MUST expose state through `data-*` attributes, and MUST render user text via text nodes (no `innerHTML` with data). Invalid `data` MUST throw a `TypeError` naming the component.

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

`InnfoUI.ElementCard({ id, name, conceptId?, description?, fields, markers? }, { domId?, collapsible?, open?, head?, body?, onRef?, onCite? })` MUST return `data-innfo-component="element-card"` with `data-element-id`, a head (`.innfo-card-head`) containing the name (`h3.innfo-card-name`) and one `marker-chip` per entry of `markers`, and one `field-row` per field. `description` renders as a paragraph when present. `opts.head` and `opts.body` are arrays of nodes appended to the head and body containers (`.innfo-card-head`, `.innfo-card-body`). When `collapsible` is true the card exposes `data-open` and a toggle button with `aria-expanded`. An empty `fields` array MUST render the head only.

#### Scenario: Card with fields
- GIVEN three fields
- THEN the card has one head and three rows

#### Scenario: Card without fields
- GIVEN `fields: []`
- THEN the card has a head and no rows

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

`InnfoUI.CitationIcon({ variant, field }, { onOpen })` (a `button` with `data-origin=<variant>`, `data-field` and `aria-label "<Label>: <field>"`; click stops propagation) and `InnfoUI.FieldRow({ name, value, citations?, ref? }, { onRef?, onCite? })` MUST follow the contract above with `data-innfo-component` values `citation-icon` and `field-row`, and MUST preserve the origin-typed behavior of `console-field-citations`. `FieldRow` MUST render one `CitationIcon` per distinct origin variant present among its citations, in the order `error, agent, human, reviewer, document`; when `ref` is given the value renders as an `ElementPill`. `InnfoUI.icon(name, size?, cls?)` MUST be exported by the kit and MUST NOT remain in the runtime; an unknown name MUST throw `TypeError`.

#### Scenario: Field row with citations
- GIVEN a field with two citations of different origins (`agent`, `human`)
- THEN the row contains the name, the value, and two `citation-icon` children, one per origin

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

`InnfoConsole` and `InnfoModelViewer` MUST build concept pills, element pills, element cards, marker chips, and icons exclusively through `InnfoUI`. `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, and the `.chip` / `.el-head` / `.el-name` builders MUST be deleted with no aliases or shims.

#### Scenario: No duplicate builders
- GIVEN the `console/*.js` sources and bundle
- WHEN searched for `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, `className = 'chip'`, `el-head`
- THEN no occurrence exists outside `ui-kit.js`

#### Scenario: Same concept, same markup
- GIVEN one concept rendered by `InnfoConsole` and by `InnfoModelViewer`
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

## Deferred Items

- Persisting a reviewer theme choice; deriving tokens from `design-presets`; a component extension registry (YAGNI).
- `ReviewToggle` and all review state/controller behavior: change C.
