# Proposal: coNNtent Render Hotfix

## Intent

`produce` reports `status:: produced` for videos that are missing their on-screen text, and the first run of a narrated-avatar episode fails. Evidence: `botijos-today/assets/gas-pump-printer-powerball/hyperframes/`. Its `manifest.json` declares title, lower-third and caption layers that never reach `index.html`. The Chrome watermark and CTA are emitted but do not show in the frames. This hotfix applies to the current layout, before `conntent-blueprint-redesign`.

## Scope

### In Scope
1. **Text layers:** lower the scene layers in `scenes[].props.layers` (title, lower-third, caption) into `tracks.overlays` and `index.html`.
2. **Invisible Chrome:** find the root cause and fix it. Acceptance: the watermark and CTA are visible in sampled rendered frames.
3. **Post-emit QA:** if any overlay declared in the manifest is missing from `index.html`, `produce` fails and does not write `status:: produced`.
4. **Stage order:** TTS and images are synthesized before `synthesizeAvatars` (`produce.mjs:268-275`). This removes the "Run compile first" failure (`avatar-jobs.mjs:134-138`).
5. **Avatar detection:** a test confirms that `isAvatarLayer` (`avatar-jobs.mjs:59`) misses `fields.type`. If it does, fix the predicate and remove the `fields.avatar` workaround (`produce.mjs:269`).
6. **TTS language:** thread the cascade `language` through the TTS request instead of the `'Spanish'` default (`asset-synthesizer.mjs:447`), and add it to the TTS cache key.
7. **`scriptDir`:** confirmed gap. The estimator already passes it (`asset-cost-estimator.mjs:175,177`). `synthesize-avatar.mjs:134,136` does not, so Series Scene Kinds are not resolved there.

### Out of Scope
- Everything in `conntent-blueprint-redesign`: the episode/library layout, the cascade scopes, Character, review gates, whisper alignment, full QA with `failed_qa`, the console and procedures.
- Compatibility: none is needed in either direction.

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `conntent-produce-command`: the stage order puts TTS and images before avatars; the post-emit overlay QA gates `produced`.
- `conntent-scene-kinds`: scene text layers are lowered to overlays and Chrome is rendered visibly; avatar layers are detected from model fields; avatar synthesis resolves Series Scene Kinds.
- `cognnitive-conntent-engine`: `language` reaches the TTS request and its cache key; overlay emission is complete and visible.

## Approach

Fix each item test-first: write a failing test that reproduces it, then the minimal fix. The QA check is a set comparison between the manifest overlays and the emitted DOM. It runs before the lifecycle write.

## Affected Areas

| Area | Impact |
|---|---|
| `nn-conntent/scripts/produce.mjs` | Modified |
| `scripts/lib/{compile,render,avatar-jobs}.mjs` | Modified |
| `scripts/{scene-compiler,scene-project,hyperframes-render}.mjs` | Modified (overlay lowering, Chrome visibility) |
| `scripts/{asset-synthesizer,synthesize-avatar}.mjs` | Modified |
| `nn-conntent/test/` | New tests |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The Chrome invisibility comes from CSS, z-index or timeline and needs a real render to prove | Med | Treat it as an investigation item; frame sampling is the acceptance check |
| Adding `language` to the TTS key invalidates existing cache entries | High | Accepted: one paid re-synthesis per scene |
| The QA check is too strict for scenes that have no overlays | Low | Compare only the overlays that are declared |

## Rollback Plan

Revert the single PR to `dev`. No data or layout changes are made; only cached TTS entries are re-keyed.

## Dependencies

- None. This change is independent of `conntent-blueprint-redesign`.

## Success Criteria

- [ ] Re-producing the botijos episode puts every manifest overlay in `index.html` and makes it visible in sampled frames.
- [ ] Removing one overlay from `index.html` makes `produce` fail without writing `status:: produced`.
- [ ] A first run with narrated avatars succeeds without a prior compile.
- [ ] An English-language episode sends `language: English`, and its cache key differs from the Spanish one.
- [ ] `synthesize-avatar` resolves Series Scene Kinds.

## Proposal question round

- Should the QA check also verify visibility (pixels), or only DOM presence? Assumed: DOM presence gates the run; frame sampling is used only to accept item 2.
- Should a failed QA keep the rendered master for inspection? Assumed: yes.
- Should an unset `language` fail or fall back to a default? Assumed: fall back to the cascade default, never a hard-coded value.
