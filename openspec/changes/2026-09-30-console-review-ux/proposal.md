# Proposal: Console review UX

## Why

Reviewing a model in a console is the human half of the feedback loop, and today it is the weakest link (code-checked 2026-09-30, `iNNfo/specs/bluepriNNts/console/innfo-console.bundle.js`):

| # | Gap | Evidence |
|---|---|---|
| 1 | Annotation is a `window.prompt()`, comment-only, element-level | `suggestFor` :2876-2891 |
| 2 | Drafts orphaned by every version rebump | `getDraftKey(meta.title, modelVersion)` :575, :2779 |
| 3 | `field` never reaches `target.field` | `addDraft` :883 and `buildReviewDoc` :780 put it top-level; schema expects `target.field` (`feedback.schema.json:104`) |
| 4 | Live export does not emit the feedback schema | modal calls `buildReviewDoc` (`console-review-v1`, :787); `buildExportDoc`/`validateFeedback` are exported but unused, contradicting living spec `innfo-console-feedback` |
| 5 | Reviewer can mark own drafts applied/rejected | status `<select>` :2376-2391; verdicts belong to reconcile |
| 6 | No reviewed/progress state, no "changed since last review", no keyboard path | none exists |
| 7 | Canonical console has none of it | `model_console.html` is rendered by `InnfoModelViewer` (own `#rail`, no draft store) |

## What Changes

- **Review mode**: explicit toggle; off = read-only console.
- **Inline annotation popover** anchored to an element card or a field row; kinds `comment | correction | delete`; field anchors write `target.field`; `correction` captures `original`/`proposed`.
- **Reviewed marks**: per-element toggle, rail progress (`reviewed/total`) and pending-draft count per concept, persisted in the draft store.
- **Verdict badges** from `meta.feedbackState` (change 3) via `StatusBadge` (change 2); reviewer-side status editing removed.
- **Change awareness**: per-element content hash in the payload; filter "changed since last review".
- **Durable drafts**: store keyed by stable model id; each draft anchored by `element_id` + base hash; hash mismatch or missing element flags "target changed". No migration of old-key drafts (no-compat preference).
- **Export preview**: item list, live schema validation against `feedback.schema.json`, reviewer identifier, download + copy-to-clipboard.
- **Keyboard and a11y**: `j`/`k` element navigation, `c` annotate, `aria-live` draft counter, focus management, narrow-viewport layout.
- Strict TDD: jsdom tests per behavior (jsdom pragma; happy-dom diverges).

## Capabilities

### New Capabilities
- `console-review-mode`: review toggle, inline annotation, reviewed progress, verdict badges, changed-since filter, keyboard/a11y.

### Modified Capabilities
- `innfo-console-feedback`: Export Modal becomes a validating preview with clipboard; drafts keyed by stable model id and anchored by element hash; `target.field` required for field anchors; reviewer cannot set verdicts.

## Chain position and dependencies

`1 cleanup -> 2 tokens/UI kit -> 3 feedback roundtrip -> 4 (this)`. Consumes `ElementCard`/`FieldRow`/`StatusBadge` and tokens (2), bundle-injected feedback UI, `buildConsolePayload`, `meta.feedbackState`, schema-conformant export (3). Must not start before 3 is merged.

## Impact

| Area | Impact |
|---|---|
| `console/innfo-console.bundle.js` (+ `innfo-runtime.js` per the build documented in 2) | Modified |
| innfo-core `buildConsolePayload` (from 3) | Modified: `meta.modelId`, per-element `hash` |
| `console/feedback.schema.json` | Likely unchanged (`target.field` exists) |
| Console tests + kitchen-sink fixture (from 2) | Extended |

## Release coupling

New `innfo-console-v*` minor (after 2 and 3) + new CDN bundle file; bump the artifact `version` in `manifest/source.yaml` `console_assets` (currently `0.6.0`); refs derived by `scripts/lib/channel-refs.js`/`sync-versions.mjs`, never hand-edited. If payload changes reach innfo-mcp or a procedure, follow `nn-dev-release` for an `innfo-mcp-v*` / `blueprints-v*` tag + repin in the same batch.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Element ids are name slugs: a rename looks like delete+new | High | "target changed/missing" flag; stable ids deferred |
| Existing drafts lost on re-key | Med | Sole user; announce; no compat code |
| Change 3 slips on schema-conformant export | Med | Hard dependency; else absorb gap 4 here |
| Bundle size / offline boot regression | Low | No fetch/modules; fixture double-click check |

## Rollback

Revert the slice commits on `dev`; previous `innfo-console-v*` tag and CDN file remain pinnable. Drafts under the new key are ignored by the old runtime (non-destructive).

## Delivery (ask-on-risk)

Estimate ~1,300-1,600 changed lines with tests: **400-line budget risk: High; chained PRs recommended**.

1. Durable draft store + payload `modelId`/element hash (~350)
2. Review mode + popover + `target.field` + reviewed/progress rail (~450, may split)
3. Verdict badges + changed-since filter (~250)
4. Export preview/clipboard + keyboard/aria/responsive (~400)

## Deferred (YAGNI)

Print view, threaded replies, multi-reviewer merge, reviewer-chosen `layer`/`severity`, stable non-name element ids, `new`-kind authoring UI, draft sync beyond `localStorage`.

## Success Criteria

- [ ] Drafts survive a version rebump; changed targets are flagged.
- [ ] A field annotation exports `target.field` and validates against `feedback.schema.json`.
- [ ] Canonical `model_console` supports the full review flow.
- [ ] Badges reflect `meta.feedbackState`; reviewers cannot set verdicts.
- [ ] Full review completable by keyboard; counter announced.

## Proposal question round

Not asked directly (executor context); assumptions needing user review:

1. Stable model id source: domaiNN-relative model path, or a new frontmatter id?
2. Drop existing old-key drafts (assumed yes)?
3. Is a name-slug element id acceptable for now, with rename = "target changed"?
4. Should `new`-kind items be authorable from the console in this slice (assumed no)?
5. Does change 3 own gap 4 (export emitting `feedback.schema.json`)?
