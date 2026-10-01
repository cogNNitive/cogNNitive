# Tasks: Batch Domain Update (nn-upgrade Flow C)

**Status: READY. Strict TDD — each RED task must be seen failing for the intended reason before its GREEN task. Runtime artifacts stay out-of-tree.**

## How to apply

- At session start load `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`; AGENTS.md mandate) and run its concurrency scan before any repo write.
- Work lands on `dev`. Conventional commits only, no AI attribution. Stage by explicit path; never `git add -A` / `git add .` / `git stash` / `git reset --hard` / `git clean`.
- Strict TDD (config `strict_tdd: true`): RED seen failing first, then GREEN. Run `npm run test`, `npm run lint`, `npm run typecheck` per step; `format:check` is informational.
- Reuse `migrate-domain.js`; do not modify it, do not delete legacy/quarantine code.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700–950 (new `batch-update.js` ~250–400; `batch-update.test.js` ~350–450; `SKILL.md` ~40) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 scan/plan/selection → PR2 apply/journal/rollback → PR3 lock + SKILL.md Flow C |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (user picks stacked-to-main vs feature-branch-chain) |

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Scanner: discovery, classification, plan file, selection | PR 1 | Base `dev`; self-contained read-only deliverable |
| 2 | Apply loop: drift guard, per-domain atomicity, journal, rollback | PR 2 | Base PR 1 (feature-branch-chain) or `dev` (stacked) |
| 3 | Soft lock + `SKILL.md` Flow C docs + final verify | PR 3 | Depends on PR 2 |

---

## 1. Foundation & decisions

- [x] 1.1 [decision] Confirm plan location (`<parent>/batch-plan.json`, `--plan` override) and soft lock (`<parent>/.nn-batch.lock`, `--force`); record outcome (proposal Q1/Q2, design D1/D2).
- [x] 1.2 **RED**: create `skills/nn-upgrade/scripts/batch-update.test.js` fixture helper (`temp/batch-update-<rand>`, removed in `finally`) + smoke asserting `runBatch`/`main` exports; unchanged `migrate-domain.js`.
- [x] 1.3 **GREEN**: scaffold `batch-update.js` exporting `runBatch({parents,command,selection,planPath,spawn,now,out})` + thin argv `main()`; smoke greens.

## 2. Discovery & classification

- [x] 2.1 **RED**: fixture parent holds a domaiNN plus `-backup-*`, `_archive`, `_templates`, dot-dir; assert only the domaiNN is a candidate, backups never `ready`, scan writes zero domain files. `[batch-domain-update:Requirement:Discovery and Classification]`
- [x] 2.2 **GREEN**: implement dir-only `readdir` discovery with exclusions + `ready/noop/blocked/skipped` classification via `createFsDomainReader`/`planMigration`; READ-ONLY. `[batch-domain-update:Requirement:Discovery and Classification]`

## 3. Persisted plan

- [x] 3.1 **RED**: assert `batch-plan.json` shape `{version,generatedAt,parentDir,domains[{name,path,status,opsCount,planHash,reason}]}`; assert `batch-plan.json`/journal names never become candidates. `[batch-domain-update:Requirement:Persisted Batch Plan]`
- [x] 3.2 **GREEN**: atomic temp-write+rename to `<parent>/batch-plan.json`; defensive skip of plan/journal names. `[batch-domain-update:Requirement:Persisted Batch Plan]`
- [x] 3.3 **RED**: hash-parity test — batch `planHash` equals `migrate-domain.js --json` planHash for one fixture. `[batch-domain-update:Requirement:Per-Domain Atomic Apply with Drift Guard]`
- [x] 3.4 **GREEN**: share `planMigration` + deps stub to pass parity; support `--plan <path>` output override. `[batch-domain-update:Requirement:Persisted Batch Plan]`

## 4. Selection

- [x] 4.1 **RED**: `--only A --yes` applies only A; `--exclude` matching all ⇒ nothing applied; empty selection exits 0 no-op. `[batch-domain-update:Requirement:Explicit Non-Interactive Selection]`
- [x] 4.2 **GREEN**: intersect `--only` with `ready`, then subtract `--exclude`; no numbered menus. `[batch-domain-update:Requirement:Explicit Non-Interactive Selection]`

## 5. Apply orchestration

