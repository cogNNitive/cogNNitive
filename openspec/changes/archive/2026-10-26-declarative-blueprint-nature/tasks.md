# Tasks: Declarative Blueprint Nature

Strict TDD.

## 1. Nature seam

- [ ] 1.1 [RED] Failing test: `parseNature(frontmatter)` reads `structure`/`ownership`; unknown values are a diagnostic.
- [ ] 1.2 [GREEN] `schema/nature.ts`: parse + validate + defaults.
- [ ] 1.3 [RED] Failing test: the compiled map reproduces today's `roleOf` for every core blueprint.
- [ ] 1.4 [GREEN] Compile the map from `canonical-registry.ts`; `roleOf`/`isConsoleModel`/`isModelCandidate` consume it.
- [ ] 1.5 [GREEN] Remove `NON_KNOWLEDGE_BLUEPRINT_RE`.

## 2. Materializer

- [ ] 2.1 [RED] Failing test: `catalog` reads the catalog doc's elements.
- [ ] 2.2 [RED] Failing test: `members` emits one unit per internal element, with derived stable ids.
- [ ] 2.3 [RED] Failing test: `projection` computes from the source.
- [ ] 2.4 [GREEN] Implement the three structure strategies behind one seam.

## 3. Surfacing + editability

- [ ] 3.1 [GREEN] `export-console.mjs`: discover/surface from the declared nature; remove the `isModelDocument` name path. No name allowlist governs surfacing.
- [ ] 3.2 [RED] Failing test: `ownership: derived` ⇒ no pencil; `authored` ⇒ pencil.
- [ ] 3.3 [GREEN] `unitEditability` derives from the model's declared `ownership`.

## 4. Declare natures + remove the hardcode

- [ ] 4.1 Declare `nature` on `sources` (catalog/derived), `artifacts`, `procedures`, `changes` (members/derived), `cogNNitive` (projection/derived), `domaiNN`/`sidecar`; bump versions; `npm run sync:versions`.
- [ ] 4.2 [RED] Failing test: `rg "NON_KNOWLEDGE_BLUEPRINT_RE"` returns 0, and no blueprint-name allowlist governs surfacing.
- [ ] 4.3 Regenerate the registry mirror, catalog, console bundle/mirrors.

## 5. Behavior-preservation proof

- [ ] 5.1 [RED]/[GREEN] A `knowledge` model's console payload is byte-identical before/after on the same input.

## 6. Verify

- [ ] 6.1 `node scripts/verify.js --fast` green.
- [ ] 6.2 Full `node scripts/verify.js` + CI green on `dev`.
- [ ] 6.3 No local build artifact committed.
