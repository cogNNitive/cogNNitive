# Design: Skill Channel Freshness Reporting

## 1. Architectural approach

### The constraint that decides everything

`skills/nn-preflight/scripts/preflight-check.js` is a **distributed standalone artifact**. It is
copied byte-for-byte to `~/.agents/skills/nn-preflight/` by
`scripts/lib/skills-commands.js:installSkillAtCommit`. On a user machine it has no git, no clone, no
tags, no `scripts/lib/**` import, and — unlike `scripts/lib/github-client.js:24-40` — **no GitHub
token detection at all** (`preflight-check.js:28-57` imports only `fs`/`os`/`path`/`http`/`https`/
`crypto` plus its own `./lib/yaml-lite` and `./upgrade-check`).

Therefore `git log <tag>..main -- <path>` is **structurally impossible** on the consumer side. Drift
must be computed by maintainer tooling and *shipped* as a value. Every other decision below falls out
of that one sentence:

> **Compute where git is. Publish through a pipe that already exists. Read where the fetch already
> happens. Print one line that can never block.**

### The second constraint, discovered during design (this one shrinks the change)

`scripts/verify.js` step 8 runs `node scripts/manifest/generate-manifest.js --channel stable --check`
on **every** verify run — local, PR, `dev`, and `main`. `generate-manifest.js`'s own docblock
(`:20-21`) states the contract it enforces:

> *"The render is a pure function of its inputs: no timestamp, no generator version, no run id.
> Regeneration with no upstream change is byte-identical."*

`commitsSincePin` is a function of `main`'s HEAD, which changes on every push. Writing it into
`docs/use/manifest.md` frontmatter — the proposal's Slice 2 — would make the committed manifest drift
from its own render on the next push and **turn verify step 8 red permanently**. Worse, it is an
unstable fixpoint: regenerating the manifest is itself a commit that changes the value being
regenerated.

The proposal's stated corollary that the tag date "can be baked in for free" via `resolveRef` is also
false: `github-client.js:171-200` returns `{ sha, kind }` and nothing else. A date would require a
**new** `api.github.com` call per ref plus an edit to `resolveRef`. (At the time of writing,
`resolveRef`'s tests stubbed `https.get` and would have silently stopped covering it; that
particular hazard was resolved on `dev` on 2026-09-22 by `f3dd42e` + `854fa11`. The decision stands
regardless — the objection that survives is the new API call, not the test coverage.)

**Consequence: the proposal's three slices collapse to two.** There is no manifest-embedding slice.
`generate-manifest.js`, `validate-manifest.js`, `github-client.js`, `manifest-rules.js`,
`manifest/source.yaml` and `lib/yaml-lite.js` are all **untouched**. See §8 for the spec amendments
this forces.

### Total footprint

One new script (+ its test), two lines of CI YAML, one `.gitignore` line, one fetch and one print
block in `preflight-check.js`, one doc line. No new subsystem, no abstraction layer, no config
schema, no plugin point, no dependency.

## 2. Architecture Decision Records

### ADR-001 — Freshness is a separate CI-generated `docs/use/freshness.json`, never manifest frontmatter

**Status:** accepted. **Overrides** the proposal's Slice 2.

| Option | Verdict |
| :-- | :-- |
| Fold `commitsSincePin`/`pinnedTagDate` into `docs/use/manifest.md` frontmatter | **Rejected** — breaks `verify.js` step 8's byte-identical `--check` guard on every push (§1); unstable fixpoint; needs a new API call for the date |
| Separate `docs/use/freshness.json`, generated in CI, published with the Pages artifact | **Chosen** |
| A GitHub Release asset / gist / third store | Rejected — new publish surface for zero gain |

**Rationale — the lifecycle mismatch is the whole decision.** `docs/use/manifest.md` is a
**release-time**, hand-committed, deterministic render whose freshness is enforced by a byte-compare.
Freshness is a **push-time**, volatile, non-deterministic measurement. Putting a per-push value inside
a per-release immutable render is a category error that the repo already has a guard against; the
guard would catch it, loudly, forever. Two lifecycles, two files.

**Precedent reused:** `docs/innfo/cdn/*.bundle.js` — gitignored (`.gitignore:12`), produced in the
`verify` job, and carried to Pages inside the `pages-docs` artifact (`ci.yml:66-72` →
`ci.yml:164-168`). `freshness.json` is exactly that shape. `docs/innfo/templates/catalog.json` is the
precedent for a JSON under `docs/` being served and consumed by preflight.

