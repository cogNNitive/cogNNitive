# Proposal: Matrix header reference resolution by declared `source`/`target` context

## Intent

A matrix cell row or column header is a reference by display name. Today
`validator/references.ts` resolves it by exact slug, then by exact display name;
when two elements in different concepts share that display name it stops and
emits `AMBIGUOUS_ELEMENT_NAME`. On the current tree (`origin/dev`, S4-2 applied)
that is **20 unique ambiguous headers across 10 tracked files**, every one of
them an artifact of the resolver ignoring information the matrix already
carries: each matrix declares `source` (the row axis concept) and `target` (the
column axis concept), and for all 20 cases the name-match belongs to exactly one
candidate once that axis concept is taken into account.

The recently amended S4 delta for `stable-element-identity` already states that
"the matrix's own `source`/`target` concepts disambiguate the author's intent"
while keeping the matrix diagnostic advisory. This change makes the resolver
actually do that: use the matrix's declared axis concept to resolve a
name-ambiguous row/column header uniquely, and keep the current advisory
fallback for the residual cases where the context does not disambiguate.

The write-once `_V_` samples that surface these headers are **not** edited: the
fix lives in the resolver, so permanent history stays untouched.

**Prerequisite:** this change MODIFIES the same requirement
(`stable-element-identity`: *Diagnostics for Unfrozen Models and Ambiguous
Names*) as `2026-10-13-s4-retire-legacy-migration-flows` (S4), which also
applies the resolver simplification (`references.ts`). Its delta is based on
S4's amended requirement text and MUST land after S4.

## Scope

### In Scope
- `resolveReferenceTarget` gains an optional axis-context argument.
- `validateReferences` passes each matrix's declared `source` (for row headers)
  and `target` (for column headers) to the resolver; an unambiguous
  context-narrowed match emits no ambiguity diagnostic.
- The residual matrix-header ambiguity stays an advisory
  `AMBIGUOUS_ELEMENT_NAME` **warning**; its message names the axis context that
  failed to disambiguate.
- Tests: new focused suite plus the two `phase5-references-ledger` matrix
  assertions that option C invalidates.

### Out of Scope
- Field-level (`reference`/`knowledge`) and `[[wikilink]]` ambiguity: stays an
  `error`, unchanged. It MUST NOT consume matrix context.
- Using a field's `target_concepts` to disambiguate field references.
- Editing any sample, fixture, or `_V_` write-once artifact.
- A slug-only reference grammar (separate versioned grammar change).

## Capabilities

### Modified Capabilities
- `stable-element-identity`: matrix cell row/column headers resolve by exact
  slug, then exact display name, then — only when the name is ambiguous — by the
  containing matrix's declared axis concept; the residual matrix ambiguity is an
  advisory warning.

## Approach

Behaviour change, so `strict_tdd: true` (lead with the failing test). The edit
is local to `validator/references.ts` and its callers; `resolveReferenceTarget`
is not part of the package's public barrel, so the only public-surface change is
`validateReferences` emitting fewer `AMBIGUOUS_ELEMENT_NAME` warnings.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/validator/references.ts` | Modified | optional axis context in `resolveReferenceTarget`; `validateReferences` passes `matrix.source`/`matrix.target`; residual message |
| `iNNfo/packages/innfo-core/tests/matrix-header-context-resolution.test.ts` | Added | focused TDD suite |
| `iNNfo/packages/innfo-core/tests/phase5-references-ledger.test.ts` | Modified | 5.1.2 / 5.1.6 matrix assertions now expect context resolution |
| `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` | Regenerated | committed CDN bundle embeds `innfo-core`; rebuilt so bytes match the new resolver |
| repo samples/fixtures (`iNNfo/specs/**/samples`, editor fixture, legacy/simulacro fixtures) | Unchanged | resolved by the resolver, never edited |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Axis label is not a concept name → over-eager resolution | Low | Context is applied only to break a name tie; a context that matches zero or >1 candidate keeps the ambiguity |
| Two pending changes modify one requirement | Med | S4 is an explicit prerequisite; this delta is written against S4's amended text and revises its now-stale matrix-warning scenario |
| Permanent-history samples get edited | Low | No sample is touched; the differential baseline tracks errors only, so removed warnings do not perturb it |

## Rollback Plan

Revert the change commits: `resolveReferenceTarget`'s context argument is
optional, so callers and prior behaviour return with no data migration.

## Success Criteria

- [ ] The 20 unique ambiguous matrix headers on tracked content no longer emit
      `AMBIGUOUS_ELEMENT_NAME`; each resolves to the source/target concept.
- [ ] A matrix header whose axis context does not disambiguate still emits an
      advisory `AMBIGUOUS_ELEMENT_NAME` warning.
- [ ] Field/wikilink ambiguity remains an `error`.
- [ ] `innfo-core` tests, `node scripts/verify.js`, and
      `npx openspec validate --strict` are green.
