# innfo-console-runtime Specification

## Purpose

One shared versioned runtime (`nn-runtime.js`) plus a thin console shell (`artifact_shell.html`) for all HTML console artifacts. Eliminates inline runtime duplication across template assets while preserving `file://` double-click with zero build.
## Requirements
### Requirement: Shared UMD/IIFE Runtime

The system MUST ship a single versioned `nn-runtime.js` as a UMD/IIFE global (`window.nnConsole`). The bundle MUST include `ui-kit.js` (`window.nnUI`), `nn-address.generated.js` (`window.nnAddress`), ordered before any module that consumes them.

The runtime MUST instantiate `createKu({ index, onAction })` once at boot and expose the builder as `ctx.ui.Ku`. All console renderers (cards, tables, matrices, rail, facets, guide, timeline, stepper, dialogs) MUST render knowledge units exclusively via `ctx.ui.Ku`.

The legacy methods `ctx.modal.edit` and `ctx.modal.comment` are DELETED from the runtime context; views MUST NOT attempt to invoke modal editors directly. All unit edits and review actions flow through `onAction(action, descriptor)`.

(Previously: the runtime file was `innfo-runtime.js` and the address file `innfo-address.generated.js`; the globals were `window.InnfoConsole` and `window.InnfoAddress`.)

#### Scenario: Ku exposed on runtime context
- GIVEN a booted console runtime
- WHEN a view's `mount(ctx)` executes
- THEN `ctx.ui.Ku` is a callable DOM builder function
- AND `ctx.modal.edit` is undefined
- AND `ctx.modal.comment` is undefined

#### Scenario: Renderers consume Ku
- GIVEN table and matrix views rendered by `nnConsole`
- WHEN the DOM is inspected
- THEN cells and headers carry `data-nn-component="ku-unit"`
- AND no legacy `.chip` or unbadged unit text exists

#### Scenario: Edit action dispatches through onAction
- GIVEN a unit edit pencil clicked
- WHEN the click event bubbles
- THEN the delegated listener invokes `onAction('edit', descriptor)`

#### Scenario: Renamed sources keep the same global
- GIVEN the runtime built from `nn-runtime.js` and `nn-address.generated.js`
- WHEN the page loads
- THEN `window.nnConsole` and `window.nnAddress` are defined

### Requirement: Console Shell with Config and JSON Slots

`artifact_shell.html` MUST declare an `nn-config` block with a `needs[]` capability list and exactly two JSON slots: `nn-schema` and `nn-model`. Generated consoles MUST declare only `needs[]` plus slot payloads, MUST NOT inline runtime code, and MUST NOT supply feedback UI markup.
(Previously: did not forbid feedback markup, which the runtime needed as anchors.)

#### Scenario: Thin console renders from slots

- GIVEN a console with `needs: ["feedback-export"]` and populated slots
- WHEN opened via `file://`
- THEN the runtime hydrates the view and injects the feedback UI

#### Scenario: Undeclared capability stays dormant

- GIVEN a console whose `needs[]` omits `feedback-export`
- WHEN the runtime boots
- THEN no export UI is injected or rendered

### Requirement: No Duplicated Inline Runtime

`artifact_shell.html` MUST be the only console shell and MUST thin onto the runtime. The `timeline` and `procedure` consoles are registered views (see `console-view-registry`), not shells: `metrics/assets/timeline.html` and `procedures/assets/procedure_console.html` no longer exist. No console artifact SHALL ship duplicated inline runtime; the bundle appears once per artifact. The citation icons and detail dialog defined by `console-field-citations` MUST be rendered by the runtime.
(Previously: the requirement covered the reference assets `business/assets/model_viewer.html` and `workspace/assets/model_console.html`, including a one-release transition for the old business shell.)

#### Scenario: Shell thinned
- GIVEN `artifact_shell.html`
- WHEN scanned for inline runtime markers
- THEN no duplicated runtime block is found

#### Scenario: Timeline and procedure shells are gone
- GIVEN the bluepriNNt assets after this change
- WHEN `metrics/assets/` and `procedures/assets/` are listed
- THEN neither `timeline.html` nor `procedure_console.html` exists

#### Scenario: No reference assets remain
- GIVEN the bluepriNNt assets after this change
- WHEN `business/assets/` and `workspace/assets/` are listed
- THEN neither `model_viewer.html` nor `model_console.html` exists

#### Scenario: Runtime renders citations
- GIVEN a compiled model with `el.citations` populated
- WHEN `artifact_shell.html` renders that element
- THEN an origin-typed icon is shown per the `console-field-citations` rules

### Requirement: Bundle-Injected Feedback UI

