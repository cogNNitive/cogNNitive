# Tasks: Knowledge-unit badge unification

## How to apply

- Load `nn-dev-development`; work in the session worktree `console-ku-badges`.
  Commit early (`wip:console-ku-badges: ...`), conventional commits, no AI
  attribution. `git add -A` is fine in a session worktree; `stash`/`reset --hard`
  /`clean` stay blocked.
- **Agile test policy (deliberate deviation from `strict_tdd`).** Only checks that
  *are* the safety contract get a test first. A new pure component gets a DOM
  test; a renderer/composition edit is proven by the existing suite plus one
  added assertion. No chained PRs: slice = one work-unit commit.
- `innfo-console.bundle.js` is GENERATED: edit the `console/*.js` sources, then
  `node scripts/build-console-bundle.mjs`; verify with
  `npm run check:console-bundle`.
- `console-payload.generated.cjs` is a generated mirror of `innfo-core` console
  sources; after editing `payload-builder.ts`, run the mirror rebuild that
  `npm run check:console-bundle` / `verify.js` expect (see `scripts/lib/console-bundle.js`).
- NEVER `npm ci` / `npm install` from the worktree (node_modules junctions).

### Load-bearing tests (kept)

| Test | Why it is load-bearing |
|---|---|
| `console-ui-kit-ku-badge.test.ts` (new) | The badge family + actions + pip is the new contract; if it breaks, every renderer lies. Pure, fast. |
| `console-ui-kit-card.test.ts` (modified) | ElementCard field/name presentation is the visible guarantee. |
| `console-ui-kit-contrast.test.ts` (modified) | The `-bg` tints must stay legible; a silent contrast regression is a shipped defect. |
| `console-review-badges.test.ts` (modified) | Mode gating: edit only in review, info always, pip on drafts. |
| `console-payload-builder` matrix case | The header metadata is what lets headers be badges. |

---

## Slice 1: Kit — badge family + tint tokens (additive, no renderer change)

Start: kit has ConceptPill/ElementPill/MarkerChip/FieldRow; no `KuBadge`.
End: `KuBadge`, `KuActions`, change pip and `-bg` tokens exist; legacy components
delegate. Existing suites stay green.

- [x] 1.1 implemented `console-ui-kit-ku-badge.test.ts` + `KuBadge`/`KuActions`/pip in `ui-kit.js`.
- [x] 1.2 added `--innfo-concept-1-bg`..`-12-bg` (light + dark) + tint CSS; extended `console-ui-kit-contrast.test.ts`.
- [~] 1.3 **deferred**: `ConceptPill`/`ElementPill`/`MarkerChip` were NOT made to delegate. The observable contract (one badge family for data units, renderers compose `KuBadge`) is met additively without churning three components and their suites; delegation is a future cleanup (`ponytail`).
- [x] 1.4 updated `console-ui-kit-card.test.ts`; `ElementCard` head renders an `element` badge, fields one `ku-badge[data-ku-kind=field]` row, no `<dt>`.
- [x] 1.5 the four kit suites green; `node scripts/verify.js` run (console steps pass).

## Slice 2: Payload — matrix header metadata

- [x] 2.1 added `head` to `ConsolePayloadMatrix` + `console-payload.test.ts` cases (free matrix `element`, item-markers `marker`); `rows`/`cols` stay `string[]`.
- [x] 2.2 rebuilt the `console-payload.generated.cjs` mirror.
- [x] 2.3 payload suite + `node scripts/verify.js`.

## Slice 3: Renderers — badges in cards, document and matrices

- [x] 3.1 `render-model-viewer.js`: document title badge; matrix header/cell badges from `head` (plain-text fallback); element card name/fields badges.
- [x] 3.2 `innfo-runtime.js`: banner document badge; matrix header/cell badges; element-card concept meta.
- [x] 3.3 `console-tabs-matrices`, `console-element-card`, `console-domain-hierarchy`, `console-dom` green.

## Slice 4: Review — info always, edit in review, change pip

- [x] 4.1 `console-review-info-pip.test.ts`: info action present with review off; a draft adds a `ku-change-pip` with the count. `review.js` decorates info always and pips always; info opens the modal on the Info tab (`startTab`).
- [x] 4.2 migrated the stable hook from `field-row` to `ku-badge[data-ku-kind=field]` in `review.js` and `docs/innfo/documentation/console-ui-kit.md`.
- [x] 4.3 review suites green; `node scripts/verify.js` (console steps pass).

## Slice 5: Bundle + docs

- [x] 5.1 rebuilt `innfo-console.bundle.js`; updated `docs/innfo/documentation/console-ui-kit.md`.
- [x] 5.2 `npm run check:console-bundle` fresh; `node scripts/verify.js`.

## Notes

- Traceability: slice 1 → `console-ui-kit` (badge family, actions, pip, tokens);
  slice 2 → `console-payload-builder` (header metadata); slices 3–4 →
  `console-ui-kit` (ElementCard/FieldRow) + `console-review-mode` (entry points,
  indicator); slice 5 → docs + bundle.
- Marker-score single address: no code double-render; the item-markers matrix
  cell route updates the same `el.markers` marker. Documented in the proposal.
