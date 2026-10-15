# innfo-console-runtime Specification

## Purpose

One shared versioned runtime (`innfo-runtime.js`) plus a thin console shell (`artifact_shell.html`) for all HTML console artifacts. Eliminates inline runtime duplication across template assets while preserving `file://` double-click with zero build.
## Requirements
### Requirement: Shared UMD/IIFE Runtime

The system MUST ship a single versioned `innfo-runtime.js` as a UMD/IIFE global (`window.InnfoConsole`). The console bundle MUST also include `ui-kit.js` (`window.InnfoUI`), ordered before any module that consumes it, and MUST inject the design tokens at boot. The runtime and kit MUST NOT use `fetch()` and MUST NOT use `type=module`. They MUST be hosted on GitHub Pages and jsDelivr, with a vendored local fallback for offline use.
(Previously: the kit-ordering scenario named `InnfoModelViewer` as a second consumer.)

#### Scenario: Offline file:// open
- GIVEN a generated console referencing the runtime
- WHEN opened via `file://` double-click with no network
- THEN the console renders fully from the local fallback

#### Scenario: No module primitives in runtime
- GIVEN the published `innfo-runtime.js` and bundle
- WHEN scanned for `fetch(` and `type=module`
- THEN neither token appears

#### Scenario: Kit available before consumers
- GIVEN the bundle loaded
- WHEN `InnfoConsole` initializes
- THEN `window.InnfoUI` is already defined

### Requirement: Console Shell with Config and JSON Slots

`artifact_shell.html` MUST declare an `innfo-config` block with a `needs[]` capability list and exactly two JSON slots: `innfo-schema` and `innfo-model`. Generated consoles MUST declare only `needs[]` plus slot payloads, MUST NOT inline runtime code, and MUST NOT supply feedback UI markup.
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

When `needs[]` declares `changeset-export`, `InnfoConsole` MUST inject the banner, export button and modal itself through an idempotent routine, creating one `[data-innfo-changeset-root]` with `#innfo-changeset-banner`, `#innfo-changeset-open` and `#innfo-changeset-modal`. It MUST read `needs[]` from the DOM so boot order does not matter. Shells MUST NOT need feedback markup; the old `#innfo-banner`, `#innfo-export-open` and `#innfo-export-modal` markup and CSS MUST be removed from `artifact_shell.html`. Injection MUST happen once even if the bundle boots more than once, MUST work offline via `file://`, and MUST NOT use `fetch` or `type=module`. The new ids MUST NOT clash with any other dialog in the page: the procedure view's step-log dialog MUST be scoped to its own container and MUST NOT use `#innfo-export-modal`. Styling MUST be minimal CSS classes.
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
- AND the log dialog does not use `#innfo-export-modal`

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

`innfo-console.bundle.js` MUST equal the output of `scripts/build-console-bundle.mjs` over its declared `SOURCES`, which MUST include `ui-kit.js` and MUST NOT include `render-model-viewer.js`. Root npm scripts `build:console` (build) and `check:console-bundle` (drift check) MUST exist. A node:test drift suite, wired into `verify.js` and `check-integrity.js`, MUST fail when the checked-in bundle differs from a fresh build. The build process MUST be documented.
(Previously: SOURCES had to include `ui-kit.js`; the viewer was not excluded.)

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

### Requirement: Released Bundle Is Versioned

A changed bundle MUST ship under a new `innfo-console-v*` tag and a new CDN file; a published tagged bundle MUST NOT be overwritten. This change and change C (`2026-10-01-console-review-ux`) MUST ship under ONE `innfo-console-v*` tag. Version references MUST be produced by `channel-refs.js` and `sync-versions.mjs`, never hand-edited. Shell edits under `bluepriNNts/**` MUST be accompanied by a `blueprints-v*` tag (not `templates-v*`) and a repin in the same batch. Frozen vendored bundle copies (the three sample/export copies and two innfo-core test fixtures) MUST each be declared frozen or regenerated explicitly.

#### Scenario: Refs are derived
- GIVEN the release batch
- WHEN `validate-manifest` and `check-integrity` run
- THEN both pass with generated refs only

#### Scenario: One tag for B and C
- GIVEN B and C both merged
- WHEN the release is cut
- THEN a single `innfo-console-v*` tag covers both and no tag ships B's kit without C

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
- THEN `#innfo-media-dialog` shows the first image and a `1 / 2` counter

#### Scenario: Advance
- GIVEN the open lightbox
- WHEN next is clicked
- THEN the second image shows and the counter reads `2 / 2`

### Requirement: Field Detail Dialog

