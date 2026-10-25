# Delta Spec: console-export-slots-and-standalone-pin

Scope guard: this change renames the embedded JSON slot ids. The capability id is unchanged. One requirement pinned the slot ids as not part of any rename and is renamed and rewritten here.

## RENAMED Requirements

- FROM: `### Requirement: Embedded slot ids are not part of the rename`
- TO: `### Requirement: Embedded slot ids carry the nn prefix with a legacy read`

## MODIFIED Requirements

### Requirement: Embedded slot ids carry the nn prefix with a legacy read

`scripts/export-console.mjs` MUST emit the embedded JSON script slots as `nn-config`, `nn-schema` and `nn-model`, and MUST NOT emit an `innfo-*` slot. A single artifact MUST carry exactly one spelling of each id: the rename MUST NOT alias or dual-emit them. Readers of artifacts that were already written (`nn-core/src/lineage/project.ts` and the exporter's own `extractModelMetaFromHtml`) MUST accept `(?:innfo|nn)` for the model slot id, so stamped exports keep resolving.

#### Scenario: Exported slots carry the prefix
- GIVEN a model exported after the rename
- WHEN its slots are listed
- THEN they are `nn-config`, `nn-schema` and `nn-model` and no `innfo-config`, `innfo-schema` or `innfo-model` slot exists

#### Scenario: A stamped export still resolves
- GIVEN a console exported before the rename that embeds `<script id="innfo-model">`
- WHEN the exporter or the lineage projection reads it
- THEN the model slot is parsed without error
