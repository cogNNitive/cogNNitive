# Tasks: Unified Knowledge-Unit Badges

Strict TDD: every behavior task is RED (failing test) -> GREEN (minimum code) -> REFACTOR, tests first. Test commands: `npm --workspace=@cognnitive/innfo-core test -- <name>` (vitest), `npm --workspace=@cognnitive/innfo-mcp test`, `npm run verify` (typecheck + both suites), `node scripts/verify.js` (node suites), `npm run check:console-bundle`, `npm run check:integrity`.
Paths: core = `iNNfo/packages/innfo-core`, console = `iNNfo/specs/bluepriNNts/console`, views = `iNNfo/specs/bluepriNNts/*/assets`. Spec refs name the delta capability + requirement under `specs/`.

## Gotchas (read before applying)

- Worktree `node_modules` are junctions: NEVER run `npm ci`/`npm install` from a worktree or subagent (corrupts the PRIMARY checkout's `node_modules`).
- After any core edit, rebuild innfo-core (`npm --workspace=@cognnitive/innfo-core run build`) BEFORE running tests that depend on dist.
- Never hand-merge generated files (`innfo-console.bundle.js`, `console-payload.generated.cjs`, `innfo-address.generated.js`): rebase, then regenerate.
- Console/editor suites share one fake-indexeddb (`pool: forks`, `singleFork`): reset storage and router state per test.
- happy-dom lets `javascript:` through: every "inert text" / XSS assertion MUST run under `// @vitest-environment jsdom`.
- Citation parsing (`parseCitation`, `resolveUnitPath`) MUST NOT be changed or widened; badge addresses are parsed by `parseUnitAddress` (maintainer Q1/Q4).
- Sections and definitions carry `concept:` and `matrix:` prefixes; elements, element values, and matrix cells stay equal to changeset `target::` (maintainer Q2/Q5).
- Concept slug is `slugifyHeading(conceptName)` (review W3).
- An inherited value is editable ONLY from its concept section badge (emits `update_concept_field`); on element cards it is info-only (maintainer Q3/Q6).
- Landing order: S2-S6 depend on `fields-replace-markers-and-tags` (S1/S3/S4), `session/global-console-filter`, and `session/ku-lifecycle-fixes`. S1 has no dependencies and can be implemented immediately.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 6,000-8,500 (roughly 55 files; ~45% generated: bundle, mirrors, testlab consoles) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (slice order below), single PR acceptable |
| Suggested split | S1 -> S2 -> S3 -> S4a/b/c -> S5 -> S6 (or one PR with work-unit commits) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units (one commit each, conventional commits, no AI attribution; dev stays green after each)

| Unit | Goal | Notes |
|---|---|---|
| U1 | S1 Core addressing: `unitAddress`, `parseUnitAddress`, `unitHome` | No dependencies, citation regressions pass |
| U2 | S2 Payload additions: addresses, declaring bluepriNNt, header slugs, generated modules | Requires companion S1, S3, lifecycle, filter |
| U3 | S3 Kit: `describeUnit`, `Ku`, CSS grammar, paper tokens, `KuInfoPanel` | Render budget recorded |
| U4a | S4a Renderer migration: cards, mini cards, tables, field split | Core views migrated |
| U4b | S4b Renderer migration: matrices, dialogs, Sources, document view | Complex layouts |
| U4c | S4c Renderer migration: rail, facets, guide, timeline, stepper, views | Zero view-mode edit buttons |
| U5 | S5 Review integration: delegated actions, address-keyed pips, Edit-structure switch | Comment-only structure drafts |
| U6 | S6 Guard on, legacy deleted, version bump, fixtures regenerated, docs | Release-ready |

---

## S1 Core Addressing (U1)

- [x] 1.1 RED `core/tests/unit-address.test.ts`: test all builders in `unitAddress` (`domain`, `document`, `section`, `element`, `value`, `cell`, `concept`, `field`, `matrix`). Verify builder outputs match expected address grammar. Spec: knowledge-unit-address "Canonical Unit Address Grammar and Builders".
- [x] 1.2 GREEN create `core/src/console/unit-address.ts`: implement `unitAddress` builders using `slugifyHeading` for concept slugs. Verify: 1.1 passes.
- [x] 1.3 RED `unit-address.test.ts` parser suite: `parseUnitAddress` round-trips for every builder output with matching kind; handles `concept:` and `matrix:` prefixes; parses two subunits as cell; delegates paths with extensions / `sources/` to `parseCitation`; rejects dotted, absolute, `..`, URL model parts; distinct addresses for shared slugs (`model@goals`, `model@concept:goals`, `model@matrix:goals`). Spec: knowledge-unit-address "Canonical Unit Address Parser".
- [x] 1.4 GREEN implement `parseUnitAddress` in `core/src/console/unit-address.ts`. Verify: 1.3 passes.
- [x] 1.5 RED citation regression suite (`core/tests/sourceRef.test.ts`): verify `parseCitation` and `resolveUnitPath` are completely unchanged: `parseCitation("sources/import/notes")` returns `null` (keeps `KU_MALFORMED`), `specs/testlab@concept:concept-1` is rejected in citation contexts.
- [x] 1.6 GREEN ensure `sourceRef.ts` exports grammar pieces without widening citation parsing. Verify: 1.5 and existing `sourceRef*.spec.ts` pass.
- [x] 1.7 RED `unit-address.test.ts` home suite: test `unitHome` explicit table (`specs/` -> `'blueprint'`, entrypoint / `roleOf === 'entrypoint'` -> `'domain'`, extensionless model id or `roleOf` in `knowledge`/`lineage-record`/`changeset`/`catalog`/`procedure` -> `'knowledge'`, else `'source'`). Spec: knowledge-unit-address "Unit Home Derivation".
- [x] 1.8 GREEN implement `unitHome` in `core/src/console/unit-address.ts`. `Role` in `naming/contract.ts` is untouched. Verify: 1.7 passes.
- [x] 1.9 RED MCP tool test: verify `apply_change` `update_matrix_cell` resolves row/col slugs correctly (`matchesCoord`). Spec: changeset-document-model "Changeset Mutation and Comment Operations".
- [x] 1.10 GREEN ensure `apply_change` matrix coordinate matching handles slugs. Verify: 1.9 passes.
- [x] 1.11 Gates: `npm --workspace=@cognnitive/innfo-core run build`, `npm run verify`. COMMIT U1.

---

## S2 Payload Additions & Generated Modules (U2)

- [x] 2.1 RED `console-payload-builder.test.ts`: `meta.domain` carries `{ title, address: "domaiNN_NN.md", modelCount, sourceCount }`; `meta.models[].family` carries blueprint family slug; schema concepts, fields, matrices carry `declaredBy: { family, version, location }`. Spec: console-payload-builder "Single Payload Builder".
- [x] 2.2 GREEN `core/src/console/payload-builder.ts`: emit `meta.domain`, `family`, and `declaredBy`.
- [x] 2.3 RED domain schema dedup test: definitions de-duplicated by composite key `(family, name)` instead of bare name, preserving multi-blueprint definitions. Spec: console-payload-builder "Single Payload Builder".
- [x] 2.4 GREEN `core/src/console/slot.ts` / `scripts/export-console.mjs`: update domain aggregation dedup key to `(family, name)`.
- [x] 2.5 RED matrix metadata test: `matrices[].slug`, `head.rows[label].slug`, `head.cols[label].slug` emitted on free matrices. Spec: console-payload-builder "Matrix Header Metadata".
- [x] 2.6 GREEN `payload-builder.ts`: populate header element slugs.
- [x] 2.7 RED element location test: `element.location` carries human location, `element.canonicalUnit` is absent, `element.unitSlug` is absent; draft normalization assigns `draft.address`. Spec: console-payload-builder "Element Ids and Hashes".
- [x] 2.8 GREEN update element building and draft normalization in `core/src/console/payload-builder.ts`.
- [ ] 2.9 Parity test: assert `unitHome(address) === describeUnit(...).home` over all testlab payload units.
- [x] 2.10 Build generator: create `scripts/export-address-module.mjs` to emit `innfo-address.generated.js` (`window.InnfoAddress`), wire into `scripts/lib/console-bundle.js` `SOURCES`.
- [ ] 2.11 Regenerate mirrors: `npm run build:payload-mirror` (`console-payload.generated.cjs`).
- [ ] 2.12 Gates: `npm run verify`, `node scripts/verify.js`. COMMIT U2.

---

## S3 Console Kit: describeUnit, Ku, CSS Grammar, KuInfoPanel (U3)

- [x] 3.1 RED `ui-kit.test.ts` descriptor suite: `describeUnit(kind, ref, index)` pure function:
  - Generates `{ kind, nature, home, address, label, slot, vtype?, editability, parentLabel?, location?, facts }`.
  - Throws `TypeError` on unknown kind or missing address.
  - Derived editability: source -> `none`, container -> `none`, structure -> `structure`, inherited value on element card -> `none`, concept value on section badge -> `review`, content -> `review`.
  Spec: console-ui-kit "Knowledge-Unit Badge Family", console-review-mode "Derived Unit Editability".
- [x] 3.2 GREEN `console/ui-kit.js`: implement `describeUnit` table and editability derivation. Verify: 3.1 passes.
- [x] 3.3 RED `ui-kit.test.ts` Ku builder suite:
  - `Ku(kind, ref, opts)` returns `span.innfo-ku-wrap` with `data-innfo-component="ku-unit"`, `data-ku-kind`, `data-ku-nature`, `data-ku-home`, `data-ku-address`.
  - Border/fill grammar: container double border, structure dashed, content solid, source paper fill (`--innfo-source-paper`), concept slot tint.
  - `aria-label` spells out nature and home.
  - Block variant `Ku(kind, ref, { variant: 'block', body })` produces `div[data-ku-variant="block"]`.
  - Tags render as `select` value badges colored by `UI.tagSlot`.
  - Action cluster `span.innfo-ku-actions` outside badge root.
  - Info button `[data-ku-action="info"]` always present.
  - Edit button `[data-ku-action="edit"]` emitted when `editability !== 'none'`.
  - Targets >= 24x24 px (WCAG 2.5.8).
  Spec: console-ui-kit "Knowledge-Unit Badge Family", "Unit Action Cluster".
- [x] 3.4 GREEN `console/ui-kit.js`, `innfo-ui.css`: implement `createKu`, `Ku`, CSS rules, and reserved inline width for action cluster.
- [x] 3.5 RED accessibility & token contrast test (jsdom):
  - Paper tokens (`--innfo-source-paper`) meet contrast floor against text in light and dark themes.
  - Action cluster reveal layout test under desktop and under `@media (hover: none)`.
  - XSS assertions: script injection in labels/addresses rendered inert as text.
- [x] 3.6 GREEN `innfo-ui.css`: finalize paper tokens and responsive layout rules. Verify: 3.5 passes.
- [x] 3.7 RED `ui-kit.test.ts` KuInfoPanel suite:
  - Accessible dialog (`role="dialog"`, focus moves to heading on open, Escape closes and restores focus to info button).
  - Displays kind, nature, Lives in, address (copy button), Location, editability + reason, and kind-specific facts.
  Spec: console-ui-kit "KuInfoPanel".
- [x] 3.8 GREEN `console/ui-kit.js`: implement `InnfoUI.KuInfoPanel`. Verify: 3.7 passes.
- [ ] 3.9 Record render budget: measure baseline testlab console render time and node count, document in `review.md`/design.
- [x] 3.10 Gates: `npm run check-console-bundle`, `npm run verify`. COMMIT U3.

---

## S4 Renderer Migration (U4a, U4b, U4c)

### S4a Cards, Mini Cards, Tables, Field Split (U4a)
- [ ] 4.1 RED card tests (`ui-kit.test.ts`, console suites): `ElementCard` renders element name via `Ku` (kind `element`), values via `Ku` (kind `value`); inherited values labelled `"inherited from <Concept>"` with no edit pencil; no `marker-chip` or legacy pills. Spec: console-ui-kit "ElementCard".
- [ ] 4.2 GREEN update `ElementCard` in `console/ui-kit.js`.
- [ ] 4.3 RED table tests: `mountElementTable` renders field definition badges in table headers once, and `value` badges in `td` cells; deletes legacy `UI.Table`.
- [ ] 4.4 GREEN `console/innfo-runtime.js`: update `mountElementTable` to use `Ku` for all headers and cells; remove `UI.Table`.
- [ ] 4.5 Gates: `npm run check-console-bundle`, `npm run verify`. COMMIT U4a.

### S4b Matrices, Dialogs, Sources, Document View (U4b)
- [ ] 4.6 RED matrix tests: `renderMatrices` renders `matrix` definition badge in corner, element/section badges for row/column headers, and `value` badges for cells; fake `matrix-<slug>` element removed.
- [ ] 4.7 GREEN `console/innfo-runtime.js`: migrate `renderMatrices` to `Ku`.
- [ ] 4.8 RED dialog & source tests: citation dialog (`#innfo-citation-dialog`), ref dialog (`#innfo-ref-dialog`), and field-detail dialog render items through `Ku`; Sources render with paper styling and info button. Spec: console-field-citations "Native citation detail dialog".
- [ ] 4.9 GREEN `console/innfo-runtime.js`: update dialogs to use `Ku`.
- [ ] 4.10 RED document view tests: `renderDocument` renders document container badge, concept section badges, element cards, and value badges through `Ku`.
- [ ] 4.11 GREEN `console/innfo-runtime.js`: migrate `renderDocument` to `Ku`.
- [ ] 4.12 Gates: `npm run check-console-bundle`, `npm run verify`. COMMIT U4b.

### S4c Rail, Facets, Guide, Stepper, Timeline, Views (U4c)
- [ ] 4.13 RED navigation & rail tests: domaiNN badge in navbar, document badges in banner/tabs, concept badges in rail, facets, and filter pills rendered via `Ku`.
- [ ] 4.14 GREEN `console/innfo-runtime.js`: update rail, facets, and omnibar to use `Ku`.
- [ ] 4.15 RED stepper & timeline tests: `render-procedure-stepper.js` and timeline rows render units via `Ku`; `onEditRow` deleted.
- [ ] 4.16 GREEN `console/render-procedure-stepper.js`, `metrics/assets/console-view-timeline.js`: migrate to `Ku`.
- [ ] 4.17 RED blueprint custom views tests: views for `organization`, `projects`, `innovation`, `metrics`, `changes`, `procedures` consume `ctx.ui.Ku`; verify zero un-gated edit buttons in org-chart and roadmap in view mode. Spec: console-view-registry "Shared mount context".
- [ ] 4.18 GREEN update all blueprint views under `iNNfo/specs/bluepriNNts/*/assets/console-view-*.js`: replace legacy chips with `ctx.ui.Ku`; delete `editButton` in org-chart and roadmap.
- [ ] 4.19 RED DraftList/RelList tests: chips replaced by `Ku` badges.
- [ ] 4.20 GREEN `console/ui-kit.js`: update `DraftList` and `RelList`.
- [ ] 4.21 Gates: `npm run check-console-bundle`, `npm run verify`. COMMIT U4c.

---

## S5 Review Integration: Delegated Actions, Switch, Pips (U5)

- [ ] 5.1 RED review action delegation tests: click on `[data-ku-action="edit"]` bubbles to single delegated listener; dispatches `onAction('edit', descriptor)`:
  - If review mode is OFF: action is inert (rejected).
  - If unit is content: opens `EditModal`.
  - If unit is inherited concept value on section badge: opens modal emitting `update_concept_field` with scope notice.
  Spec: console-review-mode "Review Mode Toggle", "Unit Info And Edit Entry Points".
- [ ] 5.2 GREEN `console/review.js`: replace post-hoc DOM decorators (`decorateCard`, `decorateFieldRow`, etc.) with descriptor-driven action handlers in `onAction`.
- [ ] 5.3 RED Edit structure switch tests: switch in `#innfo-review-dock` toggles `html[data-innfo-structure=on]`; structure pencils appear only when switch is ON; activating structure pencil opens modal in comment-only mode producing `op: "comment"` draft; switch resets to OFF on review mode exit. Spec: console-review-mode "Edit Structure Switch".
- [ ] 5.4 GREEN `console/review.js`, `innfo-ui.css`: implement Edit structure switch, CSS rules, and comment draft creation.
- [ ] 5.5 RED address-keyed pips test: `setUnitChanges(root, countsByAddress)` places pips on elements, fields, and matrix cells matching draft address; pips open Changes/History tab. Spec: console-review-mode "Pending-Change Indicator".
- [ ] 5.6 GREEN `console/review.js`, `console/ui-kit.js`: wire address-keyed pips.
- [ ] 5.7 Delete `ctx.modal.edit` and `ctx.modal.comment` from runtime context: assert neither is reachable.
- [ ] 5.8 Gates: `npm run check-console-bundle`, `npm run verify`. COMMIT U5.

---

## S6 Guard On, Legacy Deleted, Bump, Fixtures, Docs (U6)

- [ ] 6.1 RED static guard test: scan `console/*.js`, kit, and repo-owned views:
  - Assert zero occurrences of legacy classes and builders (`concept-pill`, `element-pill`, `marker-chip`, `qud-chip`, `ku-badge`, `ku-actions`, `ku-change-pip`, `field-row`, `UI.Table`).
  - Assert `data-ku-*` attributes are written only by `ui-kit.js`.
  - Assert `data-ku-exempt` appears only in files listed in `KU_EXEMPT_FILES_PIN`.
- [ ] 6.2 RED jsdom tree guard test over kitchen sink and `test/fixtures/testlab/domaiNN_console.html`:
  - Every table cell (`td`, `th`), definition item (`dd`, `dt`), and unit container holds an addressed badge OR carries `data-ku-exempt="<reason>"` with a reason in `KU_EXEMPT_REASONS` (`metamodel-svg`, `chart`, `numeric-aggregate`, `csv-subunit-label`).
  - Every `data-ku-address` parses with `parseUnitAddress`.
  - Parsed kind equals descriptor kind for every unit.
  - Zero addresses associated with two different kinds.
  - Review mode OFF => all edit buttons hidden (`display: none`) and inert.
  - Structure switch OFF => all structure pencils hidden.
  Spec: console-ui-kit "Renderers Consume the Kit".
- [ ] 6.3 GREEN delete legacy components and classes from `console/ui-kit.js`, `innfo-runtime.js`, `innfo-ui.css`.
- [ ] 6.4 Assert render budget: verify testlab console node count and render time are within budget established in S3.
- [ ] 6.5 Bump version: bump minor version in `iNNfo/specs/bluepriNNts/console/package.json`, update `manifest/source.yaml` `console_assets` pin.
- [ ] 6.6 Regenerate bundle and fixtures:
  - `npm run build:console` (`innfo-console.bundle.js`).
  - Re-export testlab fixtures (`test/fixtures/testlab/domaiNN_console.html`, `artifacts/*_console/`).
  - Run `node scripts/export-console.mjs --domain test/fixtures/testlab`.
- [ ] 6.7 Update documentation:
  - `docs/innfo/documentation/console-ui-kit.md` (new Ku badge family, tokens, KuInfoPanel).
  - `docs/innfo/documentation/reviewer-guide.md` (address-keyed pips, Edit-structure switch, comment drafts).
  - `docs/innfo/documentation/innfo-mcp.md`.
- [ ] 6.8 Gates: `node scripts/verify.js`, `npm run check:console-bundle`, `npm run check:integrity`, `npm run verify`. COMMIT U6.
