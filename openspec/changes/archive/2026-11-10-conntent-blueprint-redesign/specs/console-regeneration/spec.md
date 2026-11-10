# Delta for console-regeneration

Slice 4 (C7, C10). The apply-time handling of a stale approval is owned by Slice 3 (`conntent-review-gates`, "The engine supplies the hash and a stale approval is refused"); the verdict-carrying changeset is applied as a record, so the existing rule "regenerate after `applied`" already covers it and "Console regeneration after apply" needs no change.

## MODIFIED Requirements

### Requirement: One shared console writer for CLI and MCP

Console HTML MUST be written by exactly one function, `writeConsole`, exported by `scripts/export-console.mjs` and used by the CLI, by the MCP (which imports it from the resolved console asset directory) and by the coNNtent engine. Output paths MUST come from the single `consoleOutputPath` builder: `domaiNN_console.html` for the domain console, `artifacts/<stem>_console/<stem>_console.html` for a single-model scoped console, and `series/<s>/episodes/<slug>/deliveries/v<N>/<slug>_delivery.html` for the delivery console of one episode version. A write MUST go through a temporary file renamed over the target, and MUST be skipped when the rendered bytes (with the previous `generated` stamp) equal the existing file. A delivery write MUST refuse to replace an existing file (deliveries are immutable); because the engine assembles a delivery in a temporary sibling folder (`conntent-delivery`), `writeConsole` MUST accept a staging directory for the delivery file while recording the final path of `consoleOutputPath` inside its payload. The `outputPath` reported by `regenerate_console` MUST equal the path `writeConsole` writes for that model. Importing `export-console.mjs` MUST NOT run the CLI.
(Previously: the builder knew only the domain console and the single-model scoped console, and no caller outside the CLI and MCP existed.)

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

#### Scenario: Delivery path
- GIVEN episode `gas-pump` of series `botijos-today` at delivery version 2
- WHEN `consoleOutputPath` is asked for its delivery console
- THEN it returns `series/botijos-today/episodes/gas-pump/deliveries/v2/gas-pump_delivery.html`

#### Scenario: Delivery written into a staging folder
- GIVEN the engine assembling `v2` in a temporary sibling folder
- WHEN `writeConsole` writes the delivery console into that staging directory
- THEN the file is written there and its media links are relative to its final folder

#### Scenario: Delivery file is never replaced
- GIVEN `deliveries/v2/gas-pump_delivery.html` exists
- WHEN `writeConsole` is asked to write that delivery again
- THEN it returns an error status naming the path and the file is untouched

### Requirement: Review-and-approve notice on tool results

Every result that regenerated (or tried to regenerate) a console MUST carry a structured `next_steps` object with `notice` (text the agent MUST relay to the user), `console_path`, `opened`, and, for proposals only, an `approve` object with `reply` = `OK`, `tool` = `apply_change` and `changeset` = the changeset path. For a proposal the notice MUST state, in order: (1) the changeset was generated (path); (2) the domain console was regenerated; (3) the console was opened in a browser tab with the proposed changes and the user may review them; (4) if the user trusts the changes they may skip the review and simply reply OK, upon which the agent calls `apply_change`. For an apply the notice MUST state steps 1-3 and list conflicted change ids when `partially_applied`; it MUST NOT offer approval. When `opened` is false the notice MUST give the path to open manually; when the console failed the notice MUST say so and point at the changeset file. The tool descriptions of `propose_changeset`, `apply_change`, `init_knowledge` and `regenerate_console` MUST instruct the agent to relay `next_steps.notice`. The console is static HTML and cannot call the MCP; approval of an agent-authored proposal MUST always return through the agent. Human gate verdicts are the one exception: the owner's console writes them into `changes/` (`console-changes-direct-write`) or exports them by download, and they are applied by `produce` on start or by `apply_change`; an agent MUST NOT approve a gate on the human's behalf.
(Previously: "approval MUST always return through the agent", with no exception for human gate verdicts.)

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

#### Scenario: Verdicts do not return through the agent
- GIVEN a gate waiting for review
- WHEN the notice for the gate is read
- THEN it tells the human to approve in the console and does not offer an OK reply as approval of the gate

## ADDED Requirements

### Requirement: Regeneration after every engine exit

The coNNtent engine (`produce` and the primitives that change episode state) MUST regenerate the domaiNN console through `writeConsole` on every exit: success or no-op (0), a gate stop (10), a spend stop (11), `failed_qa` (12), and any other failure (1) after the engine wrote state. The regeneration MUST run after all engine writes and the status mirror are committed, in a `finally` of the pipeline. `open` MUST be true only when the exit requires a human action (exit 10, 11 or 12) and `--no-open` is absent; otherwise it MUST be false. A regeneration failure MUST NOT change the engine's exit code; it MUST be reported in the engine output with the console path and the error. When `produce` applies pending human changesets on start, the regeneration after the run MUST reflect them.

#### Scenario: Gate stop regenerates and opens
- GIVEN `produce` stops at the `script` gate
- WHEN the process exits
- THEN the domaiNN console was regenerated and opened and shows the open gate

#### Scenario: Autopilot run does not open
- GIVEN a run that completes with `review_gates: []`
- WHEN the process exits
- THEN the console was regenerated and no browser launch happened

#### Scenario: Failed QA regenerates
- GIVEN a run that ends in `failed_qa`
- WHEN the process exits
- THEN the console shows the episode in QA failed

#### Scenario: Regeneration failure keeps the exit code
- GIVEN console assets that cannot be resolved
- WHEN `produce` stops at a gate
- THEN the exit code is 10 and the output reports the regeneration error

#### Scenario: No browser in tests
- GIVEN the engine test suite
- WHEN a stop is simulated
- THEN an injected launcher records calls and no browser is started

### Requirement: Every applied changeset regenerates the console, including verdict-only changesets

A changeset consisting only of `review_gate` changes MUST still cause the domaiNN console to be regenerated when applied by `apply_change` or by `produce` on start, even though it changes no model content, so that the gate states, the Pending inbox and the Review history reflect it. A refused verdict (stale hash) applied as a record MUST be shown by the regenerated console as an approval marked `stale` with the gate still unsatisfied (`conntent-domain-console`).

#### Scenario: Verdict-only apply regenerates
- GIVEN a verdict-only changeset
- WHEN `apply_change` applies it
- THEN the result carries a `console` field with status `written` or `unchanged`

#### Scenario: Gate state visible after regeneration
- GIVEN an applied approval with a matching hash
- WHEN the console is regenerated
- THEN the Pending inbox no longer lists that gate and the Review history shows the approval

#### Scenario: Stale record
- GIVEN an applied approval whose hash is outdated
- WHEN the console is regenerated
- THEN the history row is marked `stale` and the gate is still listed in the inbox

### Requirement: Regeneration after an applied change to a delivered episode

When an applied changeset changes the content of a delivered episode, the regenerated domaiNN console MUST show that episode at its first open gate (`conntent-episode-lifecycle`) and no regeneration step MUST modify, replace or delete any existing `deliveries/v<N>/` file.

#### Scenario: Edit after delivery
- GIVEN a delivered episode and an applied narration edit for scene 2
- WHEN the console is regenerated
- THEN the episode shows at the `script` gate for scene 2
- AND the existing `deliveries/v1/` files are unchanged
