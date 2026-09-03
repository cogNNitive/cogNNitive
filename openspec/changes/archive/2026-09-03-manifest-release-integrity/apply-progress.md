# Apply Progress: Manifest Release Integrity

Batch 1 (first and only batch so far — no previous apply-progress existed).

## Mode

Strict TDD Mode (RED → GREEN, no fallback to Standard Mode).

## Status

29 / 33 tasks complete (Phases 1-5, 7, 8, 9 done or resolved-not-red; Phase 0 and Phase 6
correctly left unstarted per explicit boundary; Phase 10 correctly left unstarted, gated on
Phase 0/6; 9.3/9.4 blocked by pre-existing unrelated uncommitted changes in their target files).

## Completed Phases

### Phase 1 — CI Authentication (eNNvironment)
- `GITHUB_TOKEN`/`GH_TOKEN` → `Authorization: Bearer` header added to `apiRequest`/`fetchString`.
- Rate-limit violation messages now say "set GITHUB_TOKEN to raise the rate limit".
- `.github/workflows/manifest-validate.yml` passes `secrets.GITHUB_TOKEN` to the test and validate steps.
- Commit: `2c640e9`.

### Phase 2 — `ref` becomes mandatory
- Legacy fixture updated with `ref: skills-v1.0.0` in the same commit as the enforcement change
  (per instruction: do not split fixture update from the redefinition).
- New case: entry missing `ref` fails structurally.
- Commit: `313d1ad`.

### Phase 3 — Repo-scoped existence (422 handling)
- `checkCommitExists` now distinguishes HTTP 422 ("wrong repo", names the declared repo) from
  a generic existence failure.
- Commit: `d600574`.

### Phase 4 — Channel policy, reachability, mcp pinning
- `CHANNELS` policy table (`stable`: tag required, tag-shape enforced, main-reachability
  required; `preview`: branch required, neither enforced).
- `resolveRef(repo, ref)`: tries `git/ref/tags/{ref}` first (peeling an annotated tag via
  `git/tags/{sha}` when `object.type === 'tag'`), falls back to `git/ref/heads/{ref}`.
