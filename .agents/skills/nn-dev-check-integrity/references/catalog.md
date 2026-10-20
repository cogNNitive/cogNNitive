# nn-dev-check-integrity — Group Catalog

Detailed catalog of the checks. Load on demand from `SKILL.md`; each group cites the incident
(*expediente*) that justifies it. Never fabricate a pass for a check that did not run.
Each group: **what it checks**, **how**, **expediente** (past incident), **verdict rule**.
Never fabricate a pass for a check that did not actually run.

### Group 0 — Working tree & concurrent sessions
**Expediente:** `concurrent-sessions-share-working-tree.md`.

Owned by `nn-dev-development` (§1 session start, §1c concurrency check). Run
`node scripts/nn-session.mjs status` and re-read `git status -sb` right before any write.

### Group 1 — Sync with GitHub (commit / push / merge / deploy)
**Expediente:** `workspace-entity-evolution.md` (multi-PR merge incidents; CI green on the
final commit before "deployed" is true) + `mcp-two-distribution-channels.md` (a tag alone
does not deploy).

```powershell
# committed?
git status --porcelain                      # empty  → nothing uncommitted
# pushed?
git rev-list --count "@{u}..HEAD"            # 0      → nothing unpushed  (skip if no upstream)
# local main vs origin
git fetch origin main
git rev-parse main; git rev-parse origin/main
# open PRs for this work
gh pr status
gh pr list --state open --head (git branch --show-current)
# CI + Pages on the tip of origin/main
gh run list --branch main --workflow "CI & Verify" --limit 1 --json headSha,status,conclusion
# Pages deploy finished on that same tip? (deploy-pages job inside CI & Verify)
$runId = gh run list --branch main --workflow "CI & Verify" --limit 1 --json databaseId --jq '.[0].databaseId'
gh run view $runId --json jobs --jq '.jobs[] | select(.name=="deploy-pages") | {name,conclusion,headSha}'
# CDN bundle + manifest pins resolve (stable channel)
$env:GITHUB_TOKEN = (gh auth token).Trim()
node scripts/manifest/validate-manifest.js
# version bumps without a pushed tag
git tag -l "v*" "innfo-mcp-v*" "skills-v*" "templates-v*" --sort=-creatordate | Select-Object -First 8
```
- ❌ uncommitted changes that belong to this change; unpushed commits; local `main` behind
  or ahead of `origin/main`; an open PR that still needs merge; latest `CI & Verify` run on
  `origin/main` tip not `success`.
- ❌ for **release-shaped changes** (a version was bumped / tags are being cut / a release
  is in flight): any of the four deploy legs failing — (1) tag pushed, (2) CI `success` on
  the `origin/main` tip, (3) Pages `deploy-pages` job `success` on that tip, (4) CDN bundle
  + manifest pins resolving. A tag alone NEVER satisfies the definition of deployed
  (expediente `mcp-two-distribution-channels.md`).
- ⚠️ for non-release changes: the Pages deploy and CDN/manifest legs are advisory only —
  report their status, never block on them.
- ⚠️ a `package.json` / SKILL.md / template `version` was bumped in the diff but no matching
  tag exists (`v<x>`, `innfo-mcp-v<x>`, `skills-v<x>`, `templates-v<x>`).
- ⚠️ if a version was released: reminder that the GitHub Pages deploy (`deploy-pages` job,
  reusing the `verify` docs artifact) and the CDN bundle/manifest produced by
  `npm run build:docs` are **separate** from tagging — confirm the release build ran.

### Group 1b — Merge gate (`dev → main`) — blocking

Runnable manually. `nn-dev-development` §4d uses `verify.js` + green dev CI as the standard merge gate; this group is the stricter variant. A
`dev → main` batch MUST NOT land without evidence on the exact commits being
merged:

1. **Batch CI signal** — a green CI run exists for the batch tip on `dev`:
   ```powershell
   gh run list --branch dev --workflow "CI & Verify" --limit 1 --json headSha,status,conclusion
   ```
   No green signal → the gate SHALL block and require either a dev CI run or a
   documented full local rehearsal (`node scripts/check-integrity.js --pre-push`
   green on the tip) recorded in the merge report.
2. **Green stationary target** — `origin/main` latest CI conclusion is
   `success` AND `origin/main` has NOT advanced since the batch was verified
   (`git rev-parse origin/main` vs the verified sha).
