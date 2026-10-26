# Tasks: Changes as a Console Collection

Strict TDD.

## 1. Declare the collection

- [ ] 1.1 Edit `iNNfo/specs/bluepriNNts/changes/spec_NN.md`: add `nature: { structure: members, ownership: derived }`; bump `blueprint_version`; `npm run sync:versions`.
- [ ] 1.2 [RED] Failing test: the declared `changes` resolves `structure: members` and `ownership: derived`.

## 2. Materialize the units

- [ ] 2.1 [RED] Failing test: the materializer emits exactly one unit per `Change`, carrying `op/target/from/to/author/status/evidence/applied_at` and `batch` as grouping.
- [ ] 2.2 [GREEN] Wire `element-history.ts` records into the materializer (mechanism of change A).
- [ ] 2.3 [RED] Failing test: unit ids are unique and stable (`<batch>#<change-id>`).

## 3. Retire the tab

- [ ] 3.1 [RED] Failing test: the exported console has no builtin `review`/`Changes` tab.
- [ ] 3.2 [GREEN] Remove `tabs.push({ id: 'review', ... })` and the loader wiring; drop the `specNames: ['changes']` special case.
- [ ] 3.3 [RED] Failing test: `el.history` (per-element) is unchanged after the removal.
- [ ] 3.4 [GREEN] Confirm history still attaches.

## 4. Drafts overlay

- [ ] 4.1 [RED] Failing test: a local draft renders as a `pending` unit (status) with a discard action, not an edit pencil.
- [ ] 4.2 [GREEN] Runtime overlay wiring.

## 5. Verify

- [ ] 5.1 Regenerate `test/fixtures/testlab/domaiNN_console.html`; assert the change units render.
- [ ] 5.2 `node scripts/verify.js --fast` green.
- [ ] 5.3 Full `node scripts/verify.js` + CI green on `dev`.
