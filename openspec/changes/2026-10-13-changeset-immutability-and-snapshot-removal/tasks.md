# Tasks: #1B — proposal immutability on apply and removal of the model snapshot

`openspec/config.yaml` is `strict_tdd: true`: each group leads with its failing test.
Every task names the requirement it serves as `[capability: Requirement]`.
Pre-condition: #1A (`2026-10-13-changeset-first-class-and-lineage`) is applied on `dev`.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | ~300–450 (code + tests) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No — one PR |
| Decision needed before apply | No |

## 1. Remove the snapshot

- [ ] 1.1 TEST: rewrite `test/apply-change.test.ts:406`, `:479`, `:653` to assert that no
      `kNNowledge/archive/` exists after apply (single model, replay, multi-model).
      [knowledge-version-and-snapshot: Snapshot Archival to `kNNowledge/archive/` (REMOVED)]
      [changeset-apply-engine: Two-Phase Apply Transaction]
- [ ] 1.2 TEST: rewrite `test/apply-change-persist.test.ts:121-137`: success leaves no
      archive and no `.tmp`; an injected rename failure leaves the live model
      byte-identical, no `.tmp`, no archive. [changeset-apply-engine: Crash-safe persist]
- [ ] 1.3 `apply-change.ts`: delete the archive block (`:1077-1104`), replace
      `persistWithArchive` (`:552`) with `persistAtomic` (tmp + rename, `.tmp` removed on
      failure), drop the `copyFile` import. [changeset-apply-engine: Two-Phase Apply
      Transaction] [changeset-apply-engine: Crash-safe persist]
- [ ] 1.4 TEST + impl: replaying an applied changeset writes no file at all.
      [changeset-apply-engine: Idempotent Replay]
- [ ] 1.5 TEST (`tests/naming/contract.test.ts`): `isExcludedPath` is still true for
      `sources/archive/x.csv` and nested `archive/` paths. [knowledge-version-and-snapshot:
      Deep `archive` Directory Exclusion]
- [ ] 1.6 `server.ts:327`: the `apply_change` description drops "snapshot archival".
      [changeset-apply-engine: Two-Phase Apply Transaction]

## 2. Proposal immutability on apply

- [ ] 2.1 TEST (`test/apply-change.test.ts`): after a successful, a partially applied and a
      conflict apply, every normative line of every change block is byte-identical to the
      input (fixture with CRLF and quoted values). [changeset-apply-engine: Proposal
      immutability on apply]
- [ ] 2.2 TEST: a serializer stub that alters a `to::` line makes apply fail with
      `PROPOSAL_IMMUTABILITY_VIOLATION`; no model, changeset or `.tmp` is written; the lock
      is released. [changeset-apply-engine: Proposal immutability on apply]
- [ ] 2.3 `apply-change.ts`: compute the write-back bytes at the end of Phase 1 (and on the
      conflict path) and run the normative-line assertion before any write.
      [changeset-apply-engine: Proposal immutability on apply]

## 3. Replaced citation recording

- [ ] 3.1 TEST (`test/apply-change.test.ts`): an `update_field` on a field cited to
      `sources/interview.md@## Vision` leaves `replaced_sources:: sources/interview.md@## Vision`
      on that change and `verifyProposalSha` true; an `add_element` writes none.
      [field-citation-provenance: Field Citation Provenance Rewriting on Mutation (D20)]
- [ ] 3.2 `apply-change.ts`: record the replaced citation during the D20 rewrite.
      [field-citation-provenance: Field Citation Provenance Rewriting on Mutation (D20)]
- [ ] 3.3 TEST (`tests/changeset/history.test.ts`) + impl (`history.ts`): history entries
      carry `replaced_sources`; walking two applied changesets on one field reaches the
      original Source. [field-citation-provenance: Bidirectional Auditability and Lineage
      Walk]
- [ ] 3.4 Grep guard: no code, test or doc outside `openspec/changes/archive/` describes
      lineage as recovered from an archived model snapshot (`docs/innfo/documentation/`,
      `skills/nn-innfo/SKILL.md`). [field-citation-provenance: Retirement of Agent
      Modification Block from Citation Contracts]

## 4. Verification

- [ ] 4.1 `npm run typecheck`; `npm test` for `innfo-core` and `innfo-mcp`; rebuild the
      innfo-mcp bundle; `node scripts/verify.js`. [all requirements]
