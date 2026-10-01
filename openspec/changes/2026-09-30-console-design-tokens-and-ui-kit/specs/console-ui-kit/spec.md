# Console UI Kit Specification

## Purpose

Defines the shared semantic design tokens and the `InnfoUI` component layer that every console renderer composes, so the same concept renders identically in every console and works offline via `file://`.

## Requirements

### Requirement: Semantic Token Injection

The console bundle MUST inject exactly one `<style>` element carrying semantic tokens: `--innfo-surface`, `--innfo-text`, `--innfo-accent`, `--innfo-concept-1` through `--innfo-concept-N`, and status tokens for `pending`, `applied`, `rejected` and `stale`. Injection MUST be idempotent (a second boot MUST NOT add a second element). Shells MUST NOT define color tokens.

#### Scenario: Tokens injected once
- GIVEN a console whose bundle boots twice in one document
- WHEN `document.querySelectorAll('style[data-innfo-tokens]')` is evaluated
- THEN exactly one element is found
- AND `getComputedStyle(root).getPropertyValue('--innfo-accent')` is non-empty

#### Scenario: Every status has a token
- GIVEN the injected style
- WHEN resolving the status tokens for `pending`, `applied`, `rejected`, `stale`
- THEN each resolves to a distinct non-empty value in light and in dark

### Requirement: Theming and Override

The default theme MUST follow `prefers-color-scheme`. A `data-theme="light"` or `data-theme="dark"` attribute on the document root MUST override the OS preference. Theme choice is author-set only; the kit MUST NOT persist a reviewer choice (deferred, see Deferred Items).

#### Scenario: Dark override without OS preference
- GIVEN an OS preference of light and `data-theme="dark"` on the root
- WHEN token values are read
- THEN dark values apply

#### Scenario: Light override under dark OS
- GIVEN an OS preference of dark and `data-theme="light"`
- WHEN token values are read
- THEN light values apply

#### Scenario: No attribute follows OS
- GIVEN no `data-theme` attribute and a dark OS preference
- THEN dark values apply

### Requirement: Shells Own Layout Only

Every console shell (the shared `artifact_shell.html`, `model_console.html`, `timeline.html`, `procedure_console.html`) MUST NOT define color tokens or per-shell `:root` color variables, and MUST consume `--innfo-*` tokens. Shell-specific non-color layout variables MAY remain.

#### Scenario: No shell color tokens
- GIVEN the set of console shells
- WHEN scanned for `:root` blocks declaring color values (`#hex`, `rgb(`, `hsl(`)
- THEN none are found

### Requirement: InnfoUI Component Contract

`console/ui-kit.js` MUST expose a UMD global `InnfoUI` whose components are pure functions `(data, opts) -> HTMLElement`. Components MUST NOT use shadow DOM, MUST NOT call `fetch(`, MUST NOT require `type=module`, MUST NOT read global state, and MUST expose state through `data-*` attributes. Components MUST render user-provided text via text nodes (no `innerHTML` with data). Invalid `data` MUST throw a `TypeError` naming the component.

#### Scenario: Purity and no shadow DOM
- GIVEN any component called twice with equal inputs
- WHEN the results are compared
- THEN both are distinct, structurally equal elements with `shadowRoot === null`

#### Scenario: Script-injection text is inert
- GIVEN `data.label` containing `<img src=x onerror=alert(1)>`
- WHEN the component renders
- THEN the label appears as text and no `img` element exists

#### Scenario: Invalid input
- GIVEN `ConceptPill(null)`
- WHEN called
- THEN it throws a `TypeError` mentioning `ConceptPill`

### Requirement: ConceptPill

`InnfoUI.ConceptPill({ id, label, index, color?, count? })` MUST return an element with `data-innfo-component="concept-pill"`, `data-concept-id`, and a color class/attribute mapped to `--innfo-concept-{(index mod N)+1}`. The optional `color` (a named palette color from the schema) MUST select its palette slot instead of the index; an unknown name falls back to the index slot. The optional `count` MUST render a count suffix.

#### Scenario: Named color selects the slot
- GIVEN `{ id: "c1", label: "Revenue", index: 5, color: "violet" }`
- WHEN rendered
- THEN the element has `data-concept-slot="2"`

#### Scenario: Count shown
- GIVEN `{ id: "c1", label: "Revenue", index: 0, count: 3 }`
- THEN the pill text includes "3" in addition to "Revenue"

#### Scenario: Concept color wraps
- GIVEN `index` greater than the number of concept tokens
- WHEN rendered
- THEN the color maps to `--innfo-concept-{(index mod N)+1}`

#### Scenario: Basic render
- GIVEN `{ id: "c1", label: "Revenue", index: 0 }`
- THEN the element shows "Revenue" and has `data-concept-id="c1"`

