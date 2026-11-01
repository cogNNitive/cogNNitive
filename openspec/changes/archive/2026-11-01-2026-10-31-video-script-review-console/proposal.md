## Why

In video production workspaces (`video_NN`), episode drafting has evolved to require an interactive **Human Review Gate** (`<slug>_review_console.html`) before any billable avatar or audio synthesis occurs (mandated in workspace rules such as `AGENTS.md`).

However, the canonical `video-script` blueprint's embedded skill (`nn-video-script`) still distributes the legacy dark-mode draft template (`draft-template.html` / `build-draft-html.mjs`), which lacks parameter sheets, overlays inspection, live L3 markdown generation, clipboard copy actions, and modern light-theme ergonomics.

This caused local architectural drift: workspaces were forced to maintain ad-hoc script workarounds (`build-clean-review-console.mjs`, `build-review-console.mjs`) because running standard skill commands or running `nn upgrade` produced outdated draft files rather than the required review console. Additionally, while `video-script` is registered in `cogNNitive` repo's `iNNfo/specs/bluepriNNts/catalog.json`, local user stores (`~/.agents/bluepriNNts/catalog.json`) lagged behind, preventing automated distribution of updated embedded skills.

## What Changes

1. **Promote Review Console Architecture to Upstream Skill:**
   - Upgrade `draft-template.html` in `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/` to the modern Review Console architecture (light theme `#f8fafc`, collapsible parameter and overlay sheets, live L3 script generation, clipboard prompt copy, and thumbnail preview).
   - Update `build-draft-html.mjs` to emit `<slug>_review_console.html` directly (while preserving `<slug>_draft_<version>.html` alias/link for backwards compatibility).
2. **Version Bump & Blueprint Sync:**
   - Bump `video-script` blueprint to `V_0-13-11`.
   - Update `catalog.json` and release synchronization logic so that `embedded_skills` (`nn-video-script`) propagate cleanly to user distributions (`~/.agents/skills/nn-video-script/`).
3. **Skill Documentation & Governance:**
   - Update `SKILL.md` in `nn-video-script` to declare the Human Review Gate contract and document the `<slug>_review_console.html` interactive workflow.
4. **Test Suite Verification:**
   - Extend `build-draft-html.test.mjs` to validate that generated consoles render all modern review console UI elements, parameter drawers, and script generation hooks.

## Capabilities

### Modified Capabilities

- `video-script-review`: `nn-video-script` emits the interactive Review Console (`<slug>_review_console.html`) natively from draft JSON and episode assets, deprecating legacy dark-mode draft view.

## Impact

- Standardizes review console generation across all `video-script` consumers.
- Eliminates ad-hoc local scripts (`build-clean-review-console.mjs`) in video workspaces.
- Guarantees that running `nn upgrade` or rehydrating `video-script` installs the modern console.
