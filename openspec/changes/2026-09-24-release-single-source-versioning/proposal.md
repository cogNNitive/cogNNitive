# Proposal: One Source of Truth Per Version, Derived Refs

## Recommendation up front

**Build the in-house derivation. Do not adopt `release-please`.**

`release-please` was investigated seriously and it is the better tool *in the abstract*: merging its
release PR cuts the tag, which structurally eliminates this repo's `merge → tag → pin` ordering
constraint — the single defect no in-house generator can remove. It loses anyway, on a verified
mismatch rather than on taste: **it cannot express the version model of 18 of this repo's 26
distributed artifacts.** Section "The tool that does not fit" carries the evidence.

The change is therefore small and boring: extend the generator + `--check` pattern this repo already
runs six times in `scripts/verify.js` to the two version sites that are still hand-copied, and
compute `channels.stable.refs[].ref` from a number instead of typing it. Net effect on machinery:
**one script gains targets, one 89-line validator becomes deletable, zero dependencies added.**

## Intent

### The problem is a normalization failure, not error-prone tagging

"Tagging is error-prone" is the symptom report. The defect is that a version-shaped fact is stored in
up to six places and the repo's response has been, nine times, to add a comparison between them.

| Artifact | Version sites today | Authored | Hand-copied (the defect) | Generated |
| :-- | :-- | :-- | :-- | :-- |
| Skills (×8) | 2 each | `skills/<name>/SKILL.md` frontmatter (`nn-start/SKILL.md:5` → `V_3-4-0`) | `manifest/source.yaml` `skills[].version` (`:8,14,21,34,41,47,53,59`) | — |
| Templates (×18) | 4 each | `spec_NN.md` frontmatter `template_version` | — | `source.yaml`, `samples.ts` `SHIPPED_TEMPLATE_VERSIONS`, `catalog.json` |
| innfo-mcp | **6**, enumerated by `scripts/lib/version-square.js:23-86` | `iNNfo/packages/innfo-mcp/package.json` | core `package.json`, the `^v` dep range, `docs/innfo/cdn/manifest.json` `latest`, `source.yaml` mcp `version` (`:29`), `source.yaml` stable ref (`:209`) | — |
| innfo-console | 2 (was 4; 2 deleted today in `855415b`) | `source.yaml` `console_assets[].version` (`:177`) | `source.yaml` stable ref (`:212`) | — |
| Channel refs (×4) | 1 each | `channels.stable.refs[].ref` — the tag string, e.g. `skills-v2.1.0` (`:203`) | — | — |

**Templates are the proof the fix works.** `scripts/sync-template-versions.mjs` already writes
`source.yaml` and `samples.ts` from the `spec_NN.md` frontmatter, `scripts/template-catalog.mjs`
already writes `catalog.json`, and both are gated by `--check` in `verify.js:229,215`. Three of the
four template sites are *generated*, so they cannot drift. Nobody added a "template version square".
The same pattern was simply never extended to skills or to the MCP.

### The asymmetry that keeps producing guards

| Half of the release | State |
| :-- | :-- |
| **Verify** | 15+ blocking guards in `scripts/verify.js` (14 `run()` calls + inline checks) |
| **Mutate** (bump, tag, repin) | **zero automation** |

Verified: no `release`/`tag`/`bump`/`version` npm script; no executable `git tag` under `scripts/`
(the one grep hit is a comment at `scripts/guard-template-immutability.js:25`);
`.github/workflows/` holds exactly one file and has **no `on: push: tags:` trigger** — CI never
reacts to a tag. `.agents/skills/nn-dev-release/SKILL.md` documents a single-artifact release as 8
ordered, mutually blocking steps.

You cannot verify your way out of a manual process. Guards scale with the number of duplication
sites; removing a duplication site is a fixed, one-time cost.

### Nine incidents, one shape

`openspec/changes/archive/` (91 entries) contains nine prior attempts at exactly this problem:
`migrate-release-manifest`, `2026-09-03-manifest-release-integrity`,
`2026-09-05-monorepo-release-workflow-and-parity-guards`,
`2026-09-07-template-pin-main-coherence-gate`,
`2026-09-10-dev-skills-concurrency-deploy-hardening`, `2026-09-11-dev-main-process-gaps`,
`2026-09-21-repo-guardrails-hardening`, `2026-09-21-dev-process-and-tooling-gaps`,
`2026-09-22-skill-channel-freshness-reporting`.

Two of them already named the class instead of the incident:

- `2026-09-21-repo-guardrails-hardening`: *"safety mechanisms are advisory where they need to be
  executable"*.
