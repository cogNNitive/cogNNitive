# Dependency graph — console unification (spine) + changeset/lineage changes

Single source of truth for the apply order of the changes registered on 2026-10-13,
after reconciling two change sets authored in parallel:

- **`single-console-shell` (SCS)** — the **console spine**. Collapses every console into
  one shell (`artifact_shell.html`, runtime `InnfoConsole`) with a scope; retires the
  model/procedures/custom console types, `model_console.html`, `render-model-viewer.js`,
  the `compile_model_console` procedure and the `build_console_payload` MCP tool.
- **The lineage set** (#1A, #1B, #1C, S2c, S3, S4, S5, S6) — changeset as a first-class L3
  node, immutability, console changes view, provenance retirement, domain-console ports,
  migration-flow retirement, editor retirement, console regeneration/propose.

## Authority (do not re-litigate)

- **SCS is authoritative for console architecture.** The maintainer decided (2026-10-13)
  that all consoles are the domain console with a scope; no model/procedures/custom console
  types. Where a lineage delta asserts the old multi-console model, the lineage delta is
  wrong and is re-cut.
- **The lineage set is authoritative for changeset / identity / provenance.** SCS does not
  touch those.
- Not covered by either: anything in the 5 pre-existing active changes below.

## Ordering principle

**SCS applies first** (it is the console architecture every later console delta is written
against); the lineage deltas that touch console capabilities are **re-cut against the
post-SCS living specs** before they are applied. Lineage changes that touch no console
capability keep their order unchanged.

## Graph

```text
blueprint-external-skills (ARCHIVE FIRST — shares template-* spec deltas; stale example)

SCS  single-console-shell ─────────────────────────────────────────── SPINE
        │
        └─► #1A ──► #1B ──► #1C ──► S2c ──► S3a ──► S3b ─┬─► S5 (S5a→S5d)
                                        │                 │
                                        │            ┌────┘
                                        └─► S6 (S6a→S6e)
                                    S4 (S4-1→S4-2) ──► S6c   (parallel with S3)
```

## Changes

| Id | Directory | Depends on | Notes |
|----|-----------|------------|-------|
| SCS | `single-console-shell` | `blueprint-external-skills` archived | Console spine. See its `tasks.md` T0–S5 + Archive. |
| #1A | `2026-10-13-changeset-first-class-and-lineage` | SCS | Re-cut: `innfo-console-runtime`, `lineage-single-edge` deltas aligned to post-SCS text. |
| #1B | `2026-10-13-changeset-immutability-and-snapshot-removal` | #1A | No console capability touched — unchanged by SCS. |
| #1C | `2026-10-13-console-changes-view-and-slug-ids` | #1B | Re-cut: `console-export-cli`, `console-payload-builder`, `console-review-mode`, `console-view-registry`. |
| S2c | `2026-10-13-s2c-retire-legacy-provenance` | #1C | Re-cut: `console-export-cli`, `console-payload-builder`, `console-review-mode`, `innfo-console-feedback`. |
| S3 | `2026-10-13-s3-domain-console-and-edit-modal` | S2c | Re-cut: `console-architecture` (D17 superseded by SCS). SCS already ported the runtime parity gaps S3a would audit — reconcile S3a scope. |
| S4 | `2026-10-13-s4-retire-legacy-migration-flows` | — (before S6c) | No console capability touched — unchanged by SCS. |
| S6 | `2026-10-13-s6-console-regeneration-and-propose` | #1C, S2c; S6c also S4 | Re-cut: `console-export-cli`, `console-review-mode`. |
| S5 | `2026-10-13-s5-retire-innfo-editor` | S3 (S3a+S3b) AND S6 | Re-cut: `console-architecture`, `editor-lineage-ui`. Editor retirement is orthogonal to SCS (which retires the model console, not the Vue editor). |

## Requirement names modified by both SCS and a lineage change (re-cut list)

| Capability | Requirements both touch |
|------------|-------------------------|
| `console-architecture` | Level 1 Universal Runtime Primitives · Level 2 Template Domain Consoles · Level 3 Model Custom Consoles |
| `console-payload-builder` | Payload Meta · Single Payload Builder · Single Citation Shape |
| `console-review-mode` | Verdict Badges · Review Mode Toggle · Reviewed Marks and Rail Progress |
| `console-export-cli` | Status Reporting and Staleness Detection · Selective Compilation and Filtering · Console exports are write-once |
| `innfo-console-runtime` | Shared UMD/IIFE Runtime · No Duplicated Inline Runtime · Bundle-Injected Feedback UI · Bundle Matches Its Sources · Needs Registry Without Feedback Anchors |
| `lineage-single-edge` | Staleness uses existing mechanisms only |
| `editor-lineage-ui` | Explorer classifies files by contract role |
| `innfo-console-feedback` | Reconcile Feedback Procedure |
| `console-view-registry` | Standalone view export |

Rule: the lineage delta is rewritten against the post-SCS requirement text. Where SCS
already decides the outcome (shell consolidation, console-type retirement, MCP-tool removal,
per-model `sha256`/`feedbackState` in `meta.models`), the lineage delta **drops** that
requirement instead of re-modifying it.

## Affected pre-existing active changes (audited 2026-10-13)

| Change | Coupling | Action |
|--------|----------|--------|
| `2026-10-10-blueprint-external-skills` | Shares `template-procedures-manifest-and-discovery`; its `template-package-structure` delta carries the stale `assets/model_viewer.html` example | **Archive first.** Fix the stale example (SCS T0.6) before its delta lands. |
| `2026-09-30-nn-quarantine-removal` | BLOCKED. Names the editor `useLegacyDomain.ts` which S5 deletes | Whichever runs second updates the target list. No spec-delta collision (`legacy-quarantine` is untouched). |
| `2026-10-01-nn-domain-git-workflow` | none | — |
| `2026-10-07-nn-upgrade-contract-docs` | none | — |
| `2026-10-11-video-script-contract-additions` | none | — |

## Releases

Releases are tag-driven (`scripts/release/release-keys.js`: `skills|blueprints|innfo-mcp|innfo-console`); pins are never hand-edited. A change on `main` needs its tag or `verify.js --release` reddens.

- **SCS**: `innfo-console-v*`, `blueprints-v*` + repin (`workspace/` deletions), `innfo-mcp-v*` (breaking: `build_console_payload` removed), skills bump.
- **#1A–#1C** reach `main` in one batch; #1C cuts their tags.
- **S2c, S4, S6 (S6e), S5** each cut their own after their batch.

## Open questions for the maintainer

1. **Badge.** S5 retargets the document badge to `https://cognnitive.com/innfo/` with the
   wording in S5 `design.md`; that bumps every maintained bluepriNNt's `template_version`.
   Confirm URL and wording.
2. **CTAs.** "Open App" becomes "Read the docs" → `https://cognnitive.com/innfo/documentation/`. Confirm.
3. **Write-once samples.** Published `_V_x-y-z_` samples cannot be edited. If one has
   unfrozen slugs (#1C rejects its console) or a reference that only the deleted fuzzy step
   resolved (S4), exclude it from export/validation, or record it in
   `iNNfo/validation-baseline.json`?
4. **Reference grammar.** S4 keeps exact display-name resolution because `[[Display Name]]`
   wikilinks and name-based matrix headers are the iNNfo grammar; it deletes only the fuzzy
   step. Slug-only references (and cross-model `[[Model Title :: Element Name]]`) would be a
   separate, versioned iNNfo grammar change. Keep as-is, or spin a new change?
5. **Console identifiers.** Rename the `feedback-export` need and the `innfo-feedback-*`
   DOM ids (they now host the changeset export) in S2c, or leave them?
6. **Legacy detection.** S4 keeps the legacy-layout detector, the MCP legacy hint and the
   preflight detection (pointing at the new-domain recipe). Delete them too?
7. **Apply target resolution by name.** `apply_change` still resolves a change target by
   element name as well as slug (`batch-slug-resolution`). Keep?
8. **Direct writers left.** Bare `apply_change` ops (`bump_version`, `generate_index`,
   `add_concept`, `add_field`, `set_marker`, `freeze_slugs`) write without a changeset.
   Schedule the follow-up change?

### Reconciliation questions (new)

9. **S3a audit scope.** SCS already ports the runtime parity gaps (identity header, `#el-`
   deep links, `sourceUrl`, header sources icons). S3a was a parity audit that produced
   `audit.md` before S3b. Keep S3a as a re-audit against the collapsed console, or fold its
   outcome into SCS S3 and start the lineage set at S3b?
10. **Lineage console deltas.** Confirm the rule above (lineage delta drops a requirement SCS
    already decides) so the re-cut has one direction.
