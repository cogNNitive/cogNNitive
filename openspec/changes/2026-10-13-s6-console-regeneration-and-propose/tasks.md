# Tasks: S6 — console regeneration, `add_model` and `propose_changeset`

`openspec/config.yaml` is `strict_tdd: true`: each group leads with its failing test,
then the implementation, then the verification for that group. Every task names the
requirement it serves as `[capability: Requirement]`. Pre-condition: #1
(`2026-10-13-changeset-first-class-and-lineage`) and S2c are archived; rebase on them
before starting (ordering #1 → S2c → S6).

Test conventions: `innfo-core` Vitest suites under `iNNfo/packages/innfo-core/tests/`
(changeset suites in `tests/changeset/`); `innfo-mcp` Vitest suites in
`iNNfo/packages/innfo-mcp/src/tools/*.spec.ts` and `iNNfo/packages/innfo-mcp/test/*.test.ts`;
node suites `scripts/*.test.mjs` and `test/console-*.test.mjs` (discovered by
`verify.js`). No test may open a browser: pass `open: false` / `--no-open` and inject a
launcher that fails the test when invoked.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | ~1,600–2,000 (code + tests), plus generated mirrors |
| 400-line budget risk | High |
| Chained PRs recommended | Yes — slices S6a–S6e below, one PR each, in order |
| Decision needed before apply | Yes — confirm the slice split and chain strategy |

Slices: **S6a** = groups 1–3 (stable console, open, regeneration, `next_steps`);
**S6b** = groups 4–6 plus 7.3–7.4 (`add_model` engine, concept check, the single
proposed-changeset writer, `init_knowledge` wrapper);
**S6c** = the rest of group 7 and group 8 (`propose_changeset`, `init_domain`,
migration reuse);
**S6d** = group 9 (console New element — low-risk, droppable);
**S6e** = group 10 (docs, releases, verification). S6b depends on S6a (the wrapper
regenerates the console); S6c depends on S6a and S6b; S6d is
independent of S6b/S6c.

## 1. Stable console filenames and the shared writer (S6a)

- [ ] 1.1 TEST (`scripts/export-console.test.mjs`): a model export writes
      `artifacts/<stem>_console/<stem>_console.html` with fixed-name bundle and CSS; a
      changed model overwrites it; an unchanged model writes nothing; no stamped file
      appears. [console-export-cli: Console exports overwrite a stable file]
      [console-export-cli: Console exports are write-once (REMOVED)]
- [ ] 1.2 TEST (`build-console-payload.spec.ts`): `outputPath` equals the path
      `writeConsole` writes for the model. [console-regeneration: One shared console
      writer for CLI and MCP]
- [ ] 1.3 Add `consoleOutputPath` to `innfo-core/src/console/`; export it; regenerate
      `console-payload.generated.cjs`; use it in `build-console-payload.ts`.
      [console-regeneration: One shared console writer for CLI and MCP]
- [ ] 1.4 Refactor `scripts/export-console.mjs`: export
      `writeConsole({ rootDir, scope, open, launcher })` (tmp + rename, byte-equality
      skip, returns path/status/knowledgeVersions/opened/openError); `main()` runs only
      as the entry point; drop the `writeOnce` family for model consoles and the stamped
      bundle. [console-export-cli: Console exports overwrite a stable file]
      [console-export-cli: Selective Compilation and Filtering]
- [ ] 1.5 TEST + impl: `--status` / `--tree` read the stable file; `--status` reports the
      domain console fresh/stale from embedded per-model `knowledge_version` + `sha256`.
      [console-export-cli: Status Reporting and Staleness Detection]
      [console-export-cli: Tree Hierarchy Visualization]
      [console-regeneration: Console embeds the versions it was built from]
- [ ] 1.6 TEST: a model console exported twice holds one file; `--view` still writes its
      write-once family. [write-once-artifacts: Producers adopt write-once]

## 2. Opening the console (S6a)

- [ ] 2.1 TEST: `open: false` never calls the injected launcher; a throwing launcher
      yields `opened: false` + `openError` with the file written; per platform the
      launcher receives `cmd /c start` / `open` / `xdg-open` and the absolute path.
      [console-regeneration: Opening the regenerated console]
- [ ] 2.2 Implement the detached launcher in `export-console.mjs` (`writeConsole`) and
      the `--no-open` CLI flag. [console-regeneration: Opening the regenerated console]
- [ ] 2.3 Add `--no-open` to every scripted caller (`build-docs.mjs`, `verify.js`,
      existing `scripts/*.test.mjs` / `test/console-*.test.mjs` invocations).
      [console-export-cli: Console exports overwrite a stable file]

## 3. Regeneration in the MCP and the `next_steps` contract (S6a)

- [ ] 3.1 TEST (`console-regeneration.spec.ts`): resolving the console directory via
      `INNFO_CONSOLE_DIR` / repo checkout / `~/.agents/console`; missing assets yield
      `console.status: failed` with `CONSOLE_ASSETS_NOT_FOUND`, never a throw.
      [console-regeneration: Console regeneration after apply]
- [ ] 3.2 Implement `innfo-mcp/src/tools/console-regeneration.ts`
      (`regenerateConsole(root, { scope, open, launcher })` importing `writeConsole`;
      `buildNextSteps(kind, ...)`). [console-regeneration: One shared console writer for
      CLI and MCP] [console-regeneration: Review-and-approve notice on tool results]
- [ ] 3.3 TEST (`test/apply-change.test.ts`): `apply_change` regenerates after commit and
      after the lock is released (assert lock file absent when the stub writer runs) for
      `applied`; regenerates for `partially_applied`; a failing writer leaves
      `status: applied` and the model content applied with `console.status: failed`; no
      `console` field for `conflict` / `rejected`. [console-regeneration: Console
      regeneration after apply]
- [ ] 3.4 Wire regeneration into `handleApplyChange` (post-commit, outside the lock);
      add `open` to the `apply_change` input schema; add `console` + `next_steps` to the
      payload. [console-regeneration: Console regeneration after apply]
- [ ] 3.5 TEST: apply `next_steps` has steps 1–3, lists conflicted ids when
      `partially_applied`, has no `approve`; `opened: false` puts the absolute path in the
      notice; no editor or live-preview URL appears. [console-regeneration:
      Review-and-approve notice on tool results] [console-regeneration: Preview is a
      file]
- [ ] 3.6 TEST + impl: `regenerate_console` tool (domain or model scope, `open`),
      registered in `server.ts` and the tool-list test (`server.spec.ts`); idempotent
      `unchanged` on a second call; retry after failure writes. [console-regeneration:
      Explicit console regeneration tool]
- [ ] 3.7 Tool descriptions of `apply_change` and `regenerate_console` instruct the agent
      to relay `next_steps.notice`; drop "snapshot archival" from the `apply_change`
      description. [console-regeneration: Review-and-approve notice on tool results]

## 4. `add_model` in the document model (S6b)

- [ ] 4.1 TEST (`tests/changeset/parser.test.ts`): parse + serialize round-trip of an
      `add_model` change (`blueprint_name`, `blueprint_url`, `name`,
      `knowledge_version`, `sources`); `add_model` with `from`/`to`/`base_hash` is
      rejected. [changeset-document-model: Changeset Mutation and Comment Operations]
- [ ] 4.2 TEST (`tests/changeset/hasher.test.ts`): editing `blueprint_url` or
      `knowledge_version` breaks the seal; changes differing only in `sources` hash
      differently. [changeset-document-model: Cryptographic Proposal Sealing
      (`proposal_sha`)]
- [ ] 4.3 `types.ts`: `add_model` in `ChangeOp`/`isChangeOp`; `blueprint_name`,
      `blueprint_url`, `knowledge_version` (and `sources` if #1 did not add it) on
      `ChangeItem`; `ModelVersionTransition.base_version` optional. `parser.ts`,
      `serializer.ts`, `hasher.ts` `PROPOSAL_KEYS` updated. [changeset-document-model:
      Changeset Mutation and Comment Operations] [changeset-document-model:
      Cryptographic Proposal Sealing (`proposal_sha`)]
- [ ] 4.4 `changes` bluepriNNt: `add_model` option + three Change field definitions +
      `blueprint_version` bump (on top of #1); mirror into `canonical-registry.ts`;
      catalog entry; `verify.js` drift green. [changeset-document-model: Changeset
      Mutation and Comment Operations]

## 5. Shared knowledge scaffold and `add_model` apply (S6b)

- [ ] 5.1 TEST (`innfo-core` scaffold suite): `scaffoldKnowledgeDocument` output is
      byte-identical to the previous `initKnowledge` output for golden inputs (business,
      blank, a reference-field and a lone-text-concept bluepriNNt); version inference:
      explicit wins, inferred otherwise, `V_0-1-0` last, differing explicit accepted.
      [model-scaffold-robustness: Version-Aware Frontmatter Inference]
      [changeset-apply-engine: Model creation via `add_model`]
- [ ] 5.2 Move `scaffoldBodyFromSchema` + the frontmatter block from
      `innfo-mcp/src/tools/init-knowledge.ts` into `innfo-core/src/scaffold/knowledge.ts`
      (`scaffoldKnowledgeDocument`); export it. [changeset-apply-engine: Model creation
      via `add_model`]
- [ ] 5.3 TEST (`test/apply-change.test.ts`): `add_model` creates
      `kNNowledge/<id>_NN.md` that `validate_knowledge` accepts; `models.<id>` has only
      `result_version`; existing model → `MODEL_EXISTS` + dependants
      `DEPENDS_ON_CONFLICTED_CHANGE`, file untouched; `add_model` + `add_element` in one
      changeset; `ADD_MODEL_ORDER`; duplicate target rejected; unresolvable bluepriNNt →
      `BLUEPRINT_UNRESOLVED`, nothing written; missing `kNNowledge/` →
      `DOMAIN_LAYOUT_INVALID`. [changeset-apply-engine: Model creation via `add_model`]
- [ ] 5.4 Implement in `apply-change.ts`: Phase 1 creation + in-memory registration,
      partition codes, no bump for created models, tmp + rename persistence with an
      absence re-check inside the lock, no archive. [changeset-apply-engine: Model
      creation via `add_model`]
- [ ] 5.5 TEST + impl: after a commit that created a model, the handler runs
      `syncDomainManifest(root, { dry_run: false })` post-commit and reports `manifest`;
      a failing sync leaves the apply outcome unchanged. [changeset-apply-engine: Model
      creation via `add_model`]

## 6. Concept check at mutation + `init_knowledge` wrapper (S6b)

- [ ] 6.1 TEST (`test/apply-change-rejections.test.ts`): `add_element` with an undeclared
      concept fails with the unknown-concept error from the mutation (not from
      `coreValidate`), nothing written; declared concept (any case) applies.
      [changeset-apply-engine: Concept conformance at `add_element` mutation time]
- [ ] 6.2 Pass the resolved schema to `add_element` (resolve once per model, shared with
      `rename_element`); unresolvable bluepriNNt → `BLUEPRINT_UNRESOLVED`.
      [changeset-apply-engine: Concept conformance at `add_element` mutation time]
- [ ] 6.3 TEST (`init-knowledge.spec.ts`): the wrapper leaves one applied `add_model`
      changeset; the created document equals the golden pre-change output; an existing id
      fails with `MODEL_EXISTS`, file untouched; failure responses have no
      `filePath`/`content`. [changeset-apply-engine: `init_knowledge` is an `add_model`
      wrapper] [model-scaffold-robustness: Failed Init Never Returns a Success-Shaped
      Payload]
- [ ] 6.4 Rewrite `init-knowledge.ts` as the wrapper (uses `writeProposedChangeset`, tasks
      7.3–7.4, which ship in S6b); drop `in_place`,
      `templateResolved`, `scaffolded`; regenerate the console and return `next_steps`.
      Update the `init_knowledge` description (create-only, no repair, no
      `VERSION_MISMATCH`). [changeset-apply-engine: `init_knowledge` is an `add_model`
      wrapper]
- [ ] 6.5 Delete the repair tests (`test/mutate-repair.test.ts:42`,
      `init-knowledge.spec.ts:105,123`) and adapt `test/includes-and-scaffold.test.ts`,
      `server.spec.ts` to the wrapper (fixtures create `kNNowledge/`).
      [changeset-apply-engine: `init_knowledge` is an `add_model` wrapper]

## 7. `propose_changeset` and the single writer (S6c; 7.3–7.4 ship in S6b)

- [ ] 7.1 TEST (`propose-changeset.spec.ts`): one `update_field` operation writes a
      `status: proposed` L3 changeset under `changes/` that `verifyProposalSha` accepts;
      the model file is untouched; the result has `changeset`, `console.path`,
      `next_steps.approve.changeset === changeset`; applying the written file is never
      `PROPOSAL_TAMPERED`. [changeset-propose-tool: `propose_changeset` writes a sealed
      proposed changeset]
- [ ] 7.2 TEST: unknown target model, `add_model` on an existing model, duplicate
      `add_model`, an op missing required keys → errors, nothing under `changes/`;
      `add_model` then `add_element` on the new id → written. [changeset-propose-tool:
      Proposal validation before write]
- [ ] 7.3 TEST: the bare intent path (`apply_change` with `id`, `op`, `args`) writes its
      synthesized changeset through `writeProposedChangeset` with L3 frontmatter.
      [changeset-propose-tool: Single proposed-changeset writer]
- [ ] 7.4 Implement `writeProposedChangeset` (ids, L3 frontmatter, seal, file name with
      `workspace_id` from the manifest or the domain folder slug) in
      `innfo-mcp/src/tools/propose-changeset.ts`; switch `synthesizeAndExecuteChangeset`
      to it. [changeset-propose-tool: Single proposed-changeset writer]
- [ ] 7.5 Implement `propose_changeset` (validation, write, regenerate + open, result) and
      register it with a description that requires relaying `next_steps.notice`; add it
      to the tool-list test. [changeset-propose-tool: `propose_changeset` writes a sealed
      proposed changeset] [changeset-propose-tool: Proposal validation before write]
- [ ] 7.6 TEST: the proposal `next_steps.notice` carries the four steps in order and the
      OK shortcut; with the console failed it points at the changeset file.
      [console-regeneration: Review-and-approve notice on tool results]

## 8. `init_domain` and migration reuse (S6c)

- [ ] 8.1 TEST (`innfo-core` scaffold suite): `planDomainScaffold` lists the canonical
      folders + `changes/`, `.gitattributes` with `* -text`, and a `domaiNN_NN.md` with L3
      frontmatter, `workspace_id` defaulting to `slugify(name)`, and no kNNowledge
      entries. [domain-initialization: `init_domain` scaffolds an empty conformant
      domaiNN]
- [ ] 8.2 TEST (`init-domain.spec.ts`): on an empty dir, `check_domain` reports no errors
      and `validate_knowledge` on the manifest is valid; a non-empty dir is refused with
      nothing written; an `add_model` changeset then applies into it.
      [domain-initialization: `init_domain` scaffolds an empty conformant domaiNN]
- [ ] 8.3 Implement `planDomainScaffold` in `innfo-core/src/scaffold/domain.ts` and the
      `init_domain` tool (tmp + rename per file); register it; tool-list test.
      [domain-initialization: `init_domain` scaffolds an empty conformant domaiNN]
- [ ] 8.4 TEST (`skills/nn-upgrade/scripts/*.test.js`): `--import-as-source` produces the
      `init_domain` scaffold plus `sources/import/<old-domain-folder>/`; no
      `sources/legacy/`; a `sources::` citation into the import resolves.
      [domain-initialization: Import-as-source reuses the domain scaffold]
- [ ] 8.5 `migrate-domain.js runImportAsSource`: write `planDomainScaffold` via
      `loadInnfoCore`, copy into `sources/import/<old-domain-folder>/`, delete the inline
      manifest. Do not touch `lib/legacy-migrate.generated.cjs`.
      [domain-initialization: Import-as-source reuses the domain scaffold]

## 9. Console "New element" (S6d — low-risk, droppable)

- [ ] 9.1 TEST (`iNNfo/packages/innfo-core/tests/console-review-store.test.ts`):
      `addDraft` accepts `kind: "new"` with `model_id`/`concept`/`element` and no
      `element_id`/`base_hash`; rejects a new draft missing `concept`; a correction
      without `base_hash` still throws. [console-review-mode: New element draft]
- [ ] 9.2 `review.js` `addDraft`: branch the required keys on `kind`.
      [console-review-mode: New element draft]
- [ ] 9.3 TEST (`test/console-review.test.mjs`): the New element action (concept picker
      from the schema, name, declared fields) stores a draft whose export is
      `op:: add_element` with `concept`, `name`, `fields`. [console-review-mode: New
      element draft]
- [ ] 9.4 Add the action to the model view in `innfo-runtime.js` / `ui-kit.js` on the
      shared modal; rebuild the console bundle. [console-review-mode: New element draft]

## 10. Docs, release and verification (S6e)

- [ ] 10.1 `skills/nn-innfo/SKILL.md` + `iNNfo/packages/innfo-mcp/README.md`: document
      `propose_changeset`, `apply_change` regeneration, `regenerate_console`,
      `init_domain`, `add_model`, the create-only `init_knowledge`, the migration recipe,
      and the 4-step user flow (relay `next_steps.notice`; OK → `apply_change`); replace
      "or a documented file-write tool" (`SKILL.md:450`) with the changeset path; update
      the tool table rows (`SKILL.md:352,360`). [console-regeneration: Review-and-approve
      notice on tool results] [changeset-propose-tool: `propose_changeset` writes a sealed
      proposed changeset]
- [ ] 10.2 Grep guard: no S6 code or doc references `PREVIEW_APP_URL`, the hosted app or
      a live-preview URL as the place to review changes. [console-regeneration: Preview
      is a file]
- [ ] 10.3 `npm run typecheck` + `npm run typecheck:scripts`; `npm test` for
      `innfo-core` and `innfo-mcp`; `node scripts/verify.js` (mirrors, drift, catalog,
      discovered node suites). [all requirements]
- [ ] 10.4 Regenerate the TestLab domain console with `--no-open`; open it once by hand
      and check a proposal and an applied change appear. [console-regeneration: One
      shared console writer for CLI and MCP]
- [ ] 10.5 Prepare the `changes` bluepriNNt `blueprints-v*` release, the innfo-mcp
      release and the refreshed installed console asset set (`export-console.mjs`)
      following `nn-dev-release`. [changeset-document-model: Changeset Mutation and
      Comment Operations]
- [ ] 10.6 At archive: drop "Creating `new`-kind items from the console" from the
      `console-review-mode` Deferred list. [console-review-mode: New element draft]
