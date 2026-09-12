# Design: nn-dev Skills Hardening

## Summary

Prose-only changes to three maintainer skills plus a one-line CI trigger
extension. No new packages, no new scripts, no architecture seams crossed.
The enforcement points already exist (consent gate, Group 0/1, release flow);
this change promotes their verdicts and adds the missing evidence (dev CI).

## Skill diffs (section-level)

### 1. `nn-dev-development/SKILL.md`

- **§1e (extend)**: dirty-tree disambiguation gains the age rule — unattributed
  paths surviving past their session become ❌ "stale unattributed WIP" with
  three named exits: `wip:<session-id>` commit, owner-noted stash, or
  maintainer-confirmed discard.
- **§1f (new), "Session claim"**: write-intended sessions record
  `session-id + branch + intent` in the handoff block (§4d). Advisory for
  foreign agents, mandatory for ours. Claim check joins the §3 re-check
  (baseline vs current, plus claim collision → stop and report).
- **Core Rules (extend #6)**: "never stage foreign files" gains "never stage
  unattributed files" — attribution via `wip:` commit or explicit consent.

### 2. `nn-dev-check-integrity/SKILL.md`

- **Group 1 (extend)**: two new checks —
  (a) Pages deploy status on the `origin/main` tip
  (`gh run list --branch main --workflow deploy-pages` or the Pages job
  conclusion), (b) CDN/manifest resolution for release pins. Both ❌ for
  release-shaped changes, ⚠️ otherwise. The existing "tag alone" reminder
  becomes the normative deploy-DoD pointer.
- **New merge-gate rule** (invoked by `nn-dev-release` before merge and
  manually): batch tip CI signal present + green, `origin/main` CI `success`,
  `origin/main` stationary since verification. Failures distinguish
  batch-caused red (fix-forward on `dev`, re-verify) from pre-existing red
  (exception with run id, maintainer-approved).

### 3. `nn-dev-release/SKILL.md`

- **Option [a] (extend)**: audit table gains "deploy-DoD" row (tag / CI-tip /
  Pages / CDN-mWhatanifest) reusing Group 1 commands.
- **Merge orchestration (new gate before step 0)**: run the merge-gate; on
  ❌ stop with the named reason. Restate merge → tag → pin as a gate, not
  advice (already documented §c.0; now blocking).

### 4. `.github/workflows/ci.yml`

- **Trigger**: `push.branches: [main]` → `[main, dev]` for the verify/quality
  jobs only. `--release` live-manifest semantics stay push-to-`main`-only
  (existing `${{ github.event_name == 'push' && '--release' || '' }}` already
  keys on event, and PRs to main keep non-release verify — extend the
  condition to `github.ref == 'refs/heads/main'` so dev pushes never run
  release validation).
- **Tradeoff (accepted)**: ~2x verify minutes on active dev days; no Pages
  deploy from dev; one-line revert.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Enforcement style | Promote existing checks, no new scripts | Checks already encode the expedientes; new tooling adds unowned surface |
| Worktree isolation | Rejected | Same-repo reality; doubles pin confusion; skill already decided single-branch |
| Dev CI vs local rehearsal only | Dev CI primary, rehearsal fallback | Retrospective #1; rehearsal stays for offline/exception path |
| Pre-existing red main | Exception with run id, not silent pass | Keeps gate honest without freezing all work |

## Test strategy (STRICT TDD note)

`strict_tdd: true` is configured, but this change is skill prose + one YAML
trigger line: no executable units exist to red-test. Verification substitutes:

1. `node scripts/check-integrity.js` green after edits (fast gate).
2. `node scripts/verify.js` green (dev mode, no `--release`).
3. Dev-push CI run green on the change branch (proves trigger edit).
4. Reviewer diff-read of the three SKILL.md hunks against this spec
   (judgement check, Group-8 style).
