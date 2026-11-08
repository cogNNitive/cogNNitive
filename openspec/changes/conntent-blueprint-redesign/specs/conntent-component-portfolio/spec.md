# conntent-component-portfolio Delta Spec

Source decisions: D18 (format), C2, D17 tokens (Slice 2: Cascade; the console picker belongs to Slice 4). In this capability a "component" is a slot-filling item of the portfolio. The word "animation" keeps meaning the authored HyperFrames scene Layer (`type:: animation`).

## ADDED Requirements

### Requirement: A Component Is A Folder With COMPONENT.md, index.html And preview.mp4

A component MUST be a folder `library/components/<name>/` (at the domaiNN or series level, or `media/components/<name>/` in an episode, or in the blueprint package) holding:

| File | Required | Content |
|---|---|---|
| `COMPONENT.md` | yes | frontmatter and prose (below) |
| `index.html` | yes | the HyperFrames fragment that renders the component |
| `preview.mp4` | yes for package items, recommended otherwise | a short rendered preview used by the console picker |
| `LICENSE` | yes when `source` is `registry:...` | the licence text of the vendored item |

The folder name MUST match the library name pattern and MUST equal the frontmatter `name`. A missing `COMPONENT.md` or `index.html` MUST fail with `component-invalid`. A missing `preview.mp4` outside the package MUST produce the warning `component-missing-preview` and MUST NOT fail validation.

#### Scenario: Valid component
- GIVEN `library/components/hero-title/` with `COMPONENT.md`, `index.html` and `preview.mp4`
- WHEN the component is loaded
- THEN it loads with no finding

#### Scenario: Missing index
- GIVEN a component folder without `index.html`
- WHEN it is loaded
- THEN it fails with `component-invalid` naming the missing file

#### Scenario: Local component without preview
- GIVEN a local component without `preview.mp4`
- WHEN it is loaded
- THEN it loads with the warning `component-missing-preview`

#### Scenario: Package component without preview
- GIVEN a package component without `preview.mp4`
- WHEN the package test runs
- THEN the test fails naming the component

### Requirement: COMPONENT.md Frontmatter Schema

`COMPONENT.md` MUST start with YAML frontmatter with these keys, all required:

| Key | Type | Rule |
|---|---|---|
| `name` | string | equals the folder name |
| `slot` | string | a slot name accepted by the `components` field (the keys of its blueprint default list) |
| `variables` | list of objects | each `{ name, type, default, required }`; `name` unique and snake_case; `type` one of `string`, `number`, `color`, `file`; `required` boolean (default `false`); a `required: true` variable MUST NOT define a `default` |
| `duration` | number or `scene` | seconds greater than 0, or `scene` meaning the component spans its scene |
| `aspect` | list | non-empty; each entry one of `16:9`, `9:16`, `1:1`, `any` |
| `source` | string | `local`, or `registry:<item>@<version>` where `<version>` is an exact version (no ranges, no `latest`) |
| `tokens` | list of strings | frame token paths the component reads, each of the form `colors.<token>`, `typography.<token>` or `spacing.<token>`; the list MAY be empty |

For `source` of the form `registry:...` a `license` key (SPDX identifier string) MUST also be present. Violations MUST fail with `component-invalid` naming the file, the key and the reason, before any spend. Unknown keys MUST fail with `component-invalid`.

#### Scenario: Complete frontmatter
- GIVEN frontmatter with all keys, `slot: title`, `source: local`
- WHEN the component is validated
- THEN it validates

#### Scenario: Unpinned registry source
- GIVEN `source: registry:hero-title@latest`
- WHEN the component is validated
- THEN it fails with `component-invalid` naming `source` and stating a pinned version is required

#### Scenario: Registry source without licence
- GIVEN `source: registry:hero-title@1.2.0` and no `license` key
- WHEN the component is validated
- THEN it fails with `component-invalid` naming `license`

#### Scenario: Required variable with a default
- GIVEN a variable `{ name: text, type: string, required: true, default: "x" }`
- WHEN the component is validated
- THEN it fails with `component-invalid` naming `variables.text`

#### Scenario: Invalid aspect
- GIVEN `aspect: [4:3]`
- WHEN the component is validated
- THEN it fails with `component-invalid` listing the accepted values

#### Scenario: Unknown slot
- GIVEN `slot: confetti` and no such key among the `components` slots
- WHEN the component is validated
- THEN it fails with `component-invalid` naming `slot` and listing the slots accepted

