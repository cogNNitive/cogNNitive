# Proposal: Cognitivize in Place

Input: `exploration.md` in this change folder. Maintainer decisions 1-7 and the Q1-Q6 defaults were approved on 2026-10-02. This proposal does not reopen them; it scopes, sequences, and bounds them. `architectural-evolution-cognitivize.md` is the raw idea note. Where it disagrees with the decisions, the decisions win: the grammar stays `@`, the edge is `sources`, and the record is `*_cogNNitive_NN.md`.

Base: `2026-10-01-lineage-single-edge` (implemented; merges into `dev` before apply). File:line refs point at that post-change state.

## Why

The base change left one lineage edge. Where a file lives and what it is are still tangled, though:

| Gap | Evidence | Cost |
|---|---|---|
| A file's role depends on its folder. Reusing an artifact as an input means copying it into `sources/export/`. | `sourceRef.ts:101,490`, `project.ts:165,219`, `scanner-core.js:270-284` | Paths are unstable, the same bytes exist twice, and promotion is a separate workflow. |
| Sidecars are mirrored into `sources/nn/<mirror>.md` and matched through `source_file` | `scanner-core.js:62-102,661,770`, `curate-csv.js:146-165` | The sidecar sits away from its raw file, so discovery has to scrape to pair them. |
| `_NN.md` identity is encoded about 25 times, independently | `discoverModels.ts:14,40`, `list-read.ts:55`, `HomeView.vue:186`, `export-console.mjs:147`, `preflight-check.js:670` | Any new `_NN` kind (such as a sidecar) leaks into `list_knowledge`, `## NN Models`, and console targets. |
| Producers overwrite their output | `export-console.mjs:456-461`, `impact-checker.js:262-270`, `curate-csv.js:144`, compile procedures | A cited artifact can change underneath the citation. `sources/archive` exists only to patch this for raw files. |
| Timestamps are implemented four ways, in local time | `external-scanner.js:24-47`, `impact-checker.js:276`, `convergence-delta.js:26`, `transformer.js:112`, `conversations.js:6` | Ordering isn't monotonic across DST and timezones. |
| Names follow no rule | `X_V_1-0-0_<bp>_NN.md`, `Ghostbusters_Operations_V_1-0-0_NN.md`, `<verb>_<noun>_NN.md` | A file's bluepriNNt can't be read from its name. |
| Projection drift goes unnoticed | the record's view sections can be hand-edited | The persisted record becomes untrustworthy. |

Why now: the base change put lineage behind a single core projection and resolver. Re-keying that projection on name-derived roles is now one change in one place, not 25.

## Intent (the rules)

1. **Cognitivize in place.** `cognitivize(path)` is one innfo-core operation, exposed through the nn-trannsform CLI and innfo-mcp. It writes a co-located sidecar `<file>.<ext>_sidecar_NN.md` containing `source_file`, `sha256`, `size_bytes`, metadata, and, for binary files only, a normalized body. `sources/nn/`, `sources/export/`, and promotion go away.
2. **Roles come from names.** A file's role is a pure function of its name, `parent_spec`, and whether a sidecar exists. Folders are only write destinations. A sidecar is never a model.
3. **Universal `_NN` invariant.** Every `*_NN.md` conforms to a bluepriNNt `<bp>` whose name comes right before `_NN`: the stem ends with `_<bp>` or equals `<bp>`. Examples:
   - procedures: `<verb>_<noun>_procedures_NN.md`
   - kNNowledge names drop `_V_` (the version lives in frontmatter)
   - structural exceptions: `domaiNN_NN.md`, `spec_NN.md`, L0/L1 specs
4. **Artifacts are write-once.** Each output gets a UTC suffix `_YYYYMMDDTHHmmssZ` before the extension, with `-2`, `-3`… as a same-second tie-break. The write path enforces:
   - hash guard: the sidecar `sha256` must still match the file;
   - dedup: skip the write when the bytes equal the latest member of the family;
   - latest-of-family is resolved by name pattern, never by a moving `_latest` alias.

   GC only *proposes* deleting versions nobody cites, and deletes only with explicit user consent (`bootstrap.js:49`). The lineage record `*_cogNNitive_NN.md` is exempt because it is a living document.
5. **Citation target.** md/csv/json: cite the raw file. Binary: cite the sidecar body (`report.pdf_sidecar_NN.md@Heading`). A curated CSV is a write-once artifact derived from its raw file. JSON Pointer (RFC 6901) becomes a third `unit.kind`, and unit dispatch (`workspaceSources.ts:308-312`) becomes exhaustive. The grammar `path@Heading&sub` and `file.csv@RowID&column` is unchanged.
6. **Raw imports.** Watch roots only observe. Importing copies bytes verbatim into `sources/import/` (the only canonical location) and cognitivizes them there.
7. **`export/` becomes `artifacts/`.** One rename, no fallback.
8. **Drift gate.** The managed view sections of `*_cogNNitive_NN.md` must equal a fresh projection. The gate runs in nn-trannsform `--lineage --check`, `scripts/verify.js`, and MCP `check_workspace`. The journal and hand-authored blocks are not compared.
9. **Converter boundary.** Core `cognitivize()` takes an injected normalizer. For binary files MCP returns a "use the nn-trannsform CLI" result.

