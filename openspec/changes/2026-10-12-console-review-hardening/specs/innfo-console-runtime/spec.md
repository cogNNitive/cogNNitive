# Delta for innfo-console-runtime

## ADDED Requirements

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

`draftToChange` MUST emit a `target` whose model part is the model's file stem and whose
element part is an identifier `apply_change` resolves (name or slug). A draft of kind
`new` MUST export as `op:: add_element` (concept, name, fields); a `new` draft lacking a
concept or name MUST export as `op:: comment`. When the target element hash is known, the
change MUST carry `base_hash`.

#### Scenario: Round trip from console to apply

- GIVEN console drafts of kind `correction`, `delete` and `new` against a fixture domain
- WHEN they are exported, parsed with `parseChangeset` and applied with `applyChange`
- THEN every change resolves its target and applies without a resolution error

### Requirement: Per-draft staleness is visible

The runtime MUST use `isTargetChanged` to mark a draft whose target element changed
since the draft was created.

#### Scenario: Target edited after drafting

- GIVEN a draft created against element hash H1
- WHEN the console loads a payload where that element's hash is H2
- THEN the draft is flagged stale in the review UI
