# Exploration: Canonical `domaiNN` root shape and the dogfooding domaiNN

## Trigger

The maintainer asked to rename the repo's self-hosted dogfooding workspace
(`workspace_NN/`) and to make it "coherent with the `cogNNitive` blueprint" —
"eat our own dog food". Investigation shows the trigger rests on a conflation and
uncovers a systemic gap: **no domaiNN in the repo is authored in the concepts of
the `domaiNN` blueprint it declares** — not the dogfooding workspace, not even the
published documentation use-cases.

## Findings

### F1 — `cogNNitive` is a FROZEN, RETIRED blueprint

`manifest/source.yaml` declares a `frozen_blueprints:` block
(lines 136–148) holding **`cogNNitive`, `base`, and `workspace`**. The spec
`openspec/specs/base-composite-template/spec.md` is explicit:

- "The `base_V_0-1-0` Level-2 template is **frozen and legacy** … new Level-3
  models MUST NOT adopt it" (the same retirement applies to the pair it composes).
- "the canonical entry template is the fused `workspace_V_0-3-0` … which is
  self-contained and MUST NOT be composed via `includes` by `base` or any other
  package."

`cogNNitive` is the **provenance/lineage (W3C PROV)** blueprint
(`Sources`, `ModelRecords`, `Artifacts`, `Procedures`). It was retired together
with the `workspace` container blueprint it pairs with.

**Consequence:** "dogfood the `cogNNitive` blueprint" is invalid — you do not
adopt a retired blueprint. Any provenance model in a new domaiNN MUST NOT pin
`cogNNitive`. The rename to `cogNNitive_NN/` does not make the container
"coherent with `cogNNitive`": coherence with that blueprint is impossible by
policy, and the container's schema is `domaiNN`, not `cogNNitive`.

### F2 — The canonical `domaiNN` root concepts are `domaiNN`, `kNNowledge`, `Tags`

`iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md` (V_0-3-0) declares exactly three
concepts. The tests that build a schema-clean domain confirm the shape:

- `check-workspace.spec.ts:239` — "clean canonical domain" root is just
  `# NN domaiNN` (plus `parent_spec: domaiNN`).
- `validate.spec.ts:65` (`workspaceContent()`) — the canonical root is
  `# NN kNNowledge` listing models by `path::`.

A deterministic migrator already encodes the mapping
(`innfo-core/src/legacy/language-map.ts`, tested in
`tests/legacy/language-map.test.ts`): `Workspace → domaiNN`,
`Models → kNNowledge`, `Templates → bluepriNNts`, `models/ → kNNowledge/`,
entrypoint `*_base_NN.md`/`workspace_NN.md` → `domaiNN_NN.md`.

### F3 — NO domaiNN root in the repo uses the canonical concepts

Every `domaiNN_NN.md` in the repo authors `# NN Workspace` / `# NN Models` /
`# NN Sources` / `# NN Procedures` / `# NN Artifacts` — legacy `workspace`
concepts. `validate_knowledge` reports `CONCEPT_DRIFT_WARNING` for each:

| Root | Declares | Drift warnings |
|---|---|---|
| `workspace_NN/` | `domaiNN` | 9 (`Workspace`, `Specs`, `Templates`, `Models`, `Sources`, `Procedures`, `Artifacts`, `Skills`, `Tools`) |
| `docs/cognitive_nn/use-cases/startup-founder/` | `domaiNN` | 5 (`Workspace`, `Models`, `Sources`, `Procedures`, `Artifacts`) |
| `_samples_nn/` | `workspace` (frozen) | on the legacy schema |
| `simulation/fixtures/acme/` | `workspace` (frozen) | on the legacy schema |
| `test/fixtures/testlab/` | `workspace` (frozen) | on the legacy schema |

So the published documentation samples — the reference for the model — are
themselves not valid against the canonical blueprint. This is systemic, not a
dogfooding-specific bug.

### F4 — The `domaiNN` blueprint cannot carry every concept a real root uses

The `domaiNN` blueprint declares `domaiNN`, `kNNowledge`, `Tags`. Real roots also
carry the **catalog pointers** `Sources`, `Procedures`, `Artifacts`
(`sources_NN.md` / `procedures_NN.md` / `artifacts_NN.md`) and the
repo-specific `Specs`, `Templates`, `Skills`, `Tools`. The blueprint has no home
for any of these, so a root that keeps them is guaranteed to drift. The mapping
`Templates → bluepriNNts` (F2) implies the blueprint *should* declare a
`bluepriNNts` concept that its spec omits — a blueprint/content inconsistency.

### F5 — Legacy "Workspace" naming survives in five places, untracked as debt

1. Folder `workspace_NN/` (no backlog item).
2. Blueprint package dir `iNNfo/specs/bluepriNNts/workspace/` (procedures + assets; its spec moved to `domaiNN/`).
3. Standalone `iNNfo/specs/bluepriNNts/workspace_spec_NN.md` (V_0-2-2, frozen).
4. Top-level `iNNfo/specs/workspace_V_0-2-2_NN.md` + `docs/workspace_NN.md`.
5. Composite `bluepriNNts/base/spec_NN.md` `includes` `workspace_V_0-2-0` + `cogNNitive_V_0-2-0` (frozen).

Only one code reference to the folder path literal exists:
`eslint.config.mjs:29` (`'workspace_NN/**'`).

### F6 — `_NN` is already a reserved module name

`openspec/config.yaml` declares `_NN: Artifacts and commercial web content
store.` A root `_NN/` for domaiNNs would collide with that declared module.

## Options for the S2 root shape

- **A. Compose via `includes`.** REJECTED by policy: every composable blueprint
  (`workspace`, `cogNNitive`, `base`) is frozen, and the composite spec forbids
  composing the canonical entry template.
- **B1. Bare `domaiNN` concepts, catalogs as `kNNowledge` entries.** The root
  keeps `# NN domaiNN` + `# NN kNNowledge` (+ `# NN Tags`), and re-homes the
  `sources`/`procedures`/`artifacts` catalogs as `kNNowledge` entries
  (`path::` + `blueprint::`). `Specs`/`Templates` become the `bluepriNNts`
  concept; `Skills`/`Tools` are dropped (a domaiNN describes kNNowledge, not
  arbitrary repo files) or re-homed as `kNNowledge` entries. No blueprint change.
- **B2. Extend the `domaiNN` blueprint** to declare the missing concepts
  (`bluepriNNts`, and whatever the catalog roots need). Touches a shipped,
  distributed blueprint and its version; larger blast radius.

## Open questions

1. **Scope.** The defect spans all five roots. Should this change migrate only
   the dogfooding domaiNN, or reconcile the `domaiNN` blueprint + all repo roots
   (including the published docs use-cases) in one migration?
2. **`Skills`/`Tools`.** Drop them from the root, or keep a modeled root view
   (which forces B2)?
3. **Folder name.** `cogNNitive_NN/` (maintainer) collides cognitively with the
   frozen blueprint name; alternatives `ecosystem_NN/` or keep `workspace_NN/`.
