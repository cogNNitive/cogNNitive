# Engine / blueprint / skill / manifest boundaries — coNNtent

Read-only analysis. Every claim below was measured against this worktree
(`aba6dfebe`, branch `t3/analyze-video-architecture-boundaries`, based on `main`), the
live manifest at `https://cognnitive.com/use/manifest.md`, the live catalog served by
`skills-manager status`, and the real user-profile install at `~/.agents/` on this
machine. No code was changed.

**Verdict in one line: the package split (blueprint ships spec + data + embedded skill)
is right and already supported by the installer; what is wrong is that the *policy
inside the skill* is engine-owned in code while three documents say it is catalog data,
and that `coNNtent` is the only blueprint whose install path is undeclared.**

---

## 0. Corrections to the stated facts

Five of the seven facts need correction. This section is deliberately first, because the
recommendations in §6 depend on the corrected reading.

### Fact 1 — correct, but `cogNNitive-web` is not a second source

Both trees exist, but the second one is *generated*: `run-release.js:104` copies
`RELEASE_TABLE[key].repoPaths` from this repo into a fresh clone of `cogNNitive-web`,
and `scripts/lib/publish-web-tree.js` `copyDistributionPath` does `fs.rmSync(to)` before
copying, so the destination directory is replaced wholesale. `iNNfo/specs` and `skills`
in `cogNNitive-web` are a mirror, not a parallel edit surface
(`scripts/release/release-keys.js:63-72`). Reclassifying this changes the answer to
question B.

### Fact 2 — it is 7 skills and **8** blueprints, and `nn-mcp` is not a skill

The live manifest carries 7 `skills:` entries (`nn`, `nn-sources`, `nn-innfo`,
`nn-preflight`, `nn-update`, `nn-site-generator`, `nn-skills-lifecycle`) and 8
`blueprints:` entries (`domaiNN`, `changes`, `sidecar`, `sources`, `artifacts`,
`procedures`, `executions`, `blank`). `nn-mcp` is an `mcp:` bundle nested under
`nn-innfo` (`manifest/source.yaml:16-27`, nested `mcp:` at `:22-27`), not a skill.

`workspace` is declared at `manifest/source.yaml:86-90` under `frozen_blueprints:`
and **is never rendered into the manifest**: `assemble-manifest.js:323` iterates only
`source.blueprints`. So there are 9 declared blueprints, 8 published. That is a live
example of the class of defect question D is about.

### Fact 3 — correct, and the reported numbers were the machine's, not the catalog's

`catalog | coNNtent | - | blueprints-v0.97.0 | unreleased` is what `~/.agents/bootstrap-state.json`
holds, not what the catalog says. Verified today:

| source | coNNtent |
|---|---|
| `iNNfo/specs/bluepriNNts/catalog.json` | `adopted: V_0-32-2`, `release_tag: blueprints-v0.100.0`, `embedded_skills: ["nn-conntent"]` |
| live catalog (network, read by `status`) | `blueprints-v0.100.1` |
| installed (`bootstrap-state.json`) | tag `blueprints-v0.97.0`, `V_0-32-0` |
| `skills-manager status` row | `catalog \| coNNtent \| blueprints-v0.100.1 \| blueprints-v0.97.0 \| outdated` |

So `coNNtent` is *released* and *behind*, not unreleased. The consequence you named
(`update-cognnitive.mjs` can never refresh it) is still exactly right, for a different
reason: `update` iterates `parseManifest()` (`skills-manager.js:2299`), and coNNtent is
not in the manifest. The repair exists — `install --blueprint coNNtent`
(`skills-manager.js:2231-2296`) — and `status` knows the blueprint is behind, but it
**does not print that command** (see §5, failure mode 2).

### Fact 4 — the two layouts resolve to two different files, and neither is empty

`REFERENCE_CATALOG` (`catalog.mjs:20-28`) is four `..` levels above `scripts/lib`:

| layout | resolves to | exists? |
|---|---|---|
| `<blueprint>/skills/nn-conntent/scripts/lib` (package) | `<blueprint>/catalog/model-catalog_coNNtent_NN.md` | yes |
| `~/.agents/skills/nn-conntent/scripts/lib` (profile install) | `~/.agents/catalog/model-catalog_coNNtent_NN.md` | yes, **byte-identical** (SHA256 `37A60100…`) |

