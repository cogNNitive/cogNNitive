# Delta for Console UI Kit

## MODIFIED Requirements

### Requirement: InnfoUI Component Contract

`console/ui-kit.js` MUST expose a UMD global `InnfoUI` whose components are pure
functions `(data, opts) -> HTMLElement`, each marked with `data-innfo-component`,
whose values are kebab-case: `concept-pill`, `element-pill`, `element-card`,
`status-badge`, `citation-icon`, `ku-badge`, `ku-actions`,
`ku-change-pip`, `draft-list`, `annotation-popover`, `reviewed-toggle`,
`rail-progress`. The legacy `field-row` component id is retired: a field is a
`ku-badge` of kind `field` and the stable field hook becomes
`[data-innfo-component="ku-badge"][data-ku-kind="field"][data-field]`. The `marker-chip` component id is retired with the Marker primitive. Components
MUST NOT use shadow DOM, `fetch(`, `type=module`, or global state, MUST expose state
through `data-*` attributes, and MUST render user text via text nodes (no
`innerHTML` with data). Invalid `data` MUST throw a `TypeError` naming the component.
(Previously: the contract listed `marker-chip`.)

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

#### Scenario: No marker component
- GIVEN the built kit
- WHEN `InnfoUI.MarkerChip` and `data-innfo-component="marker-chip"` are searched
- THEN neither exists

### Requirement: ElementCard

