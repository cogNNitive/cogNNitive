# Proposal: Skill Channel Freshness Reporting

## Intent

`nn-preflight` reports `skillsOutdated: 0` and it is **true**. That is the problem.

The check answers *"does my install match the pinned commit?"* The user reads it as *"do I have the
latest?"* Those are two different questions, and today one green OK stands in for both. Nothing is
broken: `skills/nn-preflight/scripts/preflight-check.js:950` compares `recorded.commit` against the
manifest commit and reports honestly on that comparison. The defect is **semantic** — the report
conflates channel conformance with channel freshness, and the second question has no answer anywhere
in the system.

This change does not fix a check. It adds the missing second fact, and prints it.

### The drift is not an incident, it is a trajectory

Measured against `origin/main` on 2026-09-22:

| Fact | Value |
| :-- | :-- |
| Pinned stable skills tag | `skills-v2.0.0` = `6ad8eb8`, tagged 2026-09-16 (6 days old) |
| `origin/main` head | `2465a8a` (2026-09-21) |
| Commits on `main` touching `skills/` and NOT in the tag | **9** |
| Commits on `main` touching `iNNfo/specs/templates/` beyond `templates-v0.10.3` | **3** |
| Manifest pins in `docs/use/manifest.md` | still `skills-v2.0.0` / `6ad8eb8…` for all 8 skills |

Two of those nine are bug fixes stranded outside the stable channel that every user installs from:

- `68244e9` fix(innfo-core): ignore empty and dash matrix cells when building relationship graph edges
- `68413fd` fix(parser): normalize level to number at frontmatter boundary — **this commit modifies
  `skills/nn-preflight/scripts/preflight-check.js` itself**, the very script whose "OK" the user was
  reading

Plus `974b91b`, `021baa6`, `9c58e11`, `6eade50`, `b3f3677`, `4b7ed5e`, `78a2187`.

An earlier audit of the same gap counted **3** commits of drift. Six days later it is **9**, and the
only reason anyone knows is that a human ran a manual GitHub API query. There is no mechanism in the
repo that would ever have said this out loud. **The drift compounds silently, and silence is the
deliverable we are replacing.**

### Why the existing coherence check does not already cover this

`checkTemplateMainCoherence` (`scripts/manifest/lib/manifest-rules.js:247-272`) exists, but it is
scoped away from this problem on four independent axes:

| Axis | `checkTemplateMainCoherence` | What this problem needs |
| :-- | :-- | :-- |
| Subsystem | `templates` only (`manifest-rules.js:461`) — **no skills counterpart exists** | per-subsystem, including `skills/` |
| Granularity | single pinned **file** byte-compare | whole directory tree |
| Cost | two raw-content fetches **per file** | one local `git log` walk |
| Wiring | push-to-`dev` only, `continue-on-error: true` (`.github/workflows/ci.yml:56-61`) | runs where users are pinned: `main` |

The exact scenario the user hit — a `skills/` fix landing on `main` outside a tag — would not have
been caught even if that step ran on `main`, because there is no skills equivalent and because a
sibling file changing next to `SKILL.md` is invisible to a single-file compare. Extending it is the
obvious move and it is the wrong one: a `git log --oneline <tag>..HEAD -- <path>` walk is smaller,
directory-scoped, network-free, and already precedented in `nn-dev-release` Option [a]
(`git tag -l "skills-v*" --sort=-creatordate`).

## The architectural constraint that decides the design

`preflight-check.js` is **copied to end-user machines** at `~/.agents/skills/nn-preflight/` by
`scripts/lib/skills-commands.js:installSkillAtCommit`. On a user machine it has:

- no git (no clone, no tags, no log)
- no import of `scripts/lib/github-client.js` or any maintainer-side module
- its own hand-rolled `fetchString`/`fetchWithTimeout` (`preflight-check.js:63,141`)
- **no GitHub token detection at all**, unlike `github-client.js:24-40` which reads
  `GITHUB_TOKEN`/`GH_TOKEN`/`gh auth token`

So `git log <tag>..main -- <path>` is structurally impossible inside nn-preflight. That leaves two
ways to get "main has moved past the tag" onto a user's screen:

| Option | Cost |
| :-- | :-- |
| (a) live unauthenticated `api.github.com` call from every user machine | 60 req/hr **per IP**, shared with everything else on that network, no token path to raise it — a new rate-limit failure mode on a check whose whole job is to be quiet and reliable |
| (b) read a value computed server-side, published through the CDN pattern nn-preflight **already uses** | zero new dependency, zero new rate-limit surface, zero new fetch shape |

Option (b) reuses `DEFAULT_MANIFEST_URL` / `DEFAULT_TEMPLATE_CATALOG_URL` /
`FALLBACK_TEMPLATE_CATALOG_URL` (`preflight-check.js:37,54,56`) — primary+fallback URL, 4-6s timeout —
and the offline-degrade shape already proven at `:920-934` and `:892-900`. **We take (b).**

The reframing that follows: this is not three efforts, it is **one pipeline** — and a shorter one than
first thought (see "Corrected during design" below). CI computes freshness → publishes a small JSON →
preflight fetches it directly. P1's output is P2's input; there is no manifest-embedding step in
between.

**Corrected during design:** the claim below that the pin date "can be baked in for free" via
`resolveRef` does not hold. `scripts/lib/github-client.js:171-200` shows `resolveRef` returns only
`{ sha, kind }` — no date. Getting the tag date that way would need a **new** `api.github.com` call on
the one function whose tests stub `https.get`, silently losing coverage. The pin date is instead
computed the same way the drift count is: locally, in the CI freshness job, via
`git log -1 --format=%cI <tag>` — free, no new API call, no `resolveRef` change. See `design.md`
ADR-001/ADR-004 and §8.

## Scope

**Corrected during design: this is now two slices, not three.** The manifest-embedding slice
originally proposed below as "Slice 2" was cut during `sdd-design` — see "Corrected during design:
manifest embedding is deleted" further down for the reason. `generate-manifest.js`,
`validate-manifest.js`, `github-client.js`, `manifest-rules.js`, `manifest/source.yaml` and
`lib/yaml-lite.js` are all **untouched** by this change; only `scripts/freshness.js` (new) and
`preflight-check.js` change behavior.

### In scope

1. **Slice 1 — CI freshness computation (maintainer side).** On push to `main`, per subsystem
   (`skills/`, `iNNfo/specs/templates/`, `iNNfo/packages/innfo-mcp/`), compute drift with
   `git rev-list --count <last-matching-tag>..HEAD -- <path>` (not a line count of
   `git log --oneline`, which has parsing edge cases `rev-list --count` avoids) and publish
   `{ subsystem, pinnedTag, pinnedTagDate, commitsSincePin, filesTouched }` as a small JSON
   (e.g. `docs/use/freshness.json`) through the existing Pages/`build-docs.mjs` publish pipeline.
   Pure local git. No API call, no auth, no rate limit.
2. **Slice 2 — one informational line in nn-preflight.** `preflight-check.js` makes one additional
   guarded fetch of the published `freshness.json` (it does **not** read new manifest frontmatter
   fields — there is no manifest-embedding step, see below) and prints one line:

   > Pinned to `skills-v2.0.0` (6 days old); `main` has 9 later commit(s) touching `skills/` —
   > informational, not a blocker.

   This fetch is guarded by the same tag-equality check the manifest fetch already provides: the
   line is only printed when the freshness JSON's `pinnedTag` for a subsystem matches the tag the
   manifest just reported for that subsystem. If a new tag was cut and repinned but the freshness
   file is stale, the tags disagree and the line is silently dropped — a stale freshness file can
   only under-report or fall silent, never over-alarm.

3. **Doc-drift fix (small, same surface).** `skills/nn-skills-lifecycle/SKILL.md:48` documents the
   state file as `~/.agents/skills-state.json`. The real file is `~/.agents/bootstrap-state.json`
   (`preflight-check.js:43`, `skills-commands.js:42`); `skills-state.json` is only the legacy
   migration source (`skills-commands.js:43,97-98`). Slice 2 touches this reporting surface anyway.

### Corrected during design: manifest embedding is deleted

