# Proposal: migrate the console's `innfo-*` surface to the `nn-` prefix

## Why

The console already ships **file names** on the `nn-` convention (`nn-ui.css`,
`nn-runtime.js`, `nn-icons.js`, `nn-address.generated.js`,
`nn-console.bundle.js`), but its entire **code surface** is still `innfo-*`:
2788 occurrences across the 14 console sources, spanning 63 custom properties
(`--innfo-surface`…), 324 classes (`.innfo-ku`, `.innfo-card-fields`…),
20 `data-innfo-*` attributes, 10 JS globals (`InnfoUI`, `InnfoIcons`,
`InnfoConsole`…) and 375 quoted id literals. Two conventions coexist in one
directory, so a reader cannot tell from a name which era it belongs to.

The mismatch also has a functional cost. `test/console-ku-guard.test.mjs`
enforces the retirement of old component names with a **bare-substring** scan:

```js
const LEGACY = ['concept-pill', 'element-pill', 'marker-chip', 'qud-chip',
  'ku-badge', 'field-row', 'UI.Table', 'ConceptPill', ...]
if (text.includes(token)) offenders.push(...)
```

Because the check is a substring match, prefixing does not clear it:
`nn-field-row` still contains `field-row` and `nn-ku-badge` still contains
`ku-badge`. So the `nn-` convention cannot actually be applied to those names
while the guard stays substring-based, and the `.innfo-ku-badge` block in
`nn-ui.css` sits there as dead CSS from an earlier rename that the guard never
scanned (it only reads `.js`).

## What Changes

- **One console prefix.** Every console class, `data-*` attribute, CSS custom
  property, JS global and DOM id uses the single `nn-` / `Nn` prefix. No
  `innfo-*` name survives in the console surface.
- **The guard becomes prefix-aware.** `test/console-ku-guard.test.mjs` matches
  retired names as **whole identifiers**, not bare substrings, so `field-row`
  is caught as a standalone name while `nn-field-row` (or any future
  `nn-field-row`) is neither reported nor accidentally exempted. This is the
  change that actually unblocks the retired tokens.
- **One atomic migration per file**, no dual-emit aliases: the repo's precedent
  is a hard rename with no reader for the old name (`model_id` →
  `knowledge_id`). A transition period with both names would reintroduce exactly
  the ambiguity this change removes.
- **Generated artifacts are regenerated, never hand-edited**: the console bundle
  (concatenation, not esbuild), the testlab fixture, and the shells.
- **Identifiers are renamed; data/API contracts are decided separately.** The
  console also carries three names that are not identifiers: the localStorage
  namespace (`innfo-console:v3:`), the custom events (`innfo:rendered`,
  `innfo:theme-change`) and the `viewer` provenance string
  (`innfo-console@<version>`). A blind substitution would silently orphan every
  unsent draft and break third-party listeners, so each is an explicit question
  (Q5–Q7).

## Capabilities

### New Capabilities

- `console-prefix-naming`: the console's naming contract — which prefix each
  kind of identifier carries, how the static guard matches retired names, and
  the atomicity/regeneration rules for the migration.

### Modified Capabilities

Landed with unit E. The corpus sweep (token substitution) updates the 14 specs whose requirement text only names a renamed identifier; the two requirements that state the opposite contract are superseded by deltas under `specs/`:

- `console-ui-kit`: the "Semantic Token Injection" requirement named `--innfo-*` tokens and the `InnfoUI` global; "InnfoUI Component Contract" named the global itself. Naming updated by the sweep.
- `console-architecture`, `console-scope`, `console-export-cli`, `console-view-registry`, `innfo-console-feedback`: referenced the same names. Updated by the sweep.
- `innfo-console-runtime`: *"Internal console identifiers are unchanged by the rename"* pinned the pre-rename globals, tokens, ids, slots and store key — renamed and rewritten as a delta.
- `console-export-slots-and-standalone-pin`: *"Embedded slot ids are not part of the rename"* — renamed and rewritten as a delta.
- `canonical-vocabulary`: the "Rename scope exclusions are never recorded as retired" list — corrected in place.
- The wider corpus: 17 files under `openspec/specs/*/spec.md` renamed by the sweep.

## Impact

