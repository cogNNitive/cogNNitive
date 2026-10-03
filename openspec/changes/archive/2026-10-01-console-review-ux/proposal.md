# Proposal: Console review UX

## Why

Reviewing a model in a console is the human half of the feedback loop, and it is still the weakest link. Commit 6f905b1e built the backend (payload builder, ledger parser, shell guard) but none of the review UX. The facts below were re-checked on 2026-10-01 at HEAD fc925f8a. Source offsets refer to `iNNfo/specs/bluepriNNts/console/innfo-runtime.js`, with bundle offsets in brackets.

| # | Gap | Evidence |
|---|---|---|
| 1 | Annotation is a `window.prompt()`, comment-only and element-level | `suggestFor` :2748-2750 [bundle :2878] |
| 2 | Every version rebump orphans the drafts | `getDraftKey(model, version)` :447, built from title + version at :2651 [:575, :2779] |
| 3 | Reviewers can mark their own drafts applied or rejected | status `<select>` + `updateDraftStatus` :2248-2261 [:2376-2389] |
| 4 | The runtime ignores data the payload already carries | `buildConsolePayload` emits `meta.modelId`, a per-element `hash` and `meta.feedbackState` (`innfo-core/src/console/payload-builder.ts:86-91, :234-239`). Neither `innfo-runtime.js` nor `render-model-viewer.js` reads any of them (rg) |
| 5 | There is no reviewed/progress state, no "changed since last review" view, and no keyboard path | none exists |
| 6 | The canonical console has none of this | `workspace/assets/model_console.html` renders through `InnfoModelViewer` (`#rail`/`#content`, :298-303), which has no draft store, and `render()` clears `#content` on every filter (`render-model-viewer.js:206-208`) |

## What Changes

