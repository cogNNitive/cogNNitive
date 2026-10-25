# Delta Spec: innfo-console-runtime

Scope guard: this change renames the console identifier surface to the `nn-` prefix. The capability id stays `innfo-console-runtime`. One requirement pinned the pre-rename identifiers and is renamed and rewritten here; the naming inside the other requirements is updated by the corpus sweep without changing their semantics.

## RENAMED Requirements

- FROM: `### Requirement: Internal console identifiers are unchanged by the rename`
- TO: `### Requirement: Console identifiers carry the nn prefix with a dual read`

## MODIFIED Requirements

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
