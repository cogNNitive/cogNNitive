# Console Needs & Visual Identity

What a generated console can do is **declared, not inferred**. A console opts into
capabilities by listing them in `innfo-config.needs[]`; the shared runtime reads
that list through `hasNeed()` and only wires the matching UI. Concept color and
icon are a separate concern: they are **data from the active blueprint**, not a
hard-coded palette.

---

## Needs registry

`console/needs-registry.json` declares the available needs. Each entry carries a
`description`, an `anchors` list of DOM hooks, and — when the need is not served
by the core runtime — a `renderer` hint.

| Need | What it enables |
| :--- | :--- |
| `charts` | uPlot chart renderer reading pure-data series from `innfo-model.series`; the x-axis months window comes from `meta.months` / `historyMonths` / `startMonth` / `startYear`. Carries `renderer: "innfo-runtime"`. |
| `feedback-export` | Reviewer suggest/edit drafts in `localStorage` plus the Export modal (identifier gate, instructions, agent prompt) that produces the `_changes_NN.md` changeset. |
| `concept-rail` | Left rail of blueprint concepts with per-concept element counts. |
| `fulltext-search` | Search box filtering element names and field values. |
| `matrix-grids` | Matrix sections rendered as rows-by-columns tables from the model slots. |
| `hash-routing` | In-page relationship links resolving to element anchors via the location hash. |
| `reference-popup` | `reference`-typed values render as pills that open a detail dialog. |
| `document-view` | Generic readable-document renderer: builds a tree from parent/next fields and renders each root chain (root + steps with concept colors and step-type icons). |
| `guided-procedure` | Guided procedure execution (fsm-stepper): navigable tree of root `Work` elements and their step chains, with condition guards, I/O, tools, and role assignment. Carries `renderer: "procedure-stepper"`. |
| `timeline-grid` | Interactive monthly P&L and metrics timeline grid with growth rules, variable overrides, formula recalculation, and CSV export. Carries `renderer: "innfo-runtime"`. |

### Opt-in and gating

- A console lists the needs it wants inside `#innfo-config`:

  ```json
  { "needs": ["concept-rail", "fulltext-search", "matrix-grids"] }
  ```

- `hasNeed(config, need)` returns `true` only when `config.needs` is an array that
  contains the need. A missing config or a missing `needs[]` array means no needs
  are enabled.
- Needs that are not listed are simply never matched — there is no implicit
  default set. The list is **configuration, not UI**: it drives `hasNeed()` and is
  never rendered into the console banner.

### Default view

On a fresh load the console opens on the **Model Explorer** (the domain's primary
content), not on the first registered view — a blueprint's `procedure` view would
otherwise land first. Precedence is: a `--view`-scoped console opens on its scoped
view; otherwise `#innfo-config.defaultView` if it names a real tab; otherwise
`explorer`; otherwise the first tab. `defaultView` is a string tab id; a value
that does not name a real tab is ignored.

---

## Caveats: registry vs. what actually boots

Two mismatches are worth stating plainly.

- **The registry is a need catalog, not a manifest of loaded files.** It is a
  flat map keyed by need name, each entry holding a `description`, an `anchors`
  list of DOM hooks, and — for `charts`, `timeline-grid` and `guided-procedure` —
  a `renderer` hint. It has **no** `runtime` key and never pins bundle filenames:
  the shipped shells load the single `nn-console.bundle.js`, and the registry does
  not list it.
- **`guided-procedure` does not gate the stepper.** The stepper is the registered
  `procedure` view (`procedures/assets/console-view-procedure.js`, order 20): the
  view registry starts it through `InnfoProcedureStepper.mount(container, payload)`
  when its tab is first activated. The `guided-procedure` entry carries a
  `renderer` hint, but the runtime need gate is not what starts the stepper —
  the view registration is. `render-procedure-stepper.js` no longer auto-boots
  and creates no global ids.

---

## Blueprint-driven visual identity

Concept color and icon come from the **active blueprint's concept definitions**
(`innfo-schema.concepts[].color` / `.icon`), never from a hard-coded palette. A
color is stored as a name (for example `blue`) and translated to a hex value by
the shared visuals module's `COLOR_HEX`.

| Surface | Resolver | Source |
| :--- | :--- | :--- |
| Console (procedures) | `render-procedure-stepper.js` `conceptColor(name)` | `innfo-schema.concepts[]`, translated by `InnfoVisuals.getHexColor` |
| Console (runtime) | `nn-runtime.js` builds `conceptColorByName` from `concepts[]` | same schema slot |

A concept with no declared color falls back rather than erroring — the console
uses `#171717`.

---

## Where the visual layer is not unified

The shared visuals module is **not** the single source of truth, and steps do not
use concept icons. These nuances matter when a color or icon looks wrong in one
surface but not another.

- **Steps use `step_type` icons, not concept icons.** `render-procedure-stepper.js`
  renders `STEP_TYPE_ICONS[step_type]` (`task`, `decision`, `event`) for step
  nodes. Concept color drives the concept rail and element tags, not the step
  icon.
- **Each renderer resolves colors on its own.** `render-procedure-stepper.js` and
  `nn-runtime.js` both translate a concept color name through
  `InnfoVisuals.getHexColor`, but neither imports the palette directly — it is
  shared through the bundle, not owned by a single renderer.