| Area | Impact | Description |
|---|---|---|
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` | Modified | 1141 occurrences; the kit's CSS, attributes and globals |
| `iNNfo/specs/bluepriNNts/console/nn-ui.css` | Modified | 826 occurrences; also drops the dead `.innfo-ku-badge` block |
| `iNNfo/specs/bluepriNNts/console/nn-runtime.js` | Modified | 521 occurrences |
| `iNNfo/specs/bluepriNNts/console/artifact_shell.html` | Modified | 213 occurrences; shell-level CSS + ids |
| `iNNfo/specs/bluepriNNts/console/review.js` | Modified | 73 occurrences; selects on `data-ku-*` |
| `iNNfo/specs/bluepriNNts/console/render-procedure-stepper.js` | Modified | 14 occurrences |
| `test/console-ku-guard.test.mjs` | Modified | `LEGACY` becomes prefix-aware |
| `test/console-*.test.mjs`, `iNNfo/packages/nn-core/tests/console-*.ts` | Modified | every selector/assertion on a renamed name |
| `nn-console.bundle.js`, `test/fixtures/testlab/domaiNN_console.html` | Regenerated | concatenation + export, never hand-edited |
| `openspec/specs/**` | Modified | 99 specs reference the renamed names |
| `iNNfo/specs/**`, `docs/**` | Modified | any prose naming a console class or token |

## Approach

Ordered work units, TDD-first, gated on the open questions.

| Unit | Content | Why this position |
|---|---|---|
| A. Guard | Make `LEGACY` prefix-aware; add a test proving `nn-field-row` passes and `field-row` fails | Without it the rename is unverifiable and the retired names stay blocked |
| B. Contract | Land the `console-prefix-naming` spec (this change's delta) | Freezes the naming rules A and C implement |
| C. Sources | Rename the 6 console sources atomically, one commit per file, tests green after each | The bulk; needs A and B |
| D. Regenerate | Bundle + fixture + shells; drop the dead `nn-ui.css` block | Needs C |
| E. Corpus | Sweep the 99 specs and the docs prose | Needs the Q1–Q4 answers; last because it is the widest and most mechanical |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A rename lands in sources but not in a generated artifact, shipping a console that references a name nothing emits | High | Regenerate in the same commit (unit D); `verify.js` "Console Bundle Fresh" / "Console Shells Fresh" fail loudly |
| The guard is loosened too far and stops catching a retired name | Med | Unit A is TDD: assert both directions (`field-row` caught, `nn-field-row` clean) |
| Renaming CSS custom properties breaks a domain-level theme or preset that overrides `--innfo-*` | Med | Q1 decides this explicitly; `design-presets` and the shells are checked before landing |
| Renaming the JS global (`InnfoUI`) breaks the generated shells that read `window.InnfoUI` | Med | Q2 decides; shells are regenerated, so the risk is limited to third-party embedders of the artifact |
| The 99-spec sweep is mechanical and hides a behavioural edit | Med | Unit E is a pure token substitution with the suite green; no requirement semantics change |
| Repeating the earlier mistake: a class renamed in the kit but not in the stylesheet (dead CSS) | Med | Unit A's prefix-aware guard now scans the `.css` files too, which the old guard never did |

## Rollback Plan

- Revert the merge commit of the unit that broke. Units A–E are separate
  commits; C is one commit per file, so a single file reverts alone.
- The generated artifacts are regenerated from the reverted sources, so no
  hand-written rollback is needed.

## Dependencies

- Independent of the field-pair work (#309, #310 merged): those change the
  *pair grammar*, this changes *names*.
- Carries no release of its own unless the JS global is renamed (Q2), which
  changes a public embedder contract.

## Success Criteria

- [ ] No `innfo` occurrence remains in the 14 console sources or their emitted markup.
- [ ] `nn-field-row` and `nn-ku-badge` are usable names: the guard reports neither.
- [ ] The guard still catches a bare `field-row` / `ku-badge` identifier.
- [ ] The bundle and the testlab fixture are regenerated, and `verify.js` freshness guards are green.
- [ ] Every console test and nn-core console test is green; CI green on `dev`.

## Assumptions

1. `nn-` is the console prefix, matching the shipped file names and the
   `cogNNitive` → `nn` abbreviations (`nn-core`, `nn-mcp`).
2. No external consumer reads the console's CSS custom properties or DOM
   attributes; the artifact is consumed as a whole page, not as a component
   library. (Verify before unit C: the check is `--innfo-` is undocumented in
   `docs/` and `iNNfo/specs/`.)
3. The vendored files (`htm.umd.js`, `preact.umd.js`, `uplot.iife.min.js`) carry
   no `innfo` name and are out of scope (measured: 0 occurrences).

## Open Questions

These decide the shape of the whole change, so they must be answered before
unit C:

| # | Question | Recommended | Consequence if answered the other way |
|---|---|---|---|
| Q1 | Do the CSS custom properties become `--nn-*`? | Yes — they are the same surface, and they are undocumented | Any `--innfo-*` override in a domain preset or shell must migrate with it |
| Q2 | Does the JS global `InnfoUI` become `nn*`? | Yes, so `nnUI`, `nnIcons`, `nnConsole`… match the prefix | Keeps a public API name; the shells then keep reading `window.InnfoUI` |
| Q3 | `Nn*` or `NN*` for the PascalCase globals? | `nn*` — reads as the prefix, not as an acronym | `NN*` matches the `cogNNitive` capitalisation but reads as an initialism |
| Q4 | Does the 99-spec corpus sweep land in this change or a follow-up? | Follow-up — this change defines the contract and the sources | One very wide PR (~99 spec files) mixed with the console work |
| Q5 | Does the localStorage namespace `innfo-console:` become `nn-console:`? | Yes, as a **version bump** (`nn-console:v4:`) with no read of the old key — the repo's own precedent (`never reads … innfo-console:v2:*`) | Keeping it leaves one `innfo-` string in the sources, and the residual check in unit A must then carry an allowlist. Renaming **without** bumping would keep reading keys an old artifact wrote |
| Q6 | Do the custom events become `nn:rendered` / `nn:theme-change`? | Yes — the shells are regenerated with the kit | Any third-party listener on the old event name stops firing; keeping it leaves one `innfo:` contract behind |
| Q7 | Does the `viewer` string `innfo-console@<v>` become `nn-console@<v>`? | Yes — it is the console's own identity, versioned by `CONSOLE_VERSION` | Historical proposals keep the old viewer string; persistence was not confirmed in this audit |

## Review Workload Forecast

| Work unit | Est. changed lines (excluding generated) |
|---|---|
| A. Guard | ~40 |
| B. Contract spec | ~90 |
| C. Sources | ~2800 substitutions (mechanical, 6 files) |
| D. Regenerate | generated only |
| E. Corpus sweep | ~99 files |

- Chained PRs recommended: **Yes** — A+B, then C+D, then E.
- 400-line budget risk: **High** — unit C alone changes ~2800 occurrences. The
  chained-PR split above keeps each review under the budget.
- Decision needed before apply: **Yes** (Q1–Q4).