3. **Verdict** — ❌ if either leg fails, stopping with the named reason.
   Distinguish:
   - **Red caused by this batch** → fix-forward on `dev` first, re-verify, then
     re-run the gate. Do not merge.
   - **Pre-existing red** → record a maintainer-approved exception naming the
     failing run id; only then may the merge proceed.

Exception format (merge report line):
`MERGE-GATE EXCEPTION · origin/main red pre-existing · run <run-id> · approved by <maintainer> · <date>`

### Group 1c — Tag/pin freshness for skills & templates changes — blocking

**Expediente:** the same 2026-09-24 incident as `nn-dev-development` §4e — a
skill directory rename plus `template_version` bumps across ~15 `spec_NN.md`
files under `iNNfo/specs/templates/` were merged `dev → main` without cutting
a new `skills-v*`/`templates-v*` tag or re-pinning `manifest/source.yaml` in
the same batch. `validate-manifest.js --channel stable` failed on CI
afterward (reactive fix: `e1469d0`, cutting `skills-v2.1.0` +
`templates-v0.13.0` and re-pinning).

The check is **local, git-only** — no GitHub API call, no live manifest
validation (that stays release-only, see Group 1):

```powershell
git diff --name-only origin/main..origin/dev     # inside a batched-merge review
# or, outside a batch context, while still on dev:
git diff --name-only origin/main...HEAD
```

If any changed path matches `skills/**` or
`iNNfo/specs/{bluepriNNts,templates}/**/spec_NN.md` (the nested sample specs are
excluded — only the top-level `spec_NN.md` of a blueprint counts), the SAME diff
MUST also touch `manifest/source.yaml` — else ❌, naming which category (skills
or blueprints) triggered it and listing the matched paths.

This runs automatically inside `node scripts/check-integrity.js`, even in
dev/default mode (not just `--pre-push`/`--release`) — see
`scripts/lib/tag-pin-freshness.js` (unit-tested in
`scripts/lib/tag-pin-freshness.test.js`). It compares `origin/main...HEAD`.
Cutting the actual tag is still the maintainer's job; this check only catches the
local half (the unpinned manifest), not the missing tag itself.

### Group 1d — Release workflow auth & trigger sanity — blocking on release-shaped changes

**Expediente:** 2026-10-02 — every tag-driven release failed for most of a day
because the `Post-Publish Smoke Test` step in `.github/workflows/release.yml`
ran **without a token**: its validator (`validateManifestText`) calls the GitHub
API and, unauthenticated, got HTTP 403/429 — surfacing only as an opaque
`Live manifest … failed validation`. A second attempt then died in the template
immutability guard because its base was the moved-on `origin/main` (see
`nn-dev-release` §4b). Both are local, static checks:

```powershell
# 1. Every networked step must carry a token (Run Release AND the smoke test).
Select-String -Path .github/workflows/release.yml -Pattern 'GITHUB_TOKEN|WEB_RELEASE_TOKEN'
# 2. A tag push only publishes when the repo variable is enabled.
gh variable get RELEASE_ENABLED
```

- ❌ a step that calls the manifest validator / GitHub API has no token in its
  `env:` block.
- ❌ `RELEASE_ENABLED` is unset or not `true` while a real (non-dry-run) release
  is expected — tag pushes then silently dry-run and publish nothing.
- ❌ a **tag cut before the guard/smoke fix** cannot be re-run green: the workflow
  runs the scripts *from the tag*. Recovery is a new version tag, never a re-run.

### Group 2 — Version SSOT & Inventory Coherence
**Expediente:** `mcp-two-distribution-channels.md` — CDN frozen at v0.2.1 while the repo
was at v0.2.4 (5 MCP tools missing in production).

With single-source versioning (`sync-versions.mjs`), version declarations live in their primary files (`iNNfo/packages/innfo-mcp/package.json`, blueprint `spec_NN.md`, and skill `SKILL.md` frontmatter). `manifest/source.yaml` serves as an inventory list of components.

Group 2 verifies:
1. Version SSOT → `node scripts/sync-versions.mjs --check` verifies zero drift between packages and samples.
2. Inventory Integrity → `node scripts/verify.js` verifies that every path declared in `manifest/source.yaml` exists on disk and follows canonical naming.
- ❌ version drift or missing inventory paths.
- Fix hints: run `npm run sync:versions` to synchronize version sites; fix path references in `manifest/source.yaml`.

