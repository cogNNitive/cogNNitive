# Proposal: Manifest Release Integrity

## Intent

GitHub Pages serves `cognnitive.com` from **eNNvironment `main`, path `/docs`**. `docs/use/manifest.md` deploys the instant it merges: every merge to eNNvironment is a production deploy of the site AND the manifest.

**Production serves a 404 right now.** Main pins both templates to `d60a7109…` under `cogNNitive/iNNfo` — that SHA belongs to **actioNN**. The raw template URL returns HTTP 404 for every user running bootstrap. CI "Manifest validation" has been red on main since 2026-08-31 reporting exactly this; nothing acted on it. Separately, `mcp[].url` is unpinned (`/iNNfo/main/…bundle.js`, 18 changes) — every iNNfo push swaps the binary users download.

Root causes:
1. **A raw SHA is unreviewable** — it carries no repo identity, so a wrong-repo paste is invisible in a diff.
2. **`main` is production with no ceremony** — no state exists between merged and published.
3. **The manifest is a lockfile written by hand** — npm and Cargo generate theirs.

## Scope

### In Scope
- **Publish = tag.** Human-cut, per-repo tags on iNNfo/actioNN. Nothing publishable until merged AND tagged.
- **Generate the manifest** from `repo + ref`, resolving SHAs via the GitHub API. A wrong-repo SHA becomes impossible by construction.
- **Record both** `ref` (reviewable) and generated `commit` (immutable fetch anchor).
- **Pin `mcp[].url`** to a commit.
- **Preview channel**: publish `docs/use/manifest-next.md` beside the stable manifest in the already-auto-published `/docs`. Testers point at the preview URL; production does not move until merge + tag. This *replaces* "publish before merge" rather than merely forbidding it.
- **Enforcing validator**: `commit` MUST match `ref` in the *declared* repo and be reachable from a tag or `main`, never an orphan branch tip. Scheduled run catches dangling refs without a push.

### Out of Scope
- Merging and tagging the source branches — the user's act, tracked below as a migration precondition.
- Per-skill versioning; skills keep today's shared repo-snapshot SHA.
- Notification/escalation on validator failure — red CI only this slice.
- Signing, checksums, CDN.

## Capabilities

### New Capabilities
- `manifest-release-integrity`: tag-based publication, generated pins, `ref`+`commit` duality, preview channel, reachability enforcement.

### Modified Capabilities
- `template-skill-bundling`: schema gains `ref`; `mcp[].url` MUST be commit-pinned; validation strengthened past mere SHA existence — the live defect passes that check.

## Approach

A generator in `eNNvironment/scripts/` reads `repo + ref` inputs, resolves each ref through the GitHub API, and emits `manifest.md` (stable, from tags) and `manifest-next.md` (preview, from branch tips). `validate-manifest.js` enforces repo-scoped ref/commit correspondence plus reachability, blocking on push and running on schedule. Hand-editing a `commit` becomes a validation failure instead of a silent 404.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| iNNfo must merge+tag before eNNvironment re-pins | High | Migration precondition; validator blocks orphan-tip pins |
| Branch pins `d7d96a22…`, live only on unmerged `feat/business-template-decomposition`; squash orphans it | High | Re-pin from tag after merge |
| Preview manifest mistaken for stable | Med | Distinct URL, preview banner, excluded from the stable gate |
| GitHub API rate limits in CI | Med | Authenticated token, cached resolutions |
| Tags force-moved | Low | `commit` stays the fetch anchor; `ref` is review metadata |

## Rollback Plan

Backward compatible: `ref` is additive, `commit` semantics unchanged, `skills-manager.js` compares `commit` only. Revert the eNNvironment commits, restore the hand-edited manifest, delete `manifest-next.md`, downgrade CI to non-blocking. No consumer migration; `~/.agents/bootstrap-state.json` stays valid.

## Dependencies

- iNNfo `feat/business-template-decomposition` merged to main and tagged **before** eNNvironment re-pins.
- actioNN `feat/innfo-v0-2-0-adoption` merged and tagged.
- GitHub API token available to eNNvironment CI.

## Success Criteria

- [ ] Every stable-manifest URL returns HTTP 200 from main — regression test for today's 404.
- [ ] No `commit` in either manifest was typed by a human; every `ref` resolves to its `commit` **in its own repo**.
- [ ] `mcp[].url` contains no `/main/`.
- [ ] `manifest-next.md` is reachable at its own URL without altering stable.
- [ ] Validator rejects a wrong-repo SHA, an orphan-tip commit, and a ref/commit mismatch.
- [ ] "Manifest validation" green and blocking on main.