- `checkReleaseProvenance` via `compare/main...{sha}`: `ahead` fails stable, `identical`/`behind` pass.
- `tagShapeViolation`, `refKindViolation` wired into `validateSkill`/`validateTemplate`, plus new
  `validateMcp`/`checkMcpUrlPinned` (rejects `/main/`, requires the url to embed the entry's own commit).
- `main()` now accepts `--channel stable|preview`; with no flag, validates every channel file present.
- Deviation: the legacy-manifest fixture test (previously a live network call that only worked by
  coincidence) was converted to use the stub-based API per design's stated testing strategy, since
  it would otherwise require a real tag that does not exist yet (Phase 0 precondition).
- Commit: `f96309c`.

### Phase 5 — Generator
- `manifest/source.yaml` (SHA-free), `manifest/body.md` (prose extracted verbatim from the
  committed `docs/use/manifest.md`), `manifest/body.preview-banner.md`.
- `scripts/generate-manifest.js`: deterministic emitter (fixed key order, fixed quoting, LF-only,
  single trailing newline, zero volatile fields, entries in source order), `resolveRef` reused
  from `validate-manifest.js` (Phase 1 auth included), `--channel`, `--check`, `--out`, exit 0/1/2,
  all-or-nothing write.
- Deviation: `channels[].refs` is a list of `{key, repo, ref}` rather than a map keyed by repo name,
  because the shared zero-dependency focused YAML parser's key regex does not accept `/`, and repo
  names (the natural `ref_key`) contain one.
- Commit: `3ee2f4f`.

### Phase 7 — Preview plumbing + repo hygiene
- `docs/use/index.html`: added a "Trying an unreleased change?" section pointing at the preview
  manifest by explicit URL only; `rel=alternate` untouched (still stable-only).
- `.gitattributes`: `docs/use/manifest*.md text eol=lf`.
- Commit: `c0b8b4d`.

### Phase 8 — Workflow wiring
- `.github/workflows/manifest-validate.yml`: added `generate-manifest` unit tests, `generate --check`
  for both channels, `validate --channel` for both channels, and a daily `schedule:` cron.
- Manual review (actionlint not available in this environment) — valid YAML, consistent indentation,
  correct Actions schema.
- Commit: `9ace614`.

### Phase 9 — actioNN (independent repo)
- New regression test: a manifest carrying `ref` parses without error, and a version-only difference
  (commit unchanged) does not mark a skill outdated. Uses a local HTTP server via `SM_MANIFEST_URL`
  (the script's existing local-testing seam) so the test is deterministic and network-independent.
- Confirmed `skills-manager.js` needed no production change — `ref` already passed through untouched
  and update detection was already commit-only.
- Commit: `72ede4a`.

## Explicitly Left Unstarted (per hard boundary)

### Phase 0 — Blocking Precondition Gate
Not executed. Merging branches and cutting tags is the user's act.

### Phase 6 — Regenerate stable manifest
Not executed at all, including 6.3 (preview generation), which is technically unblocked (resolves
from branch tips, no tag required). The user's explicit phase list for this batch ("Phases 1-5, 7, 8
and 9 should land in full") does not include Phase 6, and Phase 6 is explicitly named as hard-blocked
in the boundary instructions. Left cleanly unstarted rather than partially run.

### Phase 10 — Final verification
Both tasks are explicitly gated on Phase 0/6 ("post Phase 0"; confirming proposal.md Success Criteria
that depend on the regenerated manifests). Not executed.

## Blocked (not by Phase 0)

### Tasks 9.3 and 9.4
`actioNN/docs/documentation/skills/skills-manager.md` and `actioNN/AGENTS.md` both already carry
unrelated, unstaged, substantive uncommitted changes (template hydration / dynamic MCP tool discovery
— `list_template_procedures`, `list_template_skills`, 4-tier package lookup) that are not part of this
SDD change and were not authored by this session. The same underlying WIP also touches
`eNNvironment/docs/use/manifest.md` and files under `iNNfo/packages/innfo-core/`. Editing these two
actioNN files now would either commingle unrelated changes into one commit, or require destructive
git operations (stash/pop) against work I do not have context on. Left untouched; documented as a
blocker rather than silently skipped or worked around.

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| 1.1/1.2 GITHUB_TOKEN auth header | Test asserted `Authorization: Bearer` header on stubbed `https.get`; failed (`mod.apiRequest is not a function`) | Added `authHeaders()` + exports; test passed | Reused same header helper in `fetchString` |
| 2.1/2.2 `ref` mandatory | New case (missing `ref`) asserted non-zero exit; failed (exit 0) | Added `ref` to `structuralViolations` required fields | Legacy fixture updated in the same commit |
| 3.1/3.2 422 wrong-repo | Asserted violation matched `/wrong repo/i`; failed (generic message) | Added explicit 422 branch in `checkCommitExists` | Message names the declared repo |
| 4.1/4.2 CHANNELS/resolveRef/etc | `mod.CHANNELS` undefined; failed | Implemented `CHANNELS`, `resolveRef`, `tagShapeViolation`, `refKindViolation`, `checkReleaseProvenance`; all sub-tests passed | Windows path separator bug found and fixed (`file` field forced to `/`-joined literal, not `path.join`) |
| 4.3 mcp-url-pinned | `mod.checkMcpUrlPinned is not a function`; failed | Implemented `checkMcpUrlPinned` + `validateMcp`; wired into orchestration | Reordered checks so `/main/` message wins over the generic "not pinned" message |
| 4.4 `--channel` CLI flag | Asserted unknown channel rejected; failed (no such flag) | Implemented `parseArgs`/`validateChannel`/multi-channel `main()` | — |
| 5.1-5.3 generator | `Cannot find module generate-manifest.js`; failed | Implemented `generate-manifest.js` per design's CLI contract; all 8 sub-tests passed on first full run after the refs-list fix | `channels[].refs` map → list, because `/` in a YAML key breaks the shared parser |
| 9.1/9.2 actioNN ref passthrough | Test written to assert parse success + commit-only detection; test hung on first run (spawnSync blocked event loop against in-process HTTP server) | Fixed by switching to async `spawn` for that one test; passed on retry, no production code change needed | Confirmed 9.2's own "patch only if 9.1 is red" condition — it was not red |

## Files Changed

### eNNvironment (branch `feat/innfo-v0-2-0-adoption`)
| File | Action |
|---|---|
| `scripts/validate-manifest.js` | Modified — auth, mandatory `ref`, 422 handling, channel policy, resolveRef, provenance, mcp pinning, `--channel` CLI |
| `scripts/validate-manifest.test.js` | Modified — new/updated test cases for all of the above |
| `.github/workflows/manifest-validate.yml` | Modified — `GITHUB_TOKEN` env, generator + both-channel steps, `schedule:` cron |
| `manifest/source.yaml` | Created |
| `manifest/body.md` | Created |
| `manifest/body.preview-banner.md` | Created |
| `scripts/generate-manifest.js` | Created |
| `scripts/generate-manifest.test.js` | Created |
| `docs/use/index.html` | Modified — preview-channel prose, `rel=alternate` untouched |
| `.gitattributes` | Created |

### actioNN (branch `feat/innfo-v0-2-0-adoption`)
| File | Action |
|---|---|
| `scripts/skills-manager.test.js` | Modified — new regression test |

### iNNfo
No changes (tag-only per scope; not touched).

## Not Touched (flagged, not fixed)

`eNNvironment/docs/use/manifest.md`, `actioNN/AGENTS.md`, `actioNN/docs/documentation/skills/skills-manager.md`,
`actioNN/skills/nn-innfo/SKILL.md`, and files under `iNNfo/packages/innfo-core/` all carry pre-existing
unstaged changes unrelated to this SDD change (present before this apply session started). None were
staged, committed, or reverted by this session.

## Remaining Tasks
- [ ] 0.1-0.4 (user's act)
- [ ] 6.1-6.3 (blocked by 0.1-0.4)
- [ ] 9.3-9.4 (blocked by pre-existing unrelated file changes — needs user triage)
- [ ] 10.1-10.2 (blocked by 6)

## Workload / PR Boundary
- Mode: `exception-ok` (`size:exception` recorded per tasks.md forecast).
- Current work unit: eNNvironment PR 1 (Phases 1-5, 7, 8) + actioNN PR 2 (Phase 9), both landed as
  local work-unit commits, not pushed, no PR opened (per hard boundary).
- Boundary: this batch starts from a clean `feat/innfo-v0-2-0-adoption` in both repos and ends with
  every non-Phase-0-dependent task either done or explicitly documented as blocked.
- Estimated review budget impact: eNNvironment ~950 changed lines across 8 commits (within the
  ~900-1400 forecast); actioNN ~90 changed lines across 1 commit (within the ~40-80 forecast, slightly
  over due to the added local-server test helper).