When `needs[]` declares `changeset-export`, `nnConsole` MUST inject the banner, export button and modal itself through an idempotent routine, creating one `[data-nn-changeset-root]` with `#innfo-changeset-banner`, `#innfo-changeset-open` and `#innfo-changeset-modal`. It MUST read `needs[]` from the DOM so boot order does not matter. Shells MUST NOT need feedback markup; the old `#nn-banner`, `#nn-export-open` and `#nn-export-modal` markup and CSS MUST be removed from `artifact_shell.html`. Injection MUST happen once even if the bundle boots more than once, MUST work offline via `file://`, and MUST NOT use `fetch` or `type=module`. The new ids MUST NOT clash with any other dialog in the page: the procedure view's step-log dialog MUST be scoped to its own container and MUST NOT use `#nn-export-modal`. Styling MUST be minimal CSS classes.
(Previously: the first scenario used `model_console.html`.)

#### Scenario: Shell gains feedback with no markup
- GIVEN `artifact_shell.html` with unchanged markup declaring `changeset-export`
- WHEN opened
- THEN the export button is present and the modal opens

#### Scenario: Single injection
- GIVEN a console where the bundle boots twice
- WHEN the page loads
- THEN exactly one changeset root, one banner and one export button exist

#### Scenario: No clash with the procedure view
- GIVEN a domaiNN console whose `procedure` view has a step-log dialog
- WHEN the feedback UI is injected
- THEN both dialogs coexist with distinct ids and no id appears twice in the document
- AND the log dialog does not use `#nn-export-modal`

### Requirement: Needs Registry Without Feedback Anchors

`needs-registry.json` MUST declare `changeset-export` with empty anchors (`[]`). The shell guard (`scripts/lib/console-shell-guard.js`) MUST NOT contain a hard-coded exemption for any named shell or for `changeset-export`, and MUST NOT assume more than one live shell exists.
(Previously: the guard was forbidden a hard-coded exemption for `model_console.html`.)

#### Scenario: No shell-specific branch
- GIVEN the guard after this change
- WHEN it runs over the repository shells
- THEN `artifact_shell.html` passes through the registry rule alone, and the guard source contains no shell-file-name branch

#### Scenario: No anchors required
- GIVEN a shell declaring `changeset-export` with no export markup
- WHEN the guard runs
- THEN it passes

### Requirement: Bundle Matches Its Sources

`nn-console.bundle.js` MUST equal the output of `scripts/build-console-bundle.mjs` over its declared `SOURCES`, which MUST include `ui-kit.js` and MUST NOT include `render-model-viewer.js`. The build MUST emit only `nn-console.bundle.js`; no `innfo-console.bundle.js` exists after PR 2. Root npm scripts `build:console` (build) and `check:console-bundle` (drift check) MUST exist. A node:test drift suite, wired into `verify.js` and `check-integrity.js`, MUST fail when a checked-in bundle differs from a fresh build. The build process MUST be documented.
(Previously: the bundle was `innfo-console.bundle.js`.)

#### Scenario: Fresh bundle passes
- GIVEN sources unchanged since the last build
- WHEN `check:console-bundle` runs
- THEN it passes

#### Scenario: Stale bundle fails
- GIVEN `ui-kit.js` edited without rebuilding
- WHEN the drift suite runs
- THEN it fails naming the bundle

#### Scenario: Drift check can go red
- GIVEN the checked-in bundle with one byte altered
- WHEN the drift suite runs
- THEN it fails

#### Scenario: Viewer not in the bundle
- GIVEN the declared `SOURCES`
- WHEN listed
- THEN `render-model-viewer.js` is absent and the bundle contains no `InnfoModelViewer`

#### Scenario: Single bundle after PR 2
- GIVEN the repository after PR 2
- WHEN the console assets directory is listed
- THEN `nn-console.bundle.js` exists and `innfo-console.bundle.js` does not

### Requirement: Released Bundle Is Versioned

A changed bundle MUST ship under a new `nn-console-v*` tag and a new CDN file; a published tagged bundle MUST NOT be overwritten. Only `nn-console-v*` tags release; existing `innfo-console-v*` tags and their CDN files MUST remain as published. Version references MUST be produced by the release tooling (`sync-versions.mjs`), never hand-edited. Shell edits under `bluepriNNts/**` MUST be accompanied by a `blueprints-v*` tag (not `templates-v*`) and a repin in the same batch. Frozen vendored bundle copies (the three sample/export copies and two innfo-core test fixtures) MUST each be declared frozen or regenerated explicitly.
(Previously: tags were `innfo-console-v*`, and the requirement bound the change and change C (`2026-10-01-console-review-ux`) to ONE tag.)

#### Scenario: Refs are derived
- GIVEN the release batch
- WHEN `validate-manifest` and `check-integrity` run
- THEN both pass with generated refs only

#### Scenario: First nn-console release
- GIVEN the console assets renamed in PR 2
- WHEN the first release is cut
- THEN the tag is `nn-console-v<version>` with a version strictly greater than the highest existing `innfo-console-v*`

