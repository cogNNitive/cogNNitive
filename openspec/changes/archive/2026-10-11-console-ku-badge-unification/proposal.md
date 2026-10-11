# Proposal: Knowledge-unit badge unification in the console

## Intent

Every knowledge unit a generated console renders should look like a knowledge
unit, uniformly. Today only three of them do: `ConceptPill`, `ElementPill` and
`MarkerChip`. The element name is a plain `<h3>`, a field is a `<dt>/<dd>` row
(`FieldRow`), a matrix header and a matrix cell are escaped plain text, and the
kNNowledge document itself is a title — none of them read as `InnfoUI` units. The
result is two competing visual grammars in one card, and the reviewer cannot tell
at a glance which pieces are addressable units.

This change introduces **one knowledge-unit badge family** (`KuBadge`) with
per-kind variants, and a **unit action cluster** that renders the info affordance
always and the edit affordance only in review mode. Editability becomes a *mode*,
not a per-unit property, which removes the "which badge is editable?" tax and
supersedes the per-card pencil anchors.

## Scope

### In Scope
- A single `InnfoUI.KuBadge` component with `kind` variants: `document`,
  `element`, `concept`, `field`, `cell`, `marker`, `reference`.
- Element head renders an `element` badge; fields render as one wrapped row of
  `field` badges (`name: value`); matrix row/column headers render as `element`
  (or `marker` for `item-markers matrix`) badges; cells render as `cell` badges;
  the document title renders as a `document` badge.
- A unit **action cluster** outside the badge: info (always) + edit (review mode
  only). One modal, two entry points (Info tab / Edit tab).
- A **pending-change pip** on a badge that carries one or more local drafts.
- Concept-`-bg` tint tokens so a tinted badge fill stays WCAG-compliant.
- Matrix header metadata in the payload so headers can carry concept + kind.

### Out of Scope
- Changing the drafts model, the ledger, or the export format.
- A third-party/extensibility registry for badge kinds.
- Reworking the concept rail or the procedure stepper.
- Persisting review mode or theme choice.

## Capabilities

### New Capabilities
- (none) — the badge family is delivered as a modification of `console-ui-kit`.

### Modified Capabilities
- `console-ui-kit`: adds `KuBadge` + action cluster + change pip + concept tint
  tokens; repurposes `ElementCard` fields/name and makes `FieldRow` delegate.
- `console-review-mode`: two entry icons (info always, edit in review), the single
  enlarged modal with mode-gated tabs, and the pending-change pip.
- `console-payload-builder`: additive matrix `head` metadata for badge headers.

## Decisions (this change)

1. **Marker-score address.** A marker scored through the reserved `item-markers
   matrix` is ONE unit with canonical address `element-slug#marker:<marker-slug>`.
   Its matrix cell is a *view* of that unit, not a second unit, so it MUST NOT be
   presented twice as independent units.
2. **Pending-change indicator.** A **count pip** (notification-badge pattern)
   overlaid on the badge's top-right corner, colored by the aggregate draft status,
   plus a status-tinted border on the badge for at-a-glance scanning. Chosen over a
   dotted border (which conventionally reads "draft/placeholder", i.e. the unit
   itself is provisional) and over a third action icon (the pip is itself the
   clickable affordance → opens the modal on the Changes tab). Multiple drafts on
   one unit are counted.
3. **Field citations.** A `field` badge absorbs the existing per-origin
   `CitationIcon` cluster; `field-citation-provenance` behavior is preserved and
   the `data-field` / `data-innfo-component=field-row` hooks stay stable.
4. **Tint token.** New `--innfo-concept-N-bg` tokens (light + dark), a low-alpha
   tint of `--innfo-concept-N`, so a tinted badge fill meets the contrast floor.
5. **Vocabulary.** **Badge** is the canonical family noun (`KuBadge`). The legacy
   `Pill`/`Chip` component names stay as thin delegating wrappers (no alias churn),
   and the spec documents `KuBadge` as the canonical family.

## Approach

Add `KuBadge` to `ui-kit.js` (pure, UMD, `data-innfo-component`) and make
`ConceptPill` / `ElementPill` / `MarkerChip` / `FieldRow` delegate to it with the
right variant, so existing scenarios keep passing. Renderers compose badges; the
kit stays stateless — the edit action is only rendered when the caller passes
`opts.onEdit`, so review mode gating lives in the renderer/review layer, not the
kit. The payload gains an additive `head` map; renderers fall back to plain text
when it is absent, so no producer is forced to change at once.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` | Modified | `KuBadge`, `KuActions`, change pip, tint tokens; delegating legacy components |
| `iNNfo/specs/bluepriNNts/console/render-model-viewer.js` | Modified | element/field/document/matrix badges |
| `iNNfo/specs/bluepriNNts/console/innfo-runtime.js` | Modified | document title + matrix badges, action wiring |
| `iNNfo/specs/bluepriNNts/console/review.js` | Modified | info always + edit in review + pip; modal entry points |
| `iNNfo/packages/innfo-core/src/console/payload-builder.ts` | Modified | additive matrix `head` metadata |
| `iNNfo/specs/bluepriNNts/console/innfo-console.bundle.js` | Regenerated | `node scripts/build-console-bundle.mjs` |
| `iNNfo/packages/innfo-core/tests/console-ui-kit-*.test.ts`, `test/console-*.test.mjs` | Modified/New | badge family + integration + review |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking the ~20 console suites at once | High | Additive first (new component + delegating wrappers), migrate renderers second, run targeted suites per slice |
| Tinted fill fails the contrast gate | Med | Add `-bg` tokens and extend `console-ui-kit-contrast.test.ts` with an independent luminance check |
| Bundle drift (`check:console-bundle`) | Low | Rebuild the bundle in the same commit as its source; run `npm run check:console-bundle` |
| Nested interactive elements (badge link + action button) | Med | Actions live OUTSIDE the badge root, inside a non-interactive `ku-unit` wrapper |
| Docs drift from contract | Low | Update `docs/innfo/documentation/console-ui-kit.md` in the same slice |

## Rollback Plan

Every slice is additive or revertible: revert the slice commit and regenerate the
console bundle. New payload `head` metadata is optional and ignored by renderers
when absent, so an older bundle keeps working against a newer payload and vice
versa.

## Success Criteria

- [ ] `InnfoUI.KuBadge` renders `data-innfo-component="ku-badge"` with
      `data-ku-kind` for all seven kinds; invalid `data` throws a named `TypeError`.
- [ ] An element card renders its name as an `element` badge, its fields as a
      wrapped row of `field` badges (`name: value`), and no `<dt>/<dd>` pair.
- [ ] Matrix row/column headers render as badges when payload `head` is present,
      and as plain text when it is absent.
- [ ] Outside review mode no edit action exists; in review mode each badge exposes
      edit, and info exists in both. Both open the single modal on the right tab.
- [ ] A unit with local drafts shows a count pip; its badge border reflects the
      draft status; the pip opens the Changes tab.
- [ ] `node scripts/verify.js`, the console suites, and
      `npm run check:console-bundle` pass.
