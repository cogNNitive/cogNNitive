# Delta for console-export-cli

## ADDED Requirements

### Requirement: Programmatic in-process export API and shared DOM test harness

`scripts/export-console.mjs` MUST export a programmatic in-process entry point (such as `runExportConsole(argv, options)`) that executes console compilation, `--status`, `--tree`, and `--list` workflows in-process without calling `process.exit` or mutating global state, returning `{ exitCode, stdout, stderr, writtenFiles }`. Direct CLI execution (`node scripts/export-console.mjs ...`) MUST invoke this entry point and preserve all existing stdio and exit-code semantics. Console export test suites (`scripts/export-console.test.mjs`, `test/console-export.test.mjs`, `test/console-export-view.test.mjs`, `test/console-sample-custom-view.test.mjs`) MUST invoke the programmatic API in-process and reuse shared `JSDOM` instances across read-only DOM assertions, while retaining a minimal set of CLI subprocess smoke tests.

#### Scenario: Programmatic API executes in-process without exiting the host process

- **GIVEN** a test or tool imports `runExportConsole` from `scripts/export-console.mjs`
- **WHEN** it invokes `await runExportConsole([workspaceRoot, '--no-open'])` or passes invalid flags such as `['--domain', '--all']`
- **THEN** the function SHALL resolve with `{ exitCode, stdout, stderr, writtenFiles }` matching the CLI contract
- **AND** it SHALL NOT terminate the calling Node.js process via `process.exit`.

#### Scenario: Console test suites share read-only JSDOM instances and retain CLI smoke coverage

- **GIVEN** the console export test suites execute
- **WHEN** multiple assertions inspect the same generated console HTML without mutating DOM state
- **THEN** the suite SHALL parse and boot that console HTML once in a `before()` hook and share the `JSDOM` window across read-only tests
- **AND** at least two subprocess tests SHALL still invoke `node scripts/export-console.mjs` directly to verify CLI wiring and non-zero exit codes.