- **Review mode**: an explicit toggle that exists only where `feedback-export` is declared. Off means a read-only console with no review controls in the DOM.
- **Inline annotation popover** that replaces `prompt()`. A card anchor offers `comment | delete`. A field anchor offers `comment | correction` and writes `target.field`, and `original` comes from the payload.
- **Reviewed marks**: each element can be marked reviewed. A mark counts only while its hash matches the element's current hash. The rail shows `reviewed/total` plus pending drafts per concept, in both `InnfoConsole` and `InnfoModelViewer`.
- **Verdict badges** come from `meta.feedbackState` through `StatusBadge` (B), and `stale` is included. The reviewer-side status `<select>` and `updateDraftStatus` are deleted.
- **Changed-since-last-review filter** uses the per-element `hash`.
- **Draft store v2**: one key, `innfo-console:v2:<meta.modelId>`. Each draft is anchored by `element_id` + `base_hash`, and a hash mismatch or a missing element is flagged "target changed". Drafts under the old key are neither read nor migrated.
- **Export preview** (extends A's injected `innfo-feedback-*` modal): item list, live `validateFeedback`, reviewer identifier, and download plus copy-to-clipboard with identical bytes.
- **Keyboard and a11y**: `j`/`k`/`c`, an `aria-live` draft counter, focus management and a narrow-viewport layout.
- **Code home**: the new UMD source `console/review.js` (`InnfoReview`), driven by an `innfo:rendered` event that both renderers dispatch.

## Capabilities

### New Capabilities
- `console-review-mode`: review toggle, popover annotation, reviewed progress, verdict badges, changed filter, keyboard/a11y.

### Modified Capabilities
- `innfo-console-feedback`: the Export Modal becomes a validating preview with clipboard. Drafts are keyed by `modelId` and anchored by `base_hash`. Field anchors write `target.field`. Reviewers cannot set verdicts, and items carry no `status` (per A's schema).

## Chain position and dependencies

`A 2026-10-01-console-feedback-roundtrip-completion -> B 2026-10-01-console-ui-kit -> C (this)`. Apply must not start before A and B are merged.

- **From A**: the injected feedback UI, the schema-conformant `buildExportDoc` + `validateFeedback` export, item `base_hash`, and `meta.modelId`/`hash`/`feedbackState` reaching consoles built by BOTH the CLI and the `compile_model_console` paths, with `feedbackState` read from `feedback-ledger.jsonl` at the domaiNN root.
- **From B**: `InnfoUI` (`ElementCard`, `FieldRow`, `ConceptPill`, `StatusBadge`, `DraftList`/`AnnotationPopover`/`ReviewedToggle`/`RailProgress`), `--innfo-*` tokens, `TOKEN_VALUES`, and the bundle-drift check.

## Departures from the archived design (`archive/2026-09-30-console-review-ux`)

1. The chain is now A→B→C. Old change 1 (cleanup) already landed: the shells were deleted and `console-shell-guard.js` exists.
2. Today `SOURCES` lives in `scripts/build-console-bundle.mjs:33`, and `scripts/lib/console-bundle.js` does not exist. C adds `review.js` wherever B leaves `SOURCES`.
3. The feedback root and modal are A's `innfo-feedback-*` ids, not `[data-innfo-feedback-root]`/`#innfo-feedback-modal`.
4. Badges and `stale` rely on A's ledger at the domaiNN root plus its stale-target logic, not on `sources/import/feedback/ledger.jsonl`.
5. Removing the status `<select>` is assigned to C. A must record this split, or C drops the item.
6. The kit components C needs belong to B. C adds only those B did not ship.
7. Releasing the console forces a shell repin (see Release coupling). This resolves the archived open question.

## Impact

| Area | Impact |
|---|---|
| `console/review.js` | New |
| `console/innfo-runtime.js` | Modified: store, drafts, `prompt` and `<select>` deleted; controller boot; `innfo:rendered` |
| `console/render-model-viewer.js` | Modified: `innfo:rendered` dispatch |
| `console/ui-kit.js` (B) | Modified only if review components are missing |
| `console/innfo-console.bundle.js` | Regenerated |
| `innfo-core/tests/console-review-*.test.ts` | New (`@vitest-environment happy-dom`, already used by 3 suites; jsdom pragma only where behavior diverges) |
| `workspace/assets/model_console.html` | Pin bump only |
| `docs/innfo/documentation/reviewer-guide.md` | Review flow and shortcuts |
| innfo-core payload, `feedback.schema.json`, procedures | Unchanged |

## Release coupling

- **Console**: the next `innfo-console-v*` minor above the version current at release time (`console_assets` is `0.6.0` today; A and B take their own bumps). Ship a new CDN bundle file. Refs come from `scripts/lib/channel-refs.js`/`sync-versions.mjs` and are never hand-edited.
- **Blueprints**: `console-shell-guard.js` requires shell pins to equal the manifest console version, so `model_console.html` must be repinned. That is a blueprint asset change, which needs a `blueprints-v*` tag (stable `0.19.1` today) and a repin in the same batch, per `nn-dev-release`.
- **Skills, MCP**: no `skills-v*`. `innfo-mcp-v*` only if its bundle embeds the console bundle (open question).

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Name-slug element ids: a rename looks like delete + new | High | "target changed"/missing flag; stable ids deferred |
| A ships without `modelId`/`hash` on the procedure path | Med | Hard dependency. The toggle is not rendered when `modelId` or any `hash` is missing (no fallback) |
| Viewer re-renders wipe the decorations | Med | Idempotent re-decoration on `innfo:rendered`; a test covers search re-render |
| Status token contrast fails WCAG 4.5:1 | Med | Token-pair test; fix in B before slice 4 |
| Old drafts are lost | Low | Sole user; announced in the reviewer guide |
| Offline boot regression | Low | No fetch/modules; existing offline scan |

## Rollback

Revert the slice commits on `dev`. The previous `innfo-console-v*` tag and CDN file stay pinnable. v2 keys are ignored by the old runtime and old keys stay untouched, so a rollback destroys no data.

## Review Workload Forecast

Estimate: ~1,300-1,500 changed lines including tests, excluding the regenerated bundle.

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
400-line budget risk: High
```

Strategy `ask-on-risk`. Suggested slices:

| Slice | Scope | ~Lines |
|---|---|---|
| 1 | `review.js` store v2 + math; `<select>`/`updateDraftStatus`/old store deleted; export reads v2 | 350 |
| 2 | Toggle, `innfo:rendered`, decoration, popover, field anchors, `prompt` deleted | 400 |
| 3 | Reviewed marks + rail progress (both renderers), badges, changed filter | 350 |
| 4 | Export preview + clipboard, keyboard/aria-live, narrow CSS, contrast, docs, release | 400 |

## Deferred (YAGNI)

Creating `new`-kind items from the console, print view, threaded replies, multi-reviewer merge, reviewer-chosen `layer`/`severity`, stable non-name element ids, and draft sync beyond `localStorage`.

## Success Criteria

- [ ] Drafts survive a version rebump with the same `modelId`, and changed targets are flagged.
- [ ] A field correction exports `target.field` + `original` + `base_hash` and validates against `feedback.schema.json`.
- [ ] `model_console.html` and `artifact_shell.html` produce identical review decorations from one payload.
- [ ] Badges reflect `meta.feedbackState`, and no reviewer control can set a verdict.
- [ ] A full review can be completed by keyboard alone, and the counter is announced.

## Open Questions / Proposal question round

These were not asked directly (executor context). Assumptions that need user review:

1. Does C own the removal of the status `<select>`? (Assumed yes; A records the split.)
2. Is it acceptable to drop old-key drafts? (Assumed yes.)
3. Are name-slug element ids acceptable for now, with a rename treated as "target changed"? (Assumed yes.)
4. Should reviewed marks be shown while review mode is off? (Assumed no; badges yes.)
5. Does the innfo-mcp bundle embed the console bundle, which would force an `innfo-mcp-v*` release? (Unverified.)
