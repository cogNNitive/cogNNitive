# console-proc-nav

Procedure runner: flow graph readability, right-hand graph column, one renderer, and the
shared dialog shell accessibility. Branch `session/console-proc-nav`. Delivery strategy
`ask-on-risk`. Test runner: `node --test <file>`.

## Specs

- **S1** — The flow graph lives in its own column **on the right**, drawn by ECharts only.
  User: *"Prefiero que él sea un grafo con flechas y nodos … pero que esté en una columna,
  en una tercera columna a la derecha, hecho con ECharts, y mejorando la versión que hay
  ahora"*.
- **S2** — The graph shows the step name **whole**, and colour carries the state.
  User: *"que quepa el nombre del procedimiento completo y con color representando el
  estado"*.
- **S3** — Directed edges with arrowheads; a fork shows its condition on the edge.
- **S4** — The step row opens in place, with instructions, the question and the answer form
  together, right below each other (already true on `main`; must not regress).
- **S5** — Modal shells: the dialog has an accessible name, an icon-only close button has a
  label, Escape fires `onCancel`, and every visible field label is associated with its
  control. The Ku info panel's action bar must be styled.
- **S6** — The native SVG fallback is removed. User: *"Esto lo puedes eliminar"*.

## Tasks

| ID  | Spec | Route | Status | Evidence |
| --- | ---- | ----- | ------ | -------- |
| T1  | S2   | inline | done | `flowGeometry` derives node height from wrapped lines; `cut()` no longer truncates titles |
| T2  | S1   | inline | done | `render()` appends `main` then `rail`; grid `3fr / minmax(300px,2fr)`; rail sticky |
| T3  | S6   | inline | **reverted** | `buildNativeGraph` removed, then restored: it is the only renderer a test (or a page without a chart runtime) can interact with. See the log. |
| T4  | S5   | inline | done | `aria-labelledby` on the three dialogs, close label + `cancel` on `NewElementModal`, `nn-edit-modal-foot` → `nn-edit-modal-actions` |
| T5  | S5   | inline | done | `for`/`id` on concept, model, name, comment, dynamic field labels |
| T6  | S1   | inline | done | Steps tab and its 91-line table panel removed; shared table CSS narrowed to artifacts; dead `.dotmark` rules removed |
| T7  | S4   | inline | done | Tab bar is a `tablist`: `role=tab`/`aria-selected`/`aria-controls`, roving `tabindex`, arrows + Home/End, `:focus-visible`. Rows already used a real `<button>` with `aria-expanded` |
| T8  | S4   | inline | done | "Allowed next" moved out of the collapsed `<details>`; the agent instruction stays folded |

## Log

**L1 (user, verbatim)** — *"Olvida lo de 'con una doble', que debió ser algo que dicté mal
adelante con los cambios, seguimos avanzando haz un plan e implementa los cambios"*.

- Re-verified against `origin/main`, not the primary checkout: the primary was 111 commits
  behind, and the accordion and the reordered columns had already landed there. The audit
  done on the stale tree overstated the gap; the roadmap above is against `origin/main`.
- The graph was already layered top-to-bottom (`pos.y` = layer), so no orientation change was
  needed — only wrapping and height.
- `.exec-dag-view-native` was `display: none` below 640px, so the removed fallback was already
  invisible on a phone and only reachable when the page had no chart runtime.
- One commit rather than two: the bundle and the exported fixture are generated from both
  files at once, so splitting `ui-kit.js` from the stepper would need a rebuilt intermediate
  bundle. Measured: `node --test scripts/lib/console-bundle.test.js` 1/1,
  `node --test test/console-export.test.mjs` 67/67.
- Pending: the `EditModal` value label (`fieldLabel`, `ui-kit.js`) is created before its widget
  is chosen, so it has no `for` yet — it needs the widget ref, not a blind id.

**Second pass.** Corrections to the earlier map, both from re-reading `origin/main` instead of
the stale tree:

- `doc-step` rows already used a real `<button class="proc-step-toggle">` with
  `aria-expanded` -- the "mouse-only rows" finding was about the *old* table, now deleted.
- The removed table's symbols carried replacement characters instead of an ellipsis or a
  dash, so dropping it only removed broken text; nothing left to fix.

Also found while editing: `.proc-tab-btn` has no rule of its own -- the tabs are styled by the
`.proc-tabbar button` descendant selectors — and there was no `:focus-visible` for them at all,
which a roving-tabindex tablist cannot go without.

**S6 reverted.** CI caught it before I did: `verify` runs four `test/console-procedure-*.test.mjs`
suites that click `.dag-node[data-step]`. Those nodes only exist in `buildNativeGraph`, because
jsdom has no canvas and the chart never draws. The "duplicate renderer" was also the only
testable one. Removing it is still the right destination, but it needs the replacement first: an
interactive step list in the DOM (the SVG node's role, click, Enter/Space, `data-status`,
`aria-label` and `current/selected` classes), then the tests move to it. Restored the function,
its call site and its `display:none` mobile rule; the graph keeps one visual language and the
step toggles remain the real navigation.

The same run also caught a real invariant I had broken: the procedure view must carry **no
`id`** anywhere, because two consoles can be mounted on one page. My tablist had given every tab
and panel a global id. `role=tab`/`aria-selected`/`tabindex` stay; `id`, `aria-controls` and
`aria-labelledby` are gone.

Tests now: view 22, runner-ux 65, artifacts 7, projection 7, console-bundle 1, console-export 67.
The one test I changed asserts the new column order.

