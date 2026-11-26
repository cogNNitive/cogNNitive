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
| T3  | S6   | inline | done | `buildNativeGraph` (123 lines) and its call site removed; dead `.exec-dag-view-native` rule removed |
| T4  | S5   | inline | done | `aria-labelledby` on the three dialogs, close label + `cancel` on `NewElementModal`, `nn-edit-modal-foot` → `nn-edit-modal-actions` |
| T5  | S5   | inline | done | `for`/`id` on concept, model, name, comment, dynamic field labels |
| T6  | S1   | —     | pending | Remove the Steps table (duplicate of the Flow stepper) |
| T7  | S4   | —     | pending | `doc-step` rows are `div` + click: no `tabindex`, no key handler; tab bar has no `role="tab"` |
| T8  | S4   | —     | pending | "Allowed next" is still inside a collapsed `<details>` |

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
