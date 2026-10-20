# Delta for native-pre-push-hook

## MODIFIED Requirements

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