#### Scenario: Zero duration
- GIVEN `duration: 0`
- WHEN the component is validated
- THEN it fails with `component-invalid` naming `duration`

### Requirement: COMPONENT.md Prose Guides Use And Variants

The body of `COMPONENT.md` MUST contain the headings `## When to use` (when the component fits and when it does not) and `## Variant prompt` (a prompt an agent can use to create a variant of the component). A missing or empty section MUST produce the warning `component-missing-prose` naming the section and MUST NOT fail validation, except for package items, where the package test MUST fail.

#### Scenario: Complete prose
- GIVEN a body with both headings, non-empty
- WHEN the component is validated
- THEN no warning is reported

#### Scenario: Missing variant prompt
- GIVEN a local component without `## Variant prompt`
- WHEN the component is validated
- THEN the warning `component-missing-prose` names `Variant prompt`

#### Scenario: Package item missing prose
- GIVEN a package component without `## When to use`
- WHEN the package test runs
- THEN the test fails naming the component

### Requirement: Components Are Selected With The `components` Field

Items MUST be selected with the existing keyed `components:: <slot>=<name>` field, now a `render` class field settable at `Video Defaults`, `Series`, `Scene Kind`, `Preset`, `Video` and `Scene` (see `conntent-field-registry`) and resolved per key through the cascade. `<name>` MUST be resolved as `components/<name>` through the library lookup of `conntent-library`, ending at the package. The slot of the found item MUST equal the key, else `component-slot-mismatch` naming the key, the name and the item's slot. An unresolved name MUST fail with `component-not-found` naming the name and the folders searched. Level prefixes MUST be accepted (`components:: title=series:components/hero-title`).

#### Scenario: Series selects a component
- GIVEN the Series `components:: [title=hero-title]` and `series/s/library/components/hero-title/` with `slot: title`
- WHEN the `title` slot is resolved
- THEN it resolves to that item with source `series`

#### Scenario: Nearer level wins per key
- GIVEN the Series `components:: [title=a, quote=b]` and a Scene Kind `components:: [title=c]`
- WHEN a scene of that kind resolves `title` and `quote`
- THEN `title` is `c` with source `kind` and `quote` is `b` with source `series`

#### Scenario: Slot mismatch
- GIVEN `components:: title=pull-quote` where `pull-quote` has `slot: quote`
- WHEN the pre-compile check runs
- THEN it fails with `component-slot-mismatch` naming `title`, `pull-quote` and `quote`

#### Scenario: Not found
- GIVEN `components:: title=ghost` and no such item at any level or in the package
- WHEN the pre-compile check runs
- THEN it fails with `component-not-found` listing the folders searched

#### Scenario: Local item shadows the package item
- GIVEN a package item `hero-title` and a series item `hero-title`
- WHEN `components:: title=hero-title` is resolved for an episode of that series
- THEN the series item is used

### Requirement: Component Variables Are Bound From The Layer

When a component fills a Layer, each variable whose `name` equals a field of that Layer (for example `text`, `asset`, `position`) MUST take the Layer's value; a variable not set by the Layer MUST take its `default`; a `required: true` variable with no Layer value MUST fail with `component-variable-missing` naming the Layer, the component and the variable, before any spend. A Layer field with no matching variable MUST be ignored by the component and MUST NOT fail. A value whose type does not match the variable type MUST fail with `component-variable-invalid`.

<!-- Assumption: binding by name is the simplest rule consistent with the existing `components:: <slot>=<name>` selection, which carries no variable bindings. -->

#### Scenario: Text variable bound from the Layer
- GIVEN a `title` component with a required string variable `text` and a text Layer with `text:: Hello`
- WHEN the Layer is compiled
- THEN the component renders `Hello`

#### Scenario: Default used when the Layer is silent
- GIVEN a variable `accent` of type `color` with default `#FF5A36` and a Layer that sets none
- WHEN the Layer is compiled
- THEN the component receives `#FF5A36`

#### Scenario: Required variable missing
- GIVEN a required variable `text` and a Layer without `text`
- WHEN the pre-compile check runs
- THEN it fails with `component-variable-missing` naming the Layer, the component and `text`

#### Scenario: Wrong type
- GIVEN a `number` variable `count` and a Layer value `many`
- WHEN the pre-compile check runs
- THEN it fails with `component-variable-invalid`