The proposal originally planned a "Slice 2" that had `generate-manifest.js` write `pinnedTagDate` /
`commitsSincePin` into `docs/use/manifest.md` frontmatter. `sdd-design` rejected this: `scripts/verify.js`
step 8 runs `generate-manifest.js --channel stable --check` on every verify run and enforces that
regeneration with no upstream change is byte-identical. `commitsSincePin` is a function of `main`'s
moving HEAD, so embedding it in the committed manifest would make the manifest drift from its own
render on the very next push and turn that `--check` guard red permanently — it is also an unstable
fixpoint, since regenerating the manifest is itself a commit that changes the value being embedded.
`docs/use/freshness.json` is a separate, gitignored, CI-generated file instead: two different
lifecycles (release-time deterministic render vs. push-time volatile measurement) stay in two
different files. See `design.md` ADR-001.

### Non-goals (fixed user constraints — do not relitigate)

- **Tamper / integrity protection is OUT.** No per-file content hashes, no signatures, no checksum
  manifests, no verification of installed file contents against anything. The user's position is
  explicit: if someone hand-edits a `SKILL.md`, that is the editor's own problem. This change does
  not design integrity verification against the user.
- **The stable-channel tag-pinning model STAYS.** Pinning to tags is the desired behavior. Nothing
  here proposes tracking `main`, auto-updating from `main`, or weakening the channel.
- **No new blocking gate.** The freshness signal never changes an exit code (see below).
- **No new `api.github.com` calls anywhere.** Slice 1 is local git; Slice 2's one new fetch targets
  the Pages origin (`cognnitive.com`), reusing the existing `fetchWithTimeout` helper and budget — not
  `api.github.com`.
- **No extension of `checkTemplateMainCoherence`.** Superseded, for the four reasons tabulated above.
- **No new dependency**, in the repo or in the distributed skill.

### Investigated and closed: atomic state writing (was "P3")

The original instinct was to build a guard so a crashed install could not leave the state file
claiming success over a broken disk. **The code already does this.** Recorded here with evidence so
nobody reopens it:

| Claim | Evidence |
| :-- | :-- |
| State writes are atomic | `scripts/lib/atomic-fs.js:21-34` — `saveJsonAtomic` writes a temp file then `rename`s |
| State is written once, after the full loop | `skills-commands.js:584`, `:685`, `:878` — a single `saveState` per command, post-loop |
| State is mutated only after the directory swap succeeds | `skills-commands.js:221-225` — `state.skills[name] = {...}` runs at the tail of `installSkillAtCommit`, after `replaceDirAtomic`/`copyDirAtomic` (themselves rename-based, `atomic-fs.js:42-54,63-83`) returned |

The feared failure mode (state says OK, disk is broken) **cannot currently happen**. A crash
mid-batch leaves the state file describing the old, still-consistent disk; at worst it *under*-reports
— an item looks outdated when it is fine — a harmless false-stale flag that self-heals on the next
`update`.

**Decision: close as already correct. Build nothing here.** Writing production code for a solved
problem is precisely the failure this repo's `ponytail` discipline exists to prevent. If a
belt-and-suspenders regression guard is ever wanted, the maximum justified version is one unit test
asserting the write order — not new production code.

This is the strongest section of the proposal, and it delivers zero lines of production code.

## The informational contract (non-negotiable)

The new signal **MUST** mirror the existing offline-degrade behavior exactly:

| Situation | Behavior | Precedent |
| :-- | :-- | :-- |
| Freshness data present, tag matches the manifest | print one line | new |
| Manifest reachable, fields absent (stale cache, older nn-preflight) | **print nothing** — silence, not a warning | — |
| Manifest itself unreachable | non-blocking notice only, **unchanged by this feature** | `preflight-check.js:920-934` (`manifest.reachable=false`), `:892-900` (`templateCatalogOffline`) |
| Freshness fetch specifically fails, times out, or returns a tag mismatch | **silent omission** — no item, no line, no notice (corrected during design; see below) | ADR-005 |
| Any of the above | `exitCode` **unchanged**, always | both of the above |

**Corrected during design: the freshness-fetch row is tightened from "non-blocking notice" to
silent omission.** The rest of this table stands unchanged and binding, including the untouched
`preflight-check.js:920-934` manifest-unreachable warning. But for the freshness fetch specifically,
`sdd-design` found that an "unreachable" notice would make an ordinary Pages hiccup noisier than the
silence it replaces, for a signal whose entire value is optional enrichment — so a failed, timed-out,
or tag-mismatched freshness fetch produces nothing at all, not even a notice. See `design.md` ADR-005
and §7.

