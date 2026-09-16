# Verification Report: Document Fidelity & Provenance Integrity

**Change Identifier**: `2026-09-13-document-fidelity-and-provenance-integrity`  
**Date**: 2026-09-16  
**Status**: **PASS**  
**Verifier**: Antigravity Verification Subagent  

---

## Verification commands

| Command | Result |
| --- | --- |
| `npm --prefix iNNfo run typecheck` | PASS (innfo-core, innfo-mcp, innfo-editor) |
| `npm --prefix iNNfo run test` | PASS — innfo-core 812, innfo-mcp 275, innfo-editor 657 (1744 total, 3 skipped) |
| `npm run check:integrity` | PASS — all gates, including the new `check:versions` |
| `npm run check:samples` | PASS — `_samples_nn/` and every template `samples/` in sync |
| `node simulacro/run-all.mjs` | **51 passed · 0 failed · 7 observed** across all 8 scenarios |

The 7 `observed` outcomes are informational measurements the harness records
rather than assertions; none is a failure.

## What the change fixed

**Work unit 1 — template version SSOT (F-04, F-05).** `template_version` is now
declared once, in each template's `spec_NN.md`, and generated into
`SHIPPED_TEMPLATE_VERSIONS` and `manifest/source.yaml` by
`scripts/sync-template-versions.mjs`. Drift is a commit-time gate
(`check:versions`, wired into `check:integrity`) instead of a unit test three
steps later. This defect had recurred six times.

**Work unit 2 — package distribution (F-02, F-11).** `innfo-core` moved to
`moduleResolution: NodeNext` with fully-specified relative imports, so the
published package imports under plain Node instead of only behind a bundler.
A Node-process smoke test enforces it. `npm run typecheck` now covers
`innfo-mcp`, which immediately surfaced a real type bug in `apply-change.ts`.

**Work unit 3 — document fidelity (F-01).** Round-trip went from **15 shipped
documents corrupted on save to 0**, byte-identical, with idempotency enforced
over the whole corpus by `tests/roundtrip-fidelity.test.ts`.

Two of the seven defect classes were silent data loss, not formatting:

- Frontmatter was rebuilt from an **allow-list of known keys**, so any other
  key (`workspace_id`, template extension keys) vanished on save.
- The `> [!NOTE]` banner was hardcoded, so extra author banner content was
  dropped.

The others: the item-markers matrix dropped any marker column whose cells were
all `-`; tag casing, bracket lists, section order and blank-line placement were
all rewritten. The governing fix is one idea — **the parser records the
author's exact source text and the serializer re-emits it verbatim while the
parsed value still matches**, falling back to canonical construction only for
what a mutation actually changed.

**Work unit 4 — citation provenance typing (F-06, F-09).** `citation` is a real
field type, and `validateWorkspaceSources` decides by the **declared type**
rather than the field name; name matching survives only as the documented
fallback for a model whose schema did not resolve. `serializeKnowledgeUnitRef`
emits `@## Q4 Outlook` instead of `@##q4-outlook`, so citations are readable
against the document again. Citation lists dedupe on write.

**Work unit 5 — mutation schema conformance (F-07).** `add_element` rejects an
undeclared concept when a schema is supplied, with a Levenshtein suggestion;
the schemaless path is unchanged.

**Work unit 6 — cross-model identity (F-08).** The same element name in two
models is legal and no longer advises a rename; an `info` note names the
qualified `[[Model :: Element]]` form instead.

**Work unit 7 — shipped sample workspace (F-03).** `_samples_nn/` had **no
`sources/` directory at all** — the first workspace a new user opens advertised
source traceability while shipping nothing to trace. It now ships a Markdown
report addressed by heading and a CSV incident log addressed by row key, both
registered under `# NN Sources` and cited from three models across different
templates, including a CSV row pointer and a subunit pointer. The
`workspace_hub.html` artifact declaration was removed: it is the output of a
procedure that was never run, and the workspace must not advertise what it does
not ship.

