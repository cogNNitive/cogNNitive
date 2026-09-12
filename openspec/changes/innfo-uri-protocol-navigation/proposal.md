# Proposal: iNNfo Modeler Dynamic Navigation Links & Backlog URI Protocol

## Intent

The iNNfo ecosystem benefits from making workspace access and in-app navigation extremely easy and intuitive. Users need clear absolute path copying, easy workspace loading flows, and interactive navigation links decorated with contextual emojis (`🧭`, `🔗`, etc.) in renderers. Additionally, custom URI protocol deep-linking (`innfo://`) is placed into the backlog for future exploration.

## Scope

### In Scope
- Interactive navigation link rendering with contextual emojis (`🧭` for navigation, `🗺️` for submodel mapping, `🔗` for cross-references, `⚡` for procedures).
- Enhanced workspace opening instructions, clear absolute paths in code blocks, and copy-friendly UI guidance for the iNNfo Modeler and static HTML consoles.

## Backlog ("Someday-Maybe")
- `innfo://` custom URI scheme specification and parser (deferred to the "Someday-Maybe" backlog list for future evaluation).
- OS-level custom protocol OS registration.
- Remote cloud backend storage or multi-user live synchronization of URIs.

## Capabilities

### New Capabilities
- `innfo-navigation-links`: interactive emoji-decorated navigation links and usability enhancements for workspace and element references across iNNfo apps and templates.

### Backlog Capabilities
- `innfo-uri-protocol-navigation`: custom `innfo://` protocol parsing and event routing (stored in backlog).

## Approach

1. **Emoji Decoration & UI**: Automatically or declaratively decorate navigation links with intuitive contextual emojis (`🧭`, `🗺️`, `🔗`, `⚡`) based on target type.
2. **Backlog Recording**: Document the `innfo://` custom URI protocol design in the project backlog / future roadmap without implementing runtime parsing or OS interception at this time.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/apps/innfo-editor/` | Modified | Link components and renderers updated with navigation emojis |
| `iNNfo/specs/templates/` | Modified | Console runtimes and templates updated to support interactive emoji link rendering |
| `openspec/changes/` | New | Backlog entry for `innfo://` URI protocol |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Link clutter | Low | Ensure emojis are clean and strictly contextual |

## Rollback Plan

Revert renderer emoji additions.

## Dependencies

- `innfo-editor` rendering components.

## Success Criteria

- [ ] Navigation links render with appropriate contextual emojis (`🧭`, `🗺️`, `🔗`, `⚡`).
- [ ] `innfo://` custom URI protocol recorded in the project backlog.