It does not degrade to an empty catalog: `loadMergedCatalog` does a bare
`fs.readFileSync(referencePath)` (`catalog.mjs:282`) and throws `ENOENT`. The real defect
is that **one expression has two owners** — and nothing in `skills-manager.js` creates or
refreshes the profile-root sibling. `~/.agents/catalog/` was last written
2026-11-25 14:37 and `~/.agents/library/` on 2026-11-12; the current installer has no
code that copies either (grep of `skills/nn-skills-lifecycle/scripts/skills-manager.js`
for `agents/catalog` and `library` finds nothing).

### Fact 5 — the model policy lives in three places, and `mergeCatalog` *does* merge providers

- `mergeCatalog` merges providers: `providers: { ...reference.providers, ...(overlay?.providers || {}) }`
  (`catalog.mjs:151`). The parenthetical in the brief is wrong.
- "the default and only allowed model is `wavespeed-ai/infinitetalk-fast`" is at
  `skills/nn-conntent/SKILL.md:159`, **not** in `synthesize-avatar.mjs`. The script
  resolves the model from the cascade (`synthesize-avatar.mjs:123`).
- The actual block is `DEFAULT_GUARD.allowedModels` — a literal array of 8 api_ids in
  engine code (`video-guard.mjs:62-71`) — reached through `loadGuard`
  (`video-guard.mjs:212-229`) via `loadGuardWithVoices` (`guard-config.mjs:23-35`), which
  is what `synthesize-avatar.mjs:125` uses.- That block is not an accident: the provider-neutral change spec froze it —
  *"The spend guard's model check MUST run before the catalog route, so a blocked or
  unlisted model keeps its existing refusal"*
  (`openspec/changes/conntent-provider-neutral/specs/conntent-blueprint/spec.md:28`).
- A fourth, separate policy: **pricing ignores the domain overlay**.
  `asset-cost-estimator.mjs:66` calls `loadMergedCatalog({ overlay: null })`.

### Fact 6 — right about the contradiction, wrong about every number

- The floor is not a constant. `smallTextFinding` in the pinned CLI
  (`~/.agents/skills/nn-conntent/node_modules/hyperframes@0.8.192`,
  `dist/chunk-IMSI7IFW.js:595-597`) reports
  *"Type floor is `${floorPx}` px (2.6% of the `${shortSide}` px short side …)"*. 28 px is
  what 2.6% of a 1080 short side gives; at 720p it is ~18.7 px.
- The finding is `severity: "warning"`, and the CLI only fails on warnings under
  `--strict` (`dist/chunk-CXRZBWSH.js:1014`:
  `ok = summary.errorCount === 0 && (!strict || summary.warningCount === 0)`).
  The pipeline invokes `check --json` with no `--strict`
  (`hyperframes-render.mjs:308`), and `qaHyperframesCheck` passes on exit 0
  (`qa.mjs:1053-1064`). **The type floor is not a blocking gate.**
- `lower-third` renders at **40px** (`library/components/lower-third/index.html:19`). The
  components that trip the floor on a 1080 short side are `caption` (26px,
  `library/components/caption/index.html:18`) and `watermark` (20px,
  `library/components/watermark/index.html:17`). Neither carries `data-layout-ignore`,
  which is what HyperFrames' own message tells you to add for "texture rather than
  reading" — a watermark is exactly that.

So the contradiction is real but smaller and mislocated: the blueprint ships two
components the pipeline's own checker warns about on every render, and the pipeline is
tuned to ignore the warning.

### Fact 7 — correct, with the ordering detail added

`plan-auto-tags.js:36` is `ORDER = ['blueprints', 'skills', 'nn-mcp', 'nn-console']` and
release stops at the first failure, so a blueprints failure leaves `skills-v*` and
`nn-mcp-v*` pushed and unpublished. `ci.yml`'s `auto-tag` needs
`[verify, site, quality, spec-integrity, regen]`, so a merge publishes only after the
generated write-back PR has landed.

---

## 1. A — Where each concern belongs

### The criterion

Use three tests, in this order. The first that decides, decides.

1. **Override authority.** Can a party other than the engine's author legitimately
   change the value — a domaiNN author, a series author, an operator — without shipping
   a new version of the engine? If yes, it is **data**, and the engine may hold only a
   fallback that is *reported when used*.
2. **Hash membership.** Does the value enter a cache key, a review hash, a plan hash or a
   ledger row? Then the engine owns the *shape* and the data may only choose among shapes
   the engine validates. A data value that can silently change a cache key is a
   determinism bug wearing a config's clothes.
