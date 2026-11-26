# Handoff — the eight backlog items frozen behind the blueprints decision

Written 2026-11-26. Every fact below was checked against `main` at `1477ca764`, not
against the earlier analysis: several files it cites have moved since
(`assemble-manifest.js` is now `scripts/release/assemble-manifest.js`, the installer
internals live in `scripts/lib/skills-commands.js`), so the line numbers in
`2026-11-25-conntent-boundaries.md` should be treated as leads, not as coordinates.

These eight items are parked as batch `b6-on-hold-blueprints` in `openspec/backlog_NN.md`.
None of them is blocked by missing knowledge. Each is blocked because the fix has a shape
that depends on one question the blueprints-distribution decision has not answered yet:
**is a blueprint a versioned unit of its own, or a directory inside one shared release?**

Answer that, and all eight resolve mechanically. Answer it differently and half of them
would be rewritten. That is why nothing was implemented.

---

## 1. `coNNtent` is the only shipped blueprint with no manifest declaration

**State.** `manifest/source.yaml` lists eight blueprints — `domaiNN`, `changes`, `sidecar`,
`sources`, `artifacts`, `procedures`, `executions`, `blank` — plus `workspace` under
`frozen_blueprints` (`:86-90`). `coNNtent` is not there. Yet the catalog already knows it:
`iNNfo/specs/bluepriNNts/catalog.json` carries `"coNNtent": { "embedded_skills":
["nn-conntent"], "versions": ["V_0-32-4"] }`, and `scripts/lib/skills-commands.js` installs
blueprints into `~/.agents/bluepriNNts` (`DEFAULT_BLUEPRINTS_DIR`, `:60`).

**What it costs today.** `update` and `status` walk the manifest. A blueprint that is not
declared is invisible to both: it is never reported stale and never repaired. That is the
whole incident of 2026-11-25 — an episode ran against a stale embedded skill because
nothing on this machine was comparing it.

**The decision it needs.** Whether `coNNtent` is declared as a blueprint entry (`ref_key:
blueprints`, sharing the one tag) or becomes its own entry with its own release key. The
declaration is two lines; the consequence is the whole release coupling.

**Done when.** The declaration exists, `status` reports the blueprint, and a test asserts
the manifest list and `catalog.json`'s keys agree.

---

## 2. One tag ships 22 directories

**State.** `scripts/release/release-keys.js` defines the change paths per key and
`scripts/release/plan-auto-tags.js` derives the version from the conventional commits that
touched them. `blueprints` covers every directory under `iNNfo/specs/bluepriNNts`. The last
two releases cut while this was being written are `blueprints-v0.101.0` and
`blueprints-v0.101.1` — a coNNtent fix and a console fix both moved the same number.

**What it costs today.** A typo in one blueprint cuts a release that names the other 21,
and consumers that pin `blueprints-v*` take all of them or none. The analysis measured the
alternative (a `conntent` key with content-sha pins) and recorded its cost: the version
story fragments from one number into two.

**The decision it needs.** Whether the key set grows. Nothing else in this list can be
settled before this one, because items 3, 4 and 8 all read a pin whose shape this decides.

---

## 3. Nothing compares the two blueprint trees after a release

**State.** `scripts/release/run-release.js` copies `RELEASE_TABLE[key].repoPaths` into a
fresh clone of `cogNNitive-web`, and `scripts/lib/publish-web-tree.js`
(`copyDistributionPath`) `fs.rmSync`s the destination before copying — so the second tree
is a wholesale mirror, never an edit surface. No step compares the two after the fact.

**What it costs today.** A mirror that silently stopped updating would be invisible until
someone installed from it. The analysis priced the check at about 30 lines: diff
`cogNNitive@tag` against `cogNNitive-web@tag` for the mirrored paths.

**The decision it needs.** If blueprints stop being mirrored per key, the check changes
shape or disappears. Which paths to compare is a consequence of item 2.

---

## 4. `status` reports a blueprint as `outdated` and prints no command

**State.** The skills half of `status` prints the command that repairs an outdated entry.
The blueprint half reports the state and stops. The analysis cited `skills-manager.js:1875`
for that loop; on today's `main` the installer internals live in
`scripts/lib/skills-commands.js`, so the exact site has to be re-found before editing.

**What it costs today.** "outdated" with no next step is a dead end for the person reading
it, and the one blueprint that matters most (`coNNtent`, item 1) is not in the loop at all.

**The decision it needs.** Which command is correct to print. If a blueprint is a unit with
its own key, the repair is `update --blueprint <name>` at a tag; if it stays inside the
shared release, it is a different command. Writing the line before knowing is how it gets
written twice.

---

## 5. `frozen_blueprints` is declared and never rendered

**State.** `manifest/source.yaml:86-90` declares `workspace` under `frozen_blueprints`.
`scripts/release/assemble-manifest.js` renders the `blueprints:` block (`:121-122`) and
never emits the frozen list, so the manifest that consumers read has no trace of it.

**What it costs today.** A concept that exists in the source of truth and nowhere in the
artifact. Either it is dead and should go, or it is meant to be consumed and is missing.

**The decision it needs.** Whether a frozen blueprint is installable at all. That is the
same question as item 1 in a different tense: is everything in a blueprint tree a unit, or
are some of them internal?

---

## 6. Two path constants point at directories no installer creates

**State.** `catalog.mjs` still names `~/.agents/catalog/` (`:320`, in the message it prints
when a sibling copy looks stale) and `compile.mjs` resolves against `~/.agents/library/`.
Neither directory is created by any installer code path.

**What it costs today.** The lookup falls through to the packaged copy, so it works — and
the error message points at a path the user does not have, which is worse than saying
nothing.

**The decision it needs.** Where a *unit* is installed. One resolver that fails loudly with
both candidate paths is the analysed fix, and it is three lines once the location is known.

---

## 7. Six component files are byte-identical twins with no guard

**State.** Verified today by hashing:

| `skills/nn-conntent/slots/` | `library/components/<name>/index.html` |
|---|---|
| `b-roll.html` | identical |
| `caption.html` | identical |
| `lower-third.html` | identical |
| `quote.html` | identical |
| `title.html` | identical |
| `watermark.html` | identical |

No test asserts the equality, so one edit to either copy forks them silently.

**What it costs today.** Nothing yet. That is exactly the problem: the first divergence
will be invisible until an episode renders differently depending on which copy it resolved.

**The decision it needs.** Which side is the source and which is generated. If the
component library is the distributable surface, `slots/` is a build product; if the skill
is self-contained by contract, the library copy is. The packaging model decides it.

---

## 8. The drift gate passes vacuously

**State.** `scripts/release/channel-drift.js`, shipped blocking in #884, asserts that every
released manifest entry still resolves to the commit the manifest records. Today the
committed manifest snapshot carries no released pin, so the check has nothing to contradict
and passes.

**What it costs today.** A gate that cannot fail. The day a stable snapshot is committed it
starts working — or starts failing on a pin shape it was not written for.

**The decision it needs.** Whether pins become per-unit content shas (item 2). If they do,
the gate is rewritten; relaxing it to advisory now would be work undone in the same week.

---

## What the other session should produce

1. A decision on item 2 (key granularity) and item 1 (manifest membership), written down.
2. A one-line statement of which of the six twins is generated (item 7) and where a unit is
   installed (item 6).
3. Whether `frozen_blueprints` survives (item 5), and the command `status` should print
   (item 4).

With those five sentences, the eight items become one or two small pull requests and
nothing here needs to be rediscovered.