**Not committed to git.** A committed file would require CI to push back to `main`. Gitignored; it
exists only inside the CI workspace and the Pages artifact.

### ADR-002 — The pinned tag comes from `manifest/source.yaml`, not from the newest matching tag

**Status:** accepted. Refines proposal risk "per-subsystem tag prefixes".

`nn-dev-release` Option [a] (`SKILL.md:65-72`) runs `git tag -l "skills-v*" --sort=-creatordate`,
which answers *"what is the newest tag?"*. That is the **wrong question**. Users are pinned to
whatever `manifest/source.yaml`'s `channels.stable.refs` declares (`:201-212`:
`skills-v2.0.0`, `templates-v0.10.3`, `innfo-mcp-v0.9.0`, `innfo-console-v0.2.0`). A newly cut but
un-repinned tag would silently make the drift read zero while users still receive the old one.

**Decision:** read the stable `refs` map from `manifest/source.yaml` using the already-exported
`parseFocusedYaml` from `scripts/manifest/validate-manifest.js`. No new parser, no tag sorting, and
the number reported is *drift against what is actually shipped*.

**No-tag-yet / unresolvable ref:** if `git rev-parse <tag>^{commit}` fails, the subsystem is emitted
with `"commitsSincePin": null, "unresolved": "<reason>"`. Never omitted (silence would be
indistinguishable from zero drift), never zero.

### ADR-003 — Subsystem→paths is a hardcoded 4-entry table, directory-scoped

**Status:** accepted.

```js
const SUBSYSTEM_PATHS = {
  skills:          ['skills/'],
  templates:       ['iNNfo/specs/templates/'],
  'innfo-mcp':     ['iNNfo/packages/innfo-mcp/'],
  'innfo-console': ['iNNfo/specs/templates/console/'],
};
```

**Rejected: deriving paths from `source.yaml` entries.** The entries name *files*
(`iNNfo/specs/templates/business/spec_NN.md`, `.../innfo-mcp/bin/innfo-mcp.bundle.js`), so derivation
reproduces the single-file blindness this change exists to remove, and `dirname` of the mcp bundle
(`bin/`) misses `src/` entirely. Four literal directories are five lines, obviously correct, and
auto-cover any new skill added under `skills/`.

**Known overlap, recorded not fixed:** `innfo-console` lives under `iNNfo/specs/templates/`, so a
console commit counts in both `templates` and `innfo-console`. Acceptable for an informational
lower-bound signal; a `:(exclude)` pathspec is the upgrade path if it ever misleads. Goes in the
script as a `ponytail:` comment.

### ADR-004 — `preflight-check.js` makes ONE additional fetch, single URL, no fallback

**Status:** accepted.

| Option | Cost |
| :-- | :-- |
| Ride the existing manifest fetch (zero new requests) | Impossible after ADR-001 — the data is not in the manifest |
| Live `api.github.com` call from the user machine | **Forbidden** — 60 req/hr per IP, no token path (§1). Proposal non-goal |
| One extra `fetchWithTimeout('https://cognnitive.com/use/freshness.json', 4000)` | **Chosen** |

**Honest cost:** one additional HTTP request and up to 4s of added latency **in the worst case**, on a
check that already performs at least one (manifest) and often two (template catalog) network calls.
It is issued only *after* the manifest fetch succeeds, so an offline run adds nothing at all.

**One URL, no `raw.githubusercontent` fallback.** The file is not committed (ADR-001), so a raw
fallback would 404 by construction. `cognnitive.com` is the same Pages origin already declared
canonical for the template catalog (`preflight-check.js:47-55`). A single URL that degrades silently
is correct for a signal whose entire value is informational.

**Reuses `fetchWithTimeout` (`:141`)**, the same helper and the same 4000ms budget as the template
catalog — not `fetchString` (6000ms), because this is the same "optional enrichment" tier.

### ADR-005 — Degrade state machine: three states, `exitCode` untouched in all of them

**Status:** accepted. Mirrors `preflight-check.js:920-934` and `:892-900`.

| State | Behaviour | Precedent |
| :-- | :-- | :-- |
| Fetched, parsed, tag matches the manifest | print one line per subsystem with `commitsSincePin > 0` | new |
| Fetch fails / JSON invalid / fields absent (older nn-preflight, stale cache) | **silent omission** — no item, no summary key, no line | — |
| Manifest itself unreachable | already returns at `:934`; freshness is never fetched | `:920-934` |

