# Delta Spec: native-pre-push-hook (F1)

This delta spec adds a single local `pre-push` git hook, wired through
native `core.hooksPath`, with zero new runtime or dev dependencies. It does
not add a `pre-commit` hook, does not attempt to detect or block
`--no-verify`, and does not touch formatting, linting, or commit-message
validation.

## ADDED Requirements

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

The `pre-push` hook MUST run a verification command and prevent the push
when that command exits non-zero.

#### Scenario: Failing verification blocks the push

- **GIVEN** a local commit that would fail the hook's configured
  verification command (for example, a type error equivalent to `2c11ecf`)
- **WHEN** the contributor runs `git push`
- **THEN** `.githooks/pre-push` SHALL run the configured command
- **AND** on a non-zero exit code, git SHALL abort the push
- **AND** the hook's output SHALL show the command's failure so the
  contributor can see why the push was blocked.

#### Scenario: Passing verification allows the push

- **GIVEN** a local commit that passes the hook's configured verification
  command
- **WHEN** the contributor runs `git push`
- **THEN** the hook SHALL exit zero
- **AND** git SHALL proceed with the push.

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

## Notes for design (not decided here)

- The exact verification command the hook runs (`npm run typecheck`,
  measured at ~12s for the editor workspace and ~25s for all three
  workspaces including the `innfo-core` build, vs. `npm run verify` at
  ~90s / 698 tests) is an open decision the proposal defers to
  `sdd-design`. The requirements above are satisfied by either choice: they
  specify pass/fail gating behavior, not the specific command.
- Whether hook installation via `prepare` is automatic on `npm install` or
  opt-in via an explicit `npm run hooks:install` is also deferred to
  `sdd-design`. The scenario "`core.hooksPath` is set for a fresh clone"
  assumes the automatic path per the proposal's stated approach; if design
  chooses opt-in, that scenario's trigger changes from `npm install` to the
  explicit install command, and this spec should be updated accordingly at
  design time.