3. **Failure direction.** If the value is wrong, who finds out, and when?
   A value whose wrongness costs money must be resolved and refused *before* the call, by
   the engine, from data the engine has validated (this is why `catalog.mjs` is engine
   code and the catalog file is not).

Two corollaries that settle most of the arguments in this repo:

- **Mutation authority is not an island property.** A blueprint may *declare* data and
  *describe* policy in prose. It may not execute. The moment a blueprint ships
  `scripts/*.mjs` that spend money, the blueprint is part of the engine and its release
  cadence is now the engine's cadence.
- **Transport is always engine, route is always data.** `provider-transport.mjs:1-19`
  states the rule correctly and is the model to copy: *"The engine owns no provider URL,
  credential name or model id: a model resolves to its route here."*

### The four concerns

| Concern | Today | Should be | Verdict |
|---|---|---|---|
| **Quality gates** (sequence, severity) | `review_gates:: [script, preview]` in `defaults/video-defaults_NN.md:25`, Field defined at `spec_NN.md:490`, overridable per series/video/scene and switchable off | stays data — a series author must be able to turn gates off | correct |
| **Quality gates** (implementation, fail-closed rule) | `qa.mjs`, `gates.mjs`; "an unavailable checker fails" (`qa.mjs:1050`) | stays engine | correct |
| **Spend caps** | `daily_budget` is cascade data (`spec_NN.md:477`, read at `synthesize-avatar.mjs:129-131`); the **per-run** `budget` (`spec_NN.md:471`) is never read — `SpendGuard` takes `config.budgetPerRunUsd` from `DEFAULT_GUARD.budgetPerRunUsd = 2.0` (`video-guard.mjs:58`) | both from the cascade; `DEFAULT_GUARD` may only seed a value that is *named in the refusal message* | **bug** — asymmetric ownership of two halves of one Field pair |
| **Model choice** | cascade (`avatar_model`, `image_model`, `voice_model`), correct | stays data | correct |
| **Model allowlist** | `DEFAULT_GUARD.allowedModels`, 8 literal api_ids (`video-guard.mjs:62-71`); optional `<root>/video-guard.json` (`video-guard.mjs:212-229`) | catalog `Model allowed::` / `status::`, which is what `spec_NN.md:806` already promises | **bug** — see §3 C13 |
| **Pricing** | catalog, but read with `overlay: null` (`asset-cost-estimator.mjs:66`), plus `FALLBACK_RATES` in code (`:36`) | catalog including overlay; fallback rate must be *reported* per model (`warnUnpricedAllowedModels` already exists, `:124`) | **bug** — a domaiNN price override has no effect on the estimate or the ledger charge |
| **Render defaults** (components, frames, formats) | blueprint package `library/`, resolved by `library.mjs:113` through episode → series → domain → package floor | stays data | correct |
| **Render runtime** (`hyperframes`, `gsap`, ffmpeg) | pinned in the skill's `package.json`, verified by `ensure-hyperframes.mjs:36-52` | stays engine — reproducibility is the whole point | correct |
| **Scripts** | engine, and they live inside the blueprint (`iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/`) | engine, but see §4 — the *package* is the right shipping unit, the *release key* is not | acceptable with cost |

