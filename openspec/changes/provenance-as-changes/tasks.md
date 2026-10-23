# Tasks: Provenance as Changes

Strict TDD. Each group: write the failing test first, then implement, then verify.

## 1. Change model (nn-core)

- [ ] 1.1 [RED] Failing test: a change parsed without `evidence` is rejected as invalid.
- [ ] 1.2 [GREEN] `changeset/types.ts`: rename `sources` → `evidence` (required); add `applied_at`, `batch`; remove `replaced_sources`.
- [ ] 1.3 [RED] Failing test: `evidence` + per-change `applied_at`/`batch` round-trip byte-identically.
- [ ] 1.4 [GREEN] `changeset/parser.ts` + `serializer.ts`: parse/emit the new fields; drop `replaced_sources`.
- [ ] 1.5 [GREEN] `changeset/hasher.ts`: `PROPOSAL_KEYS` follows the rename (`sources` → `evidence`); `applied_at`/`batch`/`status` excluded from the seal (execution facts).
- [ ] 1.6 [RED] Failing test: a changeset frontmatter with `models` is accepted but `models` is derivable from `target`s.

## 2. Apply engine (nn-mcp)

- [ ] 2.1 [RED] Failing test: applying an `update_field` does NOT write a companion citation and does NOT record `replaced_sources`.
- [ ] 2.2 [GREEN] `apply-change.ts`: remove the D20 rewrite and the `replaced_sources` annotation.
- [ ] 2.3 [RED] Failing test: a change with no `evidence` is rejected at intake naming the change id.
- [ ] 2.4 [GREEN] `apply-change.ts`: require `evidence`; write per-change `applied_at`/`status`/`batch`.
- [ ] 2.5 [RED] Failing test: no MCP tool writes a model file outside a change (guard).
- [ ] 2.6 [GREEN] Guard wiring; name any bypassing path.

## 3. Derived provenance (nn-core console)

- [ ] 3.1 [RED] Failing test: `deriveFieldOrigin(changes, model, element, field)` returns the last change's author+evidence.
- [ ] 3.2 [GREEN] `deriveFieldOrigin` + `deriveValueHistory` (sorted by `applied_at`).
- [ ] 3.3 [RED] Failing test: `payload-builder` emits per-field origin derived from changes, no `el.citations` from the removed KU pointer.
- [ ] 3.4 [GREEN] Wire the payload builder.

## 4. Drift fingerprint + guard

- [ ] 4.1 [RED] Failing test: a field whose value ≠ the last change's `to` emits `EDITED_WITHOUT_RECORD`.
- [ ] 4.2 [GREEN] Validator diagnostic + promptHint ("record the change or revert").
- [ ] 4.3 [RED] Failing test: a value equal to the last `to` emits nothing.
- [ ] 4.4 [GREEN] Confirm no false positive on preconditions.

## 5. Specs & bookkeeping

- [ ] 5.1 Edit `iNNfo/specs/bluepriNNts/changes/spec_NN.md`: `evidence` (required), `applied_at`, `batch`; bump `blueprint_version`; regenerate `canonical-registry.ts` + `catalog.json` (`npm run sync:versions`).
- [ ] 5.2 Delta specs: `change-provenance` (new), `field-citation-provenance`, `provenance-vocabulary`, `changeset-document-model`, `changeset-apply-engine`, `console-field-citations`.
- [ ] 5.3 Full-text scan: `replaced_sources` returns 0 in live code/specs.
- [ ] 5.4 Docs: `manual-editing-risks` page states hand-edits are read-only and detected.

## 6. Migration

- [ ] 6.1 Script: reconcile existing models' out-of-band citations into the chain (mint `decision`/`unknown` evidence).
- [ ] 6.2 [RED]/[GREEN] Migration test over a fixture domain.

## 7. Verify

- [ ] 7.1 `node scripts/verify.js --fast` green.
- [ ] 7.2 Full `node scripts/verify.js` + CI green on `dev`.
- [ ] 7.3 No local build artifact committed.
