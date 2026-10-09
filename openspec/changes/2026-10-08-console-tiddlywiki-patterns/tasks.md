# Tasks: Console TiddlyWiki Patterns

## How to apply

- Work lands on `session/console-tw-patterns` in dedicated session worktree `temp/worktree-tw-patterns`.
- Lean execution: minimal direct modifications to `innfo-runtime.js` and `ui-kit.js`.
- Strict offline `file://` verification via `scripts/build-console-bundle.mjs`.

## Tasks

- [x] 1. Implement declarative filter parsing in `iNNfo/specs/bluepriNNts/console/innfo-runtime.js` (`concept:`, `is:draft`, `is:reviewed`, `has:`).
- [x] 2. Implement draft projection overlay in `mountElementCards` to reflect live draft edits, additions, and deletions.
- [x] 3. Rebuild console bundle with `node scripts/build-console-bundle.mjs`.
- [x] 4. Validate bundle offline invariants with `node scripts/build-console-bundle.mjs --check`.
- [x] 5. Commit and merge to `dev`.
