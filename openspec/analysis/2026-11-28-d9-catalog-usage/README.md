# 2026-11-28 — D9: are any `Source` / `Artifact` catalog fields derivable?

D9 is the evidence gate the 2026-11-27 core-blueprints review put in front of D10. D10 would move
`Synchronization` and the curated deliverable catalog into `domaiNN`, on the theory that
`sources_NN.md` and `artifacts_NN.md` are an "index of indices" whose fields are already implied by
sidecars and lineage.

The review could not settle it by reading: the question is empirical. This report measures it.
It is read-only — no schema change, no blueprint change, no code change.

## Question

For every `Source` element in a real catalog: does it carry an authored `summary`, `type` and
`status`? For every `Artifact`: `summary`, `status` and an `artifact_model` link? And who reads
those fields?

If a field is truly derivable from the sidecar or from lineage, moving or deleting the catalog
costs nothing. If it is authored semantic state that something reads, D10 starts by losing data.

## Method

Every file named `sources_NN.md` or `artifacts_NN.md` was parsed into elements (each
`## NN Source:` / `## NN Artifact:` heading and its field lines), and each element was checked for
the presence of a field line (`summary::`, `type::`, `status::`, `artifact_model::`). Element
counts and field counts are exact; nothing was sampled.

Corpora:

- **Repo, 14 catalogs found, 12 with elements.** The four shipped use-cases under
  `docs/cognitive_nn/use-cases/` (consulting-sales, freelance-designer, startup-founder,
  youtube-creator), plus `test/_samples_nn`, `test/ecosystem_NN`, and the
  `simulacro-refactorizacion` fixture. Two fixtures (`simulacro-refactorizacion`) hold only an
  index and no elements and were excluded.
- **Dogfood outside the repo, 39 catalogs found, 29 with elements.** Every domain under
  `Documents/_NN` carrying one of the two files. Excluded: `accounting-backup-2026-10-18_181833`
  (a byte-identical backup of `accounting`) and nine stubs with no elements
  (`artifacts-test`, `artifacts-test-2`, `C8_cleanroom_NN`, both `IDI_*` install tests,
  `LC_test_blueprint_NN`, `miniaturas_NN`, `prueba_cogNNitive_NN`, `t3code_test_NN`).

## Results

### Shipped samples (repo)

| Kind | Elements | `summary` | `type` | `status` | `artifact_model` |
|---|---|---|---|---|---|
| `Source` | 27 | 27 (100%) | 27 (100%) | 27 (100%) | — |
| `Artifact` | 10 | 10 (100%) | field does not exist | 10 (100%) | 1 (10%) |

### Dogfood domains (outside the repo)

| Kind | Elements | `summary` | `type` | `status` | `artifact_model` |
|---|---|---|---|---|---|
| `Source` | 482 | 219 (45%) | 482 (100%) | 482 (100%) | — |
| `Artifact` | 74 | 73 (99%) | field does not exist | 74 (100%) | 0 (0%) |

### Combined

| Kind | Elements | `summary` | `type` | `status` | `artifact_model` |
|---|---|---|---|---|---|
| `Source` | 509 | 246 (48%) | 509 (100%) | 509 (100%) | — |
| `Artifact` | 84 | 83 (99%) | — | 84 (100%) | 1 (1.2%) |

`type` is a `Source`-only field, and `Artifact` has no `type` at all — its equivalent is `format`.
The 2026-11-27 proposal assumed both catalogs carried comparable metadata; they do not.

## Who reads the fields

- **`Source.summary` and `Artifact.summary` are the agent's routing index.**
  `skills/nn-innfo/SKILL.md:149` instructs the agent to read `sources_NN.md`, `procedures_NN.md`
  or `artifacts_NN.md` to scan `summary`, `format`, `status`, `category` and `tags` "with zero
  additional file I/O", and to make routing, indexing and citation decisions "based entirely on
  these indexed catalog summaries". Line 151 then allows a leaf model to be read only on demand.
  That is the progressive-disclosure contract; the summary is what avoids opening the file.
- **`Source.status` is written by the skills**, not by tooling (`skills/nn-sources/SKILL.md`).
  `nn-core/src/sync/refresh.ts` reports its own per-alias result (`refreshed`, `unchanged`,
  `unreachable`, `skipped`, `removed`); that is a sync outcome, not the catalog's `status`.
- **`artifact_model` is a model link the parser follows.**
  `nn-core/src/recursiveParser/workspace.ts:183-193` lists it among the field names it treats as a
  model reference. It is a real pointer, but almost never populated (1 of 84).
- **The console does not read any of them.** Neither `sources` nor `artifacts` ships a console
  view: `iNNfo/specs/bluepriNNts/{sources,artifacts}/assets/` is empty, so there is no
  `console-view-*.js` for either.

## Verdict, field by field

| Field | Derivable from sidecar or lineage? | Why |
|---|---|---|
| `Source.summary` | **No** | Semantic description of the contents. The sidecar carries identity and integrity (`sha256`, `size_bytes`, `source_format`, `origin_uri`, `normalized_at`); lineage projects exactly that. Neither holds meaning. |
| `Source.type` | **No** | Polymorphic origin category (`local_file`, `url_snapshot`, `dynamic_feed`, `git_repo`, `api_export`). `origin_uri` narrows it at best; `api_export` and `url_snapshot` are indistinguishable from a URL alone. |
| `Source.status` | **No** | Operational state (`ready`, `stale`, `processing`, `error`). `processing` and `error` are transient and recorded nowhere; `normalized_at` only yields an age, never the state. |
| `Artifact.summary` | **No** | Curated summary of a deliverable. Lineage projects identity and hashes; `Run Artifact` records per-run verification, not what the deliverable is for. |
| `Artifact.status` | **No** | Publication lifecycle (`draft`, `verified`, `published`, `deprecated`). Different axis from `Run Artifact`'s run status, and absent from lineage. |
| `artifact_model` | **No** | A pointer from the catalog to a structured model. Lineage does not classify `artifacts/models/*_NN.md` as artifacts at all. |

None of the six is derivable. The catalogs carry authored state that exists nowhere else.

## What this means for D10

The evidence does not support D10. The "index of indices" cost is real — a domain root does end up
with four index documents — but the fields being indexed are authored semantics with a live
consumer, and `domaiNN` already has its own job (container conventions, entry point, local
blueprints). Moving the rows would move the index without removing it, while breaking the
progressive-disclosure rule that depends on reading them.

Reopen D10 only with a different argument than "the fields are redundant", because they are not.

## One finding outside D9's scope

Both specs call their `summary` field "Mandatory"
(`sources/spec_NN.md`, `artifacts/spec_NN.md`). In practice `Source.summary` is present in **246 of
509** elements (48%); `Artifact.summary` in 83 of 84. Nothing enforces the word, so the spec
promises a rule the corpus does not follow.

That is a documentation-or-validation decision of its own, not a consolidation argument. It is
recorded here and left open: either the word softens, or a load-time rule enforces it.

## Reproduction

The measurement was a throwaway PowerShell pass over the file list above; it wrote nothing and was
deleted after use. Repro is three steps: enumerate the two filenames under
`docs/`, `test/`, `iNNfo/specs/bluepriNNts/*/samples/` and the dogfood root; split each file at
`^## NN (Source|Artifact):`; count elements and `(?m)^summary::`-style field lines. Element and
field counts above are exact, so any future pass can be compared line by line against these tables.