#### Scenario: Shell edit requires blueprints tag
- GIVEN a shell under `bluepriNNts/**` changed
- WHEN the release batch is validated
- THEN a new `blueprints-v*` tag and repin are present

#### Scenario: Vendored copies
- GIVEN the five vendored bundle copies
- WHEN the bundle is rebuilt
- THEN each is regenerated or declared frozen

### Requirement: Untrusted text is never parsed as markup

The runtime MUST render model titles, concept names, element/field values, timeline
labels, search/hash tokens and error strings as text (via `textContent` or an escape
helper), never as raw `innerHTML`. The artifact shell MUST declare a
Content-Security-Policy that forbids inline script execution while still loading the
console bundle and its JSON data islands.

#### Scenario: Hostile model title and concept name render inert

- GIVEN a payload whose model title is `<img src=x onerror=alert(1)>` and a concept named `<script>x()</script>`
- WHEN the console renders the hub and the model view
- THEN both strings appear literally as text
- AND no element or handler is created from them

#### Scenario: Hostile hash token renders inert

- GIVEN the location hash carries a search token `"<svg onload=alert(1)>"`
- WHEN the active filter pills render
- THEN the pill shows the token as text and no `svg` element exists

#### Scenario: Hostile error string renders inert

- GIVEN `renderErrors` receives a message containing HTML
- WHEN errors are shown
- THEN the message is displayed as text

### Requirement: Exported changesets are resolvable by apply_change

The console changeset export MUST emit the Level-3 changeset frontmatter of `changeset-document-model` (`level: 3`, `parent_spec: { name: "changes", url }`, `blueprint_version`, `status: proposed`), so `parseChangeset` accepts it and `validate_knowledge` reports it valid. `draftToChange` MUST emit a `target` whose model part is the model's file stem and whose element part is the element slug, never the display name. A draft of kind `new` MUST export as `op:: add_element` (concept, name, fields); a `new` draft lacking a concept or name MUST export as `op:: comment`. When the target element hash is known, the change MUST carry `base_hash`. (Previously: the export wrote `parent_spec: "changes"` with `blueprint_version: "0.1.0"`, and the element part could be a name or a slug.)

#### Scenario: Round trip from console to apply
- GIVEN console drafts of kind `correction`, `delete` and `new` against a fixture domain
- WHEN they are exported, parsed with `parseChangeset` and applied with `applyChange`
- THEN every change resolves its target and applies without a resolution error

#### Scenario: Export is a valid L3 changeset with slug targets
- GIVEN a correction draft on an element whose slug is `vision` and whose name is `Our Vision`
- WHEN the changeset is exported
- THEN its frontmatter has `level: 3` and `parent_spec.name: changes`
- AND the change `target` is `<model>@vision&<field>`, not `<model>@Our Vision&<field>`

### Requirement: Per-draft staleness is visible

The runtime MUST use `isTargetChanged` to mark a draft whose target element changed
since the draft was created.

#### Scenario: Target edited after drafting

- GIVEN a draft created against element hash H1
- WHEN the console loads a payload where that element's hash is H2
- THEN the draft is flagged stale in the review UI

### Requirement: Element Media Lightbox

The runtime MUST provide `renderMediaDialog(doc, items, start)`: a native
`<dialog>` showing an element's image fields with prev/next navigation, a
position counter and an open/download link, navigable with the arrow keys. The
element card's image thumbnail MUST open it when the element has image fields.

#### Scenario: Open from the thumbnail
- GIVEN a card whose element has two image fields
- WHEN the thumbnail is clicked
- THEN `#nn-media-dialog` shows the first image and a `1 / 2` counter

#### Scenario: Advance
- GIVEN the open lightbox
- WHEN next is clicked
- THEN the second image shows and the counter reads `2 / 2`

### Requirement: Field Detail Dialog

The runtime MUST provide `renderFieldDetailDialog(doc, field)` opening a
read-only `<dialog>` that renders one field's full value through `nnUI.FieldValue`.
In Table mode, double-clicking a field cell MUST open it for that cell.

#### Scenario: Double-click a cell
- GIVEN Table mode
- WHEN a field cell is double-clicked
- THEN `#nn-field-dialog` opens with the field name and its typed value

### Requirement: Incoming Relations On Cards

Every element card MUST show its incoming relations (elements whose relations
target it) in a `Referenced by (n)` section, in addition to its outgoing
relations. Incoming relations are derived by scanning every element's
`relations` for a target equal to the card's id.

#### Scenario: Referenced element
- GIVEN element B whose relation targets element A
- WHEN A's card renders
- THEN it contains `.nn-card-incoming` labelled `Referenced by (1)` linking to B

### Requirement: Concept Guidance Panel

