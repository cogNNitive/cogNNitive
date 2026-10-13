# Delta for console-ui-kit

## MODIFIED Requirements

### Requirement: Renderers Consume the Kit

`InnfoConsole` MUST build concept pills, element pills, element cards, marker chips, and icons exclusively through `InnfoUI`. `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, and the `.chip` / `.el-head` / `.el-name` builders MUST be deleted with no aliases or shims.
(Previously: the requirement also covered `InnfoModelViewer`, a second renderer that no longer exists.)

#### Scenario: No duplicate builders
- GIVEN the `console/*.js` sources and bundle
- WHEN searched for `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, `className = 'chip'`, `el-head`
- THEN no occurrence exists outside `ui-kit.js`

#### Scenario: Same concept, same markup
- GIVEN one concept rendered by `InnfoConsole` in a whole-domaiNN console and in a console scoped to that concept's model
- THEN `data-innfo-component` and `data-concept-id` are identical