`InnfoUI.ElementCard({ id, name, conceptId?, description?, fields }, { domId?, collapsible?, open?, head?, body?, onRef?, onCite?, actions? })` MUST
return `data-innfo-component="element-card"` with `data-element-id`. The head
(`.innfo-card-head`) is a one-line Dense Row: an image chip
(`.innfo-card-thumb`), the name as a `ku-badge` of kind `element`, up to two facts (`.innfo-card-fact`, the name
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
(Previously: the card accepted `markers` and rendered one `marker-chip` per entry in the head.)

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

#### Scenario: No marker chips in the head
- GIVEN a card with fields
- THEN `.innfo-card-head` contains no `marker-chip`

### Requirement: Renderers Consume the Kit

`InnfoConsole` MUST build concept pills, element pills, element cards and icons exclusively through `InnfoUI`. `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, and the `.chip` / `.el-head` / `.el-name` builders MUST be deleted with no aliases or shims.
(Previously: the requirement also covered `InnfoModelViewer`, a second renderer that no longer exists, and named marker chips among the kit-built parts.)

#### Scenario: No duplicate builders
- GIVEN the `console/*.js` sources and bundle
- WHEN searched for `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, `className = 'chip'`, `el-head`
- THEN no occurrence exists outside `ui-kit.js`

#### Scenario: Same concept, same markup
- GIVEN one concept rendered by `InnfoConsole` in a whole-domaiNN console and in a console scoped to that concept's model
- THEN `data-innfo-component` and `data-concept-id` are identical

### Requirement: Knowledge-Unit Badge Family

`console/ui-kit.js` MUST expose `InnfoUI.KuBadge(data, opts)` returning
`data-innfo-component="ku-badge"` with `data-ku-kind` set to one of `document`,
`element`, `concept`, `field`, `cell`, `reference`. The `marker` kind no longer exists. All variants share
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
  border. `data-field` MUST equal the field name. A multi-valued field renders one value chip per value.
- `cell`: the value only, in a neutral border.
- `reference`: the `element` presentation, and it MUST be navigable when
  `opts.href` is given.

The badge root MUST be non-interactive (`span`) when it carries any action, so that
an action control is never nested inside an interactive root. When `opts.href` or
`opts.onSelect` is given and there is no action, the root MAY be `a` / `button`.
(Previously: seven kinds including `marker`.)

#### Scenario: Every kind renders its data hook
- GIVEN `KuBadge` called with each of the six kinds
- THEN each returns `data-innfo-component="ku-badge"` and the matching `data-ku-kind`
- AND the kind-specific hook (`data-element-id`, `data-field`, `data-concept-id`) is present

#### Scenario: The marker kind is gone
- GIVEN `KuBadge({ kind: "marker", label: "Risk" })`
- THEN it does not render a `data-ku-kind="marker"` badge

#### Scenario: Field renders name and value
- GIVEN `{ kind: "field", name: "owner", value: "Slimer" }`
- THEN the text contains `owner` and `Slimer` and `data-field="owner"`

#### Scenario: Multi-valued field renders chips
- GIVEN `{ kind: "field", name: "tags", value: ["ai", "core"] }`
- THEN the badge shows two value chips, `ai` and `core`

#### Scenario: Invalid data
- GIVEN `KuBadge(null)`
- THEN it throws a `TypeError` mentioning `KuBadge`

#### Scenario: Script-injection text is inert
- GIVEN `data.label` containing `<img src=x onerror=alert(1)>`
- WHEN an `element` badge renders it
- THEN the label appears as text and no `img` element exists

### Requirement: Element Card Tag Row

`ElementCard` MUST render `TagRow` from the element's effective `tags` Field values (own plus inherited, de-duplicated) when non-empty, one chip (`[data-tag]`) per tag, and MUST render no tag row when empty or absent. Each chip MUST take its color from the tag-name color derivation (requirement "Tag Color From Name"). Tag text MUST be inert text. Clicking a chip MUST call `opts.onTag(tag)`; the runtime wires it to add the generic `tags:<tag>` field facet to the active filter. Proposing a tag change from the card produces a `correction` draft on field `tags` carrying the full new array (applied as `update_field`), not a comment draft. (Previously: tags were a derived `element.tags` array, the filter token was `tag:<tag>`, and tag proposals were comment drafts.)

#### Scenario: Tags show on the card
- GIVEN an element whose effective `tags` are `["pricing", "ai"]`
- WHEN its card renders
- THEN a `[data-innfo-component=tag-row]` holds chips with `data-tag="pricing"` and `data-tag="ai"`

#### Scenario: Inherited tag shows on the card
- GIVEN an element with no own `tags` whose concept carries `tags:: [core]`
- WHEN its card renders
- THEN a chip with `data-tag="core"` exists

#### Scenario: No tags, no row
- GIVEN an element with no effective `tags`
- THEN no tag row exists

#### Scenario: Chip click filters
- GIVEN a rendered `pricing` chip in a booted console
- WHEN it is clicked
- THEN the active filter contains `tags:pricing` and only elements whose `tags` include `pricing` are listed

#### Scenario: Hostile tag is inert
- GIVEN a tag `<img src=x onerror=alert(1)>`
- THEN it renders as text and no `img` element exists

## REMOVED Requirements

### Requirement: MarkerChip

(Reason: the Marker primitive no longer exists; flags are `tags` values and valued markers are Fields rendered as field badges.)
(Migration: tag chips via "Element Card Tag Row"; valued markers via `ku-badge` kind `field`.)

## ADDED Requirements

### Requirement: Tag Color From Name

A tag chip color MUST be derived deterministically from the tag name: one exported, unit-tested function, `UI.tagSlot` in `ui-kit.js`, maps the tag name to one of the 12 existing concept color slots using FNV-1a 32-bit over `valueKey(name)` and `slot = (h >>> 0) % 12 + 1`, with no stored color, icon or symbol. A golden-vector test MUST pin the results. The same name MUST yield the same slot in every console, session and export, and the console runtime and static exports MUST use that single implementation. Names differing only in case or surrounding whitespace MUST yield the same slot (`valueKey`).

#### Scenario: Stable slot
- GIVEN the tag name `pricing`
- WHEN the function is called repeatedly and in separate consoles
- THEN it returns the same slot in 1..12 every time

#### Scenario: Range
- GIVEN 1,000 distinct tag names
- WHEN each is mapped
- THEN every result is in 1..12 and more than one slot is used

#### Scenario: Chip carries the slot
- GIVEN a `pricing` tag chip
- WHEN rendered
- THEN its `data-concept-slot` equals the function's result for `pricing`

#### Scenario: Different names may differ, equal names never do
- GIVEN two renders of the same element in different scoped consoles
- WHEN chip colors are compared
- THEN each tag has an identical slot in both