### Defaults for items the exploration left open (design to confirm)

| Item | Default |
|---|---|
| Family key when names contain digits | Strip only a terminal `_\d{8}T\d{6}Z(-\d+)?` immediately before the extension. Every other digit belongs to the key (`balance_2026.csv` is family `balance_2026`). An unsuffixed member sorts before every suffixed member. |
| Static re-import timestamps | Every import is write-once with a suffix. Cadence (`static`/`dynamic`) only controls how often the watcher re-checks. Identical bytes dedup to no write. Files the user drops into `sources/import/` by hand stay unsuffixed members. |
| `sources/conversations/` | Kept as a write destination. A promoted transcript is a write-once md raw file cognitivized in place. The `sources/nn/conversations/` mirror goes away (`conversations.js:332`). |
| `staging/` | Scratch only: never discovered, never cited, never a lineage node, not write-once. The sidecar field `staging_file` (`scanner-core.js:79,644,753`) is removed. |

## Product Outcome

- Any file in the domaiNN becomes citable without moving: run one command and its sidecar appears next to it.
- A citation always points at bytes that cannot change. "Latest" is a query, not a mutation.
- `list_knowledge`, the editor, consoles, and `## NN Models` agree on what counts as a model, because they share one predicate.
- A file name tells you which bluepriNNt it conforms to.
- When the lineage record is out of date, CI, the CLI, or MCP says so, and nobody has to notice by hand.

## Scope

### In scope
- **innfo-core**:
  - new naming-contract module (`_NN` grammar, role, family key, UTC timestamp);
  - `writeOnce`, hash guard, dedup, `latestOfFamily`, GC planner;
  - `cognitivize()`;
  - JSON Pointer unit;
  - re-keyed `lineage/project.ts`, `fs-snapshot.ts`, `sourceRef.ts` (`resolveUnitPath`, default prefix);
  - `discoverModels.ts`, `helpers.ts`, validator invariant rule, `legacy/detect.ts` and `language-map.ts` migration entries.
- **innfo-mcp**: new `cognitivize` tool. `list-read.ts`, `spec.ts`, `validate.ts`, `init-knowledge.ts`, and `resolver-node.ts` move to the contract. Drift gate in `check_workspace`.
- **nn-trannsform**:
  - `scanner-core.js`, `curate-csv.js`, `conversations.js`, `webImport.js`, `external-scanner.js`, `process-images.js` move onto cognitivize;
  - the archive flow (`scanner.js:118-134`, `lineage-check.js:68-88`) and the collision guard are deleted;
  - `impact-checker.js`, `transformer.js`, `convergence-delta.js`, `provenance*.js`, `bootstrap.js`, `index.js`;
  - regenerated `innfo-core.generated.cjs`.
- **Scripts**: `export-console.mjs` (write-once, contract targets), `verify.js` drift gate, `workspace-index.js`, `duplicate-guards.js`, `preflight-check.js`, `upgrade-check.js`.
- **bluepriNNts**:
  - new `iNNfo/specs/bluepriNNts/sidecar/spec_NN.md`, plus its manifest entry, `canonical-registry.ts`, `blueprint-catalog.mjs`, and `sync-versions`;
  - procedure renames in all 24 `bluepriNNts/*/procedures/*_NN.md` files and their `procedure_model::` paths;
  - write-once output names in the compile and video procedures;
  - `template_version` bumps.
- **Editor**: `explorerClassify.ts`, `ConsoleHubView.vue` (the roughly 40 hand-written paths), `HomeView.vue`, `SaveWorkspaceModal.vue`, `KnowledgeInfoPanel.vue`, `WorkspacePersistenceService.ts`, `useMediaScanner.ts`, `utils/version.ts`, `submodelPath.ts`.
- **Migration**: an nn-upgrade Flow A extension (the `models/` -> `kNNowledge/` pattern) that rewrites layout, names, and citations in non-frozen workspaces.
- **Vocabulary, docs, and living specs**: "sidecar" and "cognitivize" entries in `iNNfo/specs/vocabulary.json`, about 45 docs pages, and about 12 living specs.