A freshness line that blocks a user's workflow because GitHub Pages was slow is a regression, not a
feature. There is no configuration in which this signal becomes a blocker.

## Resolved product decisions

Four product questions were left open when this proposal was drafted. All four are now decided, each
resolved toward the simpler implementation. Recorded so the implementer does not re-open them:

| Question | Decision | Why this is the simpler option |
| :-- | :-- | :-- |
| Does the line print when drift is zero? | **Yes, always print.** | Printing unconditionally is one branch fewer than gating on drift, and pin identity plus age is useful at zero drift anyway. |
| Is there a threshold above which the signal escalates? | **No.** | Reports a count and nothing else — no verdict, no severity, no colour, no configuration. A threshold is a product rule nobody asked for and would need its own justification. |
| Is the signal aimed at maintainers or end users? | **Maintainers first.** | Framing only; no code impact. It is why Slice 1 carries standalone value and Slice 2 is distribution. |
| Should the maintainer side block a release on high drift? | **No. Never a gate.** | The value of this change is that it says a true thing out loud. The moment it can stop someone's work, its failure modes — stale Pages, slow CDN, absent tags in CI — become everyone's problem instead of nobody's. |

Related delivery decision: Slice 1 takes `fetch-depth: 0` on the existing `verify` job rather than a
separate `main`-only job with its own deep checkout. The separate job is more YAML for the same
signal; the deep-checkout cost is accepted, and design §9 records the split as the upgrade path if
clone time ever becomes material.

## Delivery: two dependency-ordered slices

**Corrected during design: three slices collapsed to two** once manifest embedding was cut (see
"Corrected during design: manifest embedding is deleted" above).

| PR | Slice | Depends on | Scope sketch |
| :-- | :-- | :-- | :-- |
| 1 | CI freshness computation + published JSON | — | one new script under `scripts/`, one CI step, `fetch-depth: 0` on the `verify` job's checkout |
| 2 | preflight reporting line + `nn-skills-lifecycle` doc fix | PR 1 (fetches its published JSON) | one guarded fetch + one output line in `preflight-check.js`, one doc line |

**First-slice scope boundary — Slice 1 stands alone.** It is the only slice with standalone
user-visible value if Slice 2 never ships: the published JSON plus the CI job give maintainers a
drift signal immediately, surfaceable in `nn-dev-release` Option [a] alongside the per-subsystem tags
it already prints (`nn-dev-release/SKILL.md:64-72`). Slice 2 carries that same fact outward to end
users; it is distribution, not discovery.

Slice 2 is strictly ordered after Slice 1: Slice 2 fetches a URL Slice 1 creates. Shipping Slice 2
first would print nothing — the correct degrade, but zero value.

Total footprint target: **one new CI script, one guarded fetch, one output line.** No new subsystem,
no abstraction layer, no config schema. If this change starts growing beyond that, it has overshot
and the scope should be cut back to Slice 1.

## Risks

