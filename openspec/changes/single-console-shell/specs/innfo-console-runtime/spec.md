# Delta for innfo-console-runtime

## ADDED Requirements

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

### Requirement: Per-model verdict and hash state read from meta.models

Verdict badges and the feedback export `source_sha256` MUST be derived from the per-model entries of `meta.models` (`feedbackState`, `sha256`), including in domain and scoped consoles. The runtime MUST NOT depend on a model-level `meta.feedbackState` or `meta.sha256` being present on a multi-model payload.

#### Scenario: Badge in a scoped console
- GIVEN a scoped console whose `meta.models[0].feedbackState` has an `applied` item targeting an element
- WHEN the element renders
- THEN it shows an `applied` StatusBadge

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

## MODIFIED Requirements

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

When `needs[]` declares `feedback-export`, `InnfoConsole` MUST inject the banner, export button and modal itself through an idempotent routine, creating one `[data-innfo-feedback-root]` with `#innfo-feedback-banner`, `#innfo-feedback-open` and `#innfo-feedback-modal`. It MUST read `needs[]` from the DOM so boot order does not matter. Shells MUST NOT need feedback markup; the old `#innfo-banner`, `#innfo-export-open` and `#innfo-export-modal` markup and CSS MUST be removed from `artifact_shell.html`. Injection MUST happen once even if the bundle boots more than once, MUST work offline via `file://`, and MUST NOT use `fetch` or `type=module`. The new ids MUST NOT clash with any other dialog in the page: the procedure view's step-log dialog MUST be scoped to its own container and MUST NOT use `#innfo-export-modal`. Styling MUST be minimal CSS classes.
(Previously: the first scenario used `model_console.html`.)

#### Scenario: Shell gains feedback with no markup
- GIVEN `artifact_shell.html` with unchanged markup declaring `feedback-export`
- WHEN opened
- THEN the export button is present and the modal opens

#### Scenario: Single injection
- GIVEN a console where the bundle boots twice
- WHEN the page loads
- THEN exactly one feedback root, one banner and one export button exist

#### Scenario: No clash with the procedure view
- GIVEN a domaiNN console whose `procedure` view has a step-log dialog
- WHEN the feedback UI is injected
- THEN both dialogs coexist with distinct ids and no id appears twice in the document
- AND the log dialog does not use `#innfo-export-modal`

### Requirement: Needs Registry Without Feedback Anchors

`needs-registry.json` MUST declare `feedback-export` with empty anchors (`[]`). The shell guard (`scripts/lib/console-shell-guard.js`) MUST NOT contain a hard-coded exemption for any named shell or for `feedback-export`, and MUST NOT assume more than one live shell exists.
(Previously: the guard was forbidden a hard-coded exemption for `model_console.html`.)

#### Scenario: No shell-specific branch
- GIVEN the guard after this change
- WHEN it runs over the repository shells
- THEN `artifact_shell.html` passes through the registry rule alone, and the guard source contains no shell-file-name branch

#### Scenario: No anchors required
- GIVEN a shell declaring `feedback-export` with no feedback markup
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

## REMOVED Requirements

### Requirement: Console compile procedure relocated to workspace level

(Reason: it governed `workspace/procedures/compile_model_console_NN.md`, which is deleted together with `model_console.html` and the `build_console_payload` MCP tool.)
(Migration: none. Single-model consoles are produced by the scoped mode of `scripts/export-console.mjs` (see `console-export-cli`); no replacement procedure exists.)
