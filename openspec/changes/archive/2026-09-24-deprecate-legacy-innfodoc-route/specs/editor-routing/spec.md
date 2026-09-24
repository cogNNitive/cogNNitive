# Delta for Editor Routing

## MODIFIED Requirements

### Requirement: Deprecation and Redirection of Legacy Editor Routes

The single-page application router in `innfo-editor` (`iNNfo/apps/innfo-editor/src/router/index.ts`) MUST configure the legacy single-document routes `/innfo-doc` and `/info-doc` to redirect (`redirect: '/'`) to the root home route `/`.

When a client navigates to `/innfo-doc` or `/info-doc`, the router MUST redirect immediately to `/` without rendering or mounting any standalone single-document editor view. The router MUST safely handle any query parameters and URL fragments during redirection without throwing runtime exceptions.

(Previously: `/innfo-doc` and its alias `/info-doc` were routed directly to `InfoDocView.vue`, which loaded single documents in isolation rather than within the Workspace-First workflow.)

#### Scenario: Direct navigation to /innfo-doc redirects to root
- GIVEN an initialized `innfo-editor` web application
- WHEN a user or external link navigates to `/innfo-doc`
- THEN the router redirects the browser location to `/`
- AND the `HomeView` component is rendered

#### Scenario: Direct navigation to /info-doc alias redirects to root
- GIVEN an initialized `innfo-editor` web application
- WHEN a user or external link navigates to `/info-doc`
- THEN the router redirects the browser location to `/`
- AND the `HomeView` component is rendered

#### Scenario: Redirection handles search params safely
- GIVEN a user navigating to `/innfo-doc?file=test_01.md`
- WHEN the route resolution executes
- THEN the user is redirected to `/` without unhandled application crashes or navigation guard errors

---

### Requirement: Removal of Legacy Single-Document View and Tests

The legacy view component `InfoDocView.vue` and its dedicated test suite `tests/component/InfoDocView.test.ts` MUST be removed from `innfo-editor`. The application bundle, router configuration, and test harnesses (`tests/setup.ts`) MUST NOT import or reference `InfoDocView`.

#### Scenario: Application build contains no InfoDocView artifacts
- GIVEN the application router and views directory
- WHEN the application is compiled or tested
- THEN `InfoDocView.vue` does not exist in `src/views/`
- AND no router route entry maps to `InfoDocView` as a component

#### Scenario: Test suite passes without legacy component tests
- GIVEN the `innfo-editor` automated test suite
- WHEN `vitest` executes
- THEN component tests run without missing import errors or references to `InfoDocView.test.ts`
