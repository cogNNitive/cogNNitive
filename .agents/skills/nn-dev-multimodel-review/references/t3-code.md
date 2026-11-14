# Running nn-dev-multimodel-review in T3 Code (non-normative)

This is how the first run was driven (2026-11-14). It is one agent's walkthrough, not part
of the skill's protocol, and model ids and settings change over time.

## Roster used

| Key | Provider instance | Model | Setting |
|---|---|---|---|
| `gemini` | `antigravity` | `gemini-3.8-flash` | `thinking_level: medium` |
| `gpt-luna` | `codex` | `gpt-6-luna` | `reasoningEffort: medium` |
| `deepseek` | `opencode` | `opencode-go/deepseek-v4.1-flash` | `variant: high` |
| orchestrator and consolidator | `claudeAgent` | `claude-sonnet-5-5` | `effort: high` |

- The catalog does not say which Codex model is the cheapest tier. `gpt-6-luna` was chosen
  by elimination (the only one without an `ultra` effort level) and was not verified.
- OpenCode's Flash model offers `low`, `high` and `max` only, so `high` stood in for
  `medium`.
- Pick Antigravity's Gemini rather than its Claude or GPT-OSS models, so the analysts keep
  different lineages.

## Steps

1. Launch the orchestrator as its own top-level thread in the repository project, with the
   brief as its first message. It needs a runtime mode that lets it run git and write files
   and start delegates.
2. The orchestrator calls the capabilities listing once, then starts each analyst as a
   delegate on another provider's model, passing the setting through the target options.
   For the runtime mode it picks the least permissive one that lets a delegate write its
   file without approval (`auto-accept-edits` where offered); `approval-required` stalls an
   unattended run.
3. Wait for completion events; do not poll. From outside the orchestrator thread, wait on
   its thread until delegated work has settled, and call again on a timeout without a
   `next` hint.
4. Relay maintainer decisions into the orchestrator thread (the trust prompt, the write
   exception) with a thread message.

## Quirks seen

- Antigravity asked "Do you trust the authors of this workspace to execute automated agent
  hooks?" on the first delegate.
- Codex started its own session worktree (`session/independent-analysis-gpt-luna`) and
  wrote its phase 1 report there. It was left in place; remove it with
  `node scripts/nn-session.mjs stop --id <id>`.
- The primary-tree `PreToolUse` hook denied the orchestrator's Write tool in the primary
  checkout; the maintainer authorized one Bash write of the consolidated plan.
- Each provider has its own permission system; none inherits the orchestrator's grants, so a
  run produces some prompts even in `auto-accept-edits`.