- `2026-09-21-dev-process-and-tooling-gaps`: *"config that names a version or path rots silently;
  config that names a shape survives"*.

That second line is the repo's own diagnosis, and it was never applied to its own largest instance.
**The version square names versions.** `version-square.js:11` names a version inside a filename
(`innfo-mcp-v<version>.bundle.js`); `:62` names one inside a JSON string (`v${v}`); `:77` names one
inside a tag string. Every leg is the rot the principle predicts.

Incident #9 landed one day ago and is recorded in `scripts/lib/tag-pin-freshness.js`'s own docstring:
a skill rename plus ~15 `template_version` bumps merged `dev → main` with no tag cut and no repin;
`validate-manifest.js --channel stable` went red on `main`; `e1469d0` was the after-the-fact repin.
The response was guard #10, `checkTagPinFreshness` — which asserts a *shape* ("a diff touching
`skills/` or a template `spec_NN.md` must also touch `manifest/source.yaml`"), which is the right
principle and genuinely good work. But it is a proxy: it checks the manifest was *touched*, not that
the pin is *correct*, and its own docstring concedes *"Cutting the tag itself remains the maintainer's
job."* The manual step that gets skipped is still manual. It acquired a watchman.

### The counter-example already in the tree

`iNNfo/packages/innfo-mcp/src/server.ts:69` reads `__INNFO_MCP_VERSION__`, injected at build time by
tsup `define`. That is a **derived** value, not a duplicate — the one place this class of problem was
solved correctly, and the model this change copies.
(`.agents/skills/nn-dev-check-integrity/SKILL.md` still lists it as a 7th place to compare. That doc
is stale; the code is right. Fixing the doc is in scope.)

## The tool that does not fit

`release-please` in manifest mode looks near-perfect on paper, and three of its properties are real:
`monorepo-tags: true` emits `<component>-v<version>` — **literally this repo's existing convention**,
so no tag renaming and no consumer-pin migration; release type `simple` covers non-language
(Markdown) artifacts; `extra-files` with inline annotations and typed JSON/YAML updates is a direct
replacement for the version square, turning six compared legs into six written ones. And merging its
release PR cuts the tag, which is the one thing nothing here can otherwise fix.

Four objections. The first three are costs; the fourth is disqualifying.

