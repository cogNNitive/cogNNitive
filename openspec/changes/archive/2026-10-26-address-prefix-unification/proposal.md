# Proposal: Address Prefix Unification & Query Exclusivity Lifting

## Intent

Unify knowledge unit address parsing across `sourceRef.ts` and `unit-address.ts` on the explicit prefix dialect (`concept:<slug>`, `matrix:<slug>`), remove fragile slug-shape heuristics, and lift the `@`/`?` exclusivity in `queryUnits.ts` to allow concept-scoped queries (`model@concept:<slug>?<filters>`).

## Why Now

1. **Two Coexisting Dialects**:
   - `sourceRef.parseKnowledgeUnitRef` (`sourceRef.ts:524`) infers kind from shape heuristics (`^matrix-` / `-matrix$` at line 560) and does not recognise concepts. An element slugged `risk-matrix` or `decision-matrix` is misparsed as a matrix.
   - `unit-address.ts` uses explicit prefixes: `model@concept:<slug>`, `model@matrix:<slug>`, and bare `model@<slug>` for elements.
2. **Concept Addressing & Scoped Queries**:
   - Cross-domaiNN imports and model-scoped rail filtering need to query specific concepts deterministically (e.g., `inbox>noticias@concept:noticias?categoria=A`).
   - Today, `queryUnits.ts:53` rejects any query string containing `@`, preventing concept-level filtering.

An earlier proposal to replace this with a hierarchical syntax (`model@concept/element`) was **discarded** because concepts are already addressable in the prefix dialect, and introducing a third grammar creates unnecessary churn without benefits.

## Scope

| Component | In Scope | Non-Goals |
|---|---|---|
| `sourceRef.ts` | Teach `concept:` and `matrix:` prefixes to `parseKnowledgeUnitRef`; remove `matrix-` regex heuristic. | Changing file-path resolution rules or URI encoding. |
| `queryUnits.ts` | Allow queries on concept-addressed units: `path@concept:<slug>?<filters>`. Parse concept target and filter units within that concept. | Nested boolean queries or arbitrary sub-element scoping. |
| `spec.md` | Update `openspec/specs/knowledge-unit-address/spec.md` to reflect unified grammar and query compatibility. | Modifying write-once published `_V_x-y-z_` specs. |

## Approach

1. **Prefix Dialect as Single Standard**:
   - `model@concept:<slug>`: Section/concept scope.
   - `model@matrix:<slug>`: Matrix scope.
   - `model@<slug>`: Element scope.
   - `sourceRef.parseKnowledgeUnitRef` parses prefixes explicitly. Any slug without a prefix is treated as an element, eliminating collisions on slugs containing `matrix`.
2. **Lift `@`/`?` Exclusivity**:
   - In `queryUnits.ts`, split at `?` first, then validate the path/target. If the target contains `@`, parse it with unit address parser. If it points to a concept (`@concept:<slug>`), scope markdown and CSV querying to elements belonging to that concept.

## Ponytail Ceilings & Future Enhancements (Tag: potential-enhancement)

- **Element-Scoped Query Addressing (`model@element?subfield`)**:
  - *Ceiling*: Querying sub-elements or property values directly via URI query string is intentionally disallowed. Bare element targets with `?` are rejected.
  - *Why deferred*: Overengineering with no active consumer; cross-domain imports only require scoping by model or concept.
  - *Activation trigger*: A real use-case emerges requiring intra-element multi-property filtering without reading the full element node.
- **Arbitrary Hierarchical Path Resolution (`model@concept/element/field`)**:
  - *Ceiling*: Retained explicit prefix dialect (`@concept:<slug>`, `@matrix:<slug>`, bare element) rather than deep recursive path grammars.
  - *Activation trigger*: Cross-domain deep traversal across nested concept graphs requiring filesystem-like URI nesting.
