# Freezing iNNfo/apps/innfo-editor instead of deleting it (S5)

Worktree cogNNitive-s3-domain-console, branch session/s3-domain-console. Read-only research. "Verified" = I ran it; "reasoned" = from reading code.

## 0. Headline facts

1. The editor is NOT in scripts/verify.js (buildSteps verify.js:298-453; collectTestSuites :246-256 walks only scripts/ skills/ test/ iNNfo/specs/bluepriNNts). The verify CI job never builds or tests it. Exposure: root typecheck/test/test:coverage scripts, CI quality + site jobs, build-docs, check-integrity --pre-push, sync-versions, and four repo-wide guards.
2. Coupling to innfo-core is by SOURCE: iNNfo/apps/innfo-editor/tsconfig.json:16-17 and vite.config.ts:74-78 alias @cognnitive/innfo-core to ../../packages/innfo-core/src/browser.ts (and /legacy to src/legacy/detect.ts). tsconfig.json:20 also includes ../../specs/**. Any change to the browser.ts exports the editor uses is an editor compile error.
3. Healthy today. Verified at this HEAD with no install (existing root node_modules): vue-tsc --noEmit clean (~33 s); vitest run 109 files / 740 tests all pass, 8 min 19 s. NOT run: vite build (its prebuild rebuilds core dist into the shared node_modules junction target); reasoned OK since vue-tsc passes with the same alias.
4. Not broken by recent core changes: the editor imports ~60 symbols from the core browser entry (parseFrontmatter x18, KnowledgeDriver x8, ParsedKnowledge, isNNName, MatrixDecl, validateFormatContent, slugify, serializeKnowledge, parseKnowledge, ensureNNFilename, WorkspaceIntegrityReport, parseCitation...). Zero references to UNFROZEN_MODEL, agentModification/AgentModification; "feedback" hits are UI strings only (ExperimentalBanner.vue, ValidationReport.vue). Commit 5d32a5b1 (changeset as L3) touched the editor by one line (src/config/samples.ts).
5. Most-churned consumer: since 2026-09-15, 132 of 1284 commits touch it (52 feat, 19 refactor, 17 fix). A freeze stops feature work; the remaining maintenance is the coupling below.
6. The hosted app is built on every site build and its absence deletes it: scripts/build-docs.mjs:39 builds, :41-66 stages dist into docs/innfo/app/. .gitignore:14-15 ignores docs/innfo/app/assets/ and index.html; only 404.html and starter/*_NN.md (4) are tracked. publish-web does a FULL REPLACE of the target tree (scripts/lib/publish-web-tree.js:78-107; only .nojekyll, CNAME, release-owned paths survive, :12,19-27). If build-docs stops producing docs/innfo/app/, the next main publish removes cognnitive.com/innfo/app/.
7. HIDDEN TRAP: jsdom (^30.1.1) and happy-dom (^20.8.9) are declared ONLY in the editor package.json:52-53. Gated suites use them: test/console-*.test.mjs import jsdom (10 files, e.g. console-export.test.mjs:11, console-element-card.test.mjs:4); innfo-core/tests/console-dom.test.ts:1 and console-citation-dialog.test.ts:1 use happy-dom. Core and MCP package.json declare neither. Dropping the workspace without moving them to root devDeps turns verify and core tests red. The S5 design.md:12-34 coupling table does not list this.
8. Runtime data: the editor fetches specs from raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/... (src/utils/constants.ts:36,44,76) and the catalog from cognnitive.com/innfo/blueprints/catalog.json. Published _V_ specs are write-once, so a frozen build keeps loading; it just will not understand newer L3 shapes.
9. innfo-core has NO release channel: tags are blueprints-, innfo-console-, innfo-mcp-, skills-, templates- only; core version is synced to MCP. "Pin to a published core tag" is not available.

## 1. Every place the editor is wired in

### Dev-loop / deploy cost

- package.json:6-9 workspaces (iNNfo/packages/*, iNNfo/apps/*): editor deps in npm ci and the lockfile.
- package.json:24-26: typecheck/test/test:coverage end with the editor; editor package.json:7-13 pre-scripts rebuild core. .githooks/pre-push:34 runs npm run typecheck, so every push pays vue-tsc (~33 s) and core refactors must keep the editor compiling. npm run verify (package.json:27) adds ~8 min.
- .github/workflows/ci.yml:136-137,148-149,151-152 (quality job: editor typecheck, tests, build). publish-web needs [verify, site, quality, spec-integrity] (ci.yml:181), so a red editor blocks the Pages deploy.
- ci.yml:75-79 + scripts/build-docs.mjs:39-66: the site job builds the editor; a build failure blocks the pages-docs artifact (ci.yml:93-99).
- scripts/check-integrity.js:175: --pre-push Group 5 runs editor tests.
- scripts/sync-versions.mjs:26-28,151-179 + sync-versions.test.mjs:98 + verify.js:427 (step 7d): SHIPPED_BLUEPRINT_VERSIONS in editor src/config/samples.ts is generated; the check fails if missing or stale. Every template/blueprint release rewrites an editor file (the recurring registration gap); moving the file gives "Missing samples.ts file".
- eslint.config.mjs:10,40; package.json:20 (eslint iNNfo/ scripts/); ci.yml:121-122: lints editor .vue/.ts. Root devDeps eslint-plugin-vue, vue-eslint-parser (package.json:44,49).
- jsdom/happy-dom: finding 7.

### Guards scanning its source (constraint on vocabulary/core refactors)

- scripts/lib/legacy-write-guard.js:66-71 (scope regex for iNNfo/apps/<app>/src at :68), verify step legacy-write (verify.js:447): any FUTURE retired token forces an editor edit. Clean today, no allowlist entry.
- scripts/lib/nn-name-regex-guard.js:50-53 (4 editor allowlist entries), :59 scope regex, verify.js:448: same.
- legacy-ledger.yaml:56-63 (editor-legacy-domain) plus markers "legacy:nn-rename/editor-legacy-domain" in src/composables/useLegacyDomain.ts:1 and src/components/layout/LegacyDomainBanner.vue:2; scripts/lib/legacy-ledger-guard.js enforces a 1:1 contract. Stable if entry and files stay together. Do not touch.
- scripts/lib/brand-purge-guard.js:79 (all tracked files): no hit today; also applies to any committed build output.
- scripts/guard-text-encoding.js:111-122, skips only .bundle.js (:32): a committed Vite build (assets/index-HASH.js) would be scanned (risk).
- scripts/check-spec-version.mjs:285 (skips only tests/fixtures/models), migrate-spec-urls*.mjs:60,76; CI spec-integrity: editor URLs are template-built; resolve today; stable when frozen.
- scripts/guard-template-immutability.js:231 normalises the old badge URL in published _V_ specs: KEEP in every design.

### Verified NOT wired
release.yml, manifest/source.yaml, scripts/lib/channel-refs.js and scripts/release/*, scripts/generate-docs-facts.mjs, tsconfig.scripts.json, .prettierignore (CI format check is changed-files only, ci.yml:124-134), publish-web-guard.js:14-23 (root apps surface, unrelated), .claude/.agents hooks, vocabulary.json and test-vocabulary.js.

### Convenience/docs refs (no gate impact)
run-dev.bat:14,32,45-46,65; iNNfo/run-dev.bat:14,32; openspec/config.yaml:8,23; scripts/generate-about-twin.test.mjs:110,141; test/no-workspace-hub-references.test.mjs:34-35; innfo-core/tests/legacy/layout/retired-paths.test.ts:13; iNNfo/validation-baseline.json; comments in core (sourceRef.ts, types/graph.ts, validator/content.ts, workspace/integrity/report.ts and versionStatus.ts).

### Producers of the hosted-app URL (independent of editor source)
innfo-mcp/src/tools/preview-server.ts:21 (PREVIEW_APP_URL), :67 (view=editor&models=&live=&token=); init-knowledge.ts:32,197 badge; every maintained spec_NN.md, canonical-registry.ts, serializers (S5c). 241 files mention innfo/app/ outside openspec and docs/innfo/app.

## 2. Coupling in numbers
Core to editor: none (comments only). Editor to core: browser entry only, 85 import lines in 53 files, one deep test import (tests/unit/metamodel.test.ts:10 to packages/innfo-core/src/resolver) and /legacy (tests/unit/useLegacyDomain.test.ts:7). Renaming or removing any of ~60 symbols, or changing ParsedKnowledge/KnowledgeDriver/WorkspaceIntegrity shapes, breaks vue-tsc, vite build, vitest, hence quality, site, pre-push.

## 3. Freeze designs

S3a reads the editor source as audit input (S3 proposal), so it must exist when S3a runs.

### A) Source in place, out of workspaces and gates, FROZEN.md
Edits: (1) package.json:6-9 drop iNNfo/apps/*; :24-26 strip editor; MOVE jsdom + happy-dom to root devDeps; regenerate the lock from the primary checkout (never npm ci from a worktree junction). (2) ci.yml 136-137,148-149,151-152 and check-integrity.js:175 removed. (3) sync-versions.mjs:26-28,151-179 + test:98 stop generating samples.ts (editor table goes stale; its shipped-template-versions.test.ts would fail if run: note in FROZEN.md). (4) eslint ignore iNNfo/apps/innfo-editor/**; delete scope regex legacy-write-guard.js:68 and nn-name-regex-guard.js:59 plus allowlist entries :50-53. (5) build-docs.mjs:39-66 per hosted-app choice. (6) FROZEN.md with revive steps (re-add workspace line, npm install, run editor tests).
Breaks: nothing after edits; the run-dev.bat editor block stops working.
Hosted app options:
- A1 stop building: /innfo/app/ 404s on next main publish (the S5 end state, early).
- A2 build via isolated install (like npm ci --prefix skills/nn-sources, ci.yml:33-38): app stays live but site still depends on core browser exports. Fails "no constraint on core".
- A3 snapshot: build once at the freeze commit (throwaway worktree, own install), commit dist into docs/innfo/app/, drop .gitignore:14-15 and build-docs.mjs:39-66 (the rmSync of assets/ at :53-57 must go too). The Pages artifact carries a static app. Cost: committed minified JS (size not measured), scanned by encoding/brand guards (check once; add a skip for docs/innfo/app/assets/ if U+FFFD appears), one noisy diff. No dev-loop cost afterwards.
Reversibility: high (one workspace line + script revert + lock regen).

### B) Pin against a core release
Not available (finding 9). Variant B-prime: vendor a frozen BUILD of the core browser entry (dist/browser.js, dist/legacy/detect.js, .d.ts) under apps/innfo-editor/vendor/innfo-core/ and repoint tsconfig.json:16-17, vite.config.ts:74-78, tests/unit/metamodel.test.ts:10. Zero source coupling; editor stays rebuildable and testable. Cost: more committed generated output, still needs A guard/workspace edits, two truths about core, stale on new L3. Over-engineering if no-maintenance is the goal. Reversibility: medium.

### C) Move out of main
C1 tag + delete (git tag innfo-editor-final, or branch legacy/innfo-editor; restore via git worktree add). This is S5 with a restore point: all of section 1 plus S5c and docs. Hosted app 404s (or A3 snapshot residue). Does not satisfy keeping it in the repo on main. Reversibility high via tag.
C2 relocate to legacy/innfo-editor/: guard scope regexes and workspace glob no longer match, but tsconfig.json:14-20 and vite.config.ts:66,74-78 use ../../ relative paths, sync-versions/build-docs use the old path, 290 paths move. It is A plus a rename; same benefit A gets by deleting two regexes. Not worth it. Reversibility medium.

### D) Leave as is, exclude from gates only
Keep workspace and files; remove only from root scripts, ci.yml, check-integrity, sync-versions target, lint. No lock edits, no jsdom move; site still builds the editor so the core-source alias still gates the deploy; making the build non-fatal is wrong because replaceSiteTree then deletes the app. Cheapest, worst frozen semantics: the first core refactor that breaks vue-tsc surfaces as a red site on main. Reversibility highest.

### Comparison
- A1/A2/A3: breaks nothing after edits (jsdom/happy-dom move is the trap); ~10 small edits; hosted app 404 / live+coupled / live+static; core constraint none for A1,A3, yes for A2; reversible high.
- B-prime: as A plus vendor; A + 4 edits; live+static; no constraint; reversible medium.
- C1: all of section 1 + S5c; S5-sized; 404; no constraint; reversible high via tag.
- C2: A + path rewrites; as A; reversible medium.
- D: first core break reds site; ~5 edits; live, coupled; constrains core for the build; reversible highest.

## 4. Recommendation
A3: source stays at iNNfo/apps/innfo-editor, out of workspaces and every gate, hosted app frozen as a committed static build, plus a git tag at the freeze commit.
Order: (1) tag dev head innfo-editor-frozen; (2) throwaway worktree with own install, build once, copy dist to docs/innfo/app/, drop .gitignore:14-15; (3) root package.json workspaces + 3 scripts + move jsdom/happy-dom, lock from primary; (4) delete build-docs.mjs:39-66; (5) ci.yml 3 steps, check-integrity.js:175, sync-versions + test, eslint ignore, two guard scope regexes + four allowlist entries; leave ledger entry and markers; (6) FROZEN.md, trim run-dev.bat; (7) verify: node scripts/verify.js, npm run typecheck, npm test, build:docs/CI, check:spec-urls.
Trade-offs: hosted app and source drift from newer L3/changeset docs (accepted); editor tests stop running (shipped-template-versions.test.ts goes red if revived); committed minified assets need a one-time encoding/brand guard check.

## 5. Effect on S5 and S3
S5 becomes "delete the frozen editor later".
- Done by the freeze: tasks 3.2, 4.1, 4.2, 4.3, 4.5, 4.6, most of 3.3, part of 5.1.
- Left for late S5: 3.1 (delete iNNfo/apps/innfo-editor/** and docs/innfo/app/** incl. snapshot), 3.4 (ledger entry + two markers together), eslint ignore + FROZEN.md cleanup, lockfile Vue prune, S5b-3 baseline/comments, S5d guard (design.md:47-50 must allow the directory until deletion).
- S5c (badge retarget) leaves the critical path: while the snapshot is live, innfo/app/ in templates, init-knowledge.ts:32,197 and canonical-registry.ts still resolves; no template bumps now.
- S5a (MCP preview removal, preview-server.ts:21,67) stays coupled to S6, not to the freeze.
- New precondition: quarantine ended with maintainer sign-off.
S3 parity gate: remains a blocker for DELETING (late S5), not for the freeze (no capability is removed; source and hosted app stay). Adjust S3a: audit against the frozen tag, and note the 740 editor tests are the executable description of used behaviour but stop running after the freeze.
