# Tasks: `type:: address`

Strict TDD.

## 1. Type

- [ ] 1.1 [RED] Failing test: a field `type:: address` with a dangling value emits an error.
- [ ] 1.2 [GREEN] `types/parser.ts`: add `address` to `FIELD_TYPES`.
- [ ] 1.3 [GREEN] `validator/`: resolve `address` values through the shared parser + workspace resolver; dangling = error.
- [ ] 1.4 [RED] Failing test: `element-slug&field`, `## Heading`, `RowID&col`, `/pointer`, `matrix&row&col` all validate.

## 2. L1 spec + taxonomy

- [ ] 2.1 Edit `iNNfo/specs/iNNfo_V_0-5-0_NN.md`: add `address` + the taxonomy (`citation`/`knowledge` are its specializations).
- [ ] 2.2 Regenerate `canonical-registry.ts`; `canonical-registry.test.ts` green.

## 3. Retype

- [ ] 3.1 Edit `changes/spec_NN.md`: `target` → `type:: address`; bump `blueprint_version`; `npm run sync:versions`.
- [ ] 3.2 [RED] Failing test: a changeset with `target:: address` validates; a dangling target errors.
- [ ] 3.3 [GREEN] Confirm apply still parses/validates the target.

## 4. Verify

- [ ] 4.1 `node scripts/verify.js --fast` green.
- [ ] 4.2 Full `node scripts/verify.js` + CI green on `dev`.
- [ ] 4.3 `canonical-registry.ts` mirrors the L1 spec byte-for-byte.
