# Spec: native-pre-push-hook

## Purpose

This spec records the requirement for a local `pre-push` git hook, wired
through native `core.hooksPath`, with zero new runtime or dev dependencies.
It does not add a `pre-commit` hook, does not attempt to detect or block
`--no-verify`, and does not touch formatting, linting, or commit-message
validation.
## Requirements
### Requirement: A tracked `pre-push` hook is wired via `core.hooksPath`

The repository MUST ship a tracked hook directory and configure git to use
it for the `pre-push` event, without introducing husky, lint-staged, or any
other hook-management dependency.

#### Scenario: Hook directory is tracked and native

- **GIVEN** the repository at HEAD
- **WHEN** a contributor inspects the tree
- **THEN** a tracked `.githooks/pre-push` script SHALL exist
- **AND** no `husky`, `lint-staged`, or equivalent package SHALL appear in
  any workspace's `package.json` dependencies as a result of this change.

#### Scenario: `core.hooksPath` is set for a fresh clone

- **GIVEN** a fresh clone of the repository followed by `npm install` at the
  root
- **WHEN** installation completes
- **THEN** `git config core.hooksPath` SHALL report `.githooks`
- **AND** subsequent `git push` invocations from that clone SHALL invoke
  `.githooks/pre-push`.

### Requirement: The hook blocks a push when its verification command fails

The `pre-push` hook MUST run `scripts/pre-push-check.js` ( forwarding git's `<remote-name> <remote-url>` arguments and stdin ref lines), execute `FRESHNESS_GUARDS` in parallel after build/typecheck prerequisites, bypass heavy builds and freshness guards when all pushed commits are `wip:` checkpoints targeting a `refs/heads/session/*` branch, and prevent the push when any executed verification command exits non-zero. (Previously: `.githooks/pre-push` ignored stdin and ran `FRESHNESS_GUARDS` serially on every push regardless of `session/*` WIP checkpoint status.)

#### Scenario: Failing verification blocks the push

- **GIVEN** a local commit pushed to `dev` or `main` that fails a typecheck or freshness guard in `scripts/pre-push-check.js`
- **WHEN** the contributor runs `git push`
- **THEN** `.githooks/pre-push` SHALL run `scripts/pre-push-check.js` with parallelized freshness guards
- **AND** on a non-zero exit code, git SHALL abort the push
- **AND** the hook's output SHALL show every failing guard's output so the contributor can see why the push was blocked.

#### Scenario: Passing verification allows the push

- **GIVEN** a local commit that passes all configured pre-push checks
- **WHEN** the contributor runs `git push`
- **THEN** the hook SHALL exit zero
- **AND** git SHALL proceed with the push.

#### Scenario: Session WIP checkpoint push takes the fast-path bypass

- **GIVEN** a push whose stdin ref updates target only `refs/heads/session/*` and whose new commits (`<remote-sha>..<local-sha>`) all have commit subjects starting with `wip:`
- **WHEN** `.githooks/pre-push` invokes `scripts/pre-push-check.js`
- **THEN** the script SHALL print a fast-path notice and exit zero without running `innfo-core`/`innfo-mcp` builds or `FRESHNESS_GUARDS`.

#### Scenario: Non-WIP or non-session push runs full pre-push checks

- **GIVEN** a push to `refs/heads/dev`, `refs/heads/main`, or a `refs/heads/session/*` branch containing any commit whose subject does not start with `wip:`
- **WHEN** `.githooks/pre-push` invokes `scripts/pre-push-check.js`
- **THEN** the full build, typecheck, and parallel `FRESHNESS_GUARDS` pipeline SHALL execute.

### Requirement: `--no-verify` remains an unpoliced escape hatch

The hook MUST NOT attempt to detect, block, or log use of `git push
--no-verify`.

#### Scenario: `--no-verify` bypasses the hook entirely

- **GIVEN** a contributor who runs `git push --no-verify`
- **WHEN** the push executes
- **THEN** `.githooks/pre-push` SHALL NOT run at all (native git behavior)
- **AND** this change SHALL introduce no separate mechanism that detects or
  records that the hook was bypassed.

### Requirement: No `pre-commit` gate is added

This change MUST NOT add a `pre-commit` hook of any kind.

#### Scenario: Commits are unaffected

- **GIVEN** the hook installed by this change
- **WHEN** a contributor runs `git commit`
- **THEN** no hook introduced by this change SHALL run
- **AND** commit latency SHALL be unaffected.

## Design decisions

- The hook runs `npm run typecheck` (approximately 25 seconds for all three
  workspaces including the `innfo-core` build), not `npm run verify`
  (approximately 90 seconds with 698 tests). The hook's job is to catch the
  class of error that reached CI, not to replicate the full CI suite
  (design ADR-001).
- Hook installation via `prepare` is automatic on `npm install`, not
  opt-in. This configures `core.hooksPath` repo-locally inside each clone
  (design ADR-002).
- The hook ignores stdin, so it also runs on tag pushes and ref deletions.
  This is a known ceiling documented in the hook as a `ponytail:` comment
  with an upgrade path (design ADR-001).