| Risk | Severity | Note / mitigation |
| :-- | :-- | :-- |
| **VERIFIED BROKEN — CI checkout lacks tags.** `actions/checkout@v4` at `ci.yml:21` is a bare `- uses: actions/checkout@v4` with no `with:` block, so it defaults to `fetch-depth: 1`, `fetch-tags: false` — no tags at all. `git log <tag>..HEAD` (or `git rev-list --count`) would fail with `unknown revision` | High | **Confirmed, not a guess.** Required fix: `with: { fetch-depth: 0 }` on the `verify` job's checkout only (`ci.yml:21`) — the `quality`, `spec-integrity`, and `deploy-pages` checkouts are untouched. `fetch-tags: true` at depth 1 was considered and rejected: it fetches tag *refs* onto a shallow graft, so `<tag>..HEAD` has no common ancestry and **silently miscounts** — worse than failing outright. `nn-dev-release` Option [a] runs on a maintainer's full local clone, so this path had genuinely never been exercised in CI. **Real cost, stated plainly: `fetch-depth: 0` gives the `verify` job a full-history clone on every push and PR, replacing a single-commit one — that is the one genuine price this change imposes on CI, and it should stay visible rather than be buried in a mitigation note.** |
| **VERIFIED TOLERANT, and now moot — `yaml-lite` unknown-key handling.** `preflight-check.js:34` imports `./lib/yaml-lite`, NOT the maintainer `scripts/lib/yaml-parser.js` | Closed | Read in full: `yaml-lite.js:107-120`'s `parseFocusedYaml` builds `result[key] = value` for every key it matches — a generic map builder with no allowlist, unknown top-level keys pass through unconditionally. **No change to `yaml-lite.js` would have been needed even under the original manifest-embedding plan.** It is also now moot: `preflight-check.js` never reads manifest frontmatter for freshness at all (manifest embedding was cut — see above); it fetches `freshness.json` directly via `JSON.parse`, which yields real numbers regardless of `yaml-lite`. The one real divergence worth recording for posterity: `parseScalar` (`yaml-lite.js:8-24`) never returns a number (a frontmatter `commitsSincePin: 9` would arrive as the string `"9"`) — not worked around, simply no longer on the path. |
| **No longer applicable — `github-client.js` / `resolveRef` test coverage.** Originally flagged because the (now-deleted) manifest-embedding slice would have touched `generate-manifest.js`, which calls `resolveRef` | N/A | `generate-manifest.js` and `github-client.js` are untouched by this change (manifest embedding was cut). The underlying hazard — `resolveRef`'s tests stubbed `https.get`, so a migration to global `fetch` would have silently disabled rather than failed them — was **resolved on `dev` on 2026-09-22** by `f3dd42e` (migrate `github-client` to global `fetch`) and `854fa11` (stub global `fetch` instead of `https.get`), landed as one work unit. Nothing remains to carry here. |
| **Per-subsystem tag prefixes must be respected.** `skills-v*`, `templates-v*`, `innfo-mcp-v*`, `innfo-console-v*` (`nn-dev-release/SKILL.md:65-72`). A naive repo-wide "since last tag" number would misattribute, e.g. an iNNfo Suite release's commits counted as skills drift | Medium | Compute per subsystem against its own last matching tag. Current latest: `skills-v2.0.0`, `templates-v0.10.3`, `innfo-mcp-v0.9.0`, `innfo-console-v0.2.0` |
| **Offline degrade not implemented exactly.** Getting this wrong produces spurious blockers on flaky networks | Medium | Mirror `preflight-check.js:920-934` literally for the manifest-unreachable case; see the contract table above for the (stricter, silent) freshness-fetch case. Low risk if followed |
| **Windows error-message precedent.** `replaceDirAtomic` (`atomic-fs.js:78-83`) already carries a Windows-specific `EBUSY`/`EPERM` message for locked directories (AV / editor holding a handle) — a recurring real issue on this project | Low | Any new file-writing code follows that error-message precedent, not a raw stack trace. (`saveJsonAtomic` uses `path.join` + `fs.renameSync`; same-volume rename is atomic on NTFS, no special-casing needed) |
| Published `freshness.json` goes stale if the CI job silently stops running | Low | Include `pinnedTagDate` and generation timestamp so a stale file is legible rather than confidently wrong; the tag-equality guard (ADR-005) makes a stale file self-silencing after the next repin |

## Rollback

Each slice reverts independently: delete the CI step and script (the JSON simply stops updating and
Slice 2's fetch degrades to its silent-omission path, ADR-005); revert the preflight line (Slice 2
already omits silently when the fetch fails or the fields are absent, so an older nn-preflight in the
wild is already forward-compatible). No data migration, no build-artifact change, nothing irreversible.

## Success criteria

- [ ] A maintainer can see, without a manual GitHub API query, that `main` has N commits touching
      `skills/` beyond the pinned tag.
- [ ] The count is computed per subsystem against that subsystem's own tag prefix.
- [ ] A user running nn-preflight sees pin identity and pin age, distinct from "matches the pin".
- [ ] The freshness signal never changes `exitCode`, in any reachability state.
- [ ] Absent fields produce silence, not a warning.
- [ ] Zero new `api.github.com` calls; zero new dependencies.
- [ ] No per-file hash, signature, or checksum mechanism exists anywhere in the change.
- [ ] `nn-skills-lifecycle/SKILL.md` names `~/.agents/bootstrap-state.json`.
- [ ] No production code was written for atomic state writing.