`exitCode` is **never** written by this code path. The freshness block contains no assignment to
`results.status` or `results.exitCode` — that absence is the contract, and it is asserted by test.

**The anti-alarm guard (one line, load-bearing).** Print only when
`freshness.subsystems[key].pinnedTag === <the ref the manifest just reported>`. If a new tag was cut
and repinned but the freshness file is stale, the tags disagree and the line is **silently dropped**.
This makes a stale file structurally incapable of being more alarming than no file: it can only
under-report (its count is a lower bound against an older HEAD) or fall silent. It also means the
"unreachable notice" the proposal permits is deliberately **not** implemented — see §7.

**Placement:** the print block goes with the `templateCatalogOffline` notice at `:1155-1157`, i.e.
**before** both early returns at `:1162` (manifest unreachable) and `:1174` (status OK). Putting it
after either would make the line invisible in the common green case — the exact case it exists for.

**Scope of the printed line: skills and templates only.** `parseManifest` (`:119-130`) exposes only
`skills[]` and `templates[]`, each carrying the `ref` needed for the anti-alarm guard. MCP and console
drift stay in the JSON for maintainers. Widening `parseManifest` to reach them is a change to a parser
for two lines nobody asked for.

### ADR-006 — `yaml-lite` is not touched. VERIFIED.

**Status:** accepted. Closes the proposal's High-severity UNVERIFIED item.

Read in full (`skills/nn-preflight/scripts/lib/yaml-lite.js:107-120`): `parseFocusedYaml` builds
`result[key] = value` for **every** key it matches against `/^([A-Za-z0-9_.\-]+)\s*:\s*(.*)$/` — it
is a generic map builder with no key allowlist. Unknown top-level keys and nested blocks pass through
unconditionally. **Verdict: yaml-lite tolerates unknown keys; no change would have been needed.**

But the known divergence is real and worth recording: `parseScalar` (`:8-24`) returns `true`, `false`,
`null`, unquoted strings, and arrays — **it never returns a number**. A frontmatter `commitsSincePin: 9`
would reach `preflight-check.js` as the string `"9"`, exactly the hazard documented for `level`. After
ADR-001 the data arrives via `JSON.parse`, which yields a real number. The divergence is not worked
around; it is **routed around**.

### ADR-007 — `fetch-depth: 0` on the `verify` job checkout. VERIFIED as required.

**Status:** accepted. Closes the proposal's second High-severity UNVERIFIED item.

`actions/checkout@v4` at `ci.yml:21` has no `with:` block, so it uses the documented defaults
`fetch-depth: 1` and `fetch-tags: false`: a single-commit shallow clone with **no tags at all**.
`git log <tag>..HEAD` would fail with `unknown revision`. The proposal's suspicion is correct, and
`nn-dev-release` Option [a] runs on a maintainer's full local clone — this path has never been
exercised in CI.

| Option | Verdict |
| :-- | :-- |
| `fetch-tags: true` with default depth 1 | **Rejected** — fetches tag *refs* onto a shallow graft; `<tag>..HEAD` has no common ancestry and silently miscounts. Worse than failing |
| A `git fetch --unshallow --tags` step before the freshness step | Rejected — two lines and a second network op to reproduce what one option does |
| `with: { fetch-depth: 0 }` on `ci.yml:21` | **Chosen** |

**Cost, stated:** a full-history clone for the `verify` job on every push and PR, replacing a
single-commit one. This is the one real cost the change imposes on CI. The `quality`,
`spec-integrity` and `deploy-pages` checkouts are **not** changed.

**Step placement is load-bearing.** `deploy-pages` does not rebuild — it downloads the `pages-docs`
artifact (`ci.yml:163-168`). The freshness step must therefore run **inside `verify`, before the
`Upload built docs` step at `ci.yml:66`**, or the file never reaches Pages. It is also
`if: github.ref == 'refs/heads/main'`-gated for the same reason the upload is.

**Never blocking:** the step is `continue-on-error: true`. A failure to measure drift must not redden
`main` and block the Pages deploy — that would be a strictly worse outcome than the silence being
replaced.

### ADR-008 — A `git log` walk, not an extension of `checkTemplateMainCoherence`

**Status:** accepted. Confirms the proposal with the comparison shown rather than asserted.