The runtime MUST provide a right-hand concept guide (`#nn-concept-guide`) that
appears when a single concept is in focus (a `concept:` filter) and shows the
concept's description, field schema (including each field's widget and whether it is multi-valued), concept-level field values, associated matrices and element
count; it MUST be removed when no single concept is in focus. It MUST NOT show a Markers section.
(Previously: the guide listed the concept's markers.)

#### Scenario: Concept in focus
- GIVEN a `concept:Fleet` filter and a Fleet concept with a description
- WHEN the explorer refreshes
- THEN `#nn-concept-guide` renders the description, fields, matrices and element count

#### Scenario: Concept-level values shown
- GIVEN a concept with `tags:: [core]`
- WHEN it is in focus
- THEN the guide lists `tags` with `core`

#### Scenario: No markers section
- GIVEN any concept in focus
- THEN the guide contains no "Markers" section

#### Scenario: Focus cleared
- GIVEN the guide is shown
- WHEN the concept filter is cleared
- THEN `#nn-concept-guide` is removed

### Requirement: Scope semantics are distinct from view scope

The runtime MUST treat `meta.consoleScope.models` and `meta.consoleScope.view` as independent. A `view` scope MUST keep dropping the explorer, rail and search and mounting only that view. A `models` scope MUST NOT drop any explorer part: the runtime MUST render the explorer unchanged over the narrower payload. The runtime MUST render `meta.consoleScope.label` (see `console-scope`) as text.

#### Scenario: Model scope keeps the explorer
- GIVEN a payload with `meta.consoleScope = { models: ["a"], label: "A" }`
- WHEN the console boots in jsdom
- THEN the concept rail, search and facets exist and only model A's elements are listed

#### Scenario: View scope drops the explorer
- GIVEN `meta.consoleScope = { view: "timeline", label: "Timeline" }`
- WHEN the console boots
- THEN only the `timeline` view is mounted and no rail or search exists

### Requirement: Model identity header

The navbar MUST show the model identity from the payload: `meta.title` as the document title, plus the template, `meta.modelVersion` and `meta.generated` in a meta line. The title MUST NOT be a static string. All values MUST be rendered as text. A field absent from `meta` MUST be omitted from the line, not shown as a placeholder.

#### Scenario: Single-model scoped console shows identity
- GIVEN a payload scoped to one model with `title` `Acme Pricing`, template `business`, `modelVersion` `V_1-2-0` and a `generated` timestamp
- WHEN the console boots in jsdom
- THEN `#nn-domain-title` reads `Acme Pricing`
- AND the meta line contains `business`, `V_1-2-0` and the generated date

#### Scenario: Missing field is omitted
- GIVEN a payload whose `meta` has no `modelVersion`
- WHEN the navbar renders
- THEN no version text or empty placeholder appears

#### Scenario: Hostile title renders inert
- GIVEN `meta.title` is `<img src=x onerror=alert(1)>`
- WHEN the navbar renders
- THEN the string appears literally and no `img` element is created

### Requirement: Working element deep links

A link of the form `#el-<id>` (as produced by the kit for relations, references and pills) MUST resolve to the element whose model-qualified id matches `<id>`. Following it, or loading the page with it in the hash, MUST switch to the element's concept when it is not the active one, open the element's card, and scroll it into view. An `<id>` matching no element MUST do nothing and throw no error.

The kit's `reveal` action (`[data-ku-action="reveal"]`) MUST reuse this mechanism instead of re-rendering the unit: for an `element`, or the element that owns a `value`, it MUST navigate to `#el-<id>`; for a unit with no card of its own (document, section, matrix, source) it MUST narrow the view to the unit's canonical address instead. No second renderer may be introduced for a unit's content.

The unit info panel (`KuInfoPanel`) MUST be fed the per-kind `facts` the runtime actually knows — a concept's or field's usage count, a document's element count, a domain's model count — and MUST omit a fact rather than fabricate one.

#### Scenario: Relation link opens the target
- GIVEN element A with a relation to element B in another concept
- WHEN the reviewer follows the relation link `#el-<B id>`
- THEN the concept switches to B's concept, B's card is open and visible

#### Scenario: Page load with a deep link
- GIVEN the URL hash is `#el-<id>` of an existing element
- WHEN the console boots
- THEN that element's card is open and its concept is active

#### Scenario: Unknown deep link
- GIVEN the hash is `#el-nope`
- WHEN it is applied
- THEN the view is unchanged and no error is thrown

#### Scenario: Reveal takes you to the unit
- GIVEN an element badge whose card is currently filtered out
- WHEN its `reveal` action is activated
- THEN the filter broadens, the explorer tab is active and the element's card is scrolled into view

#### Scenario: Reveal for a unit with no card of its own
- GIVEN a document badge
- WHEN its `reveal` action is activated
- THEN the view narrows to its canonical address and no error is thrown

#### Scenario: Info facts are real or absent
- GIVEN an element of a known concept
- WHEN the `info` action opens the panel
- THEN the panel carries the concept's usage count, and omits any fact the runtime cannot derive

### Requirement: Source URL link with a safe-scheme allowlist

When `meta.sourceUrl` is present the navbar MUST show it. It MUST render as a link only when the value is an `http:` or `https:` URL or a relative path. Any other scheme (including mixed-case `javascript:`, `data:` and `vbscript:`) and protocol-relative or backslash-leading values MUST render as plain text, with no `a` element and no markup parsed from the value.

#### Scenario: Safe URLs link
- GIVEN `meta.sourceUrl` is `https://example.com/doc`, then `docs/model.md`
- WHEN the navbar renders
- THEN each is an `a` whose `href` equals the value

#### Scenario: Unsafe schemes are plain text
- GIVEN `meta.sourceUrl` is each of `javascript:alert(1)`, `JaVaScRiPt:alert(1)`, `data:text/html,<b>x</b>` and `vbscript:x`
- WHEN the navbar renders
- THEN no `a` and no `b` element exists and the value is shown as text

### Requirement: Per-model hash state read from meta.models

The feedback export `source_sha256` MUST be derived from the per-model entries of `meta.models` (`sha256`), including in domain and scoped consoles. The runtime MUST NOT depend on a model-level `meta.sha256` being present on a multi-model payload. Verdict badges are NOT read from `meta.models`: they derive from the changesets (`console-review-mode` "Verdict Badges").

#### Scenario: source_sha256 from meta.models
- GIVEN a scoped console for one model whose `meta.models[0].sha256` is `H`
- WHEN a feedback export is built
- THEN `meta.source_sha256` equals `H`

### Requirement: Scoped draft identity

The runtime MUST derive the draft-store key from the payload `meta.domainId`, which already carries the scope suffix defined in `console-scope`, and MUST append `::view:<id>` for a view scope. Consoles with different scopes MUST NOT share a draft store.

#### Scenario: Keys differ per scope
- GIVEN the same domaiNN exported whole and scoped to model A
- WHEN each console boots and saves a draft
- THEN the two draft stores use different keys and neither shows the other's draft

### Requirement: Re-pointed console suites boot the single shell and can fail

Every console test suite MUST boot `artifact_shell.html` through `nnConsole` and MUST NOT reference `model_console.html`, `render-model-viewer.js` or `InnfoModelViewer`. Each re-pointed or rewritten suite MUST be demonstrably able to fail: a recorded mutation check MUST show that deliberately breaking the behavior under test turns the suite red. A suite MUST NOT pass when it renders zero cards or finds none of the nodes it asserts on.

#### Scenario: No viewer references in suites
- GIVEN the console test suites after this change
- WHEN searched for `model_console`, `render-model-viewer` and `InnfoModelViewer`
- THEN there are zero hits

#### Scenario: Mutation turns a suite red
- GIVEN the identity-header, deep-link, `sourceUrl` allowlist and verdict-badge suites
- WHEN the corresponding runtime behavior is removed or loosened in a scratch copy
- THEN each affected suite fails

#### Scenario: Vacuous pass is rejected
- GIVEN a payload rendered into zero cards
- WHEN a suite asserts on card behavior
- THEN the suite fails on its own non-empty precondition instead of passing

### Requirement: Declared Field Lookup by Concept and Field

The runtime SHALL resolve a field's declared definition (`type`, `options`, `target_concepts`) from `schema.fields` by the pair (element concept, field name), compared case-insensitively, for read rendering (`FieldValue`), for the concept guide and for the edit modal target built by `review.js`. It MUST NOT match on the field name alone. When no definition matches, read rendering MUST fall back to the existing value-shape renderers and the edit modal MUST infer the widget from the value shape under the rules of `console-ui-kit` "Edit Modal Value Type Safety". The bundle MUST be rebuilt from the sources. A test MUST boot the console in jsdom on the output of `export-console.mjs` for a real fixture domaiNN, not on a hand-fed schema. (S3b P0-1.)

#### Scenario: Same field name, different concepts
- GIVEN `schema.fields` declares (`Task`, `status`) as `select` with options `[open, closed]` and (`Note`, `status`) as `string`
- WHEN a `Task` element and a `Note` element with `status` values render and their `status` edit modals open
- THEN the `Task` value is an `.nn-field-select` pill and its modal offers a `select`
- AND the `Note` value is plain text and its modal offers a text input (today the first name match wins for both)

#### Scenario: A real export reaches the renderers (regression)
- GIVEN a fixture domaiNN whose bluepriNNt declares a `select` field on concept `Initiative`
- WHEN it is exported with `export-console.mjs --domain` and the console boots in jsdom
- THEN at least one `.nn-field-select` node exists for an `Initiative` element (today none does in any exported console)

#### Scenario: Undeclared field falls back to shape
- GIVEN an element field `order: 3` with no declared definition
- WHEN its edit modal opens
- THEN the widget is `input[type=number]`

### Requirement: Knowledge Field Click-Through

A field declared `knowledge` SHALL render as a pill naming the bound model. When the value (ignoring `[[ ]]`, a leading `kNNowledge/` path and the `_NN.md`/`.md` suffix, case-insensitively) matches the file stem, `id` or `title` of an entry of `meta.models`, clicking the pill MUST apply the same `model:` filter the rail applies for that model. When it matches no model the pill MUST be inert and clicking it MUST NOT throw. The console MUST NOT offer to create or bind a model. (S3b P1-9.)

#### Scenario: Pill opens the bound model
- GIVEN a domain console with models `pricing` and `roadmap`, and an element whose `knowledge` field is `[[kNNowledge/roadmap_NN.md]]`
- WHEN the pill is clicked
- THEN the active filter is `model:roadmap` and only `roadmap` elements are listed

#### Scenario: Unknown model is inert
- GIVEN a `knowledge` value naming no model in `meta.models`
- WHEN the pill is clicked
- THEN the filter is unchanged and no error is thrown

#### Scenario: No creation affordance
- GIVEN any `knowledge` field
- THEN no control to create or bind a model exists

### Requirement: Open Original Source File

The citation detail dialog SHALL show, for every entry that carries an `href` (see `console-export-cli` "Console Links Are Relative to the Console File"), an "Open original" link (`a`, `target="_blank"`, `rel="noopener noreferrer"`) to the source file. The link MUST be rendered only when the `href` is a relative path or an `http:`/`https:` URL; error entries and entries without `href` MUST show no link. The console MUST NOT add preview, code or lineage modes for the file. (S3b P1, minimal `FilePreviewModal` port.)

#### Scenario: Open original from a citation
- GIVEN a field citation resolved to `sources/nn/interview.md` with `href: "sources/nn/interview.md"`
- WHEN its citation dialog opens
- THEN it contains an `a` with that `href`, `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: Error entry has no link
- GIVEN a citation entry with `error` set
- WHEN the dialog renders it
- THEN no "Open original" link exists for it

#### Scenario: Unsafe href is not a link
- GIVEN an entry whose `href` is `javascript:alert(1)`
- WHEN the dialog renders it
- THEN no `a` element is created for it

### Requirement: Field Facet Matching

The filter MUST support `<field>:<value>` for any declared Field, generalising the existing generic field filter. For a multi-valued Field (or any array value) the match MUST be exact, case-insensitive membership in the element's effective values (own plus inherited); substring matching MUST NOT be used for array membership. Matching MUST be type-aware: an array value uses exact `valueKey` membership, a scalar `select` uses exact case-insensitive equality, and other types use substring; numeric comparators are unchanged. Repeated `<field>:<value>` tokens, for the same or different fields, MUST combine with AND. Any-of is written with `|` inside one token, `<field>:a|b`, and matches an element carrying at least one of the listed values; each such token is one OR group. Every token and every other facet MUST combine with AND. Scalar Fields keep the existing generic matching. Model and concept facets keep their OR semantics; the asymmetry MUST be stated on the AND/OR connector's tooltip (`title`), not as visible filter-bar text. No dedicated `tag:` or `tag-any:` branch or alias remains. A facet rail or add-facet menu MUST list each `select` Field's values through a TWO-STEP facet: first the Field NAME, then, only after a Field is chosen, its values, drawing on the declared `options` vocabulary when the Field declares one and falling back to the observed values otherwise. No value MUST be listed before its Field is chosen. The AND/OR connector between clauses MUST be a segmented control (`.nn-op-toggle` with `.nn-op-btn` buttons and `role="group"`), not a native `<select>`, and activating the opposite option MUST rewrite the active query. (Previously: the facet listed every value directly and the AND/OR connector was a native `<select>` with the help as visible text.)

#### Scenario: Values narrow with AND
- GIVEN elements A `tags: [ai, pricing]` and B `tags: [ai]`
- WHEN the filter is `tags:ai tags:pricing`
- THEN only A is listed

#### Scenario: Exact membership, not substring
- GIVEN an element with `tags: [retail]`
- WHEN the filter is `tags:ai`
- THEN it is not listed

#### Scenario: Any-of widens with OR
- GIVEN elements A `tags: [ai]`, B `tags: [pricing]`, C `tags: [ops]`
- WHEN the filter is `tags:ai|pricing`
- THEN A and B are listed and C is not

#### Scenario: Mixed AND and any-of
- GIVEN elements A `tags: [core, ai]`, B `tags: [core, pricing]`, C `tags: [ai]`
- WHEN the filter is `tags:core tags:ai|pricing`
- THEN A and B are listed and C is not

#### Scenario: Works for any multi-valued field
- GIVEN a multi-valued Field `labels` and elements A `labels: [x, y]` and B `labels: [y]`
- WHEN the filter is `labels:x`
- THEN only A is listed

#### Scenario: Inherited values match
- GIVEN an element with no own `tags` whose concept carries `tags:: [core]`
- WHEN the filter is `tags:core`
- THEN the element is listed

#### Scenario: A field named tags is a facet source
- GIVEN an element whose Field `tags` is `[ai]`
- WHEN the filter is `tags:ai`
- THEN it is listed (reverses the former "not a tag source" rule)

#### Scenario: Legacy token is not special
- GIVEN the filter `tag:ai`
- WHEN it is evaluated
- THEN it is treated as the generic filter on a Field named `tag`, with no tag-specific branch
- AND `tag-any:ai` likewise has no special meaning

### Requirement: Console asset files use the nn prefix

From PR 2 the console runtime sources, stylesheet and bundle MUST be named with the `nn-` prefix: `nn-runtime.js`, `nn-icons.js`, `nn-preact-init.js`, `nn-address.generated.js`, `nn-slug.generated.js`, `nn-ui.css` and `nn-console.bundle.js`, under `iNNfo/specs/bluepriNNts/console/`. The regenerated payload (`console-payload.generated.cjs`) and the generated shells MUST reference the new names. No console asset file name MAY begin with `innfo-` after PR 2.

#### Scenario: Files renamed
- GIVEN `iNNfo/specs/bluepriNNts/console/` after PR 2
- WHEN it is listed
- THEN the seven `nn-` files exist and the former `innfo-*` runtime sources and `innfo-ui.css` do not

#### Scenario: Payload regenerated
- GIVEN the payload generator run after the rename
- WHEN `console-payload.generated.cjs` is checked against a fresh build
- THEN there is no drift

### Requirement: Console identifiers carry the nn prefix with a dual read

Every console identifier MUST carry the `nn-` prefix: the JS globals (`nnConsole`, `nnUI`, `nnIcons`, `nnAddress`, `nnSlug`, `nnReview`, `nnVisuals`, `nnPreact`, `nnProcedureStepper`), the `--nn-*` CSS custom properties, the DOM ids and classes, and the `data-nn-*` attributes. The embedded JSON slot ids are `nn-config`, `nn-schema` and `nn-model` (see `console-export-slots-and-standalone-pin`). The custom events are `nn:rendered` and `nn:theme-change`; the provenance `viewer` string is `nn-console@<version>`. The localStorage namespace is `nn-console:v4:` and MUST NOT read any previous namespace.

Artifacts that were already written MUST keep resolving: the lineage projection and the exporter MUST accept `(?:innfo|nn)` for the model slot id (`nn-core/src/lineage/project.ts`, `scripts/export-console.mjs`). A draft saved by a reviewer under the previous `innfo-console:v3:` namespace is NOT migrated, following the store's existing rule of never reading a previous namespace; a re-built console offers only the new store.

#### Scenario: Globals carry the prefix
- GIVEN a booted console
- WHEN the page globals are listed
- THEN `window.nnConsole`, `window.nnUI` and `window.nnAddress` are defined
- AND no `window.InnfoConsole`, `window.InnfoUI` or `window.InnfoAddress` exists

#### Scenario: An already-written artifact still resolves
- GIVEN a console HTML written before the rename that embeds `<script id="innfo-model">`
- WHEN the lineage projection reads it
- THEN the model slot is parsed and its citations are resolved

#### Scenario: A draft saved under the previous namespace is not read
- GIVEN a reviewer with a draft stored under the `innfo-console:v3:` key before the rename
- WHEN the console built after the rename boots for the same domaiNN
- THEN the draft is not loaded and the console offers only the `nn-console:v4:` store

### Requirement: Procedure Step Chain Is Derived From Declared References

The runtime MUST build a procedure's step chain from the model's declared references, not
from the order `Array.sort` leaves the siblings in. The **head** of the chain MUST be the
step that no sibling targets through `next::` (compared within the same parent), and the
chain MUST then follow `next::` (the relation first, then the `next::` field label). The
runtime MUST NOT treat the first element of a sibling array as the head. When `next::` does
not order two siblings, the tie-break MUST be document order (the order elements appear in
the model); the runtime MUST NOT use `localeCompare` or any name ordering to order a
workflow.

#### Scenario: Head is not alphabetically first

- GIVEN a procedure whose step chain is `Configurar el vídeo → Elegir imágenes → Redactar → Aprobar` and no sibling targets `Configurar el vídeo` with `next::`
- WHEN the chain is derived
- THEN it starts at `Configurar el vídeo` and reaches `Aprobar`
- AND no step is dropped even though `Aprobar` sorts before `Configurar` alphabetically

#### Scenario: Chain order is not name order

- GIVEN a procedure whose head is `Normalize Source` and whose chain ends `… → Report Ingestion`
- WHEN the chain is derived
- THEN it follows the declared `next::` order
- AND it does not reorder steps by name

#### Scenario: Document order breaks an unordered tie

- GIVEN two sibling steps with no `next::` edge between them anywhere in the chain
- WHEN the chain is derived
- THEN they keep the order they appear in the model

### Requirement: Procedure Structure Defects Are Visible

When the runtime cannot derive an unambiguous chain, it MUST record a structural defect and
render it; it MUST NOT silently drop or reorder steps. A defect MUST name the affected
element and the shape the runtime expected. The defect classes are: no head (a cycle), more
than one head (a fork), a `next::` target outside the same parent, and a step unreachable
from the head. The procedures view MUST show a structure summary (procedure count, step
count, ungrouped-step count) and one line per defect.

#### Scenario: Cycle is reported

- GIVEN a procedure whose steps form a `next::` cycle with no head
- WHEN the view renders
- THEN a defect naming the cycle is shown
- AND every step still appears (nothing is dropped)

#### Scenario: Two heads are reported

- GIVEN a procedure with two steps that no sibling targets
- WHEN the view renders
- THEN a defect naming both heads is shown
- AND both chains are visible

#### Scenario: Ungrouped steps are counted

- GIVEN a document whose `Work` elements have no root and no `parent::` links
- WHEN the view renders
- THEN the structure summary reports the ungrouped count
- AND the view does not present each ungrouped step as its own procedure without that signal

### Requirement: One Owner Of Console Tree Semantics

The runtime MUST be the single owner of console tree semantics: tree build, chain
derivation, `nextStep`, parent resolution, reference cleaning and sibling ordering all live
in `nn-runtime.js`. A view MUST consume them and MUST NOT carry a parallel implementation.
When the runtime is absent, the view MUST report it (its existing "runtime is not
available" state) rather than fall back to duplicated logic.

#### Scenario: No parallel ordering logic in the view

- GIVEN the procedure stepper source
- WHEN it is searched for chain-ordering, head-finding or parent-resolution logic
- THEN none is found
- AND the stepper calls the runtime for every structural operation

### Requirement: Procedure Tab Shows The Catalog Entry

The procedures view MUST join each executable workflow (a root `Work`) with its catalog
`Procedure` entry through the emitted `procedure_model` relation and render that entry's
`summary`, `category`, `executed_by`, `inputs_required` and `outputs_expected` in the
workflow header. When a root `Work` has no linked `Procedure`, the view MUST render the
workflow with its title and a note that no catalog entry is linked; it MUST NOT fabricate
values. Missing fields MUST be omitted, not shown as placeholders.

#### Scenario: Ficha is shown

- GIVEN a `Procedure` whose `procedure_model` relation targets a root `Work`
- WHEN that workflow's tab is active
- THEN the header shows the `Procedure`'s summary, category, responsible role and expected inputs/outputs

#### Scenario: No catalog entry linked

- GIVEN a root `Work` with no incoming `procedure_model` relation
- WHEN its tab is active
- THEN the header shows the workflow title and a "no catalog entry" note
- AND no fabricated summary appears

### Requirement: Decision Steps Render As Branches

A step whose `step_type::` is `decision` and that declares two or more `next::` targets MUST
render as a branch listing each outcome; a `decision` with a single `next::` target MUST
render as a normal step. Branch rendering is presentation only: the underlying `next::`
references MUST NOT be rewritten.

#### Scenario: Two outcomes are visible

- GIVEN a `decision` step with `next:: [[Approve]]` and `next:: [[Revise]]`
- WHEN the step renders
- THEN both `Approve` and `Revise` are shown as outcomes of the branch

#### Scenario: Single outcome is a linear step

- GIVEN a `decision` step with one `next::` target
- WHEN it renders
- THEN it renders as an ordinary step in the chain

### Requirement: Procedure Stepper Consumes The Shared Runtime

The `procedures` console view MUST consume the shared runtime for all structural operations
and MUST NOT carry a fallback copy of them: `render-procedure-stepper.js` re-implemented
`sortChildren`/`chainOf`/`firstChild`/`nextStep`/`resolveParentId` with a local fallback,
ordered siblings by `localeCompare`, and started the chain at the first child. It mounts as
a registered view (`console-view-registry`), renders one tab per executable workflow (a root
`Work`), and renders the chain derived per "Procedure Step Chain Is Derived From Declared
References". Its step-log dialog MUST stay scoped to its own container and MUST NOT use
`#nn-export-modal`.

#### Scenario: View reads structure from the runtime

- GIVEN a payload with a procedure whose head is not alphabetically first
- WHEN the view mounts
- THEN the rendered chain matches the declared `next::` order
- AND the view source contains no sibling-ordering logic

#### Scenario: Tabs are workflows

- GIVEN a document with one root `Work` and its steps
- WHEN the view renders
- THEN it shows one tab for the root `Work`, not one per step

