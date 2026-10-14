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
        └─► #1A ──► #1B ──► #1C ──► S2c ──► S3a ──► S3b ─┬─► S5-delete (S5a→S5d)
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
| S5-freeze | `2026-10-13-s5-retire-innfo-editor` (Section A) | none (does not wait for S3 or S6) | Maintainer decision 2026-10-14, variant A3: editor source stays, leaves workspaces and every gate, hosted app published from a committed snapshot, `FROZEN.md`. Touches no console capability and no release-owned path (no tags). Only `quality-gates` is a live delta. |
| S5-delete | same change (Section B, **deferred**) | S3 (S3a+S3b) AND S6, maintainer dogfooding and explicit sign-off | Original S5. Its spec deltas sit under `deferred-delete/specs/` and are NOT synced or archived by the freeze. Re-cut then: `console-architecture`, `editor-lineage-ui`. S5c (badge retarget) is off the freeze path and runs only here. |

## Verified requirement overlap (SCS vs lineage deltas)

Only these requirements are modified by BOTH the spine and a lineage delta (verified by
reading both sides; archived changes excluded). An earlier list that also named Level 1,
Level 2, the payload siblings, the runtime bundling requirements and
`lineage-single-edge`/`console-view-registry` was WRONG — no live lineage delta touches
those.

