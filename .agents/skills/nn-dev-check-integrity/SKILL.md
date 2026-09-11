---
name: nn-dev-check-integrity
version: "0.1.0"
description: Internal developer skill for cogNNitive maintainers. Post-change integrity gate — a regression net for known failure modes across specs, templates, MCP distribution, tests, docs, and GitHub sync, plus an optional deep code-review pass (QA, bug hunt, easy refactors). Run it after any large change to the monorepo, before pushing or opening a PR.
---

# nn-dev-check-integrity Skill (Post-Change Integrity Gate)

## Overview

`nn-dev-check-integrity` is an internal maintenance skill for maintainers of `cogNNitive`.
It is meant to be run **every time a large change has been made to the repository** —
before commit, push, PR, or release.

It is **NOT a generic linter**. It is a **regression net for failure modes that have
actually broken this repo before**, plus two hygiene groups (tests / docs) the maintainer
explicitly opted into. Every deterministic check traces to a documented incident (its
*expediente*, cited per group). If a risk has no history and no concrete preventive
action, it does not belong here.

This skill is maintainer-only. It is **not** distributed: it is not under `actioNN/skills/`
and it is not registered in `manifest/source.yaml`. It is a sibling of `nn-dev-release`
and `nn-template-audit`.

Scope: all operations limited to `D:\Users\lucas\Documents\GitHub\cogNNitive`.

---

## Greeting Protocol (MANDATORY)

When this skill is loaded or activated, the agent MUST print as its very first line:

```
🔧 You're using skill: nn-dev-check-integrity (🩺)
```

Session-scoped: once per conversation.

---

## 0. Engram Recall (run first, if available)

If engram MCP tools are available in the session:

1. `mem_search` for `"merge incident OR drift OR verify OR spec write-once OR CDN OR stale dist"`
   scoped to this project.
2. `mem_get_observation` on any hit that looks like a new failure mode not covered below.
3. If a genuinely new recurring incident is found, run the relevant existing checks and
   tell the maintainer that the catalog in this SKILL.md should be extended.

If engram is not available, state that once and proceed — the groups below are the
distilled catalog.

---

## 1. Selection Menu (MANDATORY — always ask)

Never run the full battery unprompted. Present this list, with the fast/high-value groups
pre-marked `[x]`, and run **only** what the maintainer selects.

```markdown
🩺 nn-dev-check-integrity — ¿qué grupos querés chequear?

  [x] 0. Working tree & sesiones concurrentes
  [x] 1. Sync con GitHub: commit / push / merge / deploy
  [x] 2. Cuadrado de versión del MCP (pkg · core · server.ts · manifest · CDN)
  [x] 3. Inmutabilidad de specs _V_x-y-z_ publicados
  [x] 4. Registro de templates nuevos en manifest/source.yaml
  [ ] 5. Espejo de CI (build core → lint → typecheck → 3 suites → app build → verify → build:docs → spec-urls)   · LENTO
  [x] 6. Tests actualizados (acompañan al código que cambió)
  [x] 7. Documentación actualizada (generados sin drift, CHANGELOG, números hardcodeados)
  [ ] 8. Preflight + coherencia del flujo de skills (UX)   · parte juicio
  [ ] 9. Entorno (Node, npm ci, rollup win32, gh auth)
  [ ] 10. Revisión general de código: QA básico + bugs + refactors fáciles   · MUY LENTO / muchos tokens

Presets:  [a] Todo   ·   [d] Post-cambio (0 1 2 3 4 6 7)   ·   [p] Pre-push (d + 5)   ·   [q] QA a fondo (p + 10)   ·   [r] Release (a)
Podés marcar números sueltos, ej. "0 1 2 6".  ·  [x] Cancelar
```

⚡ **Fast Deterministic CLI**:
- Preset `[d]` (Post-cambio gate): `npm run check:integrity` (or `node scripts/check-integrity.js`)
- Preset `[p]` (Pre-push gate with CI mirror): `node scripts/check-integrity.js --pre-push`

If the maintainer types a preset letter, expand it to its number set and confirm the
list before running. In automated environments, run the CLI directly.

---

## 2. Groups

Each group: **what it checks**, **how**, **expediente** (past incident), **verdict rule**.
Never fabricate a pass for a check that did not actually run.

### Group 0 — Working tree & concurrent sessions
**Expediente:** `concurrent-sessions-share-working-tree.md` — branch switched mid-task,
`main` advanced, foreign stash appeared, 4/10 planned fixes already applied by another
session.

Run at the **start** and again immediately **before any write**:
```powershell
git status -sb
git rev-parse HEAD
git fetch origin
git log --oneline -1 origin/main
git stash list
```
- ❌ if current branch / HEAD is not what the maintainer expects, or a stash they don't
  recognise exists.
- ⚠️ list every staged/modified path; flag any outside the set the maintainer says this
  change touched (may belong to a concurrent session — never stage it).
