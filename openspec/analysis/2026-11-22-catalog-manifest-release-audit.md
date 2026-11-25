# Catalog and manifest release audit — 2026-11-22

Read-only audit of how the Level-2 catalog, the auto-tag lane and the published
manifest agree. Every claim below was measured against `origin/main` (`9e19f2c35`),
the tag set, and the live manifest at `https://cognnitive.com/use/manifest.md`.

**Verdict: the catalog is not broken. The distribution manifest is, and the defect
predates today's releases.**

---

## What is healthy

### `release_tag` is self-healing, not stale

`scripts/blueprint-catalog.mjs:145-160` resolves each entry's `release_tag` as *the
newest `blueprints-v*` tag whose tree for that entry's directory equals `HEAD`'s*.
Because every blueprints release is a tag **on main**, tag `T`'s tree equals `HEAD`'s
exactly when nothing under that directory changed since `T`. The catalog therefore
always names the last release that actually shipped that content — a stale stamp
cannot survive one `--write` pass.

Working tree census, all 22 entries: `release_tag = blueprints-v0.88.0`, `.88.0` being
the newest tag that contains every directory's current tree.

### The version chain is coherent

| ref | coNNtent spec | coNNtent catalog `adopted` |
|---|---|---|
| `blueprints-v0.86.1` | `V_0-29-0` | `V_0-29-0` |
| `blueprints-v0.86.2` | `V_0-29-0` | `V_0-29-0` |
| `blueprints-v0.87.0` | `V_0-30-0` | `V_0-30-0` |
| `blueprints-v0.88.0` | `V_0-31-0` | `V_0-31-0` |
| `origin/main` | `V_0-31-0` | `V_0-31-0` |

Spec and catalog agree at every release and at HEAD. The "catalog says V_0-29-0"
reading that opened this audit came from the **primary checkout being 59 commits
behind** `origin/main`, not from main.

### The release lane reaches a fixed point

`plan-auto-tags` now reports `[]` on `origin/main`: no key has an unreleased content
change, so no tag is cut and the lane is quiet. `release_tag` is excluded from
`blueprints` changePaths (`scripts/release/release-keys.js`), and #777 made the regen
pass stop rewriting the catalog — together these mean a pass that only moves
`release_tag` asks for no release, which is what stops the infinite re-release loop.

---

## The defect: the published manifest cannot install what the catalog offers

`manifest/source.yaml` is the pinned source-of-truth for distribution. Its
`blueprints:` list is the only thing a fresh install fetches.

| shipped by `source.yaml` | catalog entries |
|---|---|
| `domaiNN`, `changes`, `sidecar`, `sources`, `artifacts`, `procedures`, `executions`, `blank` (8) | 22 |

**14 of 22 catalog blueprints have no install path at all:** `analysis`, `business`,
`business-model`, **`coNNtent`**, `design-presets`, `documentation`, `innovation`,
`metrics`, `organization`, `projects`, `repository`, `source-package`, `stakeholders`,
`visual-catalog`.

The content exists and is publicly fetchable — `raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md`
answers `200`. Nothing is missing but the **declaration**.

This is not a consequence of today's merges. `source.yaml` has not listed `coNNtent`
in the `blueprints:` block at any point this audit can see; the 14 orphans are a
structural gap between "what the repo publishes in the catalog" and "what the
installer is told to fetch".

### Why it matters for the release

- A user who runs the documented install gets **domaiNN plus seven technical
  bluepriNNts**. They cannot install `coNNtent`, `projects`, `business`, or any
  business/analysis domain — the half of the product that is not pipeline plumbing.
- `skills-manager status` reads the catalog and reports those 14 as available, so the
  product advertises what the installer cannot deliver.
- Our own profile install is the proof: 8 templates, the same 8 shipped here.

### The version column has no reader

The live manifest stamps **`version: "V_0-5-0"` on all eight** blueprints, while their
catalog `adopted` values are `V_0-4-1`, `V_0-15-0`, `V_0-2-0`, `V_0-4-0`, `V_0-5-2`,
`V_0-6-1`, `V_0-3-1`, `V_0-4-1`. `V_0-5-0` is `manifest/source.yaml`'s own root
`version:` (`scripts/release/assemble-manifest.js:245`), so the stamp is a fallback,
not a measurement. It is inert today — install pins on `ref`, and `status` compares
`adopted` — but it is a published field that disagrees with the product on every entry.

---

## What this means for A2

There is nothing to cut. `blueprints-v0.88.0` is already published, coherent, and
contains coNNtent `V_0-31-0`; #810 will produce `v0.89.0` with `V_0-32-0` through the
normal lane once it merges.

The release blocker is a **`source.yaml` change**, not a tag:

1. Add the 14 orphaned blueprints to `manifest/source.yaml`'s `blueprints:` list, or
   decide explicitly that some are repo-only and record why.
2. Stop stamping a root `version` onto blueprint entries that carry none in the
   source, or populate each entry's real `version`.
3. Add the guard that would have caught this: a test asserting every catalog entry is
   either shipped by `source.yaml` or listed as repo-only, and that a shipped entry's
   manifest `version` equals its catalog `adopted`.

Item 3 is the one that keeps it fixed.

---

## Method notes

- Catalog coherence: compared `spec_NN.md`'s `blueprint_version` with the catalog's
  `adopted` at each of the last four tags and at `origin/main`.
- Shipping gap: parsed `manifest/source.yaml` top-level sections
  (`blueprints`, `frozen_blueprints`) and diffed against `catalog.json`'s
  `blueprints` + `frozen` keys.
- Manifest: fetched the live document and parsed its `agent-bootstrap` frontmatter.
- Public fetchability: `HTTP GET` on the raw GitHub path for six blueprints.
- Working-tree numbers were re-measured after `git pull --ff-only`; the first readings
  in this session came from a checkout 59 commits behind and are not used.