### Requirement: Component Tokens Must Exist In The Active Frame

Every path in a component's `tokens` MUST exist in the resolved frame of the scene that uses it (see `conntent-frame`). A missing token MUST fail before any spend with `component-token-missing` naming the component, the token and the frame. A component MUST read colours, fonts and spacing only through the emitted `frame.md` tokens and MUST NOT hard-code a colour or font that is declared as a token it uses.

#### Scenario: Token present
- GIVEN a component with `tokens: [colors.primary]` and a frame defining `colors.primary`
- WHEN the pre-compile check runs
- THEN no finding is reported

#### Scenario: Token missing
- GIVEN `tokens: [colors.accent]` and a frame without `colors.accent`
- WHEN the pre-compile check runs
- THEN it fails with `component-token-missing` naming the component, `colors.accent` and the frame

### Requirement: The Package Vendors A Pinned Base Set

This requirement is the single owner of the package base set. The blueprint package MUST ship between 15 and 18 components in its `library/components/` (inclusive), each with `preview.mp4` and complete prose, covering every slot of the `components` blueprint default. The set consists of the engine-authored components converted to this format (`source: local`, design D-K5) and items vendored from the HyperFrames registry; every vendored item MUST have `source: registry:<item>@<version>` pinned to an exact version, a `license` key whose value is a permissive SPDX identifier, and a `LICENSE` file, and a candidate under a non-permissive licence MUST NOT be added. A package test MUST verify these rules and that no `index.html` of the package contains an `http:`, `https:` or protocol-relative URL, so rendering never needs the network and no stage fetches a registry item at render time.

<!-- shared with slice 3: shipping the set inside the installed skill is referenced by conntent-skill-dependency-bundling "The installed skill carries the base set"; which registry items to vendor is open verification V5 of the proposal. -->

#### Scenario: Base set size
- GIVEN the blueprint package
- WHEN its `library/components/` is listed
- THEN it holds between 15 and 18 component folders

#### Scenario: Every slot is covered
- GIVEN the slots of the `components` blueprint default
- WHEN the package components are grouped by `slot`
- THEN every slot has at least one component

#### Scenario: Vendored items are pinned and licensed
- GIVEN the package components whose `source` starts with `registry:`
- WHEN their frontmatter is read
- THEN each has `source` of the form `registry:<item>@<exact-version>`, a permissive `license` and a `LICENSE` file

#### Scenario: Engine-authored items are local
- GIVEN a converted engine-authored component
- WHEN its frontmatter is read
- THEN `source` is `local` and no `LICENSE` file is required

#### Scenario: Non-permissive licence rejected
- GIVEN a candidate registry item under a non-permissive licence
- WHEN the package test runs
- THEN it fails and names the item

#### Scenario: Rendering needs no network
- GIVEN the package components
- WHEN every `index.html` is scanned for URLs
- THEN none contains a network URL

#### Scenario: Offline render with a vendored item
- GIVEN no network access and `components:: title=<a package item>`
- WHEN an episode is compiled
- THEN compilation succeeds and no network request is made

### Requirement: The Console Data Exposes The Portfolio To The Picker

<!-- shared with slice 4: the picker UI is specified by conntent-domain-console "Component picker" -->

The coNNtent console data module MUST list, for every level that can set `components` (domaiNN, series, and the episode), the components visible from that level through the library lookup of `conntent-library`, each with `name`, `slot`, `variables`, `duration`, `aspect`, `source`, `tokens`, the level it comes from, whether a nearer item of the same name shadows it, and the path of its `preview.mp4` relative to the console file (absent when the file is missing). It MUST read these from `COMPONENT.md` through the engine's loader and MUST NOT parse them a second time. A component that fails `component-invalid` MUST be listed with its error and MUST NOT be selectable. The package floor items MUST be included at level `package`.

#### Scenario: Visible set per level
- GIVEN a series component `boxed` and a domaiNN component `boxed` and a package component `plain`
- WHEN the data is built for an episode of that series
- THEN `boxed` is listed once from `series` with the domaiNN one marked shadowed, and `plain` is listed from `package`

#### Scenario: Invalid component is not selectable
- GIVEN a component whose `COMPONENT.md` fails validation
- WHEN the data is built
- THEN it is listed with its error and flagged not selectable

#### Scenario: Missing preview
- GIVEN a local component with no `preview.mp4`
- WHEN the data is built
- THEN its preview path is absent and the entry is still listed