**One-line answer to A:** the boundary is already drawn correctly in prose
(`spec_NN.md:806` *"Keep voice, model and price knowledge in the catalog, never in engine
code"*) and in one module (`provider-transport.mjs`). The three places it is violated are
all *policy held as code constants*: the allowlist, the per-run cap, and the pricing
overlay.

---

## 2. B — Is the two-repo duplication intentional?

**Yes, and the direction is one-way by construction — but it is only enforced at release
time, and nothing detects drift.**

The flow:

```
cogNNitive (source of truth)
  └── merge to main
        └── regen writes back versions/artifacts (chore/regen PR)
              └── auto-tag cuts blueprints-v*/skills-v*/…
                    └── release.yml, run per tag, ref = the tag
                          └── run-release.js: clone cogNNitive-web, copy repoPaths, commit, push main + tag
                                └── assemble-manifest writes docs/use/manifest.md + immutable snapshot
                                      └── installer pins the tag and fetches by commit
```

Evidence that it is a mirror and not a second source:

- `release-keys.js:8` — four keys only: `skills`, `blueprints`, `nn-mcp`, `nn-console`.
- `release-keys.js:63-72` — `DISTRIBUTION_PATHS` is the complete copy surface.
- `run-release.js:104` + `publish-web-tree.js` `copyDistributionPath` — `rmSync` then copy.
- `run-release.js:119-132` — stage, `git add -A`, commit, push `origin main` (fast-forward,
  not force), then tag and push the tag.
- `release-keys.js:82-89` — `RELEASE_OWNED_GLOBS` protects `use/manifest.md` and the
  versioned CDN bundles from a Pages push. That list exists precisely because the mirror
  is *not* fully generated: hand-written site content and the manifest share one repo.

### Which is authoritative

`cogNNitive`. Three independent confirmations: the release copies *from* it; the manifest
pins commits in `cogNNitive-web` (`source.yaml` names `repo: cogNNitive/cogNNitive-web`
on all 23 entries); and `catalog.json`'s blueprint entries carry `raw.githubusercontent.com/cogNNitive/cogNNitive-web/...`
URLs. Additionally, the blueprint data files name the mirror as their own parent —
`catalog/model-catalog_coNNtent_NN.md:5` and `defaults/video-defaults_NN.md:5` both set
`parent_spec.url` to `cogNNitive-web/main/…/spec_NN.md`. Cosmetic, but it means the source
document's declared parent is the published copy.

### Are the trees in sync?

Checked today via the release-tag tree that the installed profile came from:
`~/.agents/bluepriNNts/coNNtent/spec_NN.md` = `V_0-32-0`, this repo = `V_0-32-2`. So the
published tree *was* in sync at `blueprints-v0.97.0` and has moved twice since — that is
normal lag, not drift.

### Where drift can occur, and what it breaks

| Drift mode | What breaks | Detected? |
|---|---|---|
| A hand commit in `cogNNitive-web` to `iNNfo/specs` or `skills` | survives until the next release of that key, then is silently destroyed by `rmSync` | **no** — nothing in this repo's CI reads `cogNNitive-web` |
| A hand commit in `cogNNitive-web` to `docs/`, `README`, `CNAME`, `use/manifest.md` | `use/manifest.md` is overwritten by `assemble-manifest`; the rest persists legitimately | partly — `RELEASE_OWNED_GLOBS` |
| `main` ahead of the newest tag (merged but not yet released) | the published install is behind the repo; harmless by design | yes, by construction — the manifest pins tags |
| A tag whose release run failed | the tag exists and is inert, `refs/pull` and the manifest still show the previous one | only by reading `release.yml` job names |
| The mirror's copy of a *path that is not in `distribution`* but is referenced (e.g. `scripts/export-console.mjs` is listed, `scripts/lib/*` is not) | an installed console export script that imports a helper nobody ships | **no** |

Then answer to "what drift would break": only consumer-visible drift matters, and the
window is *between the tag and the next release of that key*. The dangerous one is not
content drift — the mirror is authoritative for content at a tag by definition — it is the
**absence of a check that the mirror equals the tag it claims**. `run-release.js:124`
compares the staged tree to `tag`, i.e. to itself. Nobody compares `cogNNitive@tag` to
`cogNNitive-web@tag`.

**Recommendation for B (P4, below):** one workflow step after a successful release that
diffs `git -C <cogNNitive> ls-tree -r <tag> -- iNNfo/specs skills` against the same paths
at the tag in `cogNNitive-web`. Cheap, catches a deleted file, a stale tag, and a partially
failed release at once.

---

## 3. C — Are blueprints really islands?

**The package is an island. The skill inside it is not.**

The installer already treats a blueprint as a package with parts: `installBlueprintAtCommit`
copies a whole directory when `template.path` is one (`skills-manager.js:1634-1637`), or
infers a package from sibling folders when the path is a file
(`skills-manager.js:1640-1653`), and then projects embedded skills into the skills dir and
records them with `embedded: true` (`skills-manager.js:1582-1614`, `1666-1673`). The
manifest body documents this (`manifest/body.md`, step 8). So a blueprint that ships
`spec_NN.md` + `skills/` + `catalog/` + `library/` + `procedures/` is a supported shape.

What breaks the island is that the runtime reaches *outside* the package with two relative
constants, and both land on profile-root directories nobody maintains.

### Coupling table

| # | Coupling | Where | Class |
|---|---|---|---|
| C1 | `REFERENCE_CATALOG` = four `..` above `scripts/lib`, so one expression means `<blueprint>/catalog/` or `~/.agents/catalog/` | `catalog.mjs:20-28` | **leak** — two owners, one path expression, no test for either |
| C2 | `PACKAGE_FLOOR = SKILL_DIR/../..`, i.e. `<blueprint>` or `~/.agents`; used for `frames`, `components` and `sounds` | `compile.mjs:48-52` and consumed at `:94`, `:128`, `:197`, `:331`, `:800` | **leak** — worse than C1: four call sites, and silently absent in the profile layout |
| C3 | `~/.agents/catalog/` and `~/.agents/library/` exist on this machine and are prerequisites for C1/C2 in the installed layout, but no installer code creates them | verified by mtime (`library` 2026-11-12, `catalog` 2026-11-25 14:37) vs. grep of `skills-manager.js` | **bug** — orphan prereq; a fresh install has neither |
| C4 | The six component HTML files are byte-identical in two homes | `library/components/<n>/index.html` ≡ `skills/nn-conntent/slots/<n>.html` (all six hashes match) | **leak** — duplication with no equality test |
| C5 | The blueprint spec names a path inside the skill | `spec_NN.md:687` "the slot contracts in `skills/nn-conntent/slots/<slot>.html`" | **acceptable** — documentation, but it should read "in the installed skill's `slots/`" so it survives the profile layout |
| C6 | The skill is a third-party-installed npm package inside the blueprint (62 KB `package-lock.json`; `npm install` at install time) | `skills/nn-conntent/package.json`, `ensure-hyperframes.mjs:63-78`, `skills-manager.js:1599` | **acceptable with cost** — install-time network inside a blueprint install |
| C7 | The renderer is executed from the skill's own `node_modules` at a pinned version, never `npx` | `ensure-hyperframes.mjs:36-52`, `hyperframes-render.mjs:299-303` | **acceptable** — this is the determinism the whole pipeline rests on |
| C8 | A 1.17 MB generated core mirror is embedded in the skill | `skills/nn-conntent/scripts/lib/nn-core.generated.cjs`, imported at `catalog.mjs:18` | **acceptable** — one parse authority; but no release key rebuilds it |
| C9 | Two shipped components violate the floor the same package's pipeline runs | `caption/index.html:18` (26px), `watermark/index.html:17` (20px) vs. 2.6% floor | **bug** — data contradicts the checker |
| C10 | The package states two contradictory model policies | `SKILL.md:159` "the default and only allowed model is `wavespeed-ai/infinitetalk-fast`" vs. `spec_NN.md:794` "it has no blueprint default: the package pins no vendor model" and `spec_NN.md:806` | **bug** — one package, two truths |
| C11 | `video-guard.json` is declared retired by the layout checker but still read by the runtime | `layout.mjs:151-155` ("retired; allow models through `model-catalog_NN.md`") vs. `video-guard.mjs:212-229` | **bug** |
| C12 | `spendGuardFromDocuments` implements the *retired* design and is called only by a test | `video-guard.mjs:286-322`; sole caller `test/video-guard-retired.test.mjs:36` | **leak** — a design with no owner in production |
| C13 | The "model ids are data" invariant is enforced by a test that exempts the two modules which hardcode them, under a comment asserting they are data | `no-phantom-providers.test.mjs:42-45` (comment) vs `:44` (`DATA_MODULES` allowlist) vs `video-guard.mjs:62-71` | **bug** — the invariant is vacuous |
| C14 | The estimator prices from the reference catalog only | `asset-cost-estimator.mjs:66` | **bug** — a domaiNN price override changes the estimate by zero |
| C15 | `spendGuardFromDocuments` builds `allowedModels` from `slug` but the check compares normalized `api_id` | `video-guard.mjs:288-291` vs `:247-262` | **bug** — latent, dead today |
| C16 | The catalog stamps coNNtent with a `release_tag` while the manifest has no entry for it | `catalog.json` vs `source.yaml` | **leak** — two release statements, one blueprint |
| C17 | Any edit to a blueprint spec forces a `source.yaml` touch — including the 14 blueprints `source.yaml` does not list | `tag-pin-freshness.js:30,66-76` | **bug** — ceremony with no effect for coNNtent |

### The one that matters most

C13 is the whole incident in miniature. A test asserts *"The pricing catalog and the guard
allow-list carry the model ids as DATA"* (`no-phantom-providers.test.mjs:42-43`), and then
exempts `asset-cost-estimator.mjs` and `lib/video-guard.mjs` from the rule that would prove
it (`:44`). The green suite therefore certifies the opposite of what it claims. Run it to
confirm:

```
node --test test/video-guard-retired.test.mjs test/no-phantom-providers.test.mjs test/vendor-neutral-defaults.test.mjs
# 8 pass, 0 fail
```

`video-guard-retired.test.mjs` passes while its subject is the *retired* design, and
`vendor-neutral-defaults.test.mjs:25` passes while `SKILL.md:159` — inside the same package,
three directories up — says the opposite.

---

## 4. D — Should `coNNtent` be in the manifest?

**Yes.** The installer already supports its shape, and leaving it out has a measurable
cost today.

### Proof the shape is supported

`installBlueprintAtCommit` decides "package" from the directory, not from the manifest:

- if `template.path` is a directory → copy it whole (`:1634-1637`);
- if it is a file whose parent has `procedures/`, `assets/`, `samples/`, or a name matching
  the blueprint → copy the **parent** as the package and also write the flat `.md`
  (`:1639-1648`).

`iNNfo/specs/bluepriNNts/coNNtent/` has `procedures/` and `assets/`, so an entry with
`path: iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md` produces
`~/.agents/bluepriNNts/coNNtent/` **and** projects `nn-conntent` into
`~/.agents/skills/nn-conntent/` (`:1666-1673` → `installEmbeddedSkills:1582`).
`catalog.json` already advertises `embedded_skills: ["nn-conntent"]`.

### What breaks by leaving it out

1. **`update` cannot fix it, by construction.** `cmdUpdate` iterates `parseManifest()`
   (`skills-manager.js:2299`); coNNtent is absent, so `update` and therefore the whole
   `update-cognnitive.mjs` wrapper never touch it. The wrapper's own header says this is
   expected (`update-cognnitive.mjs:5-11`) and reports the blueprint as `unknown`.
2. **The repo already gates half of the distribution.** `skill-script-refs.js:10-12`
   defines distributed skills as *"the manifest-listed ones **plus** the skills embedded in
   a bluepriNNt package … which are projected into the skills dir on install."* So
   self-containment is enforced for `nn-conntent` and installation is not.
3. **The drift is real and visible.** Installed `V_0-32-0` at `blueprints-v0.97.0`;
   released `V_0-32-2` at `blueprints-v0.100.x`. Two releases of an engine that spends money.
4. **`status` reports it without a remedy** (see §5, failure mode 2).

### What breaks by adding it

1. **The manifest entry shape is one path per blueprint and carries no package flag.**
   `assemble-manifest.js:82,342` renders `blueprint.path`. The package detection is a
   *heuristic on folder names* (`skills-manager.js:1640`). coNNtent ships today because it
   happens to have `procedures/`; delete that folder and every install silently degrades to
   a single markdown file. Make the shape explicit (`package: true`, or a `path` ending in
   `/`) before relying on it.
2. **Release-key granularity is the real cost.** `blueprints` is one key for all 22
   blueprint directories (`release-keys.js:16-27`). Once coNNtent is in the manifest, every
   one of its frequent spec edits (V_0-32-0 → V_0-32-2 in about a day) cuts a full
   blueprints release and re-pins all 8–9 manifest entries through
   `assemble-manifest.js:323-342`.
3. **Install-time `npm install`.** `ensureSkillNodeModules` runs at projection time
   (`skills-manager.js:1599`), so a blueprint install now downloads HyperFrames and GSAP.
   That is already true for `--blueprint coNNtent`; making it the default path makes it
   universal.
4. **`workspace` repeats the omission.** `frozen_blueprints` is declared and never
   rendered (`assemble-manifest.js:323`). Whatever you decide for coNNtent, decide it for
   `workspace` in the same pass, or you will have two category errors with one fix.

**Answer:** add it — but only together with an explicit package shape and a decision on
release granularity (§5). Adding it alone moves the failure from "never updated" to
"released 22 blueprints at a time".

---

## 5. E — Is "merge → tag → manifest pin → install" right?

**The shape is right for a catalog of immutable packages. The unit of the tag is wrong for
an engine that ships weekly.**

The good parts, which should survive any redesign: the tag is the tree that ships
(`release.yml` checks out `ref: inputs.tag`, not the merge commit); hydration is write-once
(`manifest/body.md`, step 7); the manifest is a lockfile with snapshots under
`docs/use/manifests/<tag>.md`; and `plan-auto-tags` refuses a subject it cannot read a bump
from.

The failure modes, each verified here:

**1. Forgetting the tag / partial release.** `auto-tag` calls `release.yml` once per
planned tag in fixed order and stops at the first failure (`plan-auto-tags.js:36,117`).
Every later tag stays pushed and unpublished. The repo's own process notes name three live
orphans: `blueprints-v0.83.2`, `skills-v4.2.1`, `nn-mcp-v0.49.2`. An orphan tag is inert
for consumers *and* invisible in the manifest, so the only tell is reading the push run's
job names.

**2. An install that looks current but is months old — and a status that says so without
saying what to do.** Measured on this machine:

```
catalog | coNNtent | blueprints-v0.100.1 | blueprints-v0.97.0 | outdated
```

and nothing else — no diff preview, no repair command. Reason: the `outdated` row for
coNNtent comes from the loop over `state.blueprints` (`skills-manager.js:1875-1889`), which
sets `status = "outdated"` at `:1883` and *does not* push into `behindBlueprints`. Only the
second loop, for directories missing from `state`, emits
`Run: … install --blueprint <name> --yes` (`:1892-1901,1911-1913`). And the diff-preview
pass iterates `outdatedBlueprints`, which is the *manifest* set only (`:1929-1940`). So the
one blueprint that needs the optional command is the one that never gets it printed.

**3. `commit` is a tag, not a sha — so the integrity anchor is not one.** The manifest
prose calls the 40-char `commit` "the integrity anchor" (`manifest/body.md`). For
manifest-listed entries that is true. For `install --blueprint`, the manager builds
`commit: ref` where `ref` is the tag name (`skills-manager.js:2252-2259`), and
`bootstrap-state.json` records `coNNtent.commit = "blueprints-v0.97.0"`. A re-cut tag is
undetectable, and `status`'s own comparison is tag-vs-tag (`:1882`), so "same tag,
different bytes" is invisible by construction.

**4. Drift while unpinned.** Between the merge and the tag, and between the tag and the
mirror push, the repo and the published install disagree. That is by design and harmless;
what is not harmless is that no artifact records *which* merge a given tag contains, so
"is the deployed engine older than the fix?" has to be answered by reading tags.

**5. Two-step release.** `auto-tag` needs `regen`, so the generated write-back PR must land
first; that PR arrives with no checks (`GITHUB_TOKEN` suppresses `pull_request` runs) and
can only be made mergeable by pushing an empty `ci:` commit. This is friction, not a
correctness gap.

### Better shapes, cheapest first

| Option | Change | Kills which failure mode | Cost |
|---|---|---|---|
| **(a) Document and accept** | none | none | the `install --blueprint` step stays manual; the silent-drift window stays |
| **(b) Per-blueprint release keys** | add `coNNtent` to `RELEASE_KEYS` with `changePaths: iNNfo/specs/bluepriNNts/coNNtent` and its own `conntent-v*` series | 2 (independent cadence), and removes the 22-blueprints-per-release cost of adding it to the manifest | `release-keys.js`, `plan-auto-tags.js`, `assemble-manifest.js` retention logic (`:239` requires a previous pin per entry) |
| **(c) Per-entry refs in the manifest** | each blueprint's `ref` is that blueprint's own newest tag instead of one shared tag | 1, 2, 4 | more tags to reconcile; retention logic must stop requiring a shared pin |
| **(d) Pin a content sha, not a tag** | `commit` = the tree sha; `status` compares hashes (it already hashes skill dirs, `hashSkillDir` at `skills-manager.js:1606`) | 3, and makes "same tag, different bytes" detectable | loses the human-readable release narrative; needs a `--check` mode in the release lane to keep the sha stable across a re-release |
| **(e) Mirror-freshness check** | after each release, diff `cogNNitive@tag:iNNfo/specs` vs `cogNNitive-web@tag:iNNfo/specs` | B's drift, 1 (a partially failed release shows as a missing file) | ~30 lines in a workflow; no model change |

**Recommended for this repo:** (b) + (d) for `coNNtent` only, (e) for everything, (a) for
the rest until it hurts. Rationale: coNNtent is the one component with an engine cadence and
a spending path, so it is the one component that cannot tolerate tag-granularity
ambiguity. The other 21 blueprints change monthly and do not.

---

## 6. Prioritized recommendation

### P0 — contradictions that make the current tests lie (no release needed)

1. **C14**: pass the domain overlay into `findCatalogEntry` (`asset-cost-estimator.mjs:66`).
   Today a domaiNN price override changes the estimate by exactly zero, which is the worst
   possible answer for a spend gate: it looks like it works.
2. **C10**: delete "the default and only allowed model" from `SKILL.md:159`, or replace
   `spec_NN.md:794/806`. One of the two is wrong and both ship in one package.
3. **C13**: make `no-phantom-providers.test.mjs` prove what its comment claims — assert
   `DEFAULT_GUARD.allowedModels` is derived, or delete the exemption and fail.
4. **C11/C12**: finish the retirement in one direction. Either `loadGuard` reads the
   catalog (the retired-design tests already pass, so the target exists) and `video-guard.json`
   is rejected, or `layout.mjs:151` stops calling it retired.

### P1 — the incident

5. **Declare `coNNtent` in `manifest/source.yaml`**, with an explicit package marker, and
   give `status` the repair line for the `state.blueprints` loop (`skills-manager.js:1883`).
   That single line turns "outdated" into "outdated, run this".
6. Decide `workspace`/`frozen_blueprints` in the same pass (`assemble-manifest.js:323`).

### P2 — the island

7. One resolver for "the blueprint package directory", used by both `catalog.mjs:20` and
   `compile.mjs:52`, that fails loudly with the two candidate paths when neither exists.
   Delete `~/.agents/{catalog,library}` from the contract by making the installer own them
   or by removing the need (C1, C2, C3).

### P3 — the duplication

8. Make `slots/` a generated copy of `library/components/` (or the reverse) with a test
   asserting byte equality (C4). Six identical HTML files with no guard is a bug waiting
   for one edit.

### P4 — distribution design

9. (e) mirror-freshness check; (b) a `conntent` release key; (d) content-sha pins for
   catalog-blueprint installs (§5).

### Tradeoffs to weigh before acting

- **Moving the allowlist into the catalog costs the current "existing refusal" guarantee.**
  `conntent-provider-neutral` deliberately froze `assertModelAllowed` ahead of the catalog
  route so an unlisted model keeps failing. Moving the allowlist into the catalog makes
  every catalog edit a spend-permission edit. If that trade is unacceptable, the honest
  compromise is: catalog is authoritative, and the engine holds only a *blocklist*
  (`DEFAULT_GUARD.blockedModels`) — which is what `spec_NN.md:806` implies, since it names
  the catalog as the owner of model knowledge.
- **A per-blueprint release key fragments the version story.** One `blueprints-v*` number is
  easier to reason about than 22. The cost is real; it is only worth paying for the one
  blueprint with an engine cadence.
- **Pinning content shas removes the readable release narrative** that the current process
  notes lean on. Keep the tag as the *name* of the release and put the sha in `commit` —
  that is what the manifest already promises and does not do for catalog installs.

---

## 7. Method

- Read the source, not the summary: `catalog.mjs`, `video-guard.mjs`, `guard-config.mjs`,
  `provider-transport.mjs`, `avatar-jobs.mjs`, `avatar-request.mjs`,
  `asset-cost-estimator.mjs`, `qa.mjs`, `hyperframes-render.mjs`, `library.mjs`,
  `compile.mjs`, `synthesize-avatar.mjs`, `layout.mjs`.
- Read the distribution lane: `release-keys.js`, `run-release.js`, `assemble-manifest.js`,
  `plan-auto-tags.js`, `.github/workflows/release.yml`, `ci.yml`, `publish-web-tree.js`.
- Read the installer: `skills/skills-manager.js` (`installBlueprintAtCommit`,
  `installEmbeddedSkills`, `cmdInstallBlueprint`, `cmdUpdate`, `status`), plus
  `tag-pin-freshness.js`, `skill-script-refs.js`, `no-phantom-providers.test.mjs`.
- Fetched the live manifest (7 skills, 8 blueprints; `nn-mcp` nested; no `workspace`).
- Read the **machine's** state, not a guess: `~/.agents/bootstrap-state.json`,
  `~/.agents/{catalog,library}`, and `skills-manager status` output (53 lines, quoted above).
- Hashed files to prove duplication (six component/slot pairs) and identity
  (`~/.agents/catalog/…` vs the repo catalog).
- Inspected the pinned CLI (`hyperframes@0.8.192`) for the type-floor constant and its
  `--strict` exit policy, rather than trusting the 28px figure.
- Ran three test files to confirm the passing-suite contradiction (`8 pass, 0 fail`).
- Not verified: whether HyperFrames exits non-zero on a warning *without* `--strict` in a
  project that also has errors (only the `ok` expression at `chunk-CXRZBWSH.js:1014` was
  read); the exact contents of `cogNNitive-web` beyond the paths quoted; and whether
  `pruna-ai/p-video/avatar` fails in exactly the three steps described, since reproducing it
  needs a domaiNN with a spending credential. The three mechanisms that would produce those
  three errors are each cited in §0/Fact 5 and §3/C13–C15.