| Capability / requirement | Spine action | Lineage delta | Resolution |
|--------------------------|--------------|---------------|------------|
| `console-architecture` / Level 3 Model Custom Consoles | REMOVED | S3 MODIFIED (duplicate of SCS's ADDED "One Console Shell, Scoped Domain Consoles") | **Drop S3's delta** — it modifies a requirement SCS deletes. |
| `console-payload-builder` / Payload Meta | (dropped) | S2c MODIFIED (no verdicts) | **Resolved**: the spine drops its delta; S2c owns removing `meta.feedbackState`. |
| `console-review-mode` / Verdict Badges | (dropped) | S2c MODIFIED (`element.history` + `changes`) | **Resolved**: spine drops its delta; S2c owns badges (scoped-console scenario added). |
| `console-export-cli` / Status Reporting and Staleness Detection | MODIFIED (newest member of the write-once family) | S6 MODIFIED (stable `artifacts/<stem>_console/<stem>_console.html`) | Re-cut SCS's write-once text to the maintainer's "stable filename" decision. |
| `console-export-cli` / Selective Compilation and Filtering | MODIFIED (`writeOnce`) | S6 MODIFIED (`writeConsole`, stable path) | Same as above. |
| `console-export-cli` / Console exports are write-once | MODIFIED | S6 REMOVED | Drop SCS's rewrite if SCS adopts the stable file (question 11); otherwise sequential. |
| `innfo-console-feedback` / Reconcile Feedback Procedure | (dropped) | S2c REMOVED | **Resolved**: spine drops its delta; S2c removes the procedure. |
| `editor-lineage-ui` / Explorer classifies files by contract role | MODIFIED | S5 REMOVED (editor retired) | Sequential (SCS modifies, S5 removes); SCS's edit is transient, harmless. |
| `innfo-console-runtime` / `build_console_payload` references | REMOVED (tool + procedure) | S6 references it | **Dangling reference** — S6 must name the surviving mechanism. |

Everything else the lineage set touches is orthogonal: keep it and only align wording to
the post-SCS terminology. #1A's `innfo-console-runtime` "Exported changesets are resolvable
by apply_change" and `lineage-single-edge` "Node role derives from the naming contract",
#1C's console deltas, and S6's regeneration requirements are all unaffected by SCS.

## Affected pre-existing active changes (audited 2026-10-13)

| Change | Coupling | Action |
|--------|----------|--------|
| `2026-10-10-blueprint-external-skills` | Shares `template-procedures-manifest-and-discovery` with SCS | **Archive first.** Its stale `assets/model_viewer.html` example is already fixed (SCS T0.6, commit `37a78215`). |
| `2026-09-30-nn-quarantine-removal` | BLOCKED. Names the editor `useLegacyDomain.ts` (deleted by S5-delete; kept, frozen, by S5-freeze) and the quarantine half S4 shrinks | Whichever runs second updates the target list. No spec-delta collision (`legacy-quarantine` untouched), but its scope shrinks. |
| `2026-10-01-nn-domain-git-workflow` | none | — |
| `2026-10-07-nn-upgrade-contract-docs` | **Folded into S4** (maintainer, 2026-10-13): proposal-only, never applied, and S4 rewrites the same skill/procedure. Its glossary + skill-owns-final-state intent moved to S4 `design.md` D6; the change directory was removed. | Done. |
| `2026-10-11-video-script-contract-additions` | none | — |

## Releases

Releases are tag-driven (`scripts/release/release-keys.js`: `skills|blueprints|innfo-mcp|innfo-console`); pins are never hand-edited. A change on `main` needs its tag or `verify.js --release` reddens.

- **SCS**: `innfo-console-v*`, `blueprints-v*` + repin (`workspace/` deletions), `innfo-mcp-v*` (breaking: `build_console_payload` removed), skills bump.
- **#1A–#1C** reach `main` in one batch; #1C cuts their tags.
- **S2c, S4, S6 (S6e), S5-delete** each cut their own after their batch. **S5-freeze cuts none** (no release-owned path touched).

## Decisions (resolved with the maintainer, 2026-10-13)

1. **Document badge.** Confirmed: `https://cognnitive.com/innfo/` with the wording in S5
   `document-badge` (already in the delta). Maintained bluepriNNts take a `template_version`
   bump.
2. **CTAs.** Confirmed: "Open App" → "Read the docs" →
   `https://cognnitive.com/innfo/documentation/` (already in S5 `design.md` and tasks 7.3).
3. **Write-once samples.** Recorded in `iNNfo/validation-baseline.json`, not excluded: #1C
   (unfrozen slugs) and S4 (fuzzy-only references) fold this into their tasks/risks.
4. **Reference grammar.** Keep exact `[[Display Name]]` + ambiguity error (S4 unchanged). A
   slug-only grammar (incl. cross-model `[[Model Title :: Element Name]]`) is NOT opened now;
   it would be a separate versioned iNNfo grammar change.
5. **Console identifiers.** Renamed in the console spine (SCS), where the ids are defined:
   need `feedback-export` → `changeset-export`; ids `#innfo-feedback-*` → `#innfo-changeset-*`;
   root `[data-innfo-feedback-root]` → `[data-innfo-changeset-root]`. S2c records the rename
   and does not repeat it.
6. **Legacy detection.** Kept (S4): the detector, the MCP hint and the preflight detection,
   all pointing at the new-domain recipe. The whole detection half is later removed by the
   blocked `nn-quarantine-removal` change.
7. **Apply target by name.** Kept: `apply_change` resolves a target by slug or exact name
   (`batch-slug-resolution`).
8. **Direct writers.** The bare `apply_change` ops (`bump_version`, `generate_index`,
   `add_concept`, `add_field`, `set_marker`, `freeze_slugs`) stay for now; a follow-up change
   will route or remove them.
9. **S3a.** Kept, narrowed: re-audits the editor against the already-unified console (the
   safety gate before S5-delete deletes the editor; it audits the frozen editor, restore tag `innfo-editor-frozen`); it does not re-audit what SCS ported.
10. **Lineage console deltas.** Rule adopted: a lineage delta that touches a capability SCS
    decides is re-cut against the post-SCS text and dropped when redundant. Applied.
11. **Verdict source + stable console file.** Resolved: the spine was re-cut to drop the
    verdict-ledger mechanism (S2c owns verdict badges from changesets); the stable console
    file is S6's (applied after the spine). See the verified-overlap table.
12. **`nn-upgrade-contract-docs`.** Folded into S4 and removed as a live change.
13. **`init_knowledge` repair half.** Dropped: `init_knowledge` becomes create-only; broken
    frontmatter is handled by `validate_knowledge` + `update_field` (S6 design).
