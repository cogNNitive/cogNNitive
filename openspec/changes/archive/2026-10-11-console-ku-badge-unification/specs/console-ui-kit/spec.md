# console-ui-kit Specification (delta)

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: ElementCard

`InnfoUI.ElementCard({ id, name, conceptId?, description?, fields, markers? },
{ domId?, collapsible?, open?, head?, body?, onRef?, onCite?, actions? })` MUST
return `data-innfo-component="element-card"` with `data-element-id`, a head
(`.innfo-card-head`) containing the name rendered as a `ku-badge` of kind
`element`, and one `marker-chip` per entry of `markers`. Each field MUST render as
a `ku-badge` of kind `field` (`name: value`), laid out in ONE wrapped row
(`.innfo-card-fields`), and MUST NOT render as a `<dt>/<dd>` pair. `description`
renders as a facet paragraph (`.innfo-card-desc`) when present. `opts.head` and
`opts.body` are arrays of nodes appended to the head and body containers
(`.innfo-card-head`, `.innfo-card-body`). When `collapsible` is true the card
exposes `data-open` and a toggle button with `aria-expanded`. An empty `fields`
array MUST render no field badges.

#### Scenario: Card with fields
- GIVEN three fields
- THEN the card has one head and three `ku-badge[data-ku-kind=field]` children in one `.innfo-card-fields` row
- AND no `<dt>` exists

#### Scenario: Card without fields
- GIVEN `fields: []`
- THEN the card has a head and no field badges

#### Scenario: Name is an element badge
- GIVEN a card with `name: "Slimer"` and `conceptId: "paranormal-threat"`
- THEN `.innfo-card-head` contains a `ku-badge[data-ku-kind=element]` whose text is `Slimer`

### Requirement: CitationIcon and FieldRow

`InnfoUI.CitationIcon({ variant, field }, { onOpen })` (a `button` with
`data-origin=<variant>`, `data-field` and `aria-label "<Label>: <field>"`; click
stops propagation) MUST keep its contract. `InnfoUI.FieldRow({ name, value,
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
