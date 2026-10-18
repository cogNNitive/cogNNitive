# Delta for innfo-console-runtime

## MODIFIED Requirements

### Requirement: Shared UMD/IIFE Runtime

The system MUST ship a single versioned `innfo-runtime.js` as a UMD/IIFE global (`window.InnfoConsole`). The bundle MUST include `ui-kit.js` (`window.InnfoUI`), `innfo-address.generated.js` (`window.InnfoAddress`), ordered before any module that consumes them.

The runtime MUST instantiate `createKu({ index, onAction })` once at boot and expose the builder as `ctx.ui.Ku`. All console renderers (cards, tables, matrices, rail, facets, guide, timeline, stepper, dialogs) MUST render knowledge units exclusively via `ctx.ui.Ku`.

The legacy methods `ctx.modal.edit` and `ctx.modal.comment` are DELETED from the runtime context; views MUST NOT attempt to invoke modal editors directly. All unit edits and review actions flow through `onAction(action, descriptor)`.

(Previously: `ui-kit.js` did not export `createKu`/`Ku`, and `ctx.modal.edit`/`comment` were exposed on the view context.)

#### Scenario: Ku exposed on runtime context
- GIVEN a booted console runtime
- WHEN a view's `mount(ctx)` executes
- THEN `ctx.ui.Ku` is a callable DOM builder function
- AND `ctx.modal.edit` is undefined
- AND `ctx.modal.comment` is undefined

#### Scenario: Renderers consume Ku
- GIVEN table and matrix views rendered by `InnfoConsole`
- WHEN the DOM is inspected
- THEN cells and headers carry `data-innfo-component="ku-unit"`
- AND no legacy `.chip` or unbadged unit text exists

#### Scenario: Edit action dispatches through onAction
- GIVEN a unit edit pencil clicked in review mode
- WHEN the click event bubbles
- THEN the delegated listener invokes `onAction('edit', descriptor)`