**Work unit 8 — editor flows (F-12…F-16).** Expanding a model no longer forces
focus mode, the 1.1s transition is 250ms, the `webkitdirectory` fallback goes
through the real pipeline, handle persistence is consolidated, rename
revalidates only the affected root, and "Open External" resolves through a Blob
URL.

**Work unit 9 — spec and dead-code hygiene (F-10, F-17).** Live specs no longer
require the deleted `master.html`; `validateWorkspaceReferences` raises a named
error instead of a raw `TypeError`.

## Defects found and fixed that were not in the original scope

Both were discovered while implementing the units above and are the same class
of bug the change exists to eliminate:

- **`slug::` was write-only.** The parser read it; the serializer never emitted
  it. Any element declaring an explicit slug lost it on its first save. No
  shipped document used the field, which is why it had gone unnoticed. Fixed
  with an authored-vs-derived distinction, since `deriveElementSlugs` assigns a
  slug to every element and writing unconditionally would grow a `slug::` line
  on every element of every document (`c3dcf7b`).
- **The duplicate-element-name issue carried no severity.** An element failing
  model-wide name uniqueness is dropped from the graph, not merely reported,
  yet hosts had no way to triage the issue (`c916d6c`).

## Deviations from the design

**AD-4 amended: the `Row` / `Col` matrix axis placeholder was removed, not
kept.** The placeholder was substituted at write time, so a matrix whose axis
labels were genuinely empty was written back as `| Row \ Col |` and re-parsed
as those literal strings — the serializer inventing data the document never
held. That breaks Requirements 1 and 2, which are the point of the unit;
avoiding a visually empty axis header is cosmetic. Cosmetics do not outrank
fidelity. The amendment is recorded in `design.md` under AD-4.

**AD-5's "optional schema resolver" parameter proved unnecessary.**
`recursiveParse` already stashes the composed template schema on each document
root, so `validateWorkspaceSources` walks to the root and reads it. Both hosts
were already supplying `resolveTemplateSchema` — the editor in
`modelStore.parseFromHandle`, the MCP in `validate.ts` via
`buildTemplateSchemaResolverFromCache`. No new host plumbing was added.

## Out of scope, and why

**Task 4.4 (partial) — `citation` is not declared in the Level-1 metaschema.**
It is declared in the parser's `FIELD_TYPES` / `FieldType` union, which is what
makes the validation work. The metaschema half lives in
`iNNfo/specs/iNNfo_V_0-2-1_NN.md`, a **published, write-once spec file**.
Declaring the type there requires cutting a new L1 spec version with its
manifest entry, parity checks and template repointing — a separate change.
Nothing in this change depends on it: `citation` is accepted by the parser and
validated correctly today.

**Task 4.7 — no template migration was needed.** The task assumed shipped
templates declared provenance fields to migrate. Verified: none do. The only
`## NN Field Definition: source` in the corpus is `documentation`'s, already
`type:: markdown_file`, which is exactly what AD-5 says to leave alone and is
what fixes F-06. No `template_version` bump was required.

**Intra-document element identity by slug — explicit non-goal.** The 8
duplicate-name collisions in `Ghostbusters_business_NN.md` were resolved by
**renaming in the sample**. The deeper question — whether an explicit `slug::`
should legitimise a repeated display name within one document — was deliberately
not answered here, because two independent gates enforce the rule and
`IdentityRegistry` derives every node's `qualifiedId` from the name. Changing
it moves `[[wikilink]]` resolution, matrix endpoint lookup and qualified-
reference addressing underneath every consumer. That is an identity-semantics
change, not a sample repair. Recorded in full in `openspec/backlog.md`,
including the fact that duplicates are silently dropped from the graph today.

**F-18 (in-app source import) and `canonical-registry.ts` generation** remain
non-goals of this change, as recorded in the proposal and the backlog.

## Known flake, not a regression

`iNNfo/apps/innfo-editor/tests/metrics-console-harness.test.ts` can exit 134
under parallel load because it launches a real Chrome; it passes in isolation.
Pre-existing since commit `7cfe420`.
