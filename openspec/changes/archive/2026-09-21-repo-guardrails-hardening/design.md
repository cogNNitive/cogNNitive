# Design: Repo Guardrails Hardening

## 1. Architectural approach

There is no new subsystem here. The repository already owns every executable primitive it
needs (`npm run typecheck`, `scripts/verify.js`, `scripts/manifest/validate-manifest.js`,
`.github/workflows/ci.yml`, `parser/yaml.ts`'s `NORMALIZERS` array). This change is
**wiring**: it attaches existing primitives to the three moments where a mistake escapes —
the local push, the `dev` CI run, and the frontmatter parse boundary.

The organising principle is therefore not a pattern but a constraint:

> **Every artifact this change produces must be a line inside a file that already exists,
> or a file whose absence is the bug.** No new script, no new document, no new dependency,
> no new abstraction.

Measured against that constraint the whole change is: one CI step, one hook file, one
`prepare` line, one normalizer function, one git index removal, and three one-line doc
edits. Everything else was cut (§8).

### Seam placement

Three seams, each chosen because it is the single point every consumer already routes
through:

| Seam | Location | Why here |
| :-- | :-- | :-- |
| Local push gate | `.githooks/pre-push`, via `core.hooksPath` | `git push` is the exact moment a mistake becomes CI's problem. Commit is too early (high friction, no additional catch); CI is too late (the incident). |
| Release-coherence signal | a `dev`-conditioned step in `.github/workflows/ci.yml`'s `verify` job | The check is network-driven, so the seam is *when* it runs, not *where*. CI is the only place that runs automatically on every push. |
| `level` type invariant | `parseFrontmatter`'s `NORMALIZERS` array in `iNNfo/packages/innfo-core/src/parser/yaml.ts` | Every innfo-core, innfo-mcp and innfo-editor consumer of `frontmatter.level` reaches it through `parseFrontmatter` (verified: `parser/core.ts:89` → `parseModel` → `recursiveParser/model.ts`, `innfo-mcp/src/tools/validate.ts:652`, `apply-change.ts:326`, `validator/content.ts`, `merge.ts`). One normalizer makes the declared `SpecLevel = 0 \| 1 \| 2 \| 3` honest for all of them. |

The third seam is the only one with depth in the `codebase-design` sense: a ~4-line
implementation behind an interface (`level` is a `number`) that pays back across every
downstream `level === N` comparison in three packages. The first two are pure wiring and
claim no depth.

### Scope correction discovered during design (important)

The proposal and the `normalize-frontmatter-level` delta spec both assume
`skills/nn-preflight/scripts/preflight-check.js` sits downstream of the parse boundary.
**It does not.** `preflight-check.js:34` imports `./lib/yaml-lite`, a zero-dependency
focused YAML subset parser written for agent-bootstrap speed. Its `parseScalar`
(`yaml-lite.js:8-24`) returns `true`/`false`/`null` and **a string for everything else** —
it never produces a number.

Consequence: at `preflight-check.js:546-547`, `fm.level === 1` and `fm.level === 2` are
**provably dead**, and `fm.level === '1'` / `=== '2'` are the **live** branches. Deleting
the string comparisons, as the delta spec literally instructs, would silently stop
preflight from skipping Level-1 files. This design overrides that instruction (ADR-007) and
amends the spec's success criterion (§9).

## 2. Architecture Decision Records

### ADR-001 — The `pre-push` hook runs `npm run typecheck`, not `npm run verify`

**Status:** accepted. Resolves proposal open decision 1.

**Options considered**

| Option | Measured cost | Catches `2c11ecf`? | Verdict |
| :-- | :-- | :-- | :-- |
| `npm run verify` (`typecheck && test`) | > 2 min (typecheck 25s + full test across 3 workspaces; editor alone is ~90s / 698 tests / 106 files) | Yes | Rejected |
| `npm run typecheck` (root, all 3 workspaces, includes the `innfo-core` build) | **25s** | **Yes** | **Chosen** |
| `npm --workspace=@cognnitive/innfo-editor run typecheck` | 12s | Yes | Rejected |
| Nothing (status quo) | 0s | No | Rejected — this is the incident |

**Decision:** `npm run typecheck`.

**Reasoning.** The incident (`2c11ecf`, a `vue-tsc` TS2367 dead comparison) is a *type*
error. `npm run typecheck` is the cheapest command in the set that catches it, and 25s is
inside the budget a human tolerates on an action they perform a handful of times a day.
`npm run verify` buys test coverage the hook does not need to buy — CI runs the full suite
on every push anyway, and the hook's job is to stop the *class of error that reached CI*,
not to replicate CI. A two-minute hook is the one outcome that makes F1 actively harmful:
it converts `--no-verify` from an escape hatch into a habit, and a habitual `--no-verify`
is strictly worse than no hook, because it also disarms every future hook.

The editor-only variant (12s) was rejected despite being the cheapest that catches the
literal incident: it excludes `innfo-core` and `innfo-mcp`, and the 13s saved is not worth
a gate that is blind to two of three workspaces. Also, the root script *builds*
`innfo-core` first, which is precisely what makes the editor's typecheck trustworthy — the
staleness trap recorded in `innfo-core-dist-staleness-breaks-mcp-tests.md`.

**Explicitly not bought:** lint, format, commit-message validation, tests. None of them is
the incident.

**Known ceiling (recorded, not fixed).** The hook ignores its stdin, so it also runs on
tag pushes and ref deletions — a release cuts up to four tags (`nn-dev-release` Option [c]
step 5), costing ~100s of redundant typechecking against a tree that was just verified.
The upgrade path is three lines reading `$remote_ref` from stdin and skipping non
`refs/heads/*` pushes. Not shipped: it introduces a silent-skip failure mode inside the
guardrail itself, in exchange for saving ~100s a few times a month. Ship it when tag-push
friction is actually reported, not before. This goes in the hook as a `ponytail:` comment.

### ADR-002 — Hook installation is automatic via npm `prepare`, with no opt-in alternative

**Status:** accepted. Resolves proposal open decision 2.

**Options considered**

1. `"prepare": "git config core.hooksPath .githooks"` — automatic on `npm install`.
2. `"hooks:install": "..."` — explicit, opt-in, documented in the README.
3. Both (prepare + a manual script for people who skip install).

**Decision:** option 1, alone.

**Reasoning.** The objection to option 1 is that `prepare` "silently reconfigures the
user's git". It does not: `git config core.hooksPath .githooks` writes to
`.git/config` — **repo-local**, inside the clone the user just made of this repo. It does
not touch `~/.gitconfig` and has no effect outside this working copy. The blast radius is
the clone, and the clone is exactly the thing being configured. Rollback is
`git config --unset core.hooksPath`, documented in the proposal's Rollback section.

Option 2 fails on the only metric that matters: an opt-in guardrail is installed by the
people who did not need it. Option 3 ships two mechanisms for one outcome and then has to
document which one you are on — the classic guardrail that metastasises.

The root package is `private: true` and is never installed as a dependency, so `prepare`
only ever runs on a local `npm install` / `npm ci` in a git checkout.

**Fresh clone.** `git clone` → `npm install` → `core.hooksPath` is `.githooks` →
`git push` invokes `.githooks/pre-push`. This is the delta spec's stated scenario and it
holds unmodified.

**Contributors who never run `npm install` at the root.** They get no hook. This is
accepted, stated plainly, and not mitigated:

- They cannot build, test, lint, or typecheck the repo either, so they are not producing
  the kind of change the hook protects against.
- CI is unchanged and remains the real gate. The hook is a *latency* improvement on an
  existing signal, not the signal itself.
- Any mechanism that detects "you have no hook" and complains is a new advisory mechanism,
  which this change's success condition forbids.

**CI side effect.** `npm ci` in the `verify` and `quality` jobs will also run `prepare` and
set `core.hooksPath` in the runner's checkout. Harmless: Actions never pushes from those
checkouts. No `if:` guard is added for it.

**Windows.** Git for Windows executes hooks through its bundled `sh`, so a
`#!/bin/sh` script runs on the maintainer's Windows machine without change. The file must
carry mode `100755` in the git index — set once at creation with
`git update-index --chmod=+x .githooks/pre-push`. This is a task-level detail, recorded
here because it is the one way this slice can ship looking correct and silently never run.

### ADR-003 — `--no-verify` stays unpoliced, and the hook prints how to use it

**Status:** accepted (confirms the proposal; the spec already requires it).

No detection, no logging, no counter, no CI cross-check. The hook's failure message names
`git push --no-verify` as the documented way past it. A gate whose escape hatch is hidden
or shamed is a gate people uninstall; an escape hatch that is signposted is one people use
deliberately and rarely. This is the difference between F1 surviving a year and F1 being
reverted in a month.

### ADR-004 — The `dev` stable-manifest check is a separate, non-blocking step

**Status:** accepted. Resolves proposal open decision 3 and the `ci-stable-manifest-on-dev`
design note.

**The pre-tag window is real — verified.** `scripts/manifest/lib/manifest-rules.js`
`checkTemplateMainCoherence()` fetches
`raw.githubusercontent.com/<repo>/<pinned-commit>/<path>` and `.../main/<path>` and
compares them; its own docblock states that drift in either direction and fetch failures
alike become violations, and that the rule never throws (fail closed). The repo's release
order is **merge → tag → pin** (`nn-dev-release` Option [c] step 0, blocking). Therefore:
the instant a template edit merges to `main`, `main` diverges from the still-pinned tag and
the rule reports a violation, and it keeps reporting one until a new `templates-v*` tag is
cut and `manifest/source.yaml` repinned. That window is a **normal, expected state of a
correct release**, not a defect. The `templates-v0.5.1` incident (PRs #86/#87) is the same
mechanism seen from the other side: a template edit merged and *no* tag was ever cut, so
the window never closed, `main` went red on verify, and the Pages deploy was silently
skipped.

**Options considered**

1. **Widen `ci.yml:47`'s `--release` condition to include `dev`.** Rejected twice over.
   First, `--release` makes the check *blocking* on `dev`, so every developer's push goes
   red for the duration of someone else's legitimate release window — the textbook
   guardrail that trains people to ignore CI. Second, `verify.js` runs steps sequentially
   and aborts on failure, so a step-9 failure would also suppress steps 10-13 (inventory,
   immutability ×2, text-encoding guards) — a pin-window red would blind `dev` to four
   unrelated guards that currently work.
2. **A separate blocking step on `dev`.** Same developer-facing failure as option 1
   without the step 10-13 collateral. Still rejected.
3. **A separate step with `continue-on-error: true` on `dev` pushes.** Chosen.
4. **A separate non-required job.** Same observable behaviour as option 3, more YAML, and
   a second `npm ci` + checkout for one network call. Rejected on cost.
5. **PR-time prevention (evaluating the prospective merge result).** Explicitly deferred by
   the proposal; it is custom code and this change does not write custom code until
   detection proves insufficient.

**Decision:** option 3 — a discrete step, `if: github.event_name == 'push' && github.ref ==
'refs/heads/dev'`, `continue-on-error: true`, invoking the existing
`node scripts/manifest/validate-manifest.js --channel stable` with `GITHUB_TOKEN`.

**Why non-blocking is the correct semantics and not a cop-out.** The asymmetry is the whole
point and must be preserved:

- On `main`, a coherence violation **is** the desired hard signal: `main` is the published
  surface, the pin is live, and a red `main` correctly blocks the Pages deploy. `--release`
  at `ci.yml:47` already does this and is untouched.
- On `dev`, the same violation is *information about `main`*, not about the push being
  evaluated. Failing a developer's `dev` job for the state of `main` attributes a fault to
  the wrong commit. `continue-on-error: true` still renders the step with a red ✗ and a
  warning annotation in the checks UI, which is exactly the visibility F2 asks for, while
  the job conclusion stays green.

This keeps the change honest about what it is: the proposal already states this is
**detection, not prevention**, and non-blocking detection is the truthful implementation of
a detection-only contract. The workflow comment will say so in one line, satisfying the
spec's "does not claim pre-merge prevention" scenario.

**Local `npm run verify` is untouched.** `verify.js`'s `--release` gate stays as-is. Making
the default local path network-dependent would make the ADR-001 pre-push hook flaky and
offline-hostile — a gate that fails on a plane is a gate that gets uninstalled.

### ADR-005 — `normalizeLevel` is coerce-only, integer-only, and leaves everything else untouched

**Status:** accepted. Resolves proposal open decision 4 and the
`normalize-frontmatter-level` design note (which asked design to confirm or override its
working default). **Confirmed, with the coercion predicate tightened.**

**Contract.**

| Input `level` | Output | Note |
| :-- | :-- | :-- |
| `2` (YAML number) | `2` | Untouched. The corpus-dominant form: 200+ instances. |
| `"2"`, `' 2 '` | `2` | Coerced. The bug this exists to kill. |
| `"2.5"`, `"abc"`, `""`, `"  "` | unchanged (string) | Not an integer → not coerced. |
| `null`, `true`, `[]`, `{}` | unchanged | Not a string → not coerced. |
| absent | absent | No key added. |

Never throws. Never deletes the key. Never substitutes a default.

**Sketch** (final shape is the implementer's, the contract above is binding):

```ts
/** `level:` — tolerate a quoted integer (`level: "2"`); anything else passes through. */
function normalizeLevel(fm: MutableFrontmatter): void {
  if (typeof fm.level !== 'string') return
  const trimmed = fm.level.trim()
  if (trimmed === '' || !Number.isInteger(Number(trimmed))) return
  fm.level = Number(trimmed)
}
```

**Reasoning — coerce, not reject.** All eight existing normalizers
(`normalizeParentSpec`, `normalizeIncludes`, `normalizeProcedures`, `normalizeSkills`,
`normalizeViewers`, `normalizeTopLevelAlias`, `normalizeMatrices`,
`normalizeLegacyFieldNames`) are coerce-or-pass-through; `parseFrontmatter` takes an
optional `onError` callback for *warnings* and returns a value regardless. A normalizer
that throws would be the only one, and it would turn a malformed field into a failure to
parse the whole document — a strictly worse outcome for a tolerant-by-design parser whose
callers include a live editor. Rejection also has zero corpus evidence behind it: there are
no quoted levels and no out-of-range levels in the corpus at all.

**Reasoning — integer, not `Number.isFinite`.** `SpecLevel` is declared `0 | 1 | 2 | 3`.
Coercing `"2.5"` to `2.5` would produce a `number` that satisfies every downstream
`typeof level === 'number'` check while being a value the type says cannot exist — the
normalizer would be *manufacturing* the exact class of lie it exists to remove. Leaving
`"2.5"` a string is the more honest failure: downstream `level === 2` comparisons stay
false, matching today's behaviour. The explicit empty/whitespace guard exists because
`Number('') === 0` and `Number('  ') === 0`, which would silently invent a Level-0 document.

**Reasoning — leave unmodified, not delete the key.** Deleting is destructive and
unrecoverable, and it would also break round-trip expectations. Leaving the value is a
strict no-op for any input the normalizer does not understand — the smallest possible
behavioural footprint.

**Round-trip safety.** `parser/core.ts:98-106` captures `rawFrontmatter` verbatim precisely
so the serializer can emit the author's original text, and
`tests/roundtrip-fidelity.test.ts` guards byte-identical round-trips over the whole corpus
(see `serializemodel-is-lossy.md`). Coercion therefore cannot alter serialized output for
any existing file. A hypothetical `level: "2"` routed through the *constructed* emit path
would come back as `level: 2`; with zero quoted instances in the corpus this is
unreachable today, and the corpus round-trip test is the standing guard that it stays so.

**Not in scope:** normalizing any other frontmatter field; range validation; a schema layer.

### ADR-006 — `recursiveParser/model.ts:53` becomes a presence check, not a type check

**Status:** accepted.

`const hasLevel = typeof fm.level === 'number'` is one of three OR'd terms in a heuristic
answering "does this file have iNNfo frontmatter at all?" (`hasSpecVersion || hasLevel ||
hasParent`). It is not a defense against anything downstream — it is a probe.

Replace with `const hasLevel = fm.level !== undefined`.

**Why not simply keep it.** After ADR-005 the `typeof === 'number'` form would be *correct*,
but it is the wrong question: a file with `level: "abc"` plainly has a `level` key and is
plainly an iNNfo-shaped file, yet the type check answers "no frontmatter" and the file is
skipped — the misleading-empty-folder outcome the surrounding comment says it is trying to
avoid. The presence check is simultaneously shorter and more right, which is the only
combination worth taking.

**Behaviour delta.** Differs from today only for a `level` that is neither number nor
integer string — a case with zero corpus instances. Covered by the existing
`tests/recursive-parser.test.ts` suite staying green.

### ADR-007 — `preflight-check.js` keeps its string comparisons; only the dead numeric halves are deleted

**Status:** accepted. **Overrides** the `normalize-frontmatter-level` delta spec's
`preflight-check.js` scenario, which instructed the opposite.

**Evidence** (§1, "Scope correction"): `preflight-check.js` parses with its own
`lib/yaml-lite`, not with innfo-core's `parseFrontmatter`. `yaml-lite`'s `parseScalar`
returns a string for every non-boolean/non-null scalar, so `fm.level` is *always* a string
there. `fm.level === 1` and `fm.level === 2` can never be true; `=== '1'` / `=== '2'` are
carrying the logic.

**Options considered**

1. **Delete the string comparisons** (what the spec says). Rejected: it breaks preflight —
   every Level-1 file would stop being skipped at line 546 and Level-2 templates would stop
   being collected at line 547.
2. **Make `preflight-check.js` import innfo-core's parser.** Rejected: `yaml-lite`'s
   docblock states it is zero-dependency *because* it runs at agent session bootstrap.
   Replacing it introduces a build-order dependency on `innfo-core`'s `dist/` for a script
   whose whole purpose is to run before anything is built — the staleness trap in
   `innfo-core-dist-staleness-breaks-mcp-tests.md`, imported into the bootstrap path.
3. **Leave the file completely alone.** Defensible, and the spec's non-goal framing would
   accept it.
4. **Delete only the provably-dead numeric halves** (`fm.level === 1 ||`,
   `fm.level === 2 ||`), keeping the string comparisons. **Chosen.**

**Reasoning.** Option 4 is a pure deletion of unreachable code — the exact TS2367 *class*
of defect that caused the F1 incident, living in a `.js` file where no typechecker will
ever flag it. It is a two-token diff with no behaviour change, and it removes the false
impression that preflight is defending against a numeric `level`. Preferred over option 3
because the dead comparison is the thing this whole change exists to be intolerant of, and
because unlike the CI/hook slices it is genuinely testable: `preflight-check.test.js`
already exists and already runs inside `verify.js` (step at `scripts/verify.js:163`), so a
case pinning "a `level: 1` file is skipped" is a real, runnable guard.

### ADR-008 — F3 ships as a git index removal only; no `.gitignore` edit

**Status:** accepted. This is a discovery that shrinks the slice.

`.gitignore:62` already contains `.atl/`. `.atl/skill-registry.md` is tracked *despite*
being ignored, because `.gitignore` has no effect on already-tracked paths. The spec's
"add it to `.gitignore`" step is therefore already satisfied and adding a second, narrower
rule would be redundant noise.

**The slice reduces to:**

1. `git rm --cached .atl/skill-registry.md` (file stays on disk, content untouched).
2. One line in `AGENTS.md` giving the regeneration command.

**Where the doc line goes.** `AGENTS.md` — it already carries the
`<!-- gentle-ai:session-start-skill -->` block and is the file delegating agents read at
session start, which is the spec's "where delegators already look". Not a new document, per
the change's success criterion. The command itself is already stated inside the registry
file's own header (`.atl/skill-registry.md:3`:
`gentle-ai skill-registry refresh --force`); the AGENTS.md line exists for the fresh-clone
case where the file is absent and its self-documentation is therefore unreachable.

**Untouched:** the skill-resolution protocol (engram primary, local file fallback), the
registry's content, and `gentle-ai` itself.

### ADR-009 — `git push origin dev:main` is compatible with the release flow; no checkout of `main` is required anywhere

**Status:** accepted. Resolves proposal open decision 5. **Verified against
`.agents/skills/nn-dev-release/SKILL.md` Option [c] and `nn-dev-development` §4e.**

Walking the release flow step by step from a `dev` checkout:

| Release step | From a `dev` checkout | Verdict |
| :-- | :-- | :-- |
| 0. Clean-tree precondition (`iNNfo/**/package.json` unmodified) | Unchanged — this guards `generate-manifest.js` reading the working tree (expediente 2026-09-08), not the merge | **Still required.** `dev:main` does not relax it. |
| 1-3. Bump versions, rebuild bundles, update `manifest/source.yaml` | Ordinary edits on `dev` | OK |
| 4. `check-parity` → precise `git add` → commit → `git push origin main` | Becomes `git push origin dev:main` | OK |
| 5. `git tag <name>` → `git push origin <tag>` | `git tag` tags `dev`'s HEAD, which **is** `origin/main`'s tip after the step-4 fast-forward, so the tag is main-reachable and `validate-manifest.js`'s "reachable from `main`" rule passes | OK **with one constraint** (below) |
| 6. `generate-manifest.js` / `validate-manifest.js` | Read the working tree plus the network; branch-independent | OK |
| 7. Commit the pin → `git push origin main` | Becomes `git push origin dev:main` | OK |

**Answer to the spec's question:** there is **no point in the release flow that requires a
real checkout of `main`.** Two constraints replace it, and both must be documented with the
technique:

1. **Tag immediately after the `dev:main` push, before any further commit on `dev`.** If
   `dev` has advanced, tag the exact merged commit explicitly:
   `git tag <name> $(git rev-parse origin/main)`. Otherwise the tag lands on a `dev`-only
   commit, `validate-manifest.js` rejects the diverged tip, and the stable channel goes
   red — the failure mode `nn-dev-release` step 0 already warns about, reached by a new
   route.
2. **`main` must be an ancestor of `dev`.** `git push origin dev:main` is a fast-forward
   push; if a sibling agent advanced `main` independently, the server **rejects it
   non-destructively** (no partial state, no dirty checkout, nothing to recover). Recovery
   is `git fetch origin && git merge origin/main` *on `dev`* — still no checkout of `main`.
   This rejection is a feature: it is the same safety the `--ff-only` in the old dance
   provided, enforced server-side instead of locally.

**Why this replaces the documented dance.** `switch main → pull → merge --ff-only → push →
switch dev` requires a clean working tree to switch branches. This repo's tree is
demonstrably never clean — 71 foreign uncommitted paths during the session that wrote the
proposal, and `concurrent-sessions-share-working-tree.md` says why that is structural. A
documented procedure whose first step is impossible is a procedure people improvise around.
`dev:main` never touches the working tree at all, which makes the safe path cheaper than the
unsafe one — the only intervention in F5 that changes an incentive rather than adding a
sentence.

**Stated limitation.** If branch protection requiring PRs or status checks is ever enabled
on `main`, `dev:main` is rejected. It is not enabled today (direct pushes to `main` are the
documented flow at `nn-dev-development` §4e), so the technique is compatible as of this
change. This sentence goes in the skill text so the failure is legible if it ever occurs.

### ADR-010 — Slices are independent commits on `dev`, not branch-stacked PRs

**Status:** accepted.

`chain_strategy` is `stacked-to-main`, but this repo's documented workflow has **no
per-change PRs**: `nn-dev-development` §4e states plainly that single-branch working
"replaces the old commit + push + PR flow — `main` absorbs the batch instead"
(`single-dev-branch-workflow.md`). Inventing five feature branches to satisfy a chain
vocabulary would contradict the repo's own convention in a change whose subject is
respecting the repo's own conventions.

**Mapping:** each slice is one self-contained, independently revertible commit on `dev`,
landing in the order of §7. The "chain" is the commit sequence; the "merge to main" is the
existing batched `dev → main` fast-forward. Each commit is independently verifiable
(§6) and independently revertible (proposal Rollback). If the maintainer later wants
review-sized PRs, any slice can be cherry-picked onto a branch without touching the others —
guaranteed by the zero file overlap in §7.

## 3. Components and data flow

### Pre-push gate (F1)

```
developer: git push
   └─> git reads core.hooksPath (= .githooks, set by npm `prepare`)
        └─> .githooks/pre-push   [cwd = repo root, guaranteed by git]
             └─> npm run typecheck
                  ├─> innfo-core build
                  ├─> innfo-mcp  vue-tsc/tsc --noEmit
                  └─> innfo-editor vue-tsc --noEmit
                        exit 0 -> push proceeds
                        exit N -> git aborts the push, stderr shows the compiler output
                                  + one line naming `git push --no-verify` as the bypass
```

New files: `.githooks/pre-push` (mode 100755). Modified: root `package.json` (one
`prepare` line), `README.md` (one line for humans: the hook exists, what it runs, how to
bypass, how to uninstall).

### `dev` coherence signal (F2)

```
push to dev
   └─> .github/workflows/ci.yml : job `verify`
        ├─> npm ci ; npm ci --prefix skills/nn-trannsform ; npm run build:docs
        ├─> node scripts/verify.js            (no --release on dev; unchanged)
        └─> [NEW] if push && ref == dev, continue-on-error:
              node scripts/manifest/validate-manifest.js --channel stable
                 └─> checkTemplateMainCoherence()
                      ├─ GET raw.githubusercontent.com/<repo>/<pinned-commit>/<path>
                      └─ GET raw.githubusercontent.com/<repo>/main/<path>
                          differ -> step ✗ + annotation ; job conclusion stays success
```

Zero local filesystem reads, hence identical results from `dev` or `main` — the delta
spec's branch-independence scenario, confirmed by inspection of
`scripts/manifest/lib/manifest-rules.js`.

Modified: `.github/workflows/ci.yml` only. `scripts/verify.js` untouched.

### `level` normalization (F4)

```
*.md  ──> parseFrontmatter()            [parser/yaml.ts]
            └─> NORMALIZERS[] ... + normalizeLevel   [NEW, appended]
                  └─> SpecFrontmatter { level: number }
                        ├─> parseModel (parser/core.ts:89)
                        │     └─> recursiveParser/model.ts     [ADR-006 presence check]
                        ├─> innfo-mcp validate.ts:652, apply-change.ts:326
                        └─> innfo-core validator/content.ts, merge.ts:151

skills/nn-preflight/**  ──> lib/yaml-lite  [SEPARATE PARSER — not downstream, ADR-007]
```

Modified: `parser/yaml.ts` (+1 function, +1 array entry), `recursiveParser/model.ts`
(1 line), `preflight-check.js` (2 dead sub-expressions deleted),
`tests/parser-standard.test.ts` (+1 test), `preflight-check.test.js` (+1 case).

### Untracking (F3) and documentation (F5)

No runtime flow. F3 is a git index operation plus one `AGENTS.md` line. F5 is skill text in
`.agents/skills/nn-dev-release/SKILL.md` and `.agents/skills/nn-dev-development/SKILL.md`.

## 4. Integration points

| Touched | Kind | Risk if wrong |
| :-- | :-- | :-- |
| root `package.json` `scripts.prepare` | new key | `npm ci` fails in CI if `git` is unavailable in the install context. Mitigated by: every install context here is an `actions/checkout` or a developer clone. |
| `.github/workflows/ci.yml` `verify` job | +1 step | Malformed YAML breaks all CI. Verified by the first `dev` push. |
| `parser/yaml.ts` `NORMALIZERS` | +1 entry, appended last | Order-independent: no other normalizer reads or writes `level`. Verified by inspection of all eight. |
| `recursiveParser/model.ts:53` | 1 line | Covered by `tests/recursive-parser.test.ts`. |
| `preflight-check.js:546-547` | dead-code deletion | Covered by `preflight-check.test.js`, itself run by `verify.js`. |
| git index (`.atl/skill-registry.md`) | `--cached` removal | File stays on disk; local skill-path injection reads the filesystem and is unaffected. |
| `.agents/skills/nn-dev-{release,development}/SKILL.md` | prose | Maintainer-only skills, not distributed, not in `manifest/source.yaml` — no template-inventory or immutability guard applies. |

**Deliberately not touched:** `scripts/verify.js`, `scripts/manifest/**`, `.gitignore`,
`iNNfo/specs/**`, `manifest/source.yaml`, and every path in the concurrent session's
in-flight OpenSpec archive move.

## 5. Concurrency constraint on execution

71 uncommitted paths in the tree belong to a concurrent session. Every slice in this change
touches a disjoint, named file set (§7). Implementation must stage those named paths
explicitly and never `git add -A` / `git add .` (`nn-dev-development` Core Rule 6). F3's
`git rm --cached` is the only index-mutating operation and it names a single path.

## 6. Verification strategy (Strict TDD Mode)

Test runner: `npm run verify` (`npm run typecheck && npm test`).

Only **one slice contains testable logic**. Stating that plainly is more useful than
manufacturing tests that assert a config file contains the text it was just written to
contain — a tautology test passes the moment the file is saved and fails only when someone
renames a key, which is not the risk any of these slices carry.

| Slice | TDD-eligible | How it is verified |
| :-- | :-- | :-- |
| 1 — `ci-stable-manifest-on-dev` | **No** | The artifact *is* test infrastructure. Falsification procedure: push to `dev`; the step must appear, execute `validate-manifest.js --channel stable`, and — given the currently-coherent pin state, confirmed `OK: [stable] 8 skills, 15 templates, 1 mcp bundles, 1 console assets validated` this session — pass. Negative case: the `templates-v0.5.1` incident shape is the natural negative, reproducible by pinning to a stale tag in a scratch branch; not worth seeding deliberately. A test asserting `ci.yml` contains the step string is tautological and is **not** written. |
| 2 — `native-pre-push-hook` | **No** | Named manual falsification, run once at implementation and recorded in the commit body: (a) fresh `npm install` → `git config core.hooksPath` prints `.githooks`; (b) introduce a deliberate type error → `git push` is **blocked** and the compiler output is visible; (c) same state → `git push --no-verify` **succeeds**; (d) revert the error → `git push` succeeds. Step (b) is the one that matters: it is the only proof the hook is wired, executable, and non-vacuous. An automated equivalent would have to spawn a real push against a real remote — a heavier, flakier apparatus than the thing it tests. |
| 3 — `normalize-frontmatter-level` | **Yes** | Full RED→GREEN. See below. |
| 4 — `untrack-skill-registry` | **No** | One-shot git index operation. Verified by `git ls-files .atl/` returning empty, `Test-Path .atl/skill-registry.md` returning true, and the path being absent from `git status`. No logic exists to test. |
| 5 — `safe-ff-merge-technique` | **No** | Documentation. Verified by a reviewer executing `git push origin dev:main` on the next real batch and confirming the documented behaviour (tree untouched, no checkout, ff semantics, tag-order constraint). Per the delta spec's own verification note. |

### Slice 3 — the TDD cycle

**RED (write first, must fail):** in `iNNfo/packages/innfo-core/tests/parser-standard.test.ts`

1. `level: "2"` → `parseFrontmatter(...).level` is the number `2`. *(fails today: `"2"`)*
2. `level: 2` → number `2`. *(passes today — the no-op regression guard for the 200+ corpus form)*
3. `level: "abc"` → unchanged string `"abc"`; does not throw.
4. `level: ""` → unchanged `""`, **not** `0`.
5. `level: "2.5"` → unchanged string `"2.5"`.
6. no `level` key → `'level' in fm` is false.

Cases 3-6 pin the contract boundaries from ADR-005 and are the ones that would catch a
naive `Number(fm.level)` implementation.

**RED (second file):** in `skills/nn-preflight/scripts/preflight-check.test.js`, a case
asserting a `level: 1` file is skipped by the template walk. This **passes before and
after** the ADR-007 edit — that is the point: it is the guard proving the numeric deletion
was genuinely dead. It is added *before* the deletion so its pre-existing green is
observed, not assumed.

**GREEN:** add `normalizeLevel` + the `NORMALIZERS` entry; apply ADR-006 to
`model.ts:53`; delete the two dead sub-expressions per ADR-007.

**REFACTOR / regression surface:** `npm run verify` green, with specific attention to
`tests/roundtrip-fidelity.test.ts` (corpus byte-fidelity, ADR-005), `tests/recursive-parser.test.ts`
(ADR-006), and `node scripts/verify.js` step at `:163` (preflight, ADR-007).

## 7. Slices, order, and independence

Landing order (proposal ranking, unchanged): **F2 → F1 → F4 → F3 → F5**.

| # | Slice | Files touched | Est. |
| :-- | :-- | :-- | :-- |
| 1 | `ci-stable-manifest-on-dev` (F2) | `.github/workflows/ci.yml` | ~8 lines |
| 2 | `native-pre-push-hook` (F1) | `.githooks/pre-push` (new), `package.json`, `README.md` | ~20 lines |
| 3 | `normalize-frontmatter-level` (F4) | `parser/yaml.ts`, `recursiveParser/model.ts`, `preflight-check.js`, `tests/parser-standard.test.ts`, `preflight-check.test.js` | net ≈ +30 (mostly test) |
| 4 | `untrack-skill-registry` (F3) | git index, `AGENTS.md` | 1 line + 1 index op |
| 5 | `safe-ff-merge-technique` (F5) | `.agents/skills/nn-dev-release/SKILL.md`, `.agents/skills/nn-dev-development/SKILL.md` | ~10 lines |

**Dependency order: there is none.** The file sets above are pairwise disjoint — no two
slices touch the same file. Nothing in slice N reads, imports, or configures anything slice
N-1 produced. The ordering is **value ordering, not dependency ordering**, and any slice may
ship, stall, or revert alone.

Two soft sequencing preferences, neither blocking:

- **2 before 3.** Slice 3 is a typecheck-relevant edit across two packages and makes an
  excellent first live exercise of the hook installed by slice 2. Convenience only.
- **1 first.** It is the cheapest slice and the only one whose failure mode is user-facing
  (red `main` + skipped Pages deploy). Getting the signal on early costs ~8 lines.

Total changed lines are far under 400. No `size:exception` is needed.

## 8. Cut from scope (ponytail)

Each of these was considered and dropped. Listing them is the point: an unlisted
simplification is an argument waiting to be relitigated.

| Cut | Why |
| :-- | :-- |
| `husky` / `lint-staged` | `git config core.hooksPath .githooks` + a tracked shell script is the entire feature. A dependency here would exist only to run a `git config` we can run ourselves in one line. Nothing native fails to do the job. |
| A `hooks:install` script alongside `prepare` | Two mechanisms for one outcome, plus documentation about which one you are on (ADR-002). |
| `.gitignore` entry for `.atl/skill-registry.md` | Already covered by `.atl/` at `.gitignore:62` (ADR-008). Adding a narrower duplicate rule is noise. |
| A dedicated CI job for the `dev` manifest check | A step with an `if:` produces the same signal without a second checkout and a second `npm ci` (ADR-004). |
| Widening `ci.yml:47`'s `--release` condition to `dev` | Blocking on `dev` *and* it would abort `verify.js` before steps 10-13 (ADR-004). |
| Modifying `scripts/verify.js` | Would make the default local verify path network-dependent, making the pre-push hook flaky and offline-hostile. |
| stdin parsing in the hook to skip tag pushes | ~100s saved a few times a month, in exchange for a silent-skip failure mode inside the guardrail. Upgrade path recorded as a `ponytail:` comment in the hook (ADR-001). |
| A `pre-commit` hook | Already a proposal non-goal. It catches nothing the push gate does not, at much higher friction. |
| Any `--no-verify` detection, logging, or counter | ADR-003. Policing the escape hatch is how you lose the gate. |
| Deleting `preflight-check.js`'s string comparisons | Would break preflight — separate parser, strings are the live branch (ADR-007). |
| Migrating `preflight-check.js` onto innfo-core's parser | Imports a build-order dependency into a deliberately zero-dependency bootstrap script (ADR-007). |
| Range validation / rejection / schema layer for `level` | Coerce-only. Zero corpus evidence of out-of-range values (ADR-005). |
| Normalizing any frontmatter field other than `level` | Exactly one field has a documented failure. Eight normalizers already exist; this adds the ninth, not a framework. |
| Tests asserting `ci.yml` / `.githooks/pre-push` contain their own text | Tautological. Pass on save, fail only on rename (§6). |
| Any new skill, document, or convention about worktrees | The hazard already has four documents and recurred anyway. A fifth is the failure mode restating itself. |
| Any hook or script classifying working-tree paths as "foreign" or "stale" | Attribution is undecidable from git alone (`nn-dev-development` §1f). A false-positive farm here would also poison the F1 hook sitting in the same place. |
| Pre-merge (PR-time) prevention of pin/`main` drift | Custom code. Deferred until detection proves insufficient (proposal non-goal). |
| Resolving the concurrent session's in-flight OpenSpec archive move | Not ours to touch. |

## 9. Spec amendments required

`sdd-tasks` must carry these forward; two published artifacts are now known to be wrong.

1. **`specs/normalize-frontmatter-level/spec.md`, scenario "`preflight-check.js` no longer
   re-checks `level`'s type"** — instructs removing the `=== 1 || === '1'` /
   `=== 2 || === '2'` comparisons wholesale. Per ADR-007 only the **numeric halves** are
   removed. The scenario must be rewritten to: the dead numeric comparisons are removed,
   the string comparisons are retained, and the stated reason is that `preflight-check.js`
   parses with `lib/yaml-lite`, not with innfo-core's `parseFrontmatter`.
2. **`proposal.md` success criterion** — "`grep` for `level === '1'` / `'2'` / `'3'` and
   `typeof fm.level` returns zero hits outside the single normalizer" is unachievable and
   undesirable. Amended to: zero hits **inside innfo-core / innfo-mcp / innfo-editor**; the
   two `preflight-check.js` string comparisons are expected, correct, and documented as
   belonging to a separate parser.
3. **`specs/untrack-skill-registry/spec.md`, scenario "The file is gitignored going
   forward"** — its requirement is already satisfied by `.gitignore:62` (`.atl/`). No
   `.gitignore` edit ships. The scenario's *assertion* (never appears in a diff again) still
   holds and is still verified; only its implied implementation step is dropped (ADR-008).
4. **`specs/native-pre-push-hook/spec.md`** — its own design note asks to be updated once
   the install mechanism is chosen. ADR-002 chose the automatic `prepare` path, which is the
   path the spec already assumed. **No change needed.**

## 10. Residual risks

| Risk | Severity | Handling |
| :-- | :-- | :-- |
| 25s pre-push still breeds habitual `--no-verify` | Medium | Cheapest command that catches the incident (ADR-001); revisit only with evidence, and revisit downward (12s editor-only), never upward. |
| The hook ships non-executable or CRLF-terminated and silently never runs | **Medium-high** | The single most likely way slice 2 ships looking correct and doing nothing. `git update-index --chmod=+x` at creation, LF line endings, and manual falsification step (b) in §6 is mandatory, not optional. |
| `continue-on-error` red X is habituated to and ignored | Medium | Inherent to a detection-only signal, and honest: the alternative (blocking) reddens `dev` for release windows that are not the developer's fault. If it is ignored in practice, that is evidence *for* building PR-time prevention, which is the deferred escalation. |
| `prepare` fails in an install context without `git` | Low | No such context exists today (all installs are `actions/checkout` or developer clones). No `|| true` guard added, because that would also silence a legitimately broken install. |
| `normalizeLevel` changes behaviour for an input nobody writes | Low | Corpus: 200+ unquoted, 0 quoted. Round-trip fidelity preserved by `rawFrontmatter` capture; guarded by six contract tests plus the corpus round-trip suite. |
| Tag cut after `dev` advances past the merged commit → diverged tip → red stable channel | Medium | ADR-009 constraint 1 must appear in the skill text with the explicit `git tag <name> $(git rev-parse origin/main)` form, not as an aside. |
| Branch protection later enabled on `main` breaks `dev:main` | Low | Stated in the skill text so the failure is legible; not enabled today. |
| Concurrent-session tree hazard is mistaken for solved | Medium | It is not solved. F5 ships one incentive change (the safe path becomes cheaper than the unsafe one) and nothing else. The hazard remains open and workflow-level. |
| Slices 1, 2, 4, 5 carry no automated test | Accepted | Stated plainly in §6 with a named falsification procedure for each, rather than papered over with tautology tests. |