### Out of scope (non-goals)
- Releases: `templates-v*`/`skills-v*`/innfo-mcp tags, the new CDN bundle, and the `manifest/source.yaml` repin. **Coupling:** bluepriNNt edits (new `sidecar`, procedure renames, version bumps) change `templates-v*` bytes. Merging them to `main` without a tag and repin turns `verify --release` red. The new MCP tool also needs an innfo-mcp release. Batch S2-S7 into `main` together with the release.
- Frozen content: published `_V_` specs, `docs/innfo/samples/`, use-case docs under `docs/cognitive_nn/use-cases/`, and frozen bluepriNNts are exempt from renames under an explicit carve-out in the invariant check.
- Changing the citation grammar beyond the JSON Pointer unit, and `parent_spec` semantics.
- OKF/LLM-Wiki positioning or bridges.
- Unilateral deletion. GC never deletes without consent.

## Capabilities

### New Capabilities
- `nn-naming-contract`: the `_NN` invariant, role derivation, family key, UTC timestamp grammar, the frozen carve-out, and the single discovery predicate.
- `cognitivize-in-place`: the core operation, co-located sidecar, injected normalizer, CLI and MCP surfaces (including the MCP binary boundary), and raw import into `sources/import/`.
- `write-once-artifacts`: writer, hash guard, dedup, latest-of-family, and the consent-gated GC planner.
- `sidecar-blueprint`: the `sidecar` L2 bluepriNNt and the rule that its documents are never models.
- `lineage-drift-gate`: comparison of managed sections and its three run sites.

### Modified Capabilities
- `source-versioning-archive`: removed; replaced by write-once families (`version` = rank, `superseded_by` = next, `archive_path` dropped).
- `scanner-destination-collision-guard`: removed; it is unnecessary once paths are unique.
- `source-normalization-pipeline`, `source-sidecar`, `conversations-lifecycle`: sidecars are co-located; there is no `sources/nn` mirror.
- `generic-source-integrity-audit`, `lineage-version-status`, `lineage-record-sync`, `dynamic-sources-impact-check`: these now read families and the hash guard, not the archive.
- `workspace-sources-resolution`, `typed-source-references`, `document-citations`, `citation-parser-resolver`: name-derived roles and the JSON Pointer unit.
- `model-discovery-predicate`: the single contract predicate excludes sidecars.
- `workspace-directory-conventions`, `console-export-cli`, `sample-workspaces`, `template-procedures-manifest-and-discovery`, `canonical-vocabulary`: `artifacts/`, write-once consoles, procedure names, and new vocabulary terms.

## Approach

Contract first, then additive core, then cutovers that delete the old path in the same slice. No slice leaves two parallel paths. Anything temporary, such as the migration detector and rewriter, carries a `legacy:cognitivize-in-place/<id>` marker and a `legacy-ledger.yaml` entry with a removal condition. Runtime never resolves old layouts: the detector only reports and rewrites.

## Likely Delivery Slices

The estimate is 8-12k changed lines (3-4k generated), so chained PRs are required. Each slice is independently green on `dev`.

| # | Slice | Depends on | Notes |
|---|---|---|---|
| S0 | Naming-contract module; `sidecar` bluepriNNt; unified UTC timestamp; **every** model-discovery consumer (core, MCP, editor, scripts, preflight) switched to the contract predicate | — | Exclusion has to land before any sidecar exists, or sidecars leak. |
| S1 | `writeOnce`, hash guard, dedup, `latestOfFamily`, GC planner; `cognitivize()` with an injected normalizer; JSON Pointer unit | S0 | Purely additive. |
| S2 | `export/` → `artifacts/` across core, scripts, and editor; drop the `sources/original` fallback; legacy detector and rewriter | S0 | |
| S3 | Cognitivize cutover: scanner, curate-csv, conversations, and web/external import adopt it; core projection and resolver re-keyed; `sources/nn`, `sources/export`, and `sources/archive` code deleted; MCP `cognitivize` tool | S1, S2 | Likely over budget. Design should split it into core and consumers only if each half stays green. |
| S4 | Write-once producers: console export, impact report, transformer, curated CSV, compile and video procedures | S1, S2 | |
| S5 | Drift gate in the CLI, `verify.js`, and `check_workspace` | S3, S4 | |
| S6 | `_NN` invariant: validator rule, procedure and kNNowledge renames, `_V_` dropped, `procedure_model::` rewrite, migration | S5 | |
| S7 | Docs, living specs, vocabulary, regenerated samples and bundles; release handoff notes | S3-S6 | |

## Affected Modules

