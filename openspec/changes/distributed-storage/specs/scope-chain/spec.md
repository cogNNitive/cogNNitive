# Delta for scope-chain

Living spec read: `openspec/specs/scope-chain/spec.md`. The scope chain is explicitly unchanged by this change: `findScopeChain`, the root marker `domaiNN_NN.md`, the `scope: true` sub-scope flag, single-parent containment, `isolate`, nested domaiNN roots, the move-warning rule and element scopes (`scope_elements`) keep their requirements byte for byte. Storage (`concept-storage-declaration`) is orthogonal: it decides where an instance lives; the chain decides from whom it inherits values.

One requirement of this living spec is about model identity, not about the chain, and is replaced by `hierarchical-identity`: "Model Id Collision Resolves via Domain-Relative Path (Option A)". It is the only requirement removed here.

Notes for the reader (not requirements):
- Scope node ids for element scopes (`<doc>#<Concept>/<slug>`, domain-relative) are scope-graph ids, not model ids, and are unchanged.
- The `parent: <field>` lookup of `scope_elements` is an intra-document lookup, not a cross-model reference. Titles are display-only, so the field now holds the relative address `@<slug>` of the parent element instead of a `[[title]]` reference (decision Q1, resolved 2026-11-03). The chain semantics stay byte for byte; only how the parent is named changes (see the MODIFIED requirement below).

## REMOVED Requirements

### Requirement: Model Id Collision Resolves via Domain-Relative Path (Option A)

(Reason: collisions cannot arise by construction once model ids carry their container (`hierarchical-identity`). The stem-or-path flip, the `AMBIGUOUS_MODEL_ID` outcome of bare-stem lookup, and the rule that discovery emits the bare stem when unique and the path when colliding, are removed because they make a file's id depend on which other files exist, and orphan recorded change targets when a collision appears.)
(Migration: use the hierarchical id (`<container chain>/<slug>`) wherever a stem or domain-relative path was used as a model id. Duplicate identity is reported by `placement-validation`. Existing domaiNNs are migrated by a later change.)

## MODIFIED Requirements

### Requirement: Element Scope Parent Given By A Reference Field

When a `scope_elements` entry declares `parent: <field>`, the system MUST read the parent of an element from that field as the relative address `@<slug>` of an element of the previous listed concept in the same document. The removed form `[[Title of a1]]` MUST NOT be resolved by title; a value that is not an `@<slug>` address of the same document MUST be reported as `UNKNOWN_PARENT_ELEMENT` naming the field and the removed form. Two elements of the parent concept carrying the same slug MUST be reported as `AMBIGUOUS_PARENT_ELEMENT`. Chain order, `isolate`, inheritance and scope node ids (`<doc>#<Concept>/<slug>`) MUST NOT change.

(Previously: the field held a `[[title]]` reference matched against element titles.)

#### Scenario: Parent given by a reference field

- GIVEN a document that declares `scope_elements` with `Inner` naming its parent through the field `outer_ref`
- AND an `Outer` element with the slug `a1`
- WHEN an `Inner` element holds `outer_ref:: @a1`
- THEN the chain of that `Inner` element contains the `Outer` element `a1` and then the `Inner` element
- AND a value `[[Title of a1]]` in the same field is `UNKNOWN_PARENT_ELEMENT`, and no element is found by title