### Sample version coherence (blueprint bump ↔ sample refresh) — a `verify.js` step
**Expediente:** `samples-version-coherence-guard` (2026-10-04). `scripts/sync-samples.mjs`
compared the SSOT (`_samples_nn/`) and shipped (`iNNfo/specs/bluepriNNts/*/samples/`)
copies byte-for-byte **against each other** with a hardcoded target filename, so both
copies advanced in lockstep and the `samples-parity` step stayed GREEN while every sample
pinned an obsolete blueprint version (business pinned V_0-2-3 while the blueprint shipped
V_0-4-0; video pinned V_0-1-0 vs V_0-7-1). Nothing compared the sample's pin to the
blueprint's current version.

```powershell
node scripts/check-samples-version.mjs           # exit 1 on drift
node scripts/check-samples-version.mjs --json    # machine-readable failures
```
Runs automatically in `scripts/verify.js` as the `samples-version` step (next to
`samples-parity`). Rules, each emitted as a named failure:
- `NO_CURRENT_SAMPLE` — a blueprint has no sample pinned to its current
  `blueprint_version` (historical samples are allowed, but ≥1 must track current).
- `MALFORMED_PIN` — a sample's `parent_spec.name` has no parseable `V_x-y-z`.
- `MISSING_BLUEPRINT_SPEC` — the shipped `spec_NN.md` / its `blueprint_version` is absent.

- ❌ any failure. The guard **fails, it never auto-fixes** — a blueprint bump changes the
  sample's schema/content, not only its version number; auto-renaming yields
  "updated filename, broken body".
- Authoritative source is the **shipped** `iNNfo/specs/bluepriNNts/<bp>/spec_NN.md`
  `blueprint_version` — never the global cache under `~/.agents/bluepriNNts/` (it
  diverges, and `verify.js` must stay offline/deterministic).
- Fix: re-pin + refresh the sample at BOTH sites and update `SAMPLE_MAPPINGS` in
  `scripts/sync-samples.mjs`; then run `node scripts/sync-samples.mjs` to keep SSOT and
  shipped byte-identical.

### Group 3 — Immutability of published `_V_x-y-z_` specs
**Expediente:** `spec-files-are-write-once.md` — six `_V_0-1-0_` template files edited in
place broke composition for every model pinned to V_0-1-0. Nothing enforces this.

```powershell
git diff --name-only origin/main...HEAD -- "iNNfo/specs/**"
```
For every changed file matching `iNNfo/specs/**/*_V_*`:
- ❌ if its `V_x-y-z` is **not** the highest version present for that template family
  (i.e. an in-place edit of a frozen file). A change that "only" adds a field or fixes
  wording still counts.
- ✅ only new files, or edits to the newest version of a family that is not yet released.
- ⚠️ any `*_spec_NN.md` (Level 2) listed as a model in a workspace `index.md`.

### Group 3b — Canonical blueprint specs are versioned, not frozen — blocking
**Expediente:** 2026-10-04 housekeeping session — a reference sweep rewrote the
"official sample" sentence in 9 canonical blueprint specs
(`iNNfo/specs/bluepriNNts/<bp>/spec_NN.md`) without bumping their `blueprint_version`.
The `Template Immutability Guard` (a `verify.js` step, `scripts/guard-template-immutability.js`)
rejected it and the `dev` CI went red. Recovering meant either bumping 9 blueprints (which
cascades to samples + `catalog.json` + the canonical registry + dozens of test fixtures) or
reverting the specs. The bump is a real release of the `blueprints` key, not a wording edit.

Canonical blueprint specs are **unversioned on disk** (`spec_NN.md`) but **versioned in
frontmatter** (`blueprint_version`). ANY content change — a field, a wording fix, a path
correction — MUST increment `blueprint_version` for that blueprint in the same diff:

```powershell
git diff --name-only origin/main...HEAD -- "iNNfo/specs/bluepriNNts/*/spec_NN.md"
```

- ❌ a canonical `bluepriNNts/<bp>/spec_NN.md` changed in the diff and its
  `blueprint_version` is not strictly greater than the base's. The guard reports
  `base: "V_X", current: "V_X"`.
- The bump **cascades** — it is not one edit. All of these move together, in the same
  batch: the sample pin at BOTH sites (`_samples_nn/` + `bluepriNNts/<bp>/samples/`, see
  Sample version coherence), `SAMPLE_MAPPINGS` in `scripts/sync-samples.mjs`, the regenerated
  `catalog.json` (`npm run sync:versions`), and every test that asserts a
  blueprint version (core + mcp; the frozen editor is not gated).
