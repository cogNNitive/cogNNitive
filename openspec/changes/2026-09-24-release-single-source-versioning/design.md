# Design: One Source of Truth Per Version, Derived Refs

## 1. Architectural approach

### The constraint that decides everything

`scripts/verify.js:235` runs `node scripts/manifest/generate-manifest.js --channel stable --check` on
**every** verify run, and the generator's own docblock (`:20-21`) states the contract:

> *"The render is a pure function of its inputs: no timestamp, no generator version, no run id.
> Regeneration with no upstream change is byte-identical."*

So every value this change derives must be a pure function of **committed files**. No git queries, no
"newest tag", no dates, no counters. This is not a preference; it is the reason the proposal already
rejected deriving the channel version from tag history, and the reason
`2026-09-22-skill-channel-freshness-reporting` ADR-001 killed manifest-embedded freshness.

One sentence governs the whole design:

> **Store each version fact once, in a committed file. Compute every other occurrence at the moment
> it is read, not into a second field that then needs a guard.**

### The second constraint, discovered while reading the code (it shrinks the change)

Two of the things the proposal planned to *build* already exist:

1. **`docs/innfo/cdn/manifest.json` `latest` is already generated.** `scripts/build-docs.mjs:95-101`
   writes `{ latest: "v" + mcpPkg.version, updated: <today> }` from
   `iNNfo/packages/innfo-mcp/package.json` — the exact value `checkVersionSquare` compares it
   against. That check has been comparing a generated value to its own generator's input. S3 deletes
   the comparison and writes **no new generator**.
2. **The versioned CDN bundle is already produced at the right name.**
   `build-docs.mjs:76-78` copies `bin/innfo-mcp.bundle.js` to
   `docs/innfo/cdn/innfo-mcp-v<version>.bundle.js` and hard-fails if the source bundle is absent.
   The file is gitignored (`.gitignore:12`) and CI builds it before verify
   (`ci.yml:45-49`, whose comment names this dependency explicitly).

Consequence: S3 has **two** generation targets, not four — the `innfo-core` `package.json` version
and the `@cognnitive/innfo-core` dependency range. The other two dissolve by deletion alone.

### The duplication nobody counted

`(source.channels && source.channels.stable && source.channels.stable.refs) || []` is written
**four** times, verbatim, in four files: `generate-manifest.js:81`, `freshness.js:53`,
`lib/version-square.js:73`, `lib/console-release-info.js:39`. The channel-ref shape is already a
de-facto shared module with no home. Giving it one is where the derivation goes (ADR-002), and it is
the reason the derivation is not simply inlined in the generator.

### Total footprint

One new ~40-line module with one exported function; one renamed generator gaining two per-section
maps; one 89-line validator replaced by a ~28-line file-presence check under an honest name; four
call sites collapsing onto the new module; four literal tag strings deleted from
`manifest/source.yaml`. **No new `run(... --check ...)` call in `verify.js`. No new CI step. No new
dependency. No new config schema.**

## 2. Architecture Decision Records

### ADR-001 — The channel version is authored plain semver, quoted: `version: "2.1.0"`

**Status:** accepted. **Answers proposal question 1.** Confirms the assumption, with the reason
stated rather than asserted.

| Option | Verdict |
| :-- | :-- |
| `version: "2.1.0"` — plain semver, quoted | **Chosen** |
| `version: "V_2-1-0"` — match the artifact convention | Rejected |
| `version: 2.1.0` — unquoted | Rejected |

**Rationale.** The field's only job is to produce a git tag. The tag shape is normative and already
enforced: `TAG_SHAPE_RE = /^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$/` (`manifest-rules.js:21`). A `V_x-y-z`
value would need a lossy `V_` → `v`, `-` → `.` translation on the way out, which is a formatter
nobody needs and a second convention to remember at the one point where the wrong string is fatal.

The two conventions are not a wart to be tidied away — they mark **two different axes**, and after
this change the file makes that distinction visible:

| Form | Means | Examples on disk today |
| :-- | :-- | :-- |
| `V_x-y-z` | an **artifact/spec content** version (what the file says) | `skills[].version: "V_3-4-0"`, `templates[].version: "V_0-2-1"` |
| `x.y.z` | a **git tag / package** version (what a release is called) | `mcp.version: "0.10.0"` (`source.yaml:29`), `console_assets[].version: "0.2.0"` (`:177`) |

The precedent is already unanimous: every plain-semver value in `source.yaml` today is a tag/package
version, and every `V_x-y-z` is a content version. `refs[].version` is a tag version. It takes the
tag form. **Blessed, and the rule above is the reason** — not "because it matches the tag string".

**Quoted, always.** `skills/nn-preflight/scripts/lib/yaml-lite.js:8-24` `parseScalar` never returns
a number, and neither does the maintainer-side `scripts/lib/yaml-parser.js:13-29`. Both return the
string `"2.1.0"` when quoted; unquoted, both still return a string, but the quoting makes the
intent explicit and matches every existing `version:` in the file (`:8,29,177`). No code path may
depend on the type.

**Shape is validated at derivation, not downstream.** `resolveChannelRefs` (ADR-002) throws on a
version that does not match `/^\d+\.\d+\.\d+$/`. This is not a new guard — it is the derivation
refusing to emit a string it knows is unusable, and it moves the `2.1` typo from a release-time
`validate-manifest` 404 to a local verify-step-8 failure with a named cause.

### ADR-002 — `refs[].ref` disappears from `manifest/source.yaml`; the tag is derived at read time by one shared module

**Status:** accepted. This is the core of S1.

