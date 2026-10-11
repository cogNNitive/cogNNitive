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

- [ ] 1.1 **RED → GREEN**: `console-ui-kit-ku-badge.test.ts` — each of the seven
      kinds sets `data-innfo-component=ku-badge` + `data-ku-kind` + its hook;
      `KuActions` renders info/edit only from callbacks; a pip appears for
      `changes > 0`; invalid data throws `TypeError(/KuBadge/)`. Then implement in
      `ui-kit.js`.
- [ ] 1.2 **GREEN**: add `--innfo-concept-1-bg`..`-12-bg` to `TOKEN_VALUES`
      (light + dark) and the tint CSS. Extend `console-ui-kit-contrast.test.ts`
      to assert each tint vs its concept color and each tint vs `--innfo-text`.
- [ ] 1.3 **GREEN**: make `ConceptPill`/`ElementPill`/`MarkerChip` delegate to
      `KuBadge` with their variant and keep their existing hooks/tags, so their
      suites pass unchanged.
- [ ] 1.4 **RED → GREEN**: update `console-ui-kit-card.test.ts` — ElementCard head
      has a `ku-badge[data-ku-kind=element]` name, fields render as
      `ku-badge[data-ku-kind=field]` in one `.innfo-card-fields` row, no `<dt>`.
      Then update `ElementCard`/`FieldRow` in `ui-kit.js`.
- [ ] 1.5 Verify: the four kit suites; then ONE `node scripts/verify.js`.
- Rollback: revert the slice commit (kit is additive; renderers untouched).

## Slice 2: Payload — matrix header metadata

- [ ] 2.1 **RED → GREEN**: extend a payload matrix test — a free matrix emits
      `head.cols[<c>].concept=target` / `kind=element`; `item-markers matrix`
      emits `head.cols[<c>].kind=marker`; `rows`/`cols` stay `string[]`. Then add
      `head` to `ConsolePayloadMatrix` and populate it in `payload-builder.ts`.
- [ ] 2.2 **GREEN**: rebuild the `console-payload.generated.cjs` mirror; confirm
      `verify.js` mirror check stays green.
- [ ] 2.3 Verify: the payload suite + `node scripts/verify.js`.

## Slice 3: Renderers — badges in cards, document and matrices

- [ ] 3.1 **GREEN**: `render-model-viewer.js` — document title as a `document`
      badge; matrix row/col headers as badges from payload `head` (fallback to
      plain text), cells as `cell` badges. Update `test/console-*.test.mjs`
      expectations that assert header/cell markup.
- [ ] 3.2 **GREEN**: `innfo-runtime.js` — same for its matrix renderer and the
      document badge; keep it byte-shared with the bundle.
- [ ] 3.3 Verify: `test/console-tabs-matrices.test.mjs`, `console-element-card`,
      `console-domain-hierarchy`; then ONE `node scripts/verify.js`.

## Slice 4: Review — info always, edit in review, change pip

- [ ] 4.1 **RED → GREEN**: `console-review-badges.test.ts` — review off: info
      action present, edit absent; review on: edit present; a saved draft adds a
      `ku-change-pip` with the count; delete removes it; info → Info tab, edit →
      Edit tab, pip → Changes tab. Then migrate `review.js` from the per-card
      pencil anchors to the `ku-actions` cluster and enlarge the single modal.
- [ ] 4.2 **GREEN**: update the stable-hook selectors in `review.js` and
      `docs/innfo/documentation/console-ui-kit.md` from `field-row` to
      `ku-badge[data-ku-kind=field]`.
- [ ] 4.3 Verify: the review suites; then ONE `node scripts/verify.js`.

## Slice 5: Bundle + docs

- [ ] 5.1 **GREEN**: `node scripts/build-console-bundle.mjs`; update
      `docs/innfo/documentation/console-ui-kit.md` (family, actions, pip, tokens).
- [ ] 5.2 Verify: `npm run check:console-bundle`; then ONE `node scripts/verify.js`.

## Notes

- Traceability: slice 1 → `console-ui-kit` (badge family, actions, pip, tokens);
  slice 2 → `console-payload-builder` (header metadata); slices 3–4 →
  `console-ui-kit` (ElementCard/FieldRow) + `console-review-mode` (entry points,
  indicator); slice 5 → docs + bundle.
- Marker-score single address: no code double-render; the item-markers matrix
  cell route updates the same `el.markers` marker. Documented in the proposal.