The runtime MUST provide `renderFieldDetailDialog(doc, field)` opening a
read-only `<dialog>` that renders one field's full value through `InnfoUI.FieldValue`.
In Table mode, double-clicking a field cell MUST open it for that cell.

#### Scenario: Double-click a cell
- GIVEN Table mode
- WHEN a field cell is double-clicked
- THEN `#innfo-field-dialog` opens with the field name and its typed value

### Requirement: Incoming Relations On Cards

Every element card MUST show its incoming relations (elements whose relations
target it) in a `Referenced by (n)` section, in addition to its outgoing
relations. Incoming relations are derived by scanning every element's
`relations` for a target equal to the card's id.

#### Scenario: Referenced element
- GIVEN element B whose relation targets element A
- WHEN A's card renders
- THEN it contains `.innfo-card-incoming` labelled `Referenced by (1)` linking to B

### Requirement: Concept Guidance Panel

The runtime MUST provide a right-hand concept guide (`#innfo-concept-guide`) that
appears when a single concept is in focus (a `concept:` filter) and shows the
concept's description, field schema, markers, associated matrices and element
count; it MUST be removed when no single concept is in focus.

#### Scenario: Concept in focus
- GIVEN a `concept:Fleet` filter and a Fleet concept with a description
- WHEN the explorer refreshes
- THEN `#innfo-concept-guide` renders the description, fields, matrices and element count

#### Scenario: Focus cleared
- GIVEN the guide is shown
- WHEN the concept filter is cleared
- THEN `#innfo-concept-guide` is removed

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
- THEN `#innfo-domain-title` reads `Acme Pricing`
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

Every console test suite MUST boot `artifact_shell.html` through `InnfoConsole` and MUST NOT reference `model_console.html`, `render-model-viewer.js` or `InnfoModelViewer`. Each re-pointed or rewritten suite MUST be demonstrably able to fail: a recorded mutation check MUST show that deliberately breaking the behavior under test turns the suite red. A suite MUST NOT pass when it renders zero cards or finds none of the nodes it asserts on.

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
- THEN the `Task` value is an `.innfo-field-select` pill and its modal offers a `select`
- AND the `Note` value is plain text and its modal offers a text input (today the first name match wins for both)

#### Scenario: A real export reaches the renderers (regression)
- GIVEN a fixture domaiNN whose bluepriNNt declares a `select` field on concept `Initiative`
- WHEN it is exported with `export-console.mjs --domain` and the console boots in jsdom
- THEN at least one `.innfo-field-select` node exists for an `Initiative` element (today none does in any exported console)

#### Scenario: Undeclared field falls back to shape
- GIVEN an element field `order: 3` with no declared definition
- WHEN its edit modal opens
- THEN the widget is `input[type=number]`

### Requirement: Tag Facet Matching

The filter SHALL treat `tag:<t>` as exact, case-insensitive membership in `element.tags`, and multiple `tag:` tokens MUST combine with AND. `tag-any:<t>` tokens MUST form one OR group: an element matches the group when it carries at least one of them. The `tag:` set, the `tag-any:` group and every other facet MUST combine with AND. Substring matching MUST NOT be used for tags. `element.tags` is the only tag source: a field that happens to be named `tags` or `tag` MUST NOT be read by the tag facet (full-text search still finds its value). Model and concept facets keep their OR semantics; the asymmetry MUST be stated in the filter help text or documentation. (S3b P0-4.)

#### Scenario: Tags narrow with AND
- GIVEN elements A `tags: [ai, pricing]` and B `tags: [ai]`
- WHEN the filter is `tag:ai tag:pricing`
- THEN only A is listed (today A and B are, by OR)

#### Scenario: Exact match, not substring
- GIVEN an element with `tags: [retail]`
- WHEN the filter is `tag:ai`
- THEN it is not listed (today `ai` matches inside `retail`)

#### Scenario: tag-any widens with OR
- GIVEN elements A `tags: [ai]`, B `tags: [pricing]`, C `tags: [ops]`
- WHEN the filter is `tag-any:ai tag-any:pricing`
- THEN A and B are listed and C is not

#### Scenario: Mixed AND and OR
- GIVEN elements A `tags: [core, ai]`, B `tags: [core, pricing]`, C `tags: [ai]`
- WHEN the filter is `tag:core tag-any:ai tag-any:pricing`
- THEN A and B are listed and C is not

#### Scenario: A field named tags is not a tag source
- GIVEN an element with no `tags` and a string field `tags: "ai"`
- WHEN the filter is `tag:ai`
- THEN it is not listed

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

