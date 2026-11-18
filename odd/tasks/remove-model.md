# remove_model — a recorded, sealed removal of an instance model

Branch: `session/remove-model`. Delivery: one PR to `main`. Runner: `node --test`
(nn-core) and `vitest run` inside `iNNfo/packages/nn-mcp`.

Heavy change (public MCP + blueprint contract): one delta spec at
`openspec/changes/remove-model/specs/delete-impact-and-lifecycle/spec.md`, no
proposal/design/tasks files.

## Why

The CRUD loop is open at exactly one level: `propose_changeset` has `remove_element`
and `remove_matrix`, but "there is no operation that removes an instance model", and a
hand deletion is reported as `MODEL_WITHOUT_FILE`. A recorded removal closes the loop
without weakening drift checking.

## Specs

**S1 — Operation shape.** `remove_model` carries `target` (the instance model id) and
nothing else beyond `evidence`, `notes` and `author`; it must not carry `to`, `from`,
`base_hash`, `fields`, `slug`, `concept`, `name`, `blueprint_name`, `blueprint_url`,
`knowledge_version` or `seed`.

**S2 — Sealed and recorded.** A removal exists only as a change in a sealed changeset:
the parser rejects a malformed one, the seal covers it, and applying it writes the
change's execution facts. Nothing is copied into an `_archive/` folder: the change
block and Git history hold the old content.

**S3 — Instance models only.** A compact model is refused with
`REMOVE_REQUIRES_INSTANCE`. A target with no file is `MODEL_NOT_FOUND`.

**S4 — No live descendants.** A model whose folder still holds another discovered
model is refused with `REMOVE_MODEL_HAS_DESCENDANTS`, naming the ids. Remove the
children first.

**S5 — Referrers.** Every typed reference that addresses the removed id (or a
descendant id) must be cleared by an `update_field` in the same changeset that no
longer addresses it, or its element must be removed by a `remove_element` in the same
changeset. Otherwise `REMOVE_LEAVES_DANGLING_REFERENCES`, listing the
`update_field` changes that would fix it. `propose_changeset` runs the same scan.

**S6 — `MODEL_WITHOUT_FILE` is terminal after a recorded removal.** A model id whose
last applied model-lifecycle change is a `remove_model` is not reported. If a later
applied change re-creates the id (`add_model`, `extract_instance`, or a `move_model`
into it), the id is live again and a missing file is `MODEL_WITHOUT_FILE` again.

**S7 — References to a removed model.** An address naming a removed id resolves to
`REF_MODEL_NOT_FOUND` (an error) whose message names the changeset that recorded the
removal. No successor is invented; a moved id still names its successor.

**S8 — The log drops the removed model's units.** The fold removes its units, cleared
keys, element epochs and element origins at the removal's position and keeps the change
as a model tombstone, so no read-only projection reports live units for it.

**S9 — Strict replay does not replay it.** `remove_model` writes no body; a removed
model is simply not compared, and every model that has a file is compared exactly as
before.

**S10 — The manifest learns the terminal state.** An applied changeset that removed
models reconciles the domain manifest non-dry, so the inventory entry is archived; a
failure is reported in `manifest` and never changes the apply outcome.

**S11 — The blueprint declares it.** The closed `op` select of the `changes`
blueprint lists `remove_model`, the blueprint version is bumped (V_0-9-0 is
published), and the registry mirror and catalog are regenerated.

## Tasks

| ID  | Specs | Route  | Status | Evidence |
| --- | ----- | ------ | ------ | -------- |
| T1  | S1    | inline | done   | parser: 3 RED then GREEN, 23/23 in `tests/changeset/parser.test.ts` (7763940d) |
| T2  | S6, S8 | inline | done  | fold + drift: 6 RED then GREEN, 48/48 in both files (7763940d) |
| T3  | S3, S4, S5, S2 | inline | done | apply: 10 RED then GREEN in `apply-change-facts.spec.ts`, 802/802 suite (100c92d2) |
| T4  | S9    | inline | done   | strict replay test added, `provenance-strict.test.ts` 11/11 (100c92d2) |
| T5  | S7    | inline | done   | `workspaceReferences.test.ts` 23/23, diagnostics name the removal (41d2d9c6) |
| T6  | S10   | inline | done   | two `applyWithConsole` tests, `apply-change-models.test.ts` 22/22 (100c92d2) |
| T7  | S5    | inline | done   | propose scan shared with apply; `missing_referrer_updates` tested (100c92d2) |
| T8  | S11   | inline | done   | `changes-blueprint-text` guard 4/4, registry + catalogs regenerated (5ec48bb3) |
| T9  | all   | inline | todo   | docs pages + delta spec (delta spec: `instance-model-lifecycle`) |
| T10 | all   | inline | todo   | verify:fast, affected suites, PR |

