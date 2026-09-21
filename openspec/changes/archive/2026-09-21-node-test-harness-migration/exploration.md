# Exploration: Node test harness migration (bespoke runners -> `node --test`)

Date: 2026-09-21
Change: `2026-09-21-node-test-harness-migration`
Artifact store: openspec (repo-local planning home)
Origin: Ponytail over-engineering audit finding — "bespoke test harness + ~20
hand-written runners wired one-by-one into verify.js; `node --test` ships
discovery, assertions and reporting since Node 18."

## Pre-existing uncommitted WIP

`scripts/verify.js` carries uncommitted changes that already partially
implement this idea: a `collectTestSuites(dir, found)` walker discovers
`*.test.js` / `*.test.mjs` by shape under `scripts/` and `skills/`, skipping
`node_modules`, replacing an enumerated allowlist. Two non-conforming suites
stay explicitly wired (`skills/nn-trannsform/test/run.js`,
`iNNfo/specs/scripts/test-vocabulary.js`), and every `--check` drift guard
keeps its numbered position.

## Q1 — Actual runner inventory

The audit's "~20 runners" conflates two populations.

**19 conforming `*.test.{js,mjs}` suites** discovered by the walker:

```
scripts/manifest/check-parity.test.js
scripts/manifest/generate-manifest.test.js
scripts/manifest/validate-manifest.test.js
scripts/guard-template-immutability.test.js
scripts/guard-text-encoding.test.js
scripts/template-catalog.test.mjs
scripts/verify-inventory.test.js
scripts/version-square.test.js
scripts/sync-samples.test.mjs
scripts/sync-template-versions.test.mjs
scripts/build-preflight-primitives.test.mjs
scripts/export-console.test.mjs
scripts/skills-manager.test.js
scripts/lib/git-visible.test.js
scripts/lib/mcp-config-adapter.test.js
skills/nn-preflight/scripts/upgrade-check.test.js
skills/nn-preflight/scripts/preflight-check.test.js
skills/nn-upgrade/scripts/backup-workspace.test.js
skills/nn-workspace-git/test/skill-contract.test.js
```

Each uses `node:assert` plus a `runAll().catch(...)` or top-level-await
pattern. No shared framework, and no suite uses the `node:test` API today.

**2 non-conforming runners** kept explicit: `skills/nn-trannsform/test/run.js`
and `iNNfo/specs/scripts/test-vocabulary.js`.

**11 `--check` drift guards** (deterministic diff scripts, not test suites):
`check-parity.js`, `tsc --noEmit`, `build-preflight-primitives.mjs --check`,
`template-catalog.mjs --check`, `build-trannsform-slug-mirror.mjs --check`,
`sync-samples.mjs --check`, `sync-template-versions.mjs --check`,
`generate-manifest.js --channel stable --check`, `validate-manifest.js
--channel stable` (release-only), `guard-template-immutability.js`,
`guard-text-encoding.js`.

### Previously undiscovered gap: an orphaned suite

`scripts/lib/test-shared-libs.js` is a substantial (465-line) suite covering
`yaml-parser.js`, `github-client.js` and `atomic-fs.js`. Its filename does not
match `*.test.js` / `*.test.mjs`, so neither the old allowlist nor the new
discovery loop picks it up, and nothing in CI or `check-integrity.js`
references it. Archive `2026-09-03-scripts-modular-refactor/tasks.md` marks
"Add unit tests in `scripts/lib/test-shared-libs.js`" as done, and its
verify-report records it PASSing — but nothing has executed it since. This is
exactly the drift class the `skills-tests-not-in-ci` memory warns about, and it
is independent of the migration question.

Also outside the walked trees: `.claude/hooks/block-dangerous-git.test.mjs`.
Arguably out of `verify.js`'s scope, but it deserves an explicit decision
rather than silent omission.

## Q2 — Nature of `test-shared-libs.js`

A hand-written test suite, not a runner, framework or fixture helper. It uses
`node:assert` directly, spins up a real `http.createServer` for the
`github-client.js` HTTP paths, stubs `https.get` and `fs.renameSync` for
negative-path coverage, and uses `fs.mkdtempSync` for isolation. Zero other
suites depend on it — the "shared-libs" name refers to what it tests, not what
it provides. Wiring it in costs only a rename.

