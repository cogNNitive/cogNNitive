# Delta for console-regeneration

The 2026-11-15 incident: `apply_change` opened a browser tab on every apply, so repeated applies accumulated duplicate consoles. Each domain console is one enormous document (measured: 874,945 DOM nodes and ~1.35 GB working set for a 21 MB payload), so the copies exhausted RAM and every renderer burned roughly one core. Opening becomes explicit, and an explicit open coalesces instead of launching a second instance.

## MODIFIED Requirements

### Requirement: Opening the console is explicit and coalesced

Regenerating a console MUST NOT open a browser tab unless the caller asks for it. `open` MUST default to `false` on `apply_change`, `propose_changeset`, `regenerate_console` and `init_knowledge`, and `regenerateConsole` MUST treat an absent `open` as `false`. When a caller does pass `open: true`, at most one tab MUST be launched per console document inside a coalescing window: a second open for the same console path inside that window MUST return `opened: false` with `alreadyOpen: true` and MUST NOT launch the browser, because the console is rewritten in place and the tab already showing it only needs a reload. The coalescing window MUST default to 30 minutes and MUST be configurable through `INNFO_CONSOLE_OPEN_COOLDOWN_MINUTES`, where `0` disables the coalescing. The existing `INNFO_CONSOLE_NO_OPEN=1` kill switch MUST keep forcing `open` to `false` regardless of the caller. The tool descriptions MUST state that opening is off by default and that `open: true` requests a tab.

#### Scenario: An apply does not open a tab

- GIVEN an `apply_change` call that omits `open`
- WHEN the console is regenerated
- THEN the browser is not launched
- AND `opened` is `false`

#### Scenario: A second explicit open inside the window reuses the tab

- GIVEN a console was opened from this domain less than 30 minutes ago
- WHEN the caller passes `open: true` again
- THEN no browser process is launched
- AND the result reports `opened: false` and `alreadyOpen: true`

#### Scenario: The kill switch still wins

- GIVEN `INNFO_CONSOLE_NO_OPEN=1` is set
- WHEN the caller passes `open: true`
- THEN the browser is not launched

### Requirement: Review-and-approve notice on tool results

Every result that regenerated (or tried to regenerate) a console MUST carry a structured `next_steps` object with `notice` (text the agent MUST relay to the user), `console_path`, `opened`, and, for proposals only, an `approve` object with `reply` = `OK`, `tool` = `apply_change` and `changeset` = the changeset path. For a proposal the notice MUST state, in order: (1) the changeset was generated (path); (2) the domain console was regenerated; (3) how to review it — that it was opened in a browser tab with the proposed changes when `opened` is true, that it is already open and the tab needs a reload when `alreadyOpen` is true, or the path to open manually when neither; (4) if the user trusts the changes they may skip the review and simply reply OK, upon which the agent calls `apply_change`. For an apply the notice MUST state steps 1-3 and list conflicted change ids when `partially_applied`; it MUST NOT offer approval. When the console failed the notice MUST say so and point at the changeset file. The tool descriptions of `propose_changeset`, `apply_change`, `init_knowledge` and `regenerate_console` MUST instruct the agent to relay `next_steps.notice`. The console is static HTML and cannot call the MCP; approval of an agent-authored proposal MUST always return through the agent. Human gate verdicts are the one exception: the owner's console writes them into `changes/` (`console-changes-direct-write`) or exports them by download, and they are applied by `produce` on start or by `apply_change`; an agent MUST NOT approve a gate on the human's behalf.
(Previously: step (3) always said the console was opened in a browser tab, because opening was the default and every regeneration launched one.)

#### Scenario: Proposal notice carries the four steps

- GIVEN `propose_changeset` succeeded and opened the console
- WHEN `next_steps` is read
- THEN `notice` mentions the changeset path, the regenerated console, the opened tab and the OK shortcut, in that order
- AND `approve.tool` is `apply_change` and `approve.changeset` is the written path

#### Scenario: Already-open notice asks for a reload

- GIVEN a regeneration whose open was coalesced into the tab that is already open
- WHEN `next_steps` is read
- THEN `notice` says the console is already open and the tab needs a reload
- AND it does not claim a tab was opened