## Log

L1 (verbatim, 2026-11-18): implement `remove_model` as a sealed, recorded change; make
`MODEL_WITHOUT_FILE` accept a recorded removal as a terminal state narrowly tied to an
applied removal; define reference behaviour; keep old content recoverable without an
`_archive/` folder; teach strict replay and the domain manifest sync the terminal
state. Secondary, same PR if small: fix the MCP inventory (24 vs 23, missing
`read_lineage` row) and qualify the "the change is the only provenance" claim.

L2: the review's line citations are documentation claims at `ce776f9d`. Verified in
code before relying on them: `MODEL_WITHOUT_FILE` is emitted from `changelog/drift.ts`;
`move_model` is an apply-level op in `nn-mcp/src/tools/apply-change.ts` (no mutation
handler); the tool registry holds **24** tools and `read_lineage` is one of them, so
the prose count is right and the table row is missing. That closes the review's open
question 1 in favour of 24.

L3: `iNNfo/specs/bluepriNNts/changes/spec_NN.md` pins V_0-9-0 and the catalog records
it as published under `blueprints-v0.70.1`, so the new op lands as V_0-10-0 rather than
editing the published pin in place.

L4 (superseded by L5): the first plan was one capability delta,
`delete-impact-and-lifecycle`.

L5 (capability decision, 2026-11-18): the delta targets **`instance-model-lifecycle`**,
not `delete-impact-and-lifecycle` and not `safe-delete`. Reason: `main` already carries
an active change, `openspec/changes/safe-delete/`, that modifies
`delete-impact-and-lifecycle`; a second MODIFIED block on a capability already in flight
is the conflict this repo documents as expensive, and folding a public-tool-surface
change into another session's in-flight change would make one PR own both and would
have to land them together. `instance-model-lifecycle` is the capability that already
owns create/move/extract for instance models, and no active change touches it, so the
removal contract lands on its own authored bump.

L6 (D7 resolution, 2026-11-18): the registry holds 24 tools and `read_lineage` is one of
them (server.ts registry + `server.spec.ts`), so the prose count is correct and the
table row is the defect. The table lives in `content/reference/mcp-tools.md` inside a
`generated:mcp-tools` region that `scripts/generate-docs-facts.mjs` never rendered,
so it drifted by hand. Fix: add that page to the generator's target list, so the table
is produced from the registry (24 rows, `read_lineage` included) and cannot drift again.
The provenance claim is qualified in `concepts/mental-model.md`, naming `generate_index`
and the Level-2 authoring operations as the writes outside a changeset.

L7: `EXECUTION_FACT_KEYS`/`compactExecutionFacts` delete a per-change `status` and
`resolution` when they equal the batch-wide ones. Two assertions written against the
written changeset file failed for that reason and were corrected to assert the
frontmatter status and the absence of per-change facts, which is the documented shape.

L8 (generated mirror leak, 2026-11-18): the pre-commit hook regenerates the committed
nn-core mirrors, and from this worktree it embedded 144 absolute paths
(`D:/Users/.../node_modules/...`) in three of them: `node_modules` is a junction to the
primary checkout on another drive, so esbuild cannot print a relative path. That leaked
a local path into a public repo and made the nn-sources mirror determinism test fail
("no absolute or user-junction paths embedded in mirror"). Both generators now normalize
an absolute `node_modules/` and `iNNfo/` prefix, with a lookbehind so a URL such as
`https://...` can never match; the mirrors are regenerated clean (nn-sources 607/607).