- [ ] 5.1 **RED**: `--apply` without `--yes` exits 1 with zero writes. `[batch-domain-update:Requirement:Per-Domain Atomic Apply with Drift Guard]`
- [ ] 5.2 **GREEN**: require `--yes` else refuse before any write. `[batch-domain-update:Requirement:Per-Domain Atomic Apply with Drift Guard]`
- [ ] 5.3 **RED**: mutated fixture + fake `spawnSync` ⇒ drift abort, no partial write; missing `planHash` refused. `[batch-domain-update:Requirement:Per-Domain Atomic Apply with Drift Guard]`
- [ ] 5.4 **GREEN**: recompute `planHash` in-process; mismatch ⇒ `drift` (no spawn); else spawn `migrate-domain.js --apply --plan-hash <hash> --yes`; parse `Backup created at:`. `[batch-domain-update:Requirement:Per-Domain Atomic Apply with Drift Guard]`
- [ ] 5.5 **RED**: A applied then B fails ⇒ A stays applied with its own backup+journal; B failure never rolls back A. `[batch-domain-update:Requirement:Per-Domain Atomicity (No Fused Transaction)]`
- [ ] 5.6 **GREEN**: continue-on-failure per domain; never fuse; each domain keeps own backup+journal. `[batch-domain-update:Requirement:Per-Domain Atomicity (No Fused Transaction)]`

## 6. Aggregate journal & rollback

- [ ] 6.1 **RED**: assert incremental `batch-journal-<stamp>.json` references per-domain `order`/`backupDir`/`journalPath` and `committed` flag. `[batch-domain-update:Requirement:Aggregate Journal and Batch Rollback]`
- [ ] 6.2 **GREEN**: write aggregate journal incrementally after each domain (write-ahead, `committed:false`). `[batch-domain-update:Requirement:Aggregate Journal and Batch Rollback]`
- [ ] 6.3 **RED**: A then B applied; rollback replay restores B before A; `--yes` required else exit 1. `[batch-domain-update:Requirement:Aggregate Journal and Batch Rollback]`
- [ ] 6.4 **GREEN**: `--rollback <batch-journal.json>` filters `applied`, sorts `order` desc, spawns `migrate-domain.js --restore <backupDir>`. `[batch-domain-update:Requirement:Aggregate Journal and Batch Rollback]`

## 7. Idempotency, lock & edges

- [ ] 7.1 **RED**: re-run over applied domains ⇒ each skipped, no new backup; `-backup-*` never recursed into. `[batch-domain-update:Requirement:Idempotent and Resumable]`
- [ ] 7.2 **GREEN**: skip `noop`/already-applied; enforce backup-of-backup prevention. `[batch-domain-update:Requirement:Idempotent and Resumable]`
- [ ] 7.3 **RED**: `.nn-batch.lock` `wx`; EEXIST without `--force` exits 1; `--force` bypasses; read-only parent warns + proceeds. `[batch-domain-update:Requirement:Per-Domain Atomicity (No Fused Transaction)]`
- [ ] 7.4 **GREEN**: acquire/release advisory lock in `finally` for `--apply`/`--rollback`. `[batch-domain-update:Requirement:Per-Domain Atomicity (No Fused Transaction)]`
- [ ] 7.5 **RED**: zero-candidate and all-noop exit 0; invalid flags exit 2; any failed/drift/blocked exits 1. `[batch-domain-update:Requirement:Scope Boundary]`
- [ ] 7.6 **GREEN**: wire exit codes; assert no legacy/quarantine deletion path exists. `[batch-domain-update:Requirement:Scope Boundary]`

## 8. Skill docs — Flow C

- [ ] 8.1 **RED**: assert `skills/nn-upgrade/SKILL.md` says "three" flows and contains `## Flow C` with C0–C3 and a reuse note. `[batch-domain-update:Requirement:Skill Integration (Flow C)]`
- [ ] 8.2 **GREEN**: edit `SKILL.md` — "two" → "three"; add Flow C (C0 scan, C1 selection/consent, C2 apply, C3 rollback); note v1 = Flow A only and no legacy deletion. `[batch-domain-update:Requirement:Skill Integration (Flow C)]`

## 9. Verification

- [ ] 9.1 Run `npm run test` — new suite and full repo green.
- [ ] 9.2 Run `npm run lint` + `npm run typecheck` — clean.
- [ ] 9.3 Manual smoke: real `--scan` on a temp parent ⇒ zero domain writes; then delete runtime artifacts, confirm migrated domains intact. `[batch-domain-update:Requirement:Scope Boundary]`
- [ ] 9.4 Confirm `migrate-domain.js` unchanged and no legacy code deleted; close traceability to all 9 requirements.