- Rule for the whole run: re-read each file immediately before editing; never trust a
  plan written several tool calls earlier.

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
# version bumps without a pushed tag
git tag -l "v*" "innfo-mcp-v*" "skills-v*" "templates-v*" --sort=-creatordate | Select-Object -First 8
```
- ❌ uncommitted changes that belong to this change; unpushed commits; local `main` behind
  or ahead of `origin/main`; an open PR that still needs merge; latest `CI & Verify` run on
  `origin/main` tip not `success`.
- ⚠️ a `package.json` / SKILL.md / template `version` was bumped in the diff but no matching
  tag exists (`v<x>`, `innfo-mcp-v<x>`, `skills-v<x>`, `templates-v<x>`).
- ⚠️ if a version was released: reminder that the GitHub Pages deploy (`deploy-pages` job,
  reusing the `verify` docs artifact) and the CDN bundle/manifest produced by
  `npm run build:docs` are **separate** from tagging — confirm the release build ran.

### Group 2 — MCP version square
**Expediente:** `mcp-two-distribution-channels.md` — CDN frozen at v0.2.1 while the repo
was at v0.2.4 (5 MCP tools missing in production); `server.ts` still hardcodes the version
string instead of reading `package.json`.

Compare these **six** values; all must be the same `x.y.z`:
1. `iNNfo/packages/innfo-mcp/package.json` → `version`
2. `iNNfo/packages/innfo-core/package.json` → `version`, and the `@cognnitive/innfo-core`
   range in `innfo-mcp/package.json` `dependencies` (`^x.y.z`)
3. `iNNfo/packages/innfo-mcp/src/server.ts` → the literal in `new Server({ name, version })`
4. `manifest/source.yaml` → the `innfo-mcp` block `version:` **and** `channels.stable.refs`
   key `innfo-mcp` `ref: innfo-mcp-v<x.y.z>`
5. `docs/innfo/cdn/manifest.json` → `latest: "v<x.y.z>"`
6. `docs/innfo/cdn/innfo-mcp-v<x.y.z>.bundle.js` → file exists
- ❌ any mismatch. Name the two sides.
- Fix hints: bump the literal in `server.ts`; run `npm run build:docs` from the repo root
  (stages values 5 + 6); re-pin `manifest/source.yaml`.

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

### Group 4 — New template folders registered in the manifest
**Expediente:** `verify-scripts-template-inventory-guard.md` + `workspace-entity-evolution.md`
incident 3 — PR #29 broke CI on every push because `base/` was added under
`specs/templates/` without a `manifest/source.yaml` entry. Also happened with `documentation`.

```powershell
node scripts/verify.js            # Template Inventory Guard + line-count guard + generated-manifest freshness (live stable validation is release-only: add --release)
node scripts/manifest/check-parity.js
```
- ❌ any folder under `iNNfo/specs/templates/` (except `assets`) with no `- name: <folder>`
  in `manifest/source.yaml`; any parity mismatch (SKILL.md ↔ manifest ↔ template
  frontmatter ↔ `innfo-mcp/package.json`).
- Fix: add the `templates:` entry (name, repo, path, version) in the **same** change.

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
npm --prefix iNNfo/apps/innfo-editor test
npm --prefix iNNfo/apps/innfo-editor run build
node scripts/verify.js            # dev mode: skips the live stable-manifest check (release-only)
npm run build:docs
npm --prefix iNNfo run check:spec-urls
npm --prefix iNNfo run check:spec-version -- --inventory   # informational
```

**Local automation & residual nonequivalence.** `node scripts/check-integrity.js --pre-push`
automates the core of this list: `lint`, `typecheck`, `innfo-core test`,
`innfo-mcp test:coverage`, `innfo-editor test`, `check:spec-urls`, plus the full
`verify.js` suite (Groups 3/4/7). Three steps are deliberately **not** mirrored
locally — they are documented gaps, not oversights, and the runner should not be
widened to include them:
- `innfo-core run build` — CI builds core before the tests to kill stale `dist/`
  (expediente `innfo-core-dist-staleness-breaks-mcp-tests.md`). The local runner
  expects a current build; if `innfo-mcp` tests throw `<fn> is not a function`,
  run the core build manually before blaming the change.
- `innfo-editor run build` — CI owns the app build; locally the app test suite plus
  typecheck catch the same regressions without the heavier bundle step.
- `npm run build:docs` — excluded from the local gate on purpose: it is heavy and
  rewrites tracked generated docs, so running it would dirty the very tree the gate
  is inspecting. The release path owns it.

`check:spec-version -- --inventory` is informational by design and never fails a
gate, so it stays out of the runner.

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
  `docs/innfo/app/`, `docs/innfo/templates/catalog.json`, `docs/_sidebar.md`,
  `docs/_navbar.md`, `docs/llms.txt`, `docs/ai-index.yaml`, `docs/use/manifest.md`,
  `docs/use/manifest-next.md`.