### Requirement: ElementPill

`InnfoUI.ElementPill({ id, label, origin })` MUST render a relation chip with `data-innfo-component="element-pill"`, `data-element-id`, and an origin icon when `origin` is provided. `ElementPill` is retained as a distinct component because it has a live consumer (relation chips) and is named in `console-architecture`.

#### Scenario: Origin icon present
- GIVEN `origin: "source"`
- THEN the pill contains one origin icon with `data-origin="source"`

#### Scenario: Origin omitted
- GIVEN no `origin`
- THEN no origin icon is rendered

### Requirement: ElementCard

`InnfoUI.ElementCard({ id, name, fields, conceptId })` MUST return `data-innfo-component="element-card"` with `data-element-id`, a head containing the name, and one body row per field. An empty `fields` array MUST render the head only.

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
- THEN the chip has `data-marker-id="m1"` and `data-kind="risk"`

### Requirement: StatusBadge

`InnfoUI.StatusBadge({ status, count? })` MUST accept only `pending`, `applied`, `rejected` or `stale`, render `data-innfo-component="status-badge"` with `data-status`, and color it through the matching status token. Any other value MUST throw a `TypeError`. When `count` is provided, the visible text MUST be the count and the `aria-label` MUST be `"<count> <status>"`.

#### Scenario: Count shown
- GIVEN `{ status: "pending", count: 4 }`
- THEN the badge text is "4", `data-status="pending"`, and `aria-label="4 pending"`

#### Scenario: Valid status
- GIVEN `status: "applied"`
- THEN the badge has `data-status="applied"` and visible text "applied"

#### Scenario: Unknown status rejected
- GIVEN `status: "done"`
- THEN it throws a `TypeError`

### Requirement: CitationIcon and FieldRow

`InnfoUI.CitationIcon({ origin, citationId })` and `InnfoUI.FieldRow({ name, value, citations })` MUST follow the same contract as above, with `data-innfo-component` values `citation-icon` and `field-row`. They MUST preserve the origin-typed behavior defined by `console-field-citations` and MUST ship after the first five components (separate slice).

#### Scenario: Field row with citations
- GIVEN a field with two citations
- THEN the row contains the name, the value, and two `citation-icon` children

### Requirement: Renderers Consume the Kit

`InnfoConsole` and `InnfoModelViewer` MUST build concept pills, element pills, element cards and marker chips exclusively through `InnfoUI`. `renderConceptPill`, `renderElementPill`, `renderCards` and the `.chip` / `.el-head` / `.el-name` builders MUST be deleted with no aliases or shims.

#### Scenario: No duplicate builders
- GIVEN the console sources and bundle
- WHEN searched for `renderConceptPill`, `renderElementPill`, `renderCards`, `className = 'chip'`
- THEN no occurrence exists outside `ui-kit.js` (and none for the three `render*` names anywhere)

#### Scenario: Same concept, same markup
- GIVEN the same concept rendered by `InnfoConsole` and by `InnfoModelViewer`
- WHEN both DOMs are compared on `data-innfo-component` and `data-concept-id`
- THEN they are identical

### Requirement: Offline Invariant

The bundle including `ui-kit.js` MUST contain no `fetch(` and no `type=module` and MUST render with no network.

#### Scenario: Offline scan
- GIVEN the built bundle
- WHEN scanned
- THEN neither `fetch(` nor `type=module` appears

### Requirement: Kitchen-Sink Fixture and Component Tests

A kitchen-sink fixture HTML MUST render every component in light and dark. Each component MUST have at least one DOM test. Tests MUST run under happy-dom, or jsdom (via Vitest pragma) where happy-dom diverges.

#### Scenario: Fixture covers all components
- GIVEN the fixture
- WHEN queried for each `data-innfo-component` value in the contract
- THEN each appears at least once under both `data-theme="light"` and `data-theme="dark"`

#### Scenario: Tests can go red
- GIVEN a component whose `data-status` attribute is removed
- WHEN its test runs
- THEN the test fails

### Requirement: Reuse by Generated Consoles

The token names and component contract MUST be documented so blueprint-generated and user-generated consoles can reuse them through the bundle, with no extension or plugin registry.

#### Scenario: Contract documented
- GIVEN the documentation
- THEN it lists every token, every component signature, and every `data-*` hook

## Deferred Items

- Persisting a reviewer theme choice (localStorage): deferred; no live consumer.
- Deriving tokens from the `design-presets` blueprint: deferred; tokens are independent.
- Component extension registry: out of scope (YAGNI).
- Exact `innfo-console-v*` version number: decided at release time from the highest published tag (design/release).