| Axis | `checkTemplateMainCoherence` (`manifest-rules.js:247-272`) | `git log <tag>..HEAD -- <dir>` |
| :-- | :-- | :-- |
| Scope | one pinned **file**, byte-compared | whole **directory tree** |
| Subsystems | `templates` only (`:461`); **no skills counterpart exists** | all four, one table entry each |
| Cost | 2 raw-content HTTP fetches **per file** (≈34 fetches for 17 templates) | one local process, zero network |
| Wiring | push-to-`dev` only, `continue-on-error` (`ci.yml:56-61`) | push-to-`main`, where users are pinned |
| Answer | "did this file's bytes change?" | "how far has this subsystem moved?" |

This repo has a documented history of reimplementing rather than reusing, so the question was asked
seriously: extending the existing rule would mean adding a skills branch, a directory-walk mode, and a
per-file fetch fan-out to a network-bound function, then rewiring it onto `main` — strictly more code
than the ~90-line script, and it would still answer the wrong question. **Reuse is correctly rejected
here; reuse happens instead at the helper level** (`parseFocusedYaml`, `saveJsonAtomic`,
`fetchWithTimeout`, the `pages-docs` artifact, `verify.js` step 0b test discovery — five existing
primitives, no new ones).

`checkTemplateMainCoherence` and `ci.yml:56-61` are left exactly as they are.

## 3. Data flow

```
push to main
 └─ ci.yml : job `verify`   [checkout fetch-depth: 0  ← ADR-007]
     ├─ npm ci ; npm run build:docs
     ├─ node scripts/verify.js --release
     ├─ [NEW] node scripts/freshness.js          (main only, continue-on-error)
     │    ├─ read manifest/source.yaml → parseFocusedYaml → channels.stable.refs   [ADR-002]
     │    ├─ per ref_key: git rev-parse <tag>^{commit}
     │    │                git log -1 --format=%cI <tag>          → pinnedTagDate
     │    │                git log <tag>..HEAD --oneline -- <dirs> → commitsSincePin
     │    │                git diff --name-only <tag>..HEAD -- <dirs> → filesTouched
     │    └─ saveJsonAtomic('docs/use/freshness.json', …)          [Windows-safe, ADR-009]
     └─ Upload built docs (pages-docs artifact, path: docs)   ← MUST come after
 └─ deploy-pages : download pages-docs → https://cognnitive.com/use/freshness.json

user machine
 └─ preflight-check.js
     ├─ fetchString(manifest)  ─ fails → return at :934, freshness never attempted
     └─ fetchWithTimeout(freshness.json, 4000)   [ADR-004]
          ├─ throws / bad JSON / missing key → silent, no item, no line
          └─ subsystems[k].pinnedTag === manifest ref ?   [anti-alarm guard, ADR-005]
                └─ print at :1155, before both early returns
                   exitCode: untouched, always
```

### `docs/use/freshness.json`

```json
{
  "generatedAt": "2026-09-22T10:14:03Z",
  "head": "2465a8a",
  "subsystems": {
    "skills": {
      "pinnedTag": "skills-v2.0.0",
      "pinnedTagDate": "2026-09-16T08:41:12Z",
      "paths": ["skills/"],
      "commitsSincePin": 9,
      "filesTouched": 14
    },
    "innfo-console": { "pinnedTag": "innfo-console-v0.2.0", "commitsSincePin": null, "unresolved": "tag not found in checkout" }
  }
}
```

`generatedAt` and `head` exist so a maintainer can tell a stale file from a confident wrong one. They
are **not** read by `preflight-check.js` — staleness is handled by the tag-equality guard (ADR-005),
not by a user-side age threshold, which would be a config knob for a value that never changes.

### Printed line

```
ℹ️  Channel freshness: skills pinned to skills-v2.0.0 (6 days old); main has 9 later
    commit(s) touching skills/ — informational, not a blocker.
```

"6 days old" is computed at print time from `pinnedTagDate`, so the phrasing cannot go stale.
Subsystems with `commitsSincePin === 0` or `null` print nothing.

## 4. File changes

