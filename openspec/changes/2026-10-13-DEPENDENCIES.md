# Dependency graph — 2026-10-13 changeset, console and editor-retirement changes

Single source of truth for the apply order of the eight changes registered on 2026-10-13.
Every change is fully specified and sliced into batch-sized apply units before any apply
starts. A change starts only when every change it depends on is applied on `dev`.

## Graph

```text
#1A ──► #1B ──► #1C ──► S2c ──► S3a ──► S3b ──┐
                         │                    ├──► S5 (S5a → S5b → S5c → S5d)
                         └──► S6a ──► S6b ──► S6c ──► S6e ┘
                               │              ▲
                               └──► S6d       │
S4 (S4-1 → S4-2) ─────────────────────────────┘   (S4 before S6c; parallel with S3)
```

| Id | Directory | Depends on | Slices (one PR each) |
|----|-----------|------------|----------------------|
| #1A | `2026-10-13-changeset-first-class-and-lineage` | — | one |
| #1B | `2026-10-13-changeset-immutability-and-snapshot-removal` | #1A | one |
| #1C | `2026-10-13-console-changes-view-and-slug-ids` | #1B | #1C-1, #1C-2, #1C-3 (releases) |
| S2c | `2026-10-13-s2c-retire-legacy-provenance` | #1C | S2c-1, S2c-2, S2c-3 |
| S3 | `2026-10-13-s3-domain-console-and-edit-modal` | S2c | S3a (audit gate), S3b (re-planned after the audit) |
| S4 | `2026-10-13-s4-retire-legacy-migration-flows` | — (lands before S6c) | S4-1, S4-2 |
| S6 | `2026-10-13-s6-console-regeneration-and-propose` | #1C, S2c; S6c also S4 | S6a, S6b (after S6a), S6c (after S6a, S6b, S4), S6d (after S6a), S6e (last) |
| S5 | `2026-10-13-s5-retire-innfo-editor` | S3 complete (S3a + S3b) AND S6 complete | S5a, S5b-1, S5b-2, S5b-3, S5c-1, S5c-2, S5d |

## Why each edge exists (what the changes touch)

- **#1A → #1B**: #1B's immutability assertion uses #1A's raw-text-preserving serializer and
  writes #1A's `replaced_sources` annotation key.
- **#1B → #1C**: #1C's Changes collection carries `replaced_sources`; both touch the apply
  and history read side.
- **#1C → S2c**: both modify `console-payload-builder` (#1C `Element Ids and Hashes`, S2c
  `Payload Meta`), `console-export-cli` (#1C `Real domain identity…` + ADDED `Changes
  collection…`; S2c REMOVED `Root Ledger Input`) and `console-review-mode` (#1C
  `Multi-tab-safe, durable draft store`; S2c `Verdict Badges`), and the same files
  (`export-console.mjs`, `review.js`). S2c's badges read #1C's `changes` collection.
- **S2c → S3**: S3's audit and ports run against the console after the review-state and
  export-modal churn.
- **#1C, S2c → S6**: S6 writes L3 changesets, reads the per-model meta of #1C, and edits
  `export-console.mjs` and `build-console-payload.ts` last. S6 adds no
  `console-payload-builder` delta; its `console-export-cli` and `console-review-mode`
  deltas touch other requirements than #1C and S2c.
- **S4 → S6c**: both edit `skills/nn-upgrade/scripts/migrate-domain.js`.
- **S3, S6 → S5**: S5 deletes the editor only after S3 decided and ported what is used,
  and deletes the live preview only after S6 made preview a regenerated console file and
  moved the scaffold into `innfo-core`. S5 also edits `legacy-ledger.yaml` after S4.

## Requirements modified by more than one change

| Capability / requirement | Order | Rule |
|--------------------------|-------|------|
| `changeset-document-model` / `Cryptographic Proposal Sealing (proposal_sha)` | #1A, then S6 | S6's delta is written against the post-#1A text and lists a superset of #1A's keys |

Every other requirement is modified by at most one change.

## Releases

A template, console, MCP or skill change on `main` needs its release tag
(`.agents/skills/nn-dev-release/SKILL.md`; a template edit merged without its tag and repin
reddens `verify.js --release`). #1A–#1C reach `main` in one `dev → main` batch and #1C
cuts their tags. S2c, S4, S6 (S6e) and S5 each cut their own after their batch. Tags of
one key may be shared by changes merged in the same batch.

## Open questions for the maintainer

1. **Badge.** S5 retargets the document badge to `https://cognnitive.com/innfo/` with the
   wording in S5 `design.md`; that bumps every maintained bluepriNNt's `template_version`.
   Confirm URL and wording (the alternative, a static page left at `/innfo/app/`, is a
   compatibility artifact and was rejected).
2. **CTAs.** "Open App" becomes "Read the docs" → `https://cognnitive.com/innfo/documentation/`. Confirm.
3. **Write-once samples.** Published `_V_x-y-z_` samples cannot be edited. If one has
   unfrozen slugs (#1C rejects its console) or a reference that only the deleted fuzzy step
   resolved (S4), should it be excluded from console export and validation, or recorded in
   `iNNfo/validation-baseline.json`?
4. **Reference grammar.** The brief asked S4 to make slugs the only reference form. S4
   keeps exact display-name resolution because `[[Display Name]]` wikilinks and name-based
   matrix headers are the iNNfo grammar (~2,500 lines in ~170 tracked `_NN.md` files, many
   write-once) and deletes only the fuzzy step. Slug-only references would be a versioned
   iNNfo grammar change plus a content rewrite — a separate change, if wanted. Same for
   cross-model `[[Model Title :: Element Name]]`.
5. **Console identifiers.** Rename the `feedback-export` need and the `innfo-feedback-*`
   DOM ids (they now host the changeset export) in S2c, or leave them?
6. **Legacy detection.** S4 keeps the legacy-layout detector, the MCP legacy hint and the
   preflight detection (pointing at the new-domain recipe). Delete them too?
7. **Apply target resolution by name.** `apply_change` still resolves a change target by
   element name as well as slug (`batch-slug-resolution`). Out of scope here; keep?
8. **Direct writers left.** `reconcile_artifact_feedback_NN.md` says "apply_change or file
   tools", and bare `apply_change` ops (`bump_version`, `generate_index`, `add_concept`,
   `add_field`, `set_marker`, `freeze_slugs`) write without a changeset (S6 open question 4).
   Schedule the follow-up change?