- **Do NOT attempt a text-only fix in a canonical spec** (e.g. repointing a dead path)
  unless that blueprint is genuinely being released. The cascade cost is large and easy to
  underestimate. Prefer fixing the wording in a non-immutable surface (public docs,
  maintainer skills, `manifest/body.md`) and leave the canonical spec for a versioned
  change. This is the exact mistake that cost a session's tail on 2026-10-04.

### Group 3c — `git checkout <ref> -- <path>` is blocked; use a read-through
The PreToolUse git guard refuses `git checkout <ref> -- <path>` and `git restore <path>`
(they can overwrite your own uncommitted work). To revert a single authored file to a ref:
```powershell
# safest: read the ref's blob and write it, no working-tree guard triggers
git show <ref>:<path> > <path>          # POSIX
node -e "const{execSync}=require('child_process');const fs=require('fs');fs.writeFileSync(process.argv[1],execSync('git show '+process.argv[2]+':'+process.argv[1],{encoding:'buffer',maxBuffer:2e7}))" <path> <ref>
```
Do NOT use `git restore .`, `git clean`, `git reset --hard`, or `git stash` (all blocked,
all destructive of your own work).


### Group 4 — New template folders registered in the manifest
**Expediente:** `verify-scripts-template-inventory-guard.md` + `workspace-entity-evolution.md`
incident 3 — PR #29 broke CI on every push because `base/` was added under
`specs/templates/` without a `manifest/source.yaml` entry. Also happened with `documentation`.

```powershell
node scripts/verify.js            # Template Inventory Guard + line-count guard + generated-manifest freshness
node scripts/blueprint-catalog.mjs --check # validates iNNfo/specs/bluepriNNts/catalog.json freshness
```
- ❌ any folder under `iNNfo/specs/bluepriNNts/` (except `assets`) with no `- name: <folder>`
  in `manifest/source.yaml`; stale `catalog.json`.
- Fix: add the `blueprints:` entry (name, repo, path) in the **same** change; run `node scripts/blueprint-catalog.mjs` to regenerate `catalog.json`.

### Group 5 — CI mirror (slow; run before push)
**Expedientes:** `innfo-core-dist-staleness-breaks-mcp-tests.md` (stale `dist/` →
`<fn> is not a function`, looks like an integration bug); `provenance-lineage-consolidation-chain.md`
(`main` `format:check` is dirty repo-wide — never format repo-wide); the `spec-integrity` CI job.

In order, stop on first failure:
```powershell
npm --prefix iNNfo/packages/innfo-core run build      # ALWAYS first — kills stale dist
npm --prefix iNNfo run lint
npm --prefix iNNfo run typecheck
npm --prefix iNNfo/packages/innfo-core test
npm --prefix iNNfo/packages/innfo-mcp run test:coverage
node scripts/verify.js            # dev mode: skips the live stable-manifest check (release-only)
npm run build:docs
npm --prefix iNNfo run check:spec-urls
```

**Local automation & residual nonequivalence.** `node scripts/check-integrity.js --pre-push`
automates the core of this list: `lint`, `typecheck`, `innfo-core test`,
`innfo-mcp test:coverage`, `check:spec-urls`, plus the full
`verify.js` suite (Groups 3/4/7). Two steps are deliberately **not** mirrored
locally — they are documented gaps, not oversights, and the runner should not be
widened to include them:
- `innfo-core run build` — CI builds core before the tests to kill stale `dist/`
  (expediente `innfo-core-dist-staleness-breaks-mcp-tests.md`). The local runner
  expects a current build; if `innfo-mcp` tests throw `<fn> is not a function`,
  run the core build manually before blaming the change.
- `npm run build:docs` — excluded from the local gate on purpose: it is heavy and
  rewrites tracked generated docs, so running it would dirty the very tree the gate
  is inspecting. The release path owns it.

Format — **changed files only**, mirroring `.github/workflows/ci.yml`:
```powershell
git fetch --no-tags --depth=1 origin main
$changed = git diff --name-only --diff-filter=ACMR origin/main...HEAD -- '*.ts' '*.mts' '*.vue' '*.js' '*.mjs' '*.json' |
  ForEach-Object { $_ -replace '^iNNfo/','' } | Where-Object { $_ }
if ($changed) { Push-Location iNNfo; npx prettier --check --ignore-unknown $changed; Pop-Location }
```
- ❌ any command exits non-zero.
- Never run `npm --prefix iNNfo run format` (repo-wide) — `main` is already dirty.