| Option | Verdict |
| :-- | :-- |
| `ref:` stays a physical field, generated by the sync step and `--check`-gated | **Rejected** |
| `ref:` disappears; rows carry a version; readers derive `<key>-v<version>` | **Chosen** |
| Derive inside `generate-manifest.js` only | Rejected — three other readers |

**Why not keep `ref:` as a generated field.** It would need a writer, a `--check`, and a window
between runs in which a human can type a wrong tag that only a gate catches. The proposal's own
criterion is *"a malformed tag string is unrepresentable, not validated"* — a generated-but-present
field is validated, not unrepresentable. Deleting the field is both the smaller diff and the
stronger guarantee: there is no longer a place to type it.

**Why a shared module and not the generator.** Four files read `channels.<ch>.refs[].ref` today
(§1). Derivation in the generator alone would leave `freshness.js` and `console-release-info.js`
reading a field that no longer exists. Four call sites is a **real seam**, not a hypothetical one.

```js
// scripts/lib/channel-refs.js  (~40 lines)
// resolveChannelRefs(sourceDoc, channel) -> [{ key, repo, ref }]
//   row has `ref:`     -> literal (branch refs; the preview channel)
//   row has a version  -> `${key}-v${version}`
//   both, or neither   -> throw (ambiguous row / no resolvable ref)
```

Interface: one function, two arguments, a list of the same `{key, repo, ref}` shape every caller
already consumes. `generate-manifest.js:resolveEntryRef` is **unchanged** — it keeps receiving
`{repo, ref}` rows and never learns that versions exist. Derivation happens at the edge of the
parse, which is what "derived before `resolveRef` needs it" means concretely:
`parseSourceYaml` returns `channels` already normalized (one-line change at
`generate-manifest.js:46`).

**Per-row, not per-channel.** The rule inspects the row, never the channel name, so the module
carries no channel policy and the `CHANNELS` table (`manifest-rules.js:33-48`) stays the single home
of channel policy. Nothing drifts because nothing is duplicated.

**`manifest/source.yaml` on-disk shape after S1:**

```yaml
channels:
  stable:
    # The tag is derived as "<key>-v<version>" — never typed. skills and templates
    # carry their own channel version (a batch number that exists nowhere else in
    # the repo); innfo-mcp and innfo-console derive theirs from the artifact
    # version declared above, because there it is the same fact, not a copy.
    refs:
      - key: skills
        repo: cogNNitive/cogNNitive
        version: "2.1.0"
      - key: templates
        repo: cogNNitive/cogNNitive
        version: "0.13.0"
      - key: innfo-mcp
        repo: cogNNitive/cogNNitive
      - key: innfo-console
        repo: cogNNitive/cogNNitive
  preview:            # byte-identical to today
    refs:
      - key: skills
        repo: cogNNitive/cogNNitive
        ref: main
      # ... three more, unchanged
```

The asymmetry is the point: a row carries a version **only where that version is a distinct fact**.

**Parser safety.** `version:` is a sibling scalar inside an existing list item, exactly like `repo`
and `ref` — a shape `parseSequence` (`yaml-parser.js:65-109`) demonstrably handles. A row with only
`key` + `repo` is also fine. No nesting introduced, no `/` in a mapping key.

### ADR-003 — Where the mcp and console channel versions come from: the artifact version, not a fifth and sixth authored number

**Status:** accepted. Bounds the "4 new authored fields" cost the proposal accepted.

Putting `version: "0.10.0"` on the `innfo-mcp` stable row would create a **new hand-copy of the
package.json version** — the exact defect this change exists to remove. So `resolveChannelRefs`
carries a two-entry table naming where a key's version lives when the row does not declare one:

```js
const VERSION_SOURCE = {
  'innfo-mcp':     (doc) => mcpEntry(doc).version,          // source.yaml skills[].mcp[].version
  'innfo-console': (doc) => consoleAsset(doc).version,      // source.yaml console_assets[].version
};
```

Both values are themselves already single-sourced: after S3, `source.yaml`'s mcp `version` is
generated from `iNNfo/packages/innfo-mcp/package.json`, and `console_assets[].version` was made
authoritative on 2026-09-24 in `855415b`.

**Data, not branching** — the same form as `CHANNELS` (`manifest-rules.js:33`) and
`SUBSYSTEM_PATHS` (`freshness.js`, ADR-003 of the freshness change). Adding a channel key is adding
a row or authoring a `version:`, never editing control flow.

**Net authored version facts: 30 → 28**, two better than the proposal's estimate. Only `skills` and
`templates` gain an authored number, because only those two channel versions exist nowhere else
(grep-verified in the proposal).

### ADR-004 — `sync-template-versions.mjs` gains the skills and mcp targets and is renamed `sync-versions.mjs`

**Status:** accepted. **Answers design decision 1.**

| Option | Verdict |
| :-- | :-- |
| Extend `sync-template-versions.mjs`, rename to `sync-versions.mjs` | **Chosen** |
| Extend it and keep the name | Rejected — the name becomes false |
| A sibling `sync-skill-versions.mjs` | **Rejected — violates a hard constraint** |

**The sibling is disqualified, not merely disfavoured.** Every `--check` script owns one
`run(... --check ...)` call in `verify.js`. A sibling adds a second one, and the proposal's success
criterion is that the net count must not increase. One script, one slot, three target families.

**The extension is genuinely small, because the existing writer already does the hard part.**
`syncSourceYaml` (`sync-template-versions.mjs:155-207`) is a line walker that tracks the enclosing
top-level list section and the current `- name:` and rewrites `version:` lines when its map has that
name. Two changes:

1. Accept **per-section maps** (`{ templates, frozen_templates, skills }`) instead of one merged
   map. This is not decoration: a single map would let a template slug and a skill name cross-write
   each other silently. There is no collision today (`nn-*` vs template slugs), and per-section maps
   mean there never can be.
2. Add `skills` to the section regex at `:170`. The `- name:` matcher at `:177` is indentation-
   agnostic, so the **nested `skills[].mcp[]` entry is reached for free** — `- name: innfo-mcp`
   followed by `version: "0.10.0"` is walked by the same loop. Zero new traversal logic.

The skills map is `SKILL.md` frontmatter `version` per skill (read with the existing
`readFrontmatterVersion` helper shape), plus one entry `innfo-mcp` → the mcp `package.json`
version. That is the map the release-time guard already compares against:
`checkVersionParity` (`manifest-rules.js:198-215`) fetches remote `SKILL.md` and compares its
`version` to the manifest's. Generating from the same field is what makes the guard unfailable
rather than merely passing.

**Rename scope (8 references, all one-liners):** `package.json:27,28`, `verify.js:229`,
`check-integrity.js:85`, the test file's name and its import, the `GENERATED_HEADER` constant
(`:45`) and therefore a regeneration of `samples.ts`, plus `openspec/specs/quality-gates/spec.md:155`
and `workspace_NN/workspace_NN.md:192`. `git mv` preserves blame. The rename lands **entirely inside
S2** so no slice leaves a half-renamed reference. The user-facing entry point `npm run sync:versions`
already promises the general thing, so only the file path is a lie.

### ADR-005 — `scripts/lib/version-square.js` is deleted and the CDN-bundle-presence check is re-homed as `scripts/lib/cdn-bundle-staged.js`

**Status:** accepted. **Answers proposal question 3 — with a third option, chosen over both offered.**

| Option | Verdict |
| :-- | :-- |
| Delete the file outright, inline the presence check | Rejected — two call sites |
| Keep `version-square.js` holding only the bundle-presence check | Rejected — the name would lie |
| `git mv` to `cdn-bundle-staged.js`, reduced to the presence check | **Chosen** |

**Why not inline it.** The check has two callers: `verify.js:124` (so CI covers it) and
`check-integrity.js:74` (the maintainer-local gate). Two callers is a real seam; inlining means two
copies of a `path.join` + `existsSync` + message.

**Why not keep the name.** The repo's own principle, from
`2026-09-21-dev-process-and-tooling-gaps`: *config that names a version or path rots silently;
config that names a shape survives.* A module called `version-square` that performs no version
comparison is the same defect as a command whose name promises more than its body does. `git mv`
gives the maintainer what they actually wanted from "keep the file" — the docstring history and the
blame chain — without the misnomer.

**The file's numbering is self-contradictory today, and that dies with it.** Its header docstring
(`:5-11`) enumerates six items in which #4 is the `source.yaml` stable ref and #6 is the bundle
file; its inline comments (`:50,55,61,66,72`) enumerate five, in which #4 is the bundle file and #5
is the stable ref — because the header counts the *source* value as an item and the comments count
only *comparisons*. Two schemes, one file, disagreeing on what "4" names. This is exactly the
number-naming rot the principle predicts, and it is why this design identifies every check by the
file and field it reads and **never by an index**. Nothing inherits the numbering: the new module
asserts one thing and says so in one sentence.

**What survives, precisely:**

```js
// scripts/lib/cdn-bundle-staged.js  (~28 lines)
// Asserts the staged CDN bundle for the current innfo-mcp version exists on disk:
//   docs/innfo/cdn/innfo-mcp-v<iNNfo/packages/innfo-mcp/package.json version>.bundle.js
// Not a version comparison — a build-ordering check. The file is gitignored
// (.gitignore:12) and produced by scripts/build-docs.mjs:76-78, so a red result
// means `npm run build:docs` has not run at the current version in this workspace.
```

It keeps reading the mcp `package.json` version, because the filename it must predict contains that
version. That is a *use* of the single source, not a second copy of it.

### ADR-006 — Dissolution of the MCP version checks, one by one, by name

**Status:** accepted. Identified by the file and field each check reads; no index numbers (ADR-005).

