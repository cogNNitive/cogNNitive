# console-regeneration Specification

## Purpose
TBD - created by archiving change 2026-10-13-s6-console-regeneration-and-propose. Update Purpose after archive.
## Requirements
### Requirement: One shared console writer for CLI and MCP

Console HTML MUST be written by exactly one function, `writeConsole`, exported by
`scripts/export-console.mjs` and used by the CLI and by the MCP (which imports it from
the resolved console asset directory). Output paths MUST come from the single
`consoleOutputPath` builder: `domaiNN_console.html` for the domain console and
`artifacts/<stem>_console/<stem>_console.html` for a single-model scoped console. A write MUST go
through a temporary file renamed over the target, and MUST be skipped when the rendered
bytes (with the previous `generated` stamp) equal the existing file. The `outputPath`
reported by `regenerate_console` MUST equal the path `writeConsole` writes for that
model. Importing `export-console.mjs` MUST NOT run the CLI.

#### Scenario: CLI and MCP write the same file
- GIVEN a domain with model `strategy`
- WHEN the CLI exports the single-model scoped console and the MCP regenerates it
- THEN both write `artifacts/strategy_console/strategy_console.html`
- AND the bytes are identical for identical inputs and stamp

#### Scenario: Reported path exists
- GIVEN `regenerate_console` reports a console path for model `strategy`
- WHEN `writeConsole` runs for that model
- THEN the file at `outputPath` exists

#### Scenario: Unchanged input writes nothing
- GIVEN a domain console already up to date
- WHEN `writeConsole` runs again
- THEN it returns status `unchanged` and the file is not rewritten

### Requirement: Opening the regenerated console

Every console regeneration MUST attempt to open the written console in a browser tab
when `open` is `true` (the default for `writeConsole`, `regenerate_console`,
`propose_changeset` and the regeneration inside `apply_change`; the CLI exposes
`--no-open`). The launch MUST be a detached child process: `cmd /c start` on Windows,
`open` on macOS, `xdg-open` on Linux, each given the absolute console path. A missing
launcher, an unsupported platform or a spawn error MUST be reported as `opened: false`
with `openError` and MUST NOT fail the call. With `open: false` no process MUST be
spawned. Tests MUST NOT open a browser.

#### Scenario: open=false never spawns
- GIVEN an injected launcher that records calls
- WHEN `writeConsole` runs with `open: false`
- THEN the launcher is never called and the result has `opened: false`

#### Scenario: Headless open failure is not fatal
- GIVEN a launcher that throws (no browser available)
- WHEN a console is regenerated with `open: true`
- THEN the console file is written
- AND the result has `opened: false` and an `openError`

#### Scenario: Platform command
- GIVEN the platform is `darwin`
- WHEN the console is opened
- THEN the launcher is invoked as `open` with the absolute console path

### Requirement: Console regeneration after apply

The `apply_change` handler MUST regenerate the domain console when it returns status `applied`
or `partially_applied` (including an idempotent replay), after the apply
committed and outside the `changes/.lock`, and MUST report the outcome in a separate
`console` field (`status` one of `written`, `unchanged`, `failed`; `path`; `opened`;
`error` when failed). A regeneration failure MUST NOT revert, alter or fail the apply:
`success`, `status`, `models` and `appliedCount` MUST be unchanged. No regeneration MUST
run for `conflict` or `rejected`. The flow MUST NOT depend on any snapshot archive.

#### Scenario: Applied change regenerates after commit
- GIVEN a sealed changeset that applies cleanly
- WHEN `apply_change` runs with `open: false`
- THEN the model files are committed and the lock is released before regeneration starts
- AND the result has `status: applied` and `console.status: written`

#### Scenario: Partially applied regenerates
- GIVEN a changeset with one clean and one conflicted change
- WHEN `apply_change` runs
- THEN the result has `status: partially_applied` and a `console` field whose status is `written` or `unchanged`

