# Proposal: Repo Guardrails Hardening

## Intent

This repository's safety mechanisms are **advisory where they need to be executable**.

The repo already owns a rich advisory layer: skills (`pre-commit-hygiene-gate`, `nn-dev-development`,
`using-git-worktrees`, `git-worktree-isolation`), persistent memory expedientes, and written
conventions. It also already owns the executable primitives that would enforce them —
`npm run verify`, `npm run typecheck`, `scripts/verify.js`, `scripts/manifest/validate-manifest.js`,
a CI workflow. What is missing is the wiring between the two: **nothing runs the executable
primitives at the moment a mistake leaves the developer's machine.**

Five incidents, all confirmed empirically this session, are five faces of that one gap:

| # | Face of the gap | What it cost |
| :-- | :-- | :-- |
| F1 | No git hooks at all; `npm run verify` is wired to nothing local | A `vue-tsc` type error (`2c11ecf`) sat unpushed 3 days; CI went red on push, found by accident |
| F2 | `dev` CI ≠ `main` CI (`--release` is main-push-only) | Green `dev` does not imply green `main`; already broke `main` once (templates-v0.5.1, PRs #86/#87) and skipped the Pages deploy |
| F3 | `.atl/skill-registry.md` is tracked but machine-generated with absolute local paths | 80-insert/80-delete zero-semantic diffs; the repo violates its own stated hygiene rule via its own file |
| F4 | `frontmatter.level` has three incompatible defenses and no boundary normalizer | The TS2367 dead comparison that produced the F1 incident |
| F5 | Concurrent AI sessions share one working tree | 71 foreign uncommitted paths mid-session; a half-done OpenSpec archive move stale since 2026-09-17 |

**The success condition is not "more guardrails". It is: every mechanism this change touches ends
up either executable or deleted.** An advisory mechanism that has already failed twice does not get
a third restatement.

## Ranking (revised — this overrides the suggested order)

The exploration handoff proposed **F1, F3 → F2 → F4 → F5**. Evidence collected while writing this
proposal supports a different order, and the reason is F2's actual cost/benefit:

1. **F2 — one line of YAML, prevents the only failure in the chain that reaches production.**
   Confirmed at `scripts/manifest/lib/manifest-rules.js:249-250`: the coherence check fetches
   `raw.githubusercontent.com/<repo>/<pinned-commit>/...` and `.../main/...`. It is **network-driven
   and branch-independent** — the answer it gives is identical whether it runs from `dev` CI or
   `main` CI, because neither reads the local checkout. Cost to enable on `dev` is comparable to F3;
   impact (red `main` + skipped Pages deploy = user-facing) is the highest in the set. It goes first.
2. **F1 — the guardrail whose absence produced the incident chain.** Medium cost, high leverage,
   zero new dependencies (see Approach).
3. **F4 — a net-deletion root-cause fix.** Removes code, adds one normalizer and one test.
4. **F3 — real but harmless noise.** Demoted from first place: 80 lines of path churn is annoying,
   never wrong. Also, our chosen fix direction changed on discovery (below), which makes it cheaper
   than first estimated but also lower-stakes.
5. **F5 — highest cost, most recidivist, and largely not solvable in repo code.** Mostly a non-goal
   here; see its section for the honest reckoning.

## Scope by finding

### F2 — Make `dev` CI tell the truth about `main`

**In scope**
- Run the stable-manifest validation on `dev` pushes as well, so pin/main drift surfaces within one
  push instead of being discovered by accident after merge.

**Approach (ponytail):** do **not** touch `scripts/verify.js`'s `--release` gate. That gate is
correct for the *local* path — step 9 is the only network-dependent step, and making
`npm run verify` require network would make the F1 pre-push hook flaky and offline-hostile. The
minimal change is in `.github/workflows/ci.yml`: one additional step (or a widened condition on
line 47) that invokes the existing `node scripts/manifest/validate-manifest.js --channel stable`
on `dev` pushes. No new script, no new dependency, no change to verify.js's contract.

**Honest limitation, stated up front:** because the check compares the pin against *remote* `main`,
drift only becomes detectable **after** the offending merge lands on `main`. Running it on `dev`
converts "main is red and nobody knows" into "the next `dev` push is red" — detection, not
prevention. True pre-merge prevention would require evaluating the PR merge result, which is
custom code this proposal declines to write until detection proves insufficient.

**Non-goals**
- Prevention at PR time (deferred, explicitly).
- Removing or relaxing the `--release` gate for local `npm run verify`.
- Any change to the release ordering convention (merge → tag → pin).

### F1 — One executable local gate, at push, with zero new dependencies

**In scope**
- A tracked hook directory wired via native git (`core.hooksPath`), installed by an npm `prepare`
  script so a fresh `npm install` sets it up.
- A single `pre-push` hook running an existing npm script.

**Approach (ponytail):** three deliberate rejections.

1. **No husky, no lint-staged.** `git config core.hooksPath .githooks` plus a tracked shell script
   is the whole feature. `prepare` is a native npm lifecycle hook. Zero dependencies added.
2. **`pre-push`, not `pre-commit`.** The exploration framed this as a pre-commit problem and worried
   that ~90s of `npm test` would drive people to `--no-verify`. That worry is real but the framing
   is wrong: the incident was *not* a bad commit — it was a bad commit **that reached CI**. Push is
   the boundary where CI becomes involved, pushes are far rarer than commits, and a push is allowed
   to take a minute. Gating commits buys nothing the push gate does not, at much higher friction.
3. **`--no-verify` stays available and unpoliced.** An escape hatch without a lock is the difference
   between a gate people keep and a gate people uninstall.

**Non-goals**
- A pre-commit hook of any kind.
- Attempting to detect or block `--no-verify`.
- Replacing, deprecating, or rewriting the `pre-commit-hygiene-gate` skill. It keeps its advisory
  job for AI sessions; the hook covers the human and skill-skipping paths it never could.
- Formatting, linting, or commit-message validation. Not the incident, not in scope.

### F4 — Normalize `level` at the boundary, delete the three defenses

**In scope**
- Add a `normalizeLevel` to the `NORMALIZERS` array at
  `iNNfo/packages/innfo-core/src/parser/yaml.ts:194-203`, coercing `level` to `number` once, at the
  single point where all consumers' data enters.
- Delete the downstream improvisations:
  - `skills/nn-preflight/scripts/preflight-check.js:546-547` (`=== 1 || === '1'`, `=== 2 || === '2'`)
  - `iNNfo/packages/innfo-core/src/recursiveParser/model.ts:53` (`typeof fm.level === 'number'`)
  - (`recursiveEditor`/`recursiveSerializer.ts:248` already fixed in `39b2af7`.)
- One test asserting a quoted `level: "2"` parses to the number `2`.

**Rationale:** this is the ponytail bug-fix rule verbatim — one guard in the shared function is a
smaller diff than a guard in every caller, and patching only the caller the ticket named leaves the
siblings broken. `SpecLevel` is declared as `0 | 1 | 2 | 3` at
`iNNfo/packages/innfo-core/src/types/parser.ts:35`; the type already claims the invariant, nothing
enforces it, and each consumer paid for that separately. Corpus evidence: 200+ unquoted `level: N`,
zero quoted — so the three defenses are cargo cult *today*, but the normalizer is what makes the
declared type honest and lets all three be deleted safely.

**Non-goals**
- Normalizing any other frontmatter field. Eight normalizers already exist; this adds exactly one,
  for the field with a documented failure.
- Runtime validation/rejection of out-of-range levels, or a schema-validation layer. Coerce, do not
  validate — no evidence of an out-of-range level in the corpus.

### F3 — Stop tracking a machine-generated file

**In scope**
- Untrack `.atl/skill-registry.md`, add it to `.gitignore`, and document the one-command
  regeneration in the place delegators already look.

**Approach (ponytail) — and a discovery that settles the open direction:** the exploration offered
two options, "make the generator emit `~`-relative paths" or "untrack and generate on demand". The
file's own header (`.atl/skill-registry.md:3`) resolves it: *"Auto-generated by gentle-ai
skill-registry refresh"*. **The generator is an external tool we do not own.** Option one is a
feature request against someone else's binary plus an indefinite wait; option two is a `git rm
--cached` and a `.gitignore` line. Deletion over addition.

The stated objection — subagent skill-path injection depends on this file being readable — does not
survive contact: injection reads the file from the **local filesystem**, which works identically
whether or not git tracks it, and the orchestrator protocol already specifies an engram
`skill-registry` lookup as the primary source with the file as fallback. An untracked, locally
generated registry is strictly more correct, because its absolute paths are only ever valid on the
machine that generated them.

**Non-goals**
- Patching, wrapping, or post-processing `gentle-ai` output.
- Committing a sanitized or path-relativized copy (that is option one wearing a hat).
- Changing the registry's content, contract, or the skill-resolution protocol.

### F5 — Concurrent sessions: mostly a non-goal, and saying so is the point

**Recommended: drop from this change's implementation scope.**

The evidence forces this. The repo already has `using-git-worktrees`, `git-worktree-isolation`,
`.agents/skills/nn-dev-development/SKILL.md` (whose *stated job* is exactly this hazard, complete
with a stale-dirty-tree rule and a session-claim protocol), and a memory expediente
`concurrent-sessions-share-working-tree.md`. The hazard recurred anyway, twice, and recurred
**live during the session that wrote this proposal**. A sixth document is not a control; it is the
failure mode restating itself.

The structural question — *why is the safe path not the default path?* — has an uncomfortable
answer: agents are launched into the repo root by their harnesses, and nothing in this repository
can change where an external tool sets its `cwd`. **This is a workflow problem, not a repo-code
problem, and this proposal will not pretend otherwise.**

**In scope (the only executable residue worth keeping):**
- Record the safe-merge technique confirmed today in `nn-dev-release` / `nn-dev-development`:
  `git push origin dev:main` performs a **server-side fast-forward and never checks out `main`**, so
  a dirty working tree is left untouched. This replaces the current documented
  `switch main → pull → merge --ff-only → push → switch dev` dance, which requires a clean tree the
  repo demonstrably never has. One or two lines, and it is the one change that makes the safe path
  cheaper than the unsafe one.

**Non-goals**
- Any new skill, document, or convention about worktrees.
- Any hook or script that inspects the tree for "foreign" paths and blocks on them. Attribution is
  undecidable from git alone (expediente `1f` in `nn-dev-development` already documents the
  stale-WIP vs foreign-agent ambiguity), so such a hook is a false-positive farm that trains people
  to bypass it — which would also undermine F1's hook, sitting in the same place.
- Resolving the in-flight OpenSpec archive move currently dirtying the tree. Not ours to touch.

## Delivery: five independent stacked-to-main slices

The five concerns share a theme, not a dependency. A pre-push hook does not depend on the `level`
normalizer; untracking the registry does not depend on CI. Each ships alone, each is independently
revertible, none blocks another.

| PR | Slice | Scope sketch | Est. |
| :-- | :-- | :-- | :-- |
| 1 | `ci-stable-manifest-on-dev` (F2) | `.github/workflows/ci.yml` | ~5 lines |
| 2 | `native-pre-push-hook` (F1) | `.githooks/pre-push`, `package.json` `prepare`, short README note | ~30 lines |
| 3 | `normalize-frontmatter-level` (F4) | `parser/yaml.ts` +normalizer, 2 deletions, 1 test | net ≈ 0 |
| 4 | `untrack-skill-registry` (F3) | `git rm --cached`, `.gitignore`, 1 doc line | ~3 lines + 1 deletion |
| 5 | `safe-ff-merge-technique` (F5 residue) | `nn-dev-release` / `nn-dev-development` skill text | ~5 lines |

Total well under any changed-line budget; no slice needs a size exception. Recommended merge order
is the ranking above. Because they are independent, a slice that stalls in review does not hold the
others.

Per strict TDD: PR 3 is the only slice with testable logic and leads with its failing test. PRs 1,
2, 4, 5 are configuration/wiring — their verification is that `npm run verify` stays green and the
hook/CI step demonstrably fires and demonstrably fails on a seeded bad input.

## Open decisions for `sdd-design` (do not silently choose)

1. **F1 — what exactly does `pre-push` run?** `npm run typecheck` (~10s for the editor workspace
   alone; the root script also builds `innfo-core` first) is the minimum that would have caught
   `2c11ecf`. `npm run verify` (~90s, 698 tests) is what CI runs. Cheapest-that-catches-the-incident
   vs. parity-with-CI is a real fork with a real friction tradeoff. Decide, with a measured number.
2. **F1 — hook installation on a fresh clone.** `prepare` runs on `npm install`, but a contributor
   who never runs `npm install` at the root has no hook, and `prepare` silently reconfigures the
   user's git for anyone who installs. Acceptable, or opt-in via an explicit
   `npm run hooks:install`?
3. **F2 — does the `dev` run gate the build?** Making the new CI step blocking on `dev` means a
   legitimately-unreleased pin state could redden `dev`. Blocking, or report-only with a visible
   annotation? The release-ordering comment at `scripts/verify.js:213-217` claims the failure window
   exists; this proposal found no instance of it. Verify the claim before choosing.
4. **F4 — coerce or reject on a non-numeric `level`?** Proposal recommends coerce-only. Confirm, and
   decide what `normalizeLevel` does with a value that is neither number nor numeric string
   (leave as-is vs. delete the key).
5. **F5 — is `git push origin dev:main` compatible with the release flow?** It never checks out
   `main`, which is the point, but the release flow also tags and re-pins. Confirm the tag/pin steps
   still work from a `dev` checkout, or document the one point where a real checkout is required.

## Risks

| Risk | Severity | Mitigation |
| :-- | :-- | :-- |
| `pre-push` friction drives habitual `--no-verify`, leaving the repo worse than before | Medium | Push-scoped not commit-scoped; measure the runtime before choosing the command (open decision 1) |
| Enabling the stable check on `dev` reddens `dev` for a legitimate pre-tag pin state | Medium | Open decision 3; verify the window is real before making it blocking |
| Untracking the skill registry breaks a delegator that assumed a tracked file | Low | Engram `skill-registry` is already the documented primary source; local file still generated on demand |
| `normalizeLevel` changes behavior for an input nobody actually writes | Low | Corpus evidence: 200+ unquoted, 0 quoted; the change is provably a no-op on real data, guarded by one test |
| F5 residue is mistaken for having "solved" the concurrency hazard | Medium | This proposal states explicitly that it does not. The hazard remains open and workflow-level |

## Rollback

Each slice reverts independently: delete `.githooks/` and the `prepare` line (git falls back to
`.git/hooks/`); revert the CI step; revert the normalizer commit; re-add the registry file to git;
revert the skill text. No data migration, no build-artifact change, nothing irreversible.

## Success criteria

- [ ] A type error like `2c11ecf` cannot leave a developer's machine without an explicit
      `--no-verify`.
- [ ] A pin/`main` coherence break is visible on a `dev` run, not discovered by accident on `main`.
- [ ] `.atl/skill-registry.md` no longer appears in any diff.
- [ ] `grep` for `level === '1'` / `'2'` / `'3'` and `typeof fm.level` returns zero hits outside the
      single normalizer.
- [ ] Zero new runtime or dev dependencies added by this change.
- [ ] No new advisory document is created by this change.