### Group 6 — Tests keep up with the code (no expediente — opted in)
Hygiene, not a regression net. Best-effort static checks:
```powershell
git diff --name-only origin/main...HEAD
```
- ⚠️ a non-test source file (`*.ts` / `*.vue`, not `*.spec.ts` / `*.test.ts`) changed in the
  diff but **no** test file changed in the same package.
- ⚠️ a new `src/**/*.ts` with no sibling `*.spec.ts` / `*.test.ts`.
- ❌ `.only(` / `describe.only` / `it.only` left in any test file.
- ⚠️ `.skip(` / `it.todo(` / `xit(` / `xdescribe(` left in the diff.
- ⚠️ obsolete snapshots — run `npm --prefix iNNfo/packages/innfo-core test` and read
  vitest's "obsolete snapshot" report; a `__snapshots__` file with no referencing test.
- optional: `npm --prefix iNNfo run test:coverage` and compare to the threshold in each
  `vitest.config.ts` (or the previous run) — ⚠️ on a drop.

### Group 7 — Docs keep up with the code (no expediente — opted in)
Generated / published artifacts must not be stale:
```powershell
npm run build:docs
node scripts/generate-docsify-suite.mjs
$env:GITHUB_TOKEN = (gh auth token).Trim()
node scripts/manifest/generate-manifest.js --channel stable
node scripts/manifest/generate-manifest.js --channel preview
git status --porcelain -- docs/
```
- ❌ `git diff` is non-empty for any generated path after regeneration:
  `docs/innfo/templates/catalog.json`, `docs/_sidebar.md`,
  `docs/_navbar.md`, `docs/llms.txt`, `docs/ai-index.yaml`, `docs/use/manifest.md`,
  `docs/use/manifest-next.md`.
- ⚠️ the diff bumps a `version` / `spec_version` but `CHANGELOG.md` has no new entry.
- ⚠️ hardcoded facts in `*/SKILL.md` and `docs/**` that drifted — MCP tool count
  ("N herramientas" vs. the real count in `server.ts` / `nn-innfo` §1), version strings
  quoted in prose, tool names, file paths / flags that no longer resolve.

### Group 8 — Preflight + skill-flow coherence (part deterministic, part judgement)
Deterministic:
```powershell
node scripts/preflight-check.js   # fallback: node skills/nn-preflight/scripts/preflight-check.js
```
- ❌ preflight runner not found on any known path, or exits `2` (Node blocker).
- ⚠️ exits `1` (outdated / missing components) — report, do not auto-fix.
- For every consumer skill (`nn`, `nn-innfo`, `nn-sources`, `nn-site-generator`,
  `nn-skills-lifecycle`, `nn-design-presets`): its SKILL.md has a `## 0. Activation Gate`
  section delegating to `nn-preflight` with the canonical text, a greeting banner
  (`🔧 You're using skill: …`), and does **not** duplicate the runner command / exit-code
  branching.

Judgement (opt-in — requires reading, not a script): read `nn` → `nn-preflight` →
the entry menus and option flows of `nn-innfo` / `nn-sources` / the others, and assess
whether the routing order and the user-facing flow still hold together — no dead options,
no menu pointing at a step that was removed, no contradictory instructions between a
consumer skill and `nn-preflight`, `[a] (Recommended)` present where the convention
requires it. Report findings as ⚠️; never mutate a SKILL.md from this skill.

### Group 9 — Environment
**Expediente (automated bullets only):** `preflight-tests-leak-real-home-dir.md`-adjacent
2026-09-24 incident — jsdom@30.1.1 requires `engines.node: ^22.22.2 || ^24.15.0
|| >=26.0.0`, but CI was still pinned to Node 20 in all 3 jobs and root
`package.json` had no `engine-strict`; the mismatch reached `main` before
anyone noticed. Reactive fix already landed (`448ae6f`): CI bumped to
`node-version: 22` in all 3 jobs of `.github/workflows/ci.yml`, `.npmrc` now
has `engine-strict=true`, and root `package.json` `engines.node` is now
`"^22.22.2 || ^24.15.0 || >=26.0.0"`. The line below that used to say
"⚠️ Node < 20 (CI uses 20)" was stale as of that fix — CI uses 22, not 20.

Two bullets below are now **automated** (❌/⚠️, run via
`node scripts/check-integrity.js` → `scripts/lib/node-engine-check.js`); the
rest of this group stays manual/opt-in judgement:

- ❌ **(automated)** any installed dependency's own declared `engines.node`
  (checked for the repo root and every npm workspace under
  `iNNfo/packages/*`) excludes a Node version pinned via
  `node-version:` in `.github/workflows/ci.yml`. Names the package, its
  declared range, and the failing CI version. A workspace with no installed
  `node_modules` is skipped with a note, not treated as a failure.
- ⚠️ **(automated)** the `node-version:` values inside `.github/workflows/ci.yml`
  disagree with each other (currently all 3 are `22`; if a future edit pins
  one job differently without meaning to, this catches it).
- ⚠️ `package-lock.json` newer than `node_modules` (root and `iNNfo/`) → `npm ci` pending.
- ⚠️ Windows and `iNNfo/node_modules/@rollup/rollup-win32-x64-msvc` missing → tests may
  fail to start (`npm i -D @rollup/rollup-win32-x64-msvc --no-save`).
- ⚠️ `gh auth token` fails → Groups 1 and 7 can't verify CI / regenerate manifests.

### Group 10 — General code review (QA + bug hunt + easy refactors) — no expediente, opted in
A broad quality pass. Token- and time-heavy; default OFF. This group **delegates** to the
existing tooling (`code-review`, `simplify`, `judgment-day` skills) — it does not
reimplement a reviewer. Still read-only: suggestions only, no edits.

Ask for the scope before running:
```markdown
Alcance de la revisión de código:
  [1] Solo el diff vs origin/main
  [2] Módulos tocados + su blast radius (lo que importa lo que cambió)
  [3] Repo completo (innfo-core · innfo-mcp · scripts · skills/)   · el más caro
```

**10a — Deterministic QA sweep** (any scope):
- `npm --prefix iNNfo run lint` (skip if Group 5 already ran it) — report, never `--fix`.
- Inventory `TODO` / `FIXME` / `HACK` / `XXX` across the scope.
- Stray `console.log` / `console.warn` / `console.error` / `debugger` in non-test `src/`.
- TS escape hatches: `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable*` —
  file:line inventory; flag the ones **new** vs `origin/main`.
- `src/` files over ~400 lines (split candidates — soft signal, not a rule).
- Circular dependencies — run dependency-cruiser if configured, else ⚠️ "not checked".
- Obvious copy-paste blocks across the scope.

**10b — Easy refactors** — delegate to the `simplify` skill (or the reuse/simplification/
altitude axis of `code-review`) on the scope. Report **only** low-risk mechanical wins:
dead code, redundant branches, a helper duplicated from `@cognnitive/innfo-core`, needless
indirection. Each as `file:line → suggestion`. No edits.

**10c — Bug hunt** — delegate to `code-review` at `high` / `max` effort on the scope
(correctness, edge cases, off-by-one, unhandled rejections, resource leaks, wrong error
handling, Windows path assumptions). For scope 2 / 3, run it per package in parallel
sub-agents and synthesise. For a deeper adversarial pass, point the maintainer at
`judgment-day` (dual blind review) — do not embed it here.

**Verdict rule:** a bug is ❌ only when confirmed (reproducible or a clear code path); an
uncertain one is ⚠️ labelled `PLAUSIBLE`. Refactor and QA-smell items are always ⚠️ /
informational — Group 10 **never fails the gate on its own**; it informs.

### Group 11 — cogNNitive-web issues triage (distribution feedback loop) — advisory, delegated
**Expediente:** 2026-10-12 — end-user sessions filed 12 issues against
`cogNNitive/cogNNitive-web` (the public distribution mirror); none was triaged
back into this source monorepo, so a confirmed preflight false positive
(web#12, reserved `target:: Markers`) lived on while the fix belonged here.

**Owned by `nn-dev-issue-tracking`.** When this group is selected, read and follow
`.agents/skills/nn-dev-issue-tracking/SKILL.md` §3 (intake sweep) and report its buckets
(`fixes-here` / `web-only` / `already-fixed`). It also owns the import (transfer + traceability
comment + ledger) in §4–§6. This group stays a thin trigger inside the gate — do not duplicate
the sweep here.

```powershell
gh issue list --repo cogNNitive/cogNNitive-web --state open --limit 100 --json number,title,author,createdAt
```

- ⚠️ any open web issue not yet in a bucket — list `web#<n> <title>`. A completed sweep leaves
  **no open `fixes-here`** web issue (source of truth is this monorepo: `skills/` + `iNNfo/` +
  `scripts/` ship to web via `manifest/source.yaml` + release workflow).
- Never fails the gate on its own (advisory, like Group 10). Run on `--pre-push`
  and before a release batch, not on every edit.

---