| The check (what it compares) | Verdict | Reason |
| :-- | :-- | :-- |
| `iNNfo/packages/innfo-core/package.json` `version` **vs** the mcp version | **Becomes generated** (S3) | The lockstep is real (a Suite release bumps both); once the value is written from the mcp `package.json` there is nothing left to disagree |
| The `@cognnitive/innfo-core` **dependency range** in `innfo-mcp/package.json` | **Becomes generated** (S3) | Written as `^${version}`, matching the value on disk today (`^0.10.0`). The current check also tolerates a bare exact range; the generator picks one form, which removes the tolerance as well as the drift |
| `docs/innfo/cdn/manifest.json` `latest` **vs** `v<mcp version>` | **Deleted, nothing added** (S3) | `build-docs.mjs:95-101` already writes it from the same `package.json` (§1). The check compares a generated value to its own generator's input |
| The **stable ref** in `manifest/source.yaml` **vs** `innfo-mcp-v<mcp version>` | **Deleted** (by S1) | The field no longer exists; the ref is derived from the mcp version (ADR-002, ADR-003) |
| `manifest/source.yaml` mcp `version` **vs** `package.json` (the S3 target; not one of the header's items but the fifth hand-copy) | **Becomes generated** (S3) | Rides the `source.yaml` writer ADR-004 already extends |
| **The staged CDN bundle file exists on disk** | **Survives, re-homed and renamed** (S3) | Never a version comparison. See ADR-005 |

Presence guards inside the old module (`mcpPkgPath` / `corePkgPath` / `cdnManifestPath` /
`sourcePath` existence, ~12 lines) die with it: each one guarded a read that no longer happens. The
one read that remains — the mcp `package.json` version — keeps its own missing-file message in the
new module.

**A `--check` gate on `docs/innfo/cdn/manifest.json` is structurally forbidden.** It carries
`updated: new Date().toISOString().split('T')[0]` (`build-docs.mjs:98`), so a byte-comparison gate
on it would go red on the first calendar day after any regeneration — the ADR-001 failure mode of
the freshness change, reached by a new route. The file stays tracked (a deliberate 2026-09-03
decision in `ci-build-and-purge-bundles`, which explicitly preserved it while untracking its
bundle siblings) and stays ungated. Its committed `latest` may lag; Pages serves the copy CI
regenerates, so no consumer sees the lag.

### ADR-007 — `check-parity.js`'s skill and mcp version comparisons are deleted with the generators that replace them

**Status:** accepted. The one judgment call in this design a reviewer may want to veto; the veto is
free (leaving the lines in place cannot fail).

After S2/S3, `check-parity.js:45-52` (manifest skill version vs `SKILL.md`) and `:61-71` (manifest
mcp version vs `package.json`) compare a **generated** value against the very file it is generated
from. They cannot fail unless the generator did not run — which is precisely and only what
`sync-versions.mjs --check` reports, earlier in the same verify run, with an actionable message
(`Run npm run sync:versions`) instead of a bare mismatch.

Deleted in the slice that makes each one vestigial: the skill comparison in S2, the mcp comparison
in S3. **The presence checks stay** — `SKILL.md` exists, the mcp bundle exists, the template file
exists. Those are not version comparisons and `check-parity.js` remains the local offline guard for
them.

**Template version comparison at `:76-105` is left exactly as it is.** It is *already* vestigial
today (generated from `spec_version` since `sync-template-versions.mjs` shipped) and touching it is
outside this change's remit. Recorded so the asymmetry is deliberate rather than an oversight.

### ADR-008 — `checkTagPinFreshness` is not touched, and S2 measurably weakens it. Recorded, not fixed.

**Status:** accepted with a named follow-on. **This is the design's most important warning.**

`checkTagPinFreshness` (`lib/tag-pin-freshness.js:58-76`) passes when a diff touching `skills/`
**also touches `manifest/source.yaml`** — file-touched, not pin-correct, as its own docstring
concedes. After S2, bumping a skill's `SKILL.md` version and running `npm run sync:versions` writes
`source.yaml` automatically. **The guard then passes without any channel version having been bumped
and without any tag being cut** — the exact failure that produced it on 2026-09-24.

S2 does not redesign it (out of scope, and the proposal is explicit that it stays). It must ship
with the degradation **stated in the slice's commit message and in `nn-dev-release`**, and the
follow-on recorded: tighten the predicate from *"`source.yaml` was touched"* to *"the affected key's
`channels.stable.refs[].version` changed"*, comparable in ~10 lines by parsing
`git show <base>:manifest/source.yaml` with the `parseFocusedYaml` the module's caller already
imports. That tightening is strictly stronger than today's predicate — it also closes the existing
false pass where `source.yaml` was touched for an unrelated reason — and it is a one-predicate change
to an existing guard, not a new checker. **It is not in this change.**

## 3. Data flow

```
AUTHORED (28 facts, each in exactly one committed file)
 ├─ skills/<name>/SKILL.md          frontmatter version   (8, V_x-y-z)
 ├─ iNNfo/specs/templates/**/spec_NN.md  template_version + spec_version  (18, V_x-y-z)
 ├─ iNNfo/packages/innfo-mcp/package.json  version        (1, semver)
 ├─ manifest/source.yaml console_assets[].version         (1, semver)
 └─ manifest/source.yaml channels.stable.refs[].version   (2: skills, templates — semver, ADR-001)

GENERATED AT WRITE TIME  (scripts/sync-versions.mjs, one --check slot: verify.js:229)
 ├─ iNNfo/apps/innfo-editor/src/config/samples.ts  SHIPPED_TEMPLATE_VERSIONS   [exists today]
 ├─ manifest/source.yaml templates[]/frozen_templates[].version                [exists today]
 ├─ manifest/source.yaml skills[].version                                      [S2]
 ├─ manifest/source.yaml skills[].mcp[].version                                [S3]
 ├─ iNNfo/packages/innfo-core/package.json  version                            [S3]
 └─ iNNfo/packages/innfo-mcp/package.json   dependencies['@cognnitive/innfo-core']  [S3]

GENERATED AT WRITE TIME  (scripts/build-docs.mjs — untouched by this change)
 ├─ docs/innfo/cdn/manifest.json  latest                        [already generated, :95-101]
 └─ docs/innfo/cdn/innfo-mcp-v<version>.bundle.js  (gitignored) [already staged,   :76-78]

DERIVED AT READ TIME  (scripts/lib/channel-refs.js — no field on disk, nothing to gate)
 resolveChannelRefs(sourceDoc, channel) -> [{ key, repo, ref }]
   row.ref present            -> literal            (preview: 'main', branch policy)
   row.version present        -> `${key}-v${version}`
   neither, key in table      -> `${key}-v${VERSION_SOURCE[key](doc)}`   (ADR-003)
   ambiguous / unresolvable   -> throw
     ├─ generate-manifest.js  parseSourceYaml -> buildRenderModel -> resolveEntryRef (UNCHANGED)
     │     └─ resolveRef(repo, ref) -> commit sha -> docs/use/manifest.md  (byte-identical render)
     ├─ freshness.js          pinnedTag baseline
     ├─ console-release-info.js  cdnRef -> jsDelivr URL
     └─ cdn-bundle-staged.js  (does NOT use it — reads package.json directly for the filename)

STILL MANUAL (unchanged, by construction)
 └─ git tag <derived ref> ; push ; the merge -> tag -> pin ordering
```

The 26 hand-copied sites become 0. Two `--check`-gated generators and one read-time derivation
cover all of them, and the derivation needs no gate because it produces no file.

## 4. File changes

| File | Action | Description |
| :-- | :-- | :-- |
| `scripts/lib/channel-refs.js` | Create | ~40 lines. `resolveChannelRefs(sourceDoc, channel)` + the 2-entry `VERSION_SOURCE` table (ADR-002, ADR-003). Pure: takes a parsed doc, no fs, no git, no network. |
| `scripts/lib/channel-refs.test.js` | Create | Auto-discovered by `verify.js` step 0b — zero wiring. |
| `manifest/source.yaml` | Modify | S1: 4 stable `ref:` lines deleted; 2 `version:` lines added; 4-line comment. S2/S3: 9 `version:` values become generated (identical bytes). |
| `scripts/manifest/generate-manifest.js` | Modify | S1: `parseSourceYaml` normalizes `channels` through `resolveChannelRefs` (~3 lines). `resolveEntryRef` untouched. |
| `scripts/freshness.js` | Modify | S1: replace the inlined `stable.refs` access with one call. |
| `scripts/lib/console-release-info.js` | Modify | S1: replace the inlined access + its missing-ref error path with one call (~15 lines shorter). |
| `scripts/sync-template-versions.mjs` → `scripts/sync-versions.mjs` | Rename + modify | S2: `git mv`; per-section maps; `skills` section; `collectSkillVersions`; mcp version target (S3); docstring rewrite. |
| `scripts/sync-template-versions.test.mjs` → `scripts/sync-versions.test.mjs` | Rename + modify | S2/S3: skill + mcp + cross-write cases. |
| `iNNfo/apps/innfo-editor/src/config/samples.ts` | Modify | S2: regenerated (the `GENERATED_HEADER` names the script path). |
| `package.json` | Modify | S2: `sync:versions` and `check:versions` script paths. |
| `scripts/verify.js` | Modify | S2: step 7d path. S3: step 0 block swaps `checkVersionSquare` for `checkCdnBundleStaged` (~12 lines → ~9). **`run(... --check ...)` count unchanged.** |
| `scripts/check-integrity.js` | Modify | S2: `:85` path. S3: Group 2 label + call (`:72-80`). |
| `scripts/lib/version-square.js` → `scripts/lib/cdn-bundle-staged.js` | Rename + shrink | S3: 89 → ~28 lines, one assertion, honest name (ADR-005). |
| `scripts/version-square.test.js` → `scripts/cdn-bundle-staged.test.js` | Rename + shrink | S3: 7 cases → 2 (staged / missing). |
| `scripts/manifest/check-parity.js` | Modify | S2: delete the skill version comparison. S3: delete the mcp version comparison. Presence checks stay (ADR-007). |
| `scripts/manifest/check-parity.test.js` | Modify | S2/S3: drop the two version-mismatch cases. |
| `iNNfo/packages/innfo-core/package.json` | Modify | S3: `version` becomes a generated value (same bytes at migration). |
| `.agents/skills/nn-dev-check-integrity/SKILL.md` | Modify | S4: the stale `__INNFO_MCP_VERSION__` claim (`:231-232` enumerate the dissolved checks). |
| `.agents/skills/nn-dev-release/SKILL.md` | Modify | S4: Option [c] steps 2-3 instruct hand-editing sites that are now generated; add the ADR-008 warning. |
| `openspec/specs/quality-gates/spec.md` | Modify | S4: `:155` names the renamed script. |
| `workspace_NN/workspace_NN.md` | Modify | S4: `:192` names the renamed script. |

**Deliberately untouched:** `scripts/build-docs.mjs`, `scripts/manifest/validate-manifest.js`,
`scripts/manifest/lib/manifest-rules.js` (including `tagShapeViolation`, `CHANNELS`,
`checkVersionParity`), `scripts/lib/tag-pin-freshness.js`,
`scripts/check-tag-pin-freshness-cli.js`, `.githooks/pre-push`, `scripts/lib/yaml-parser.js`,
`skills/nn-preflight/scripts/lib/yaml-lite.js`, `.github/workflows/ci.yml`, `.gitignore`,
`docs/use/manifest.md`, `docs/use/manifest-next.md`, `docs/innfo/cdn/manifest.json`.

`tagShapeViolation` survives deliberately: it validates the **published manifest read back from
disk**, a different artifact from `source.yaml`. Derivation makes it unfailable for
generator-produced refs; it still catches a hand-edited `docs/use/manifest.md`.

## 5. Verification strategy (Strict TDD Mode)

Runner: `node scripts/verify.js` (step 0b auto-discovers `*.test.js` / `*.test.mjs` under
`scripts/` and `skills/` by filename shape — a correctly named file is gated with **zero YAML
wiring**). Suites here are hand-rolled `node:assert` scripts with `console.log('✔ …')` per case,
**not** `node:test` `test()` calls: follow `scripts/sync-template-versions.test.mjs` and
`scripts/freshness.test.js`, not any framework.

> **Fixture trap — this has reddened `main` in this repo twice.** A fixture that reads ambient state
> (the real `manifest/source.yaml`, a real home directory, the real working tree) passes on a
> maintainer machine and fails on CI, or worse, passes on CI for the wrong reason. Precedents:
> `preflight-tests-leak-real-home-dir` (fixtures omitting `--mcp-dir` probed `~/.agents`) and the
> removed e2e spec that compared `git show HEAD:file` to the same file on disk and therefore could
> not fail. **Every fixture gets its own `mkdtempSync` directory and explicit arguments**, the
> pattern `sync-template-versions.test.mjs:19` already uses. No test in this change may read
> `manifest/source.yaml`, `process.env.HOME`/`USERPROFILE`, or git state. `resolveChannelRefs` takes
> a parsed object precisely so its suite needs no filesystem at all.

| Slice | TDD | Cycle |
| :-- | :-- | :-- |
| S1 — `channel-refs.js` | **Yes** | RED against in-memory objects: (a) a row with `version: "2.1.0"` and key `skills` → `skills-v2.1.0`; (b) a row with `ref: main` → `main` verbatim, untouched; (c) a row with **both** → throws, message names the key; (d) a row with **neither** and an unknown key → throws; (e) `innfo-mcp` row with neither → `innfo-mcp-v` + the doc's mcp version (ADR-003); (f) `innfo-console` likewise from `console_assets`; (g) version `"2.1"` → throws, message names the key and the expected shape; (h) output order matches input order and the returned shape is exactly `{key, repo, ref}`. |
| S1 — reader call sites | **Yes** | The three existing suites (`generate-manifest.test.js`, `freshness.test.js`, `console-release-info.test.js`) carry inline `SOURCE_YAML` fixtures with literal `ref:` lines. Each must be **migrated to the new shape and kept green** — a passing suite whose fixture still uses the deleted field is the "cannot fail" trap. Add one case per suite proving the *derived* ref reaches the consumer (`freshness.pinnedTag`, the jsDelivr URL, the rendered `ref:` line). |
| S1 — migration equality | **No** (a command, not a unit) | `node scripts/manifest/generate-manifest.js --channel stable --check` passes with `docs/use/manifest.md` **unmodified**. See §6. |
| S2 — `sync-versions.mjs` skills | **Yes** | RED in the renamed suite, all fixtures in `mkdtempSync`: (a) 2 fake skills with `SKILL.md` versions + a fake `source.yaml` → both `skills[].version` rewritten, template values untouched; (b) `--check` on a drifted skill → exit non-zero, message names the skill and both values; (c) `--check` on an aligned tree → exit 0; (d) **cross-write guard**: a fixture with a skill and a template *sharing a name* → each section takes its own map (this is the case that fails if the maps are merged); (e) a `SKILL.md` with no frontmatter `version` → named error, not a silent skip; (f) the `channels:` block is byte-identical after a write (the writer must never touch `refs[].version`). |
| S2 — rename | **No** | Mechanical. Falsification: `rg sync-template-versions` returns only `openspec/changes/archive/**`. |
| S3 — mcp generation | **Yes** | (a) fake mcp `package.json` at `9.9.9` → `source.yaml` mcp `version`, `innfo-core` `package.json` `version`, and the dep range all become `9.9.9` / `^9.9.9`; (b) `--check` on each drifted individually → three distinct named errors; (c) the dep range is written as `^x.y.z` exactly (not bare, not `~`); (d) the rest of both `package.json` files is byte-identical, key order included — JSON round-tripping must not reformat a file it edits. |
| S3 — `cdn-bundle-staged.js` | **Yes** | (a) `mkdtempSync` repo with `package.json` at `1.2.3` and `docs/innfo/cdn/innfo-mcp-v1.2.3.bundle.js` present → ok; (b) the same repo with the file absent → not ok, message names the exact expected path; (c) missing `package.json` → named error. Cases 2, 3, 4 and 7 of the old suite are **deleted with the comparisons they covered**, not ported. |
| S4 — docs | **No** | `rg` for the dissolved instructions returns nothing outside `openspec/changes/archive/**`. |

Per slice: `npm run lint`, `npm run typecheck`, `node scripts/verify.js` green. `--release` is not
runnable pre-tag by design (`verify.js:237-246`), so a release-channel regression surfaces only
after the tag — which is why S1's migration equality check (§6) is mandatory before each merge.

## 6. Migration and rollback

**The migration is a no-op diff, and that is the proof of correctness.** Every value this change
generates or derives must equal the value a human typed today, byte for byte. The check needs no new
tooling:

```powershell
# after each slice's code lands, before committing:
node scripts/sync-versions.mjs                       # write every generated target
node scripts/manifest/generate-manifest.js --channel stable --check   # must exit 0
node scripts/manifest/generate-manifest.js --channel preview --check  # must exit 0
git diff --exit-code -- docs/use/manifest.md docs/use/manifest-next.md `
  iNNfo/packages/innfo-core/package.json iNNfo/packages/innfo-mcp/package.json
```

A reviewer reads it as: **the only file in the diff whose *values* changed is `manifest/source.yaml`,
and only by deleting `ref:` lines and adding `version:` lines.** If a single byte of
`docs/use/manifest.md` moves, the derivation produced a different tag than the one shipping today —
stop, do not commit. The four expected derivations are `skills-v2.1.0`, `templates-v0.13.0`,
`innfo-mcp-v0.10.0`, `innfo-console-v0.2.0`, matching `source.yaml:203,206,209,212` exactly.

**One-time ordering within S1:** edit `source.yaml` and `channel-refs.js` in the same commit. The
intermediate state (field deleted, derivation absent) makes `generate-manifest --check` fail, so the
two cannot be split across commits.

**Rollback, per slice, each independent:**

- **S1** — restore the four literal `ref:` strings, drop the two `version:` keys, revert four call
  sites, delete `channel-refs.js`. `source.yaml` is valid and hand-maintained again.
- **S2/S3** — revert the generator commit. The generated values are byte-identical to hand-typed
  ones, so every file stays valid; only the guarantee is lost. Restore the deleted `check-parity.js`
  comparisons in the same revert (ADR-007).
- **S3's module swap** — `git revert` restores `version-square.js` and its 7-case suite, plus one
  `require` and one call in each of `verify.js` and `check-integrity.js`.

No consumer-visible change at any point: `refs[].version` lives only in
`manifest/source.yaml`, a maintainer-side file that is **never distributed**. An existing
`~/.agents/bootstrap-state.json` and an older installed `nn-preflight` cannot observe this change,
because the published manifest is byte-identical and keeps pinning tag + resolved commit SHA.

## 7. Slices, order, independence

| PR | Slice | Est. lines (incl. tests) | Depends on |
| :-- | :-- | :-- | :-- |
| 1 | **S1** derive `refs[].ref`; `channel-refs.js`; 4 call sites | ~190 | — |
| 2 | **S2** skills → `source.yaml`; rename to `sync-versions.mjs` | ~180 | 1 (shares the `source.yaml` writer) |
| 3 | **S3** mcp generation; dissolve the version square; re-home the bundle-presence check | ~170 | 1, 2 |
| 4 | **S4** doc truth-up | ~40 | 3 |

All four are well under the 400-line review budget; **no `size:exception` needed.** Per
`single-dev-branch-workflow`, each slice is one self-contained revertible commit on `dev`.

**S1 stands alone** and is worth shipping even if nothing else does: it deletes the failure class
that reddened `main` on 2026-09-24 — a tag string that disagrees with the version it names — and it
collapses the four-fold duplicated `stable.refs` access on the way.

**S3 is last among the code slices** because it is the only one that deletes a guard, and deleting a
guard is safe only once every check it performed has a generated replacement or a recorded reason to
disappear (ADR-006).

**Ordering is a real dependency, not a preference.** S2 extends the `source.yaml` writer S1 leaves in
place; S3 writes the mcp version through the map shape S2 introduces; S4 documents what S3 removed.

### Expected net line delta — stated honestly

Production code is roughly **break-even to −40**: `version-square.js` (−61 net after the re-homed
module), `check-parity.js` (−17), the four collapsed `stable.refs` accesses and
`console-release-info.js`'s error path (−20), `verify.js`/`check-integrity.js` (−5), against
`channel-refs.js` (+40) and the `sync-versions.mjs` extension (+65).

**With test code counted, the change is net POSITIVE by roughly +50 to +90 lines.** Strict TDD
requires a suite for the new derivation, and the two suites that shrink (`version-square.test.js`
−85, `check-parity.test.js` −25) do not offset the two that grow (`channel-refs.test.js` +70,
`sync-versions.test.mjs` +80). The proposal's success criterion *"net lines deleted > net lines
added"* is therefore **unlikely to be met as literally written**, and §8 asks `sdd-tasks` to carry
the correction forward rather than let a slice get judged against a metric this design can already
show is wrong. The criteria that ARE met, and that are the actual prize: **26 hand-copied version
sites → 0**, **one 89-line validator gone**, **`run(--check)` count unchanged at 6**, **four
hand-typed tag strings now unrepresentable**, **28 authored facts instead of the projected 30**.

## 8. Cut from scope (ponytail)

| Cut | Why |
| :-- | :-- |
| A generator for `docs/innfo/cdn/manifest.json` `latest` (proposal S3) | Already generated by `build-docs.mjs:95-101`. The work was to delete a comparison, not to write a writer (§1) |
| Any `--check` gate on `docs/innfo/cdn/manifest.json` | Its `updated:` field is `new Date()` — a gate would go red on the next calendar day (ADR-006) |
| Keeping `ref:` as a generated, `--check`-gated field | Needs a writer and a gate to buy a weaker guarantee than deleting the field (ADR-002) |
| A sibling `sync-skill-versions.mjs` | Would add a second `run(--check)` call to `verify.js`, violating the success criterion (ADR-004) |
| Authoring `refs[].version` for `innfo-mcp` / `innfo-console` | Would be a brand-new hand-copy of the package.json and console-asset versions (ADR-003) |
| A `refs[].version` format converter (`V_x-y-z` ↔ `x.y.z`) | A formatter for a value that only ever becomes a git tag (ADR-001) |
| Generating `iNNfo/apps/innfo-editor/package.json`'s version | A Suite release bumps it, but no existing check covers it and no hand-copy of it was reported. Recorded as a gap, not adopted — the writer takes one more target the day someone shows it drifting |
| Redesigning `checkTagPinFreshness` | Explicitly out of scope; the S2 interaction is recorded as a warning + follow-on instead (ADR-008) |
| Deleting `check-parity.js`'s *template* version comparison | Already vestigial before this change; outside the remit (ADR-007) |
| Gitignoring `docs/innfo/cdn/manifest.json` | `2026-09-03-ci-build-and-purge-bundles` deliberately kept it tracked while untracking its bundle siblings. Not reopened here |
| Automating the tag cut (`git tag $(node scripts/print-stable-ref.js skills)`) | Falls out of S1 as a one-liner, but it is a release-procedure change. Proposal already lists it as a follow-on |
| A `--check` on the derivation | It writes no file. `generate-manifest --check` already exercises it on every verify run |
| A config schema / registry for "which version lives where" | Two table rows (ADR-003), the same form as `CHANNELS` and `SUBSYSTEM_PATHS`. A schema for two rows is the abstraction this change exists to avoid |
| `release-please` / `changesets` | Rejected with evidence in the proposal. Not relitigated without new facts |
| Deriving any ref from git (newest tag, tag dates) | Breaks `generate-manifest --check`'s byte-identical contract permanently (§1) |
| A byte-comparison freshness gate on the MCP bundle | tsup output is not byte-reproducible across environments (589-byte measured delta). The surviving check is file **presence** only (ADR-005) |

## 9. Spec amendments required

`sdd-spec` authored `specs/release-version-generation/spec.md` in parallel. It is compatible with
this design in substance; five points need tightening before `sdd-tasks` plans against it. Its
"Notes for design" §1 and §3 are answered by ADR-004 and ADR-005 respectively.

1. **"Stable channel ref is derived … from a sibling authored `version` field" (`spec.md:17-18`) is
   true for two of four keys only.** `innfo-mcp` and `innfo-console` rows carry **no** `version:`;
   theirs is derived from the artifact version already in the document, because authoring it there
   would create a brand-new hand-copy (ADR-003). The requirement should read "from an authored
   sibling `version`, or — where the channel version is the same fact as an artifact version already
   declared in the document — from that value". This also halves the "four new authored fields" count
   the proposal accepted: it is **two**.
2. **`refs[].ref` does not survive as a field at all.** `spec.md:20` (`ref` MUST NOT be hand-typed)
   is satisfied in the strongest available way: the field is **absent from `manifest/source.yaml`**
   and the tag is derived at read time (ADR-002). Any scenario that asserts a hand-edited `ref:` is
   *detected* must become one asserting it cannot be *written*.
3. **The malformed-version scenario (`spec.md:28-32`) fails with exit 2, not exit 1.**
   `resolveChannelRefs` throws before any render happens, so
   `generate-manifest.js --channel stable --check` exits **2** (resolution/parse failure), not 1
   (byte drift). The scenario's intent is met and strengthened — the failure names the key and the
   expected shape rather than surfacing as a `TAG_SHAPE_RE` violation at release time — but a task
   asserting exit 1 would be wrong.
4. **`docs/innfo/cdn/manifest.json` `latest` already satisfies its MUST.** `spec.md:56-58` requires
   it to be generated from the MCP `package.json`; `build-docs.mjs:95-101` has done exactly that all
   along (§1). The task is to **delete the comparison**, not to write a generator. No task may add a
   `--check` on that file: its `updated:` field is `new Date()` (ADR-006).
5. **`checkTagPinFreshness` is weakened by S2, not "a class this capability does not touch"**
   (`spec.md:103-105`). It stays unmodified, as the proposal requires, but generating
   `skills[].version` into `source.yaml` makes its file-touched predicate auto-satisfiable by the
   generator. The note must record that and name the tightening as a follow-on (ADR-008). This is the
   one place where the spec, as written, would let a slice ship believing a guard is intact.

The proposal's success criterion *"net lines deleted > net lines added"* should be amended to
production-code lines, or replaced by the five concrete criteria in §7 — the design can already show
the literal metric will not hold once Strict TDD's suites are counted.

## 10. Residual risks

| Risk | Severity | Handling |
| :-- | :-- | :-- |
| **S2 makes `checkTagPinFreshness` auto-satisfiable** — the only guard here that earns its keep | **High** | ADR-008. Not fixed in this change. Must be stated in S2's commit message and in `nn-dev-release`, and the follow-on tightening recorded in the backlog **in the same batch**. A silent shipping of S2 trades a real guard for a generated convenience |
| A reviewer reads the no-op migration diff as "nothing happened" and skips the equality check | Medium | §6 makes the expected diff explicit (only `source.yaml` `ref:`→`version:` lines) and names the four exact derived tags. The check is two commands and `git diff --exit-code` |
| `sync-versions.mjs` rewrites JSON and reformats `package.json` | Medium | Test case S3(d) asserts byte-identity outside the two edited values, key order included. Prefer a targeted line/`JSON.stringify(…, 2)` round-trip proven against the real files' current formatting, not a naive re-serialize |
| A test fixture reads the real `manifest/source.yaml` or the real home dir and passes locally, fails on CI | Medium | §5's fixture trap box. `resolveChannelRefs` takes a parsed object so its suite touches no filesystem; every other fixture is `mkdtempSync` with explicit arguments |
| A row with neither `ref:` nor `version:` and a key absent from `VERSION_SOURCE` throws at render time, not at author time | Low | Deliberate: `generate-manifest --check` runs on every verify (`:235`), so the throw surfaces locally within one command, with a message naming the key. A separate authoring-time gate would be the new checker this change forbids |
| The two frontmatter parsers diverge on a numeric `version` | Low | ADR-001: quoted always; both `parseScalar` implementations return strings, and no code path depends on the type. `yaml-lite.js` is **not touched** and cannot see this field anyway (`source.yaml` is never distributed) |
| Rename leaves a dangling reference in a doc or dogfooding model | Low | 8 known references enumerated in ADR-004, all in S2; falsified by `rg sync-template-versions` returning only `openspec/changes/archive/**` |
| The committed `docs/innfo/cdn/manifest.json` `latest` silently lags after a bump | Low | Pre-existing and unchanged: CI regenerates it before verify and Pages serves the regenerated copy. Deleting the comparison removes a red gate on a value no consumer reads stale (ADR-006) |
| Concurrent sessions share the working tree; generators write files | Low | `nn-dev-development` applies: precise staging only, never `git add -A`. The writer touches only its declared targets, and `nn-dev-release` Option [c] step 0 already records that a dirty tree contaminates a generated pin |
| Someone later reopens deriving the channel version from git | Low | §1 and the proposal's "Resolved before `sdd-spec`" both record the two independent reasons (the byte-identical `--check` contract; the tag history shows the major digit is semantic) |