## Q3 — Ordering dependencies (WIP claim verified)

The WIP's comment is accurate. The discovered unit suites are self-contained
(`mkdtempSync` / in-process HTTP servers with `finally` cleanup, no shared
filesystem state with the guards). The `--check` guards genuinely are
order-sensitive and the file documents why per step: step 5 (preflight bundle)
must precede step 9 (live manifest validation), because 9 halts on pre-existing
pinned-tag drift and would make 5 unreachable in CI; step 7d (template version
parity) must precede step 8 (rendered manifest doc) so a stale `source.yaml`
fails with a clear message instead of a confusing rendered-doc diff.

One dependency the WIP comment does not call out: step 0 (MCP Version Square)
reads a gitignored CDN bundle built by `npm run build:docs`, which CI runs
*before* `verify.js` is invoked. That ordering lives outside `verify.js` and
must not be disturbed.

Note: the guards are numbered 1-13 with gaps at 6, 10 and 11, implying earlier
renumbering that was never cleaned up.

## Q4 — CI reality: no drift found

`.github/workflows/ci.yml`'s `verify` job runs `npm ci` -> `npm ci --prefix
skills/nn-trannsform` -> `npm run build:docs` -> `node scripts/verify.js`
(`--release` on main push). It runs no suite independently outside that call.
`scripts/check-integrity.js` calls `require('./verify.js').runVerification(...)`
directly — the same function, not a re-implementation — so there is no
dual-maintenance risk. `check-integrity.js` additionally runs a Group 5
CI-mirror block (lint, workspace unit tests, `check:spec-urls`) covering iNNfo
workspace packages, a disjoint concern unaffected by this migration.

## Q5 — Node floor

`package.json` declares `"engines": { "node": ">=20.15" }`; CI pins
`node-version: 20`. No repo-root `.nvmrc`. Node 20 has mature `node:test`:
glob discovery (`--test`, stable since 20.6), coverage, `t.plan`, subtests, and
the `spec` / `dot` / `tap` / `junit` reporters. No floor-driven blocker.

## Q6 — `nn-trannsform` dependency isolation

`skills/nn-trannsform/package.json` is a separate, non-workspace manifest with
its own dependencies (mammoth, minimist, pdf-parse, prompts, xlsx) and its own
`"test": "node test/run.js"`. CI already handles it with `npm ci --prefix
skills/nn-trannsform`.

**Concrete regression risk for a full migration:** the hand-rolled walker skips
`node_modules` explicitly. Node's own `--test` glob does NOT. Pointing `node
--test` at `scripts/ skills/` would discover every vendored
`node_modules/**/*.test.js` under `skills/nn-trannsform/` (lop, duck, option,
...) and under `iNNfo/**`. This hazard does not exist in the current WIP.

## Q7 — What a migration would NOT preserve

`verify.js`'s `run()` halts on the *first* failing step (`process.exit(1)`, no
aggregation) and prints a numbered, human-narrated progress log interleaved
with the guard descriptions. `node --test` runs all discovered files,
aggregates, and reports in a structurally different shape (per-test-case tree,
not per-file numbered steps), and does not halt on first file failure by
default.

No script or skill greps `verify.js`'s stdout — `check-integrity.js` imports
the function and relies on `process.exit`, not text scraping.

**But `openspec/specs/quality-gates/spec.md` (lines 22-24) normatively names
three suites by literal invocation string:** `node
scripts/manifest/generate-manifest.test.js`, `node
scripts/manifest/validate-manifest.test.js`, `node
scripts/manifest/check-parity.test.js`. The discovery-loop WIP satisfies this
in effect but not in letter. A full `node --test` migration breaks it further,
since those suites would no longer run as distinct child processes. Either path
needs a `MODIFIED Requirement` delta — not a silent reinterpretation.

Also lost in a full migration: today a failing unit suite fails fast before the
slower `--check` / network / git steps ever run (explicit in-code rationale: "a
broken tester should fail before the slower network- and git-dependent steps").
A single `node --test` invocation runs all suites to completion first,
changing a fail-fast latency property that is load-bearing for local dev.

## Affected areas

- `scripts/verify.js` — orchestration, discovery loop, ordering, halt semantics
- `scripts/lib/test-shared-libs.js` — orphaned; needs a wiring decision
- `openspec/specs/quality-gates/spec.md` — stale literal invocations; needs a delta
- `.github/workflows/ci.yml` — `verify` job must stay compatible
- `scripts/check-integrity.js` — imports `runVerification`; already decoupled
- `skills/nn-trannsform/` — separate dep tree; must stay excluded
- `.claude/hooks/block-dangerous-git.test.mjs` — scope decision needed

## Approaches

### 1. Land the discovery-loop WIP as-is, stop there

Shape-based discovery replaces the allowlist; per-file `node <file>` invocation
via `run()` is kept.

- **Pros:** already written; solves the documented failure mode
  (`skills-tests-not-in-ci`); zero change to output format, halt semantics or
  CI; near-zero regression risk.
- **Cons:** does not address the "no shared framework" complaint; no
  parallelism, coverage or uniform reporter; leaves `test-shared-libs.js`
  orphaned unless separately handled.
- **Effort:** Low.

### 2. Full `node --test` migration

Replace the discovery loop and per-file `run()` calls with a single `node
--test` invocation, converting all 19 suites from `assert` + manual logging to
`test()` / `describe()`.

- **Pros:** native parallelism, built-in coverage, standard reporters, removes
  hand-rolled boilerplate.
- **Cons:** must solve the `node_modules` exclusion hazard (Q6); loses
  fail-fast ordering (Q7); touches all 19 suites — a wide mechanical diff that
  the repo's own 400-line PR budget is built to catch, so it needs chaining;
  needs the `quality-gates` delta anyway; and the two non-conforming runners
  plus the 11 `--check` guards stay outside `node --test` regardless, so
  `verify.js` remains a two-tier orchestrator. The "single dispatcher" story
  the audit implies is not fully achievable without also touching the guards,
  which the audit did not flag as in scope.
- **Effort:** Medium-High.

### 3. Hybrid — land the WIP now, defer the full conversion

Gate approach 2 on a concrete pain point (coverage reporting, parallel CI time).

- **Pros:** decouples the low-risk built fix from the higher-risk rewrite;
  matches the maintainer's own "MEDIUM RISK, deferred benefit" framing, which
  describes approach 2 and not approach 1; stays inside the review budget.
- **Cons:** the deferred work needs an explicit backlog entry so it does not
  silently vanish.
- **Effort:** Low now, Medium-High later if triggered.

## Recommendation

**Approach 3.** The evidence does not support the full rewrite now. The
uncommitted WIP is a working, well-reasoned fix for the actual documented
failure mode, with an in-code rationale explaining what it replaces and why.

Scope for the proposal:

1. Commit the WIP with scope-closing additions: wire or explicitly exclude
   `scripts/lib/test-shared-libs.js`, and decide
   `.claude/hooks/block-dangerous-git.test.mjs`'s status explicitly.
2. Write a `MODIFIED Requirement` delta for `openspec/specs/quality-gates/spec.md`,
   since the literal-invocation wording no longer matches the implementation
   even though behaviour is preserved.
3. Do NOT convert the 19 suites to the `node:test` API in this change. Park it
   as a separate change with its own risk acceptance.

## Risks

- The `quality-gates` spec is already stale relative to the uncommitted WIP;
  shipping without a delta leaves the spec lying about the implementation.
- `test-shared-libs.js` is orphaned dead weight covering real production code;
  this predates the migration and should not be silently left orphaned.
- If approach 2 is chosen later, the `node_modules` exclusion hazard is real
  and must be solved explicitly, not assumed away.
- No automation parses `verify.js` stdout, but the fail-fast-before-slow-steps
  property is intentional and documented; a future migration must preserve it
  or consciously trade it off.

## Verification caveat

The exploring agent had no shell or git access and read `scripts/verify.js`'s
on-disk content directly rather than diffing against the last commit. The
orphan status of `test-shared-libs.js` and the `quality-gates` literal
invocations at lines 22-24 were independently confirmed by the orchestrator via
ripgrep.
