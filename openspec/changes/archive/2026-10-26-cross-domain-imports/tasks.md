# Tasks: Cross-DomaiNN Imports

## 1. Test Fixture Setup (`test/fixtures/imports-inbox`)
- [ ] 1.1 Create minimal `inbox` domain with `noticias` model and `select` field `categoria` (options A, B, C).
- [ ] 1.2 Create consumer domains `dominio-a` and `dominio-b` with relative declarations in `domaiNN_NN.md`.

## 2. Declaration Parsing & Path Resolution (`nn-core`)
- [ ] 2.1 Add parser support in `layout.ts` / `WorkspaceIndex` for `## NN Imported Domain:` and `## NN Import:`.
- [ ] 2.2 Add origin address validation and prevent transitive snapshot imports.

## 3. Query Execution & Snapshot Projection
- [ ] 3.1 Implement snapshot generator executing `queryUnits` against origin domain.
- [ ] 3.2 Write projected markdown output to `kNNowledge/imports/<alias>/<import-name>_NN.md`.
- [ ] 3.3 Add tests verifying category A items land in `dominio-a` and unclassified items are excluded.

## 4. Diff Engine & Refresh Changeset Generation
- [ ] 4.1 Implement diff comparison between origin snapshot hash and local snapshot.
- [ ] 4.2 Generate proposed changeset under `changes/proposed/` with origin evidence.
- [ ] 4.3 Test scenario: reclassify item from A to B, verify item leaves A and enters B with broken reference warnings.

## 5. Console Integration & Read-Only Handling
- [ ] 5.1 Update console model loader to recognize `read_only: true` on imported snapshots.
- [ ] 5.2 Add badge and disable edit actions on snapshot models in the console UI.

## 6. Verification & CLI Integration
- [ ] 6.1 Add interactive scan option in startup choices.
- [ ] 6.2 Run full `verify:fast` suite and validate all tests pass.