| File | Action | Description |
| :-- | :-- | :-- |
| `scripts/freshness.js` | Create | ~90 lines. Exports `computeFreshness({ sourceYaml, runGit, head })` (pure, injectable git) + a CLI that writes `docs/use/freshness.json` via `saveJsonAtomic`. |
| `scripts/freshness.test.js` | Create | Auto-discovered by `verify.js` step 0b (`collectTestSuites(scripts/)`) — no wiring needed. |
| `.github/workflows/ci.yml` | Modify | `with: { fetch-depth: 0 }` on the `verify` checkout (`:21`); one `main`-gated `continue-on-error` step **before** `:66`. |
| `.gitignore` | Modify | `docs/use/freshness.json`, beside the `docs/innfo/cdn/*.bundle.js` precedent. |
| `skills/nn-preflight/scripts/preflight-check.js` | Modify | One `FRESHNESS_URL` const; one guarded `fetchWithTimeout` after the manifest parse; one print block at `:1155`. |
| `skills/nn-preflight/scripts/preflight-check.test.js` | Modify | Degrade-path and no-exitCode cases. |
| `skills/nn-skills-lifecycle/SKILL.md:48` | Modify | `~/.agents/skills-state.json` → `~/.agents/bootstrap-state.json`. |

**Deliberately untouched:** `generate-manifest.js`, `validate-manifest.js`, `github-client.js`,
`manifest-rules.js`, `manifest/source.yaml`, `lib/yaml-lite.js`, `build-docs.mjs`, `verify.js`,
`atomic-fs.js`, `skills-commands.js`, and `ci.yml:56-61`.

### ADR-009 — Windows write precedent

The CLI writes through `saveJsonAtomic` (`scripts/lib/atomic-fs.js:21-34`) rather than
`fs.writeFileSync`. Free reuse, and it inherits the temp-file-then-rename behaviour and the cleanup
path. `docs/use/` is a plain directory, so the `EBUSY`/`EPERM` directory-lock message at
`atomic-fs.js:78-83` does not apply; the CLI catches a write failure and exits with a named message
(`FAIL: could not write docs/use/freshness.json: <code>`) rather than a raw stack trace, matching that
precedent's intent.

## 5. Verification strategy (Strict TDD Mode)

Runner: `npm run verify` (step 0b discovers both new/changed test files automatically).

| Slice | TDD | Cycle |
| :-- | :-- | :-- |
| 1 — `scripts/freshness.js` | **Yes** | RED: `computeFreshness` with a stubbed `runGit` → (a) two subsystems, distinct tags, distinct counts; (b) an unresolvable tag → `commitsSincePin: null` + `unresolved`, not `0`; (c) zero commits since pin → `0`; (d) `git` throwing → that subsystem `unresolved`, siblings still computed; (e) output key order stable. No real git, no network. |
| 1 — CI wiring | No | The artifact is CI config. Falsification: first push to `main` — the step runs, `docs/use/freshness.json` appears in the `pages-docs` artifact, and `https://cognnitive.com/use/freshness.json` resolves. A test asserting `ci.yml` contains its own text is tautological and is not written. |
| 2 — `preflight-check.js` | **Yes** | RED in `preflight-check.test.js`: (a) freshness present + tag matches → line printed, `exitCode` unchanged; (b) fetch rejects → no line, no item, `exitCode` unchanged; (c) tag mismatch (stale file) → **no line**; (d) malformed JSON → no line, no throw; (e) `commitsSincePin: 0` → no line. Case (b) is the one that matters: it is the only proof the signal cannot block. |
| 2 — doc line | No | `rg skills-state.json skills/nn-skills-lifecycle/` returns only legacy-migration references. |

`npm run lint`, `npm run typecheck`, `npm run verify` green per slice.

## 6. Slices, order, independence

| PR | Slice | Files | Est. lines | Depends on |
| :-- | :-- | :-- | :-- | :-- |
| 1 | CI freshness computation + published JSON | `scripts/freshness.js`, `scripts/freshness.test.js`, `ci.yml`, `.gitignore` | ~170 (incl. test) | — |
| 2 | preflight line + `nn-skills-lifecycle` doc fix | `preflight-check.js`, `preflight-check.test.js`, `nn-skills-lifecycle/SKILL.md` | ~90 | PR 1 (reads its JSON) |

Both well under the 400-line review budget; no `size:exception` needed.

**Slice 1 stands alone.** Even if slice 2 never ships, `docs/use/freshness.json` plus the CI step give
maintainers the drift signal immediately, surfaceable from `nn-dev-release` Option [a] next to the
per-subsystem tags it already prints.

**Ordering is a real dependency, not a preference:** slice 2 reads a URL slice 1 creates. Shipping 2
first prints nothing — which is the correct degrade, but also zero value.

Per `single-dev-branch-workflow`, each slice is one self-contained revertible commit on `dev`, not a
feature branch.

## 7. Cut from scope (ponytail)