- **innfo-core**: new public exports. Relative imports carry `.js` (NodeNext). The generated mirrors (`innfo-core.generated.cjs`, `console-payload.generated.cjs`) are regenerated in each slice.
- **innfo-mcp**: new tool, contract adoption, drift gate. The bundle needs a release.
- **innfo-editor**: discovery, explorer, console hub, source preview.
- **nn-trannsform**: the whole ingest path. It ships its own `package.json` (`npm ci --prefix`).
- **bluepriNNts**: the new `sidecar`, all procedure files, and the `workspace` and `cogNNitive` bluepriNNts.
- **scripts/CI**: `verify.js` (inventory guard, drift gate), `check-integrity.js`.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Windows `autocrlf` rewrites md/csv/json raw bytes, which breaks the hash guard | High | Hash raw bytes only. Bootstrap writes a workspace `.gitattributes` marking `sources/import/**` and `artifacts/**` as `-text`. Add a CRLF fixture test. |
| `MAX_PATH`: `<name>_<ts>.<ext>_sidecar_NN.md` plus deep paths | Med | The contract computes path length and fails loudly before writing. Document the long-path setting. |
| Sidecar discovery leak: one missed `_NN` encoding lists sidecars as models | High | S0 switches all consumers first. An rg gate forbids `_NN\.md` regexes outside the contract module. |
| Concurrent changes touch the same files (`console-*`, `visual-catalog-blueprint`, `nn-quarantine-removal`, `decoupled-release-pipeline`) | High | Rebase each slice on `dev`, sequence after those merges, and keep slices small. |
| Test churn: about 100 test files, many fixtures renamed | High | Rename fixtures with the migration tool itself, so the tool is exercised as a side effect. |
| Release coupling turns `main` red | Med | Merge S2-S7 to `main` only together with the tag and repin (separate change). |
| A frozen bluepriNNt (`workspace`) holds the compile procedures that need write-once outputs | Med | See Open Question 1. |
| Ordering by UTC suffix vs. clock skew across machines | Low | Ties and out-of-order clocks are resolved by the suffix plus `-n` only. Order is never inferred from mtime. |

## Rollback

Each slice is a self-contained commit range on `dev` and reverts with `git revert`. S0, S1, and S5 are additive. S2, S3, and S6 rewrite paths and names, so reverting them also requires reverting the matching migration output in sample workspaces (generated, regenerable). Write-once never mutates existing bytes and GC never deletes without consent, so no user data is lost by a revert. The Procedures journal is never rewritten. Nothing reaches users until a `templates-v*`/`skills-v*`/innfo-mcp release is cut.

## Success Criteria

- [ ] `rg -n "sources/(nn|original|export|archive)/" iNNfo/packages iNNfo/apps skills scripts -g '!*.generated.*' -g '!**/fixtures/**'` returns only `legacy:cognitivize-in-place/*`-marked lines.
- [ ] The regex for `_NN.md` filename identity is defined only in the contract module (rg over `.ts`, `.js`, `.vue`, `.mjs`, excluding generated files and tests).
- [ ] There is one timestamp helper. `external-scanner.js`, `impact-checker.js`, `convergence-delta.js`, `transformer.js`, and `conversations.js` define none.
- [ ] Running each producer twice on unchanged input writes no new file. Changed input writes a new suffixed file and leaves prior bytes identical (sha256).
- [ ] On every sample workspace, zero sidecars appear in `list_knowledge`, `## NN Models`, `export-console` targets, or editor workspace detection.
- [ ] Editing a managed record section fails `nn-trannsform --lineage --check`, `node scripts/verify.js`, and MCP `check_workspace`. Editing the journal passes.
- [ ] Every non-exempt `*_NN.md` in the repo satisfies the invariant check, and frozen paths are reported as carved out.
- [ ] Binary citations resolve via `<file>.<ext>_sidecar_NN.md@Heading`. JSON Pointer units resolve and validate.
- [ ] `node scripts/verify.js`, `npm run check:integrity`, and `node scripts/lib/legacy-ledger-guard.js` pass. Every `legacy:cognitivize-in-place/` marker maps 1:1 to a ledger entry.

## Proposal question round

All product decisions are maintainer-approved (decisions 1-7, Q1-Q6). The only assumptions that still need review are the four defaults in "Defaults for items the exploration left open" and the open questions below.

## Open Questions

1. **Frozen bluepriNNt carve-out vs. required behavior.** The `workspace` bluepriNNt is frozen (`manifest/source.yaml:159-174`) but holds `compile_model_console`, `compile_workspace_hub`, and other procedures that S4 must make write-once. The `cogNNitive` record fields (`archive_path`, `version`) also change. Default: edit both in place for behavior, as in the base change's D10 precedent, and keep their procedure *names* under the carve-out, with no rename. Confirm.
2. **`.gitattributes` scope** for the hash guard. Default: path-based on `sources/import/**` and `artifacts/**`. Raw files cognitivized elsewhere would stay exposed to CRLF conversion. Confirm whether to use `* -text` for the whole domaiNN.
3. **Procedure rename and published URLs.** Do any published docs or pinned consumers deep-link `procedures/<verb>_<noun>_NN.md`? If so, they 404 after rename unless the release notes cover it. There is no redirect, per the no-compat rule.