#### Scenario: Regeneration failure does not revert
- GIVEN console assets that cannot be resolved
- WHEN a changeset is applied
- THEN the result has `status: applied` and `console.status: failed` with an error
- AND the model files hold the applied content

#### Scenario: Conflict does not regenerate
- GIVEN a changeset whose every change conflicts
- WHEN `apply_change` runs
- THEN the result has no `console` field

### Requirement: Explicit console regeneration tool

The MCP MUST expose `regenerate_console` (`domain`, optional `model`, `open` default
`true`) that calls `writeConsole` for the domain console (or the given single-model scoped console)
and returns the same `console` and `next_steps` shape. It MUST be idempotent and is the
retry path after a failed regeneration.

#### Scenario: Retry after failure
- GIVEN an apply whose regeneration failed
- WHEN `regenerate_console` is called once the cause is fixed
- THEN the domain console is written and `console.status` is `written`

#### Scenario: Idempotent
- GIVEN `regenerate_console` just ran
- WHEN it runs again with no model change
- THEN `console.status` is `unchanged`

### Requirement: Regeneration reports the versions it was built from

The regeneration result MUST return as `knowledgeVersions` the per-model
`knowledge_version` and content `sha256` that the domain console embeds in its meta
(`console-export-cli`: "Real domain identity and model-qualified element ids"). `export-console.mjs --status` MUST report the domain console as
`fresh` when every embedded pair matches the live models and `stale` otherwise.

#### Scenario: Stale file detected
- GIVEN a domain console built when `strategy` was at `V_0-1-1`
- WHEN a changeset bumps `strategy` to `V_0-1-2` without regenerating
- THEN `--status` reports the domain console as `stale`

### Requirement: Preview is a file

The way a user sees a proposed or applied change MUST be a freshly regenerated domain
console file opened in a browser tab. No code MAY target a hosted editor or a
loopback live preview; both were removed with the editor retirement (S5).

#### Scenario: No editor URL in the result
- GIVEN `propose_changeset` or `apply_change` succeeded
- WHEN the result is read
- THEN the user-facing location is the console file path
- AND `next_steps` contains no editor or live-preview URL

### Requirement: Review-and-approve notice on tool results

Every result that regenerated (or tried to regenerate) a console MUST carry a structured
`next_steps` object with `notice` (text the agent MUST relay to the user),
`console_path`, `opened`, and, for proposals only, an `approve` object with
`reply` = `OK`, `tool` = `apply_change` and `changeset` = the changeset path.
For a proposal the notice MUST state, in order: (1) the changeset was generated (path);
(2) the domain console was regenerated; (3) the console was opened in a browser tab with
the proposed changes and the user may review them; (4) if the user trusts the changes
they may skip the review and simply reply OK, upon which the agent calls `apply_change`.
For an apply the notice MUST state steps 1–3 and list conflicted change ids when
`partially_applied`; it MUST NOT offer approval. When `opened` is false the notice MUST
give the path to open manually; when the console failed the notice MUST say so and point
at the changeset file. The tool descriptions of `propose_changeset`, `apply_change`,
`init_knowledge` and `regenerate_console` MUST instruct the agent to relay
`next_steps.notice`. The console is static HTML and cannot call the MCP; approval MUST
always return through the agent.

#### Scenario: Proposal notice carries the four steps
- GIVEN `propose_changeset` succeeded and opened the console
- WHEN `next_steps` is read
- THEN `notice` mentions the changeset path, the regenerated console, the opened tab and the OK shortcut, in that order
- AND `approve.tool` is `apply_change` and `approve.changeset` is the written path

#### Scenario: Apply notice offers no approval
- GIVEN `apply_change` succeeded
- WHEN `next_steps` is read
- THEN it has no `approve` field

#### Scenario: Not opened
- GIVEN regeneration succeeded with `opened: false`
- WHEN `next_steps.notice` is read
- THEN it contains the absolute console path for the user to open