| Cut | Why |
| :-- | :-- |
| Embedding freshness in `manifest.md` frontmatter (proposal Slice 2) | Breaks `verify.js` step 8's byte-identical guard; unstable fixpoint (ADR-001) |
| `pinnedTagDate` via `resolveRef` | Needs a new API call; `resolveRef` returns `{sha, kind}` only, and its tests stub `https.get`. Local `git log -1 --format=%cI` is free |
| Any change to `yaml-lite.js` | Verified unnecessary — generic map builder (ADR-006) |
| An "unreachable" warning item when the freshness fetch fails | Would make a Pages hiccup noisier than the silence it replaces. Silence is the correct degrade for an optional enrichment |
| A user-side staleness age threshold on `generatedAt` | A config knob guarding a case the one-line tag-equality check already handles (ADR-005) |
| `raw.githubusercontent` fallback URL | The file is not committed; the fallback would 404 by construction (ADR-004) |
| Widening `parseManifest` to expose mcp/console refs | Two subsystems, two lines, nobody asked. They stay in the JSON for maintainers (ADR-005) |
| Deriving subsystem paths from `source.yaml` entries | Reproduces the single-file blindness being removed; `dirname` of the mcp bundle misses `src/` (ADR-003) |
| Extending `checkTemplateMainCoherence` | More code, wrong question, network-bound (ADR-008) |
| `fetch-tags: true` instead of `fetch-depth: 0` | Silently miscounts on a shallow graft (ADR-007) |
| Any new `api.github.com` call | Proposal non-goal; 60 req/hr per IP, no token path |
| Per-file hashes, signatures, checksum manifests | Explicit fixed user constraint |
| Any production code for atomic state writes | Already correct (`atomic-fs.js:21-34`, `skills-commands.js:221-225,584,685,878`). At most one write-order unit test, and even that is optional |
| A blocking gate anywhere | `exitCode` is never touched; the CI step is `continue-on-error` |

## 8. Spec amendments required

`sdd-spec` is authoring deltas in parallel from the proposal's **three**-slice framing. Two published
assumptions are now known to be wrong and `sdd-tasks` must carry these forward:

1. **Slice 2 (manifest embedding) does not exist.** Any scenario requiring `generate-manifest.js` to
   write `pinnedTagDate` / `commitsSincePin` into `docs/use/manifest.md` frontmatter must be deleted,
   with the reason recorded: it breaks the `--check` determinism contract at `verify.js` step 8
   (ADR-001). The delivery table becomes two slices, not three.
2. **`preflight-check.js` reads `freshness.json`, not manifest frontmatter.** Any scenario phrased as
   "reads the new frontmatter fields from the manifest it already fetches" must be rephrased as one
   additional guarded `fetchWithTimeout` of `https://cognnitive.com/use/freshness.json` (ADR-004),
   including the tag-equality guard (ADR-005).
3. **The "+ `yaml-lite` if needed" conditional is resolved: not needed** (ADR-006). Any spec text
   leaving it open should be closed.
4. The informational contract table in the proposal stands **unchanged and binding**, with one
   tightening: the "unreachable → non-blocking notice" row becomes **silent omission** for the
   freshness fetch specifically (§7). The manifest-unreachable warning at `:920-934` is untouched.

## 9. Residual risks

| Risk | Severity | Handling |
| :-- | :-- | :-- |
| `fetch-depth: 0` slows the `verify` job on every push and PR | Medium | The only real cost imposed. Scoped to one job. If clone time becomes material, the upgrade path is moving the freshness step to its own `main`-only job with its own deep checkout — more YAML, same signal |
| The freshness step silently stops running; the Pages copy goes stale | Low | `generatedAt`/`head` make it legible; the tag-equality guard makes it self-silencing after the next repin (ADR-005) |
| One extra user-side request and up to 4s latency | Low | Issued only after a successful manifest fetch; same budget as the template catalog |
| `git log --oneline` output parsed by line count | Low | Use `git rev-list --count <tag>..HEAD -- <dirs>` rather than counting `--oneline` lines — no parsing, no empty-line edge case. Recorded here so the implementer does not reach for the proposal's literal command |
| Console commits double-counted under `templates` | Low | Informational lower bound; `:(exclude)` pathspec is the recorded upgrade path (ADR-003) |
| A reader treats `commitsSincePin` as "unsafe to install" | Low | The printed line ends with "informational, not a blocker" and the status/exit path is untouched and test-asserted |
| Someone later reopens manifest embedding | Low | ADR-001 records the `verify.js` step 8 proof; §8 propagates it into the specs |