- ⚠️ the diff bumps a `version` / `spec_version` but `CHANGELOG.md` has no new entry.
- ⚠️ hardcoded facts in `*/SKILL.md` and `docs/**` that drifted — MCP tool count
  ("N herramientas" vs. the real count in `server.ts` / `nn-innfo` §1), version strings
  quoted in prose, tool names, file paths / flags that no longer resolve.

### Group 8 — Preflight + skill-flow coherence (part deterministic, part judgement)
Deterministic:
```powershell
node scripts/preflight-check.js   # fallback: node actioNN/skills/nn-preflight/scripts/preflight-check.js
```
- ❌ preflight runner not found on any known path, or exits `2` (Node blocker).
- ⚠️ exits `1` (outdated / missing components) — report, do not auto-fix.
- For every consumer skill (`nn-router`, `nn-innfo`, `nn-trannsform`, `nn-site-generator`,
  `nn-skills-lifecycle`, `nn-design-presets`): its SKILL.md has a `## 0. Activation Gate`
  section delegating to `nn-preflight` with the canonical text, a greeting banner
  (`🔧 You're using skill: …`), and does **not** duplicate the runner command / exit-code
  branching.

Judgement (opt-in — requires reading, not a script): read `nn-router` → `nn-preflight` →
the entry menus and option flows of `nn-innfo` / `nn-trannsform` / the others, and assess
whether the routing order and the user-facing flow still hold together — no dead options,
no menu pointing at a step that was removed, no contradictory instructions between a
consumer skill and `nn-preflight`, `[a] (Recommended)` present where the convention
requires it. Report findings as ⚠️; never mutate a SKILL.md from this skill.

### Group 9 — Environment (no expediente — cheap preconditions)
- ⚠️ Node `<` 20 (CI uses 20).
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
  [3] Repo completo (innfo-core · innfo-mcp · innfo-editor · scripts · actioNN/skills)   · el más caro
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

---

## 3. Report Format

One consolidated report. Per group, per check, a line:

```markdown
## nn-dev-check-integrity — <date>  ·  groups: <selected>

### ❌ Blockers
- [G2] MCP version square: server.ts literal "0.2.3" ≠ package.json "0.2.4"
  Impact: MCP handshake advertises the wrong version; CDN + manifest may follow it.
  Fix: edit the literal in iNNfo/packages/innfo-mcp/src/server.ts, then run build:docs.

### ⚠️ Warnings
- [G6] recursiveParser/normalize.ts changed, no test touched in innfo-core.

### ✅ OK
- [G0] Working tree clean, on <branch>, HEAD == origin/main.
- [G3] No published _V_x-y-z_ spec edited in place.

### 🔍 Code review (Group 10)   — informational, does not fail the gate
- CONFIRMED  innfo-core/src/foo.ts:88 — off-by-one drops the last row when len % 2 == 1.
- PLAUSIBLE  innfo-mcp/src/resolver-node.ts:140 — unawaited fs promise may race on Windows.
- refactor   innfo-editor/src/utils/sourceRef.ts:12 — re-exports a helper now in core; drop.
```

- Exit / conclude **non-zero** (fail) only on a ❌ from Groups 0–9. Group 10 never fails the
  gate on its own — a confirmed bug it finds becomes a ❌ once the maintainer accepts it.
- A check that was skipped or could not run is a ⚠️, never a ✅.

---

## Core Rules

1. **Never guess git state** — run `git status -sb` / `git fetch` right before reporting or
   writing, not from values read earlier (Group 0).
2. **Ask which groups** — always show the selection menu; never run the full battery
   unprompted.
3. **Build `innfo-core` first** — any group that runs tests starts with
   `npm --prefix iNNfo/packages/innfo-core run build`.
4. **Changed files only for format** — never `format` / `prettier --write` repo-wide;
   `main` is already dirty.
5. **Read-only** — this skill inspects and reports. It never edits code, specs, SKILL.md,
   manifests, or generated docs. It may suggest exact fix commands.
5b. **Group 10 delegates** — the code-review group calls the `code-review` / `simplify` /
   `judgment-day` skills (per-package parallel sub-agents for wide scope). It does not
   reimplement a reviewer, and it still obeys Rule 5.
6. **Never fabricate a pass** — skipped or errored check ⇒ ⚠️.
7. **Authenticate gh** — `$env:GITHUB_TOKEN = (gh auth token).Trim()` before
   `generate-manifest.js` / `gh` calls to dodge 403s.
8. **Every deterministic check cites its expediente** — if a new recurring incident shows
   up (via engram or the maintainer), extend the catalog in this file; don't add
   history-less checks silently.
9. **Monorepo scope** — `D:\Users\lucas\Documents\GitHub\cogNNitive` only.