**1. This repo has no PRs to hook.** Integration is a server-side fast-forward push,
`git push origin dev:main`, on a single `dev` branch batched to `main`
(`nn-dev-release/SKILL.md:246-295`; the technique exists specifically because the shared working tree
is routinely dirty with a concurrent session's files). `release-please` is PR-centric by design.
Adopting it means introducing a release-PR flow — and the skill records that
`git push origin dev:main` *"will be rejected"* if branch protection requiring PRs is ever enabled on
`main`. So the two models are not merely different, they are mutually exclusive at the push boundary.
Real cost, paid in the workflow every maintainer and every concurrent agent session uses daily.

**2. It adds an external tool plus a GitHub App/Action to the release path.** `scripts/` is
deliberately zero-dependency and deterministic (`nn-dev-release/SKILL.md:16`). A release path that
depends on a hosted Action is a release path that can be down.

**3. `.github/workflows/` contains one file and no tag-triggered workflow.** Release automation here
is entirely new CI surface, not an extension of existing surface.

**4. The disqualifier: `release-please` has one version per component. This repo has two version
concepts per component, and they are not the same number.** Verified in `manifest/source.yaml`:

| | Per-artifact version | Channel/tag version |
| :-- | :-- | :-- |
| Skills | 8 **independent** values, format `V_x-y-z` — `V_3-4-0`, `V_3-3-0`, `V_0-5-2`, `V_0-2-0`, `V_0-1-0`, `V_0-2-0`, `V_1-3-0`, `V_1-2-0` (`source.yaml:8-59`) | one shared `skills-v2.1.0` (`:203`) |
| Templates | 18 independent values, format `V_x-y-z` — mostly `V_0-2-1`, business at `V_0-2-5` (`:64-155`) | one shared `templates-v0.13.0` (`:206`) |

`2.1.0` and `0.13.0` appear nowhere in the repo except inside those ref strings and the manifest
rendered from them (grep-verified). They are batch numbers, unrelated to any artifact's own version.

So for `skills` as a `release-please` component: it would own `2.1.0` and could write it into a
`version.txt`, but it **cannot** bump the 8 independent `V_x-y-z` values — those are not one
component version, they are eight, in a non-semver format `extra-files` annotations cannot emit
(annotations write `x.y.z`). Splitting into 8 skill components + 18 template components would produce
26 independent tags and break every consumer pin, which is the migration the tool was supposed to
avoid. Modelling them as one component each normalizes **zero** of the real duplication for
18 of 26 artifacts — which is where the bulk of the hand-copying lives.

`release-please` could genuinely fix `innfo-mcp` (semver, `extra-files` with `jsonpath` into both
`package.json`s and `docs/innfo/cdn/manifest.json`) and `innfo-console`. That is 2 of 26 artifacts,
and even for the MCP it cannot satisfy version-square leg 4, which requires a **built bundle file
whose version is in its filename** — a tool that writes version strings cannot run tsup and rename
its output.

Honest scorecard:

| Criterion | In-house derivation | `release-please` |
| :-- | :-- | :-- |
| Places a version lives afterward | 30 authored, **0 duplicated** | 4 component versions + 26 artifact versions still hand-copied for 18 of them |
| `merge → tag → pin` ordering constraint | **survives** | **eliminated** (merge cuts the tag) |
| Dependency cost | zero — reuses `sync-template-versions.mjs` / `template-catalog.mjs` / `build-preflight-primitives.mjs` pattern | external tool + GitHub App/Action + new CI surface on the release path |
| Workflow cost | none | replaces `git push origin dev:main`, the technique that exists *because* the tree is shared |
| Migration risk | per-slice, revertible, no consumer impact | either 26 tags (breaks every pin) or 4 components that fix 2 artifacts |
| Guards | **deletes** `checkVersionSquare` | deletes `checkVersionSquare` and `checkTagPinFreshness` |

`release-please` wins exactly one row, and wins it for components whose version model it cannot
express. **Take the in-house option.** If the ordering constraint later proves to be the dominant
cost, the cheap answer is not a tool: once `refs[].ref` is derived from a number, cutting the tag is
`git tag $(node scripts/print-stable-ref.js skills)` — one line in the release skill, not a platform.

## Scope

### In scope

**S1 — Derive `channels.stable.refs[].ref`.** Replace the hand-typed tag string with a derivation.
The authored fact becomes a number; the ref becomes `<key>-v<version>`:

- `innfo-mcp` and `innfo-console`: **already derivable from data present today** — the MCP
  `package.json` version and `console_assets[].version`. `scripts/lib/console-release-info.js`
  (added in `855415b`) already derives the jsDelivr URL from the console ref, so the direction of
  flow is established.
- `skills` and `templates`: a channel version must be **introduced** (`channels.stable.refs[].version`),
  because — per the table above — `2.1.0` and `0.13.0` exist nowhere else. This is the one place the
  change adds an authored field. It replaces a free-form string with a number and makes the tag
  shape (`nn-dev-release/SKILL.md:196-203`, `TAG_SHAPE_RE`) unrepresentable-if-wrong instead of
  validated-after-the-fact.

**S2 — Generate `source.yaml` skill versions from `SKILL.md` frontmatter.** Extend
`sync-template-versions.mjs` (or a sibling using the identical shape) so the 8
`skills[].version` values become generated, exactly as the 18 template values already are. Same
`--check` gate, same `verify.js` slot.

**S3 — Collapse the MCP version square from 6 legs to 1 authored + N generated.** With
`iNNfo/packages/innfo-mcp/package.json` as the single authored version, generate: the core
`package.json` version, the `@cognnitive/innfo-core` dep range, `docs/innfo/cdn/manifest.json`
`latest`, and the `source.yaml` mcp `version`. `checkVersionSquare` legs 1, 2, 3, 5, 6 then have
nothing left to compare.

**S4 — Documentation truth-up.** `nn-dev-check-integrity/SKILL.md` (stale `__INNFO_MCP_VERSION__`
claim) and `nn-dev-release/SKILL.md` Option [c] steps 2-3, which instruct hand-editing every site
this change generates.

### Out of scope

| Item | Why not here |
| :-- | :-- |
| Move the drift signal earlier (analysis item 3) | Separate concern: *when* a true fact is reported, not *how many places* it is stored. `scripts/freshness.js` already computes it; rewiring it is a CI-trigger change that touches none of this. |
| Decouple the Pages deploy from release bookkeeping (analysis item 4) | Separate concern: blast radius of a failed gate, not version normalization. Worth doing — an incoherent pin currently skips `deploy-pages` and blinds the `freshness.json` that reports the problem — but it has no dependency on this change in either direction. |
| The `dev → main` pre-push tag/pin gate | **Already shipped today** in `78b6713`. Do not re-propose. |
| Console version/CDN de-duplication | **Already shipped today** in `855415b`. Do not re-propose. |
| Adopting `release-please` (or `changesets`) | Rejected with evidence above. Recorded so it is not relitigated without new facts. |
| Automating the tag cut | Falls out of S1 as a one-liner, but it is a release-procedure change, not a normalization change. Follow-on. |
| Cutting `docs/innfo/cdn/*.bundle.js` from the repo | Committing derivable artifacts is a real anti-pattern and leg 4 is its symptom, but removing it changes what the browser editor loads at runtime. Its own change. |

## Success criteria — this change must REMOVE machinery

**If this change ships a new checker, it has failed.** The prize is fewer moving parts than today.
Every slice either deletes a comparison or converts a hand-copy into a generated target; none adds an
invariant.

- [ ] `scripts/lib/version-square.js` `checkVersionSquare` is **vestigial**: legs 1, 2, 3, 5, 6 have
      no authored counterpart left to disagree with. Its `verify.js:124-125` call site is removed.
- [ ] Leg 4 (the CDN bundle must exist on disk) survives as a **file-presence** check, renamed and
      relocated out of a module named after a version invariant. It was never a version comparison.
- [ ] `channels.stable.refs[].ref` is never hand-typed. A malformed tag string is unrepresentable,
      not validated.
- [ ] Net count of `run(... --check ...)` calls in `verify.js` does **not increase**: S2 and S3 extend
      existing `--check` scripts rather than adding new ones.
- [ ] Number of hand-copied version sites goes from ~26 to **0**. Authored version facts stay at 30
      (26 artifact versions + 4 channel numbers) — that is the irreducible floor, because those 30
      are distinct facts, not copies of one.
- [ ] Net lines deleted > net lines added across the change.

**Explicitly NOT claimed: `checkTagPinFreshness` does not become unnecessary.** The brief for this
proposal suggested it would, and that does not survive checking. Deriving `ref` from
`refs[].version` removes the *string-formatting and stale-ref* failure class, but a maintainer who
edits a skill and does not bump `refs[].version` still ships an unreleased change — which is
precisely and only what `tag-pin-freshness.js` catches. Nothing in a derivation removes forgetting.
Deriving the ref from git instead (e.g. "newest `<key>-v*` tag reachable from `main`") *would* make it
structural, and is rejected: `generate-manifest.js --check` (`verify.js:235`) requires a
byte-identical render, so a moving git input would make the committed manifest drift from its own
render on the next push. `checkTagPinFreshness` stays, and it is the only guard here that earns its
keep.

## Preserve: tag + resolved SHA pinning, and installed clients

Non-negotiable, unchanged by this proposal:

- **Tag + resolved commit SHA in the published manifest is the industry-recommended pattern** (tag
  for humans, SHA because it is immutable). This part of the current design is correct. This change
  alters only *how the tag string is produced*, never what the manifest records or how consumers
  resolve it.
- **`docs/use/manifest.md` keeps its current shape and URL.** Consumers fetch it from
  `raw.githubusercontent.com/.../main/docs/use/manifest.md` and install from `codeload`/`raw` at the
  pinned commit (`scripts/skills-manager.js` → `scripts/lib/skills-commands.js`).
- **Backward compatibility, stated explicitly:** an existing `~/.agents/bootstrap-state.json` keeps
  working untouched, and an **older installed `nn-preflight` keeps working**, because the generated
  manifest is byte-compatible with the hand-maintained one. `refs[].version` is a new key in
  `manifest/source.yaml` — a *maintainer-side* file that is never distributed — so it cannot reach a
  client at all. No migration, no state-file change, no client-visible field.
- The `preview` channel (`refs[].ref: main`) is untouched: it is a branch name, not a version.

## Delivery: four dependency-ordered slices

| PR | Slice | Depends on | Scope sketch |
| :-- | :-- | :-- | :-- |
| 1 | **S1** derive `refs[].ref` | — | add `refs[].version`; derive ref in the generator; `--check` on the existing slot |
| 2 | **S2** generate skill versions into `source.yaml` | 1 (shares the `source.yaml` writer) | extend `sync-template-versions.mjs` targets + tests |
| 3 | **S3** collapse the MCP square; delete `checkVersionSquare` | 1, 2 | generate 4 sites; remove the `verify.js` call; relocate leg 4 |
| 4 | **S4** doc truth-up | 3 | `nn-dev-check-integrity`, `nn-dev-release` Option [c] |

**First-slice boundary — S1 stands alone.** It deletes, on its own, the failure class that reddened
`main` on 2026-09-24: a tag string that disagrees with the version it is supposed to name. It needs
none of S2/S3, it is one generator target plus one `--check`, and it is revertible by restoring four
literal strings. If the rest never ships, S1 is still worth having.

S3 is last among the code slices because it is the only one that **deletes** a guard, and deleting a
guard is safe only once every leg it watched has a generated replacement in place.

## Risks

| Risk | Severity | Note / mitigation |
| :-- | :-- | :-- |
| **The two frontmatter parsers diverge.** `scripts/lib/yaml-parser.js` (maintainer, `parseFocusedYaml`) vs `skills/nn-preflight/scripts/lib/yaml-lite.js` (shipped to user machines). `yaml-lite.js:8` `parseScalar` **never returns a number** — a numeric value arrives as a string | Medium | S1 introduces `refs[].version`. Keep it **quoted** in `source.yaml`, as every existing `version:` already is (`source.yaml:8,29,177`), so both parsers agree on a string. Never emit a bare number into `source.yaml`, and never make a client-side code path depend on its type. The shipped parser is on a different release cadence than the repo — it cannot be fixed in the same breath. |
| **`generate-manifest.js --check` requires a byte-identical render** (`verify.js:235`) | High | Nothing volatile may enter the manifest. Every derived value here is a pure function of committed files — no git queries, no timestamps, no counters. This is also why deriving the ref from "newest tag" is rejected outright (see success criteria). Precedent for the failure: ADR-001 of `2026-09-22-skill-channel-freshness-reporting`. |
| **Version-square leg 4 requires a CDN bundle on disk that is committed yet gitignored** (`docs/innfo/cdn/innfo-mcp-v<v>.bundle.js`, `version-square.js:67-70`) | Medium | S3 must preserve this as a presence check, not fold it into a generated value. A generator cannot produce it — it is tsup output. Keep it, rename it, do not delete it with the rest of the square. |
| **A local `tsup` rebuild of the MCP bundle is not byte-reproducible.** Measured this session: 637351 bytes rebuilt vs 637940 committed, differing only in minifier symbol renames | Medium | No slice may introduce a byte-comparison freshness gate on that bundle — it would be flaky across environments. Content inspection (grep for a distinctive literal) works where byte comparison does not. S3 touches the *version string* in the CDN manifest, never the bundle bytes. |
| **The 4 channel versions have no second source, so S1's new `refs[].version` is a genuinely new authored field** | Medium | Accepted and stated plainly: this change adds 4 authored numbers to remove ~26 hand-copies and one 89-line validator. It is not a pure deletion, and the success criteria count it honestly rather than hiding it. |
| **Concurrent sessions share the working tree**; generators write files | Medium | `nn-dev-development` applies: precise staging only, never `git add -A`. Generators must write only their declared targets. `nn-dev-release` Option [c] step 0 already records that a dirty tree contaminates a generated pin (`2026-09-08`: an uncommitted `0.5.0` bump leaked into `source.yaml`). |
| **`source.yaml` is parsed by a *focused* YAML parser**, not a real one; `refs` is a list rather than a map specifically because it cannot handle `/` in mapping keys (`source.yaml:191-197`) | Low | Add `version:` as a sibling scalar inside an existing list item — a shape the parser demonstrably handles (`repo`, `ref` already live there). Do not introduce nesting. |
| Bumping `refs[].version` without cutting the matching tag still ships a broken stable channel | Low | Unchanged from today, and out of this change's reach by construction. `checkTagPinFreshness` (`78b6713`, pre-push at the `dev → main` boundary) is the mechanism, and it stays. |

## Rollback

Each slice reverts independently. S1: restore four literal `ref:` strings and drop the `version:`
key. S2/S3: the generated values are byte-identical to what a human would have typed, so reverting a
generator leaves `source.yaml` valid and merely hand-maintained again. S3's guard deletion reverts by
restoring one `require` and one call in `verify.js`. No consumer-visible change, no data migration,
nothing irreversible.

## Proposal question round

Three product questions the maintainer should answer before `sdd-spec`. Each one changes the shape of
S1; none blocks reading the rest of this proposal. Assumptions in force if unanswered are stated.

1. **Channel-version format.** `refs[].version: "2.1.0"` (plain semver, matching the tag) is
   assumed. Confirm — the artifact versions use `V_x-y-z`, and mixing the two conventions in one file
   is already the status quo but worth an explicit blessing.
2. **Does the skills channel version have meaning, or is it a counter?** If it is purely a batch
   counter, S1 could derive it too and remove the fourth authored number. If a maintainer intends
   `2.1.0` to convey compatibility to users, it must stay authored.
3. **Should S3 delete `version-square.js` outright or leave the module with leg 4 only?** Deleting
   the file is cleaner; keeping it preserves its test file and its docstring history.
