# Delta for contextual-resolution

Scope: illustrative example key only. The scenario "Element target" names `music_volume`, which is renamed `background_audio_volume` in the `video-script` blueprint. No requirement behavior changes: the nn-core resolver and loader are untouched, and `resolve_effective` stays preset-blind.

## MODIFIED Requirements

### Requirement: MCP resolve_effective And explain Tools

nn-mcp MUST expose a `resolve_effective` tool and an `explain` tool. Both MUST accept a document or scope `path` (domain-relative, or absolute inside the server's domaiNN), a `key`, a `strategy` (`override`, `union` or `none`) and an optional element target `{ concept, slug }` naming a declared scope element of that document. Both MUST locate scopes through `findScopeChain` (and, with an element target, `loadElementChain`), MUST obtain the value and the trace from nn-core `resolve` (no second fold in nn-mcp), and MUST NOT write.

`resolve_effective` MUST return the effective value, whether it is present, the winner and the trace. `explain` MUST return the same trace plus the chain of scopes it was computed over (node id, kind, supplier document and `isolate` flag, outermost first) and the floor supplier. Neither MUST return a composed procedure.

The floor MUST be located by nn-mcp: the bluepriNNt package named by the `parent_spec` of the innermost values document of the chain is resolved through the bluepriNNt package resolver (`resolveBlueprintPackage`), and its floor is the single `_NN.md` under the package's `defaults/` folder. A package that cannot be resolved, or has no `defaults/` document, means no floor and is not an error; more than one `_NN.md` under `defaults/` is the structured error `AMBIGUOUS_FLOOR`. A `parent_spec.name` that is a path (it contains `/`, `\` or `..`) is the structured error `INVALID_PARENT_SPEC` naming the document, and an I/O failure other than absence while reading the package or its `defaults/` folder is `FLOOR_UNREADABLE`; neither is silently treated as "no floor".

Both tools MUST return a structured error, never a thrown exception or a rejected call, with a stable `code` and a `detail`: `INVALID_ARGUMENT` (a missing or ill-typed input), `PATH_OUTSIDE_SCOPE` (the path, or the domaiNN it belongs to, is outside the server's domain root, including through a link), `INVALID_PARENT_SPEC`, `FLOOR_UNREADABLE`, `NO_DOMAIN_ROOT` (with the directories `searched`), `UNSUPPORTED_STRATEGY`, the element errors of the element adapter, and the document errors `UNREADABLE_DOCUMENT` and `MALFORMED_FRONTMATTER` (with the domain-relative `path`). Every response MUST survive `JSON.stringify` then `JSON.parse` with deep equality and MUST NOT contain absolute machine paths other than inside `searched`; error details are scrubbed to domain-relative form and an unexpected failure is the generic `INTERNAL_ERROR` without paths.
(Previously: the "Element target" scenario used the key `music_volume`; behavior is unchanged.)

#### Scenario: resolve_effective returns value and winner

- GIVEN the three-level fixture and `priority: high` declared in `p1`
- WHEN `resolve_effective` is called with a path in `p1`, key `priority`, strategy `override`
- THEN the response contains `high`, present true, the winner `p1`, and a trace listing `portfolio`'s `medium` as overridden by `p1`

#### Scenario: explain returns the trace and the chain

- GIVEN the same inputs
- WHEN `explain` is called
- THEN the response contains the chain `portfolio, alpha, p1` with node kinds
- AND its trace deep-equals the trace returned by `resolve_effective`

#### Scenario: Element target

- GIVEN a document declaring `scope_elements` and a scene element declaring `background_audio_volume: 0.06` below a series declaring `0.4`
- WHEN `resolve_effective` is called for that document, the key `background_audio_volume`, `override` and the target `{ concept: Scene, slug }`
- THEN the value is `0.06`, the winner is the scene element, and the trace lists the series' `0.4` as overridden by it

#### Scenario: none keeps an omitted value absent

- GIVEN a root declaring `precio_hora_tutoria: "84"` and a Prestación element declaring none
- WHEN `resolve_effective` is called with `none` and that element as target
- THEN the result is absent and the trace lists the root's declaration under `notInherited`

#### Scenario: Floor fallback

- GIVEN a package whose `defaults/` document declares `health: green` and no scope declaring `health`
- WHEN `resolve_effective` is called for `health` with `override`
- THEN the value is `green` and the winner is the floor supplier `bluepriNNt:<package>`
- AND the same call in a domaiNN whose package has no `defaults/` document is explicitly absent, not an error

#### Scenario: Path outside any domaiNN

- GIVEN a path with no `domaiNN_NN.md` in its ancestry
- WHEN either tool is called
- THEN the structured error `NO_DOMAIN_ROOT` is returned listing the directories searched

#### Scenario: Path outside the server's domain root

- GIVEN an absolute path that is not inside the server's domain root
- WHEN either tool is called
- THEN the structured error `PATH_OUTSIDE_SCOPE` is returned and nothing outside the root is read

#### Scenario: Domain root above the server root or behind a link

- GIVEN the server root is a sub-folder of the real domaiNN, or a link inside the root points outside it
- WHEN either tool is called for a path that reaches the outer domaiNN
- THEN the structured error `PATH_OUTSIDE_SCOPE` is returned

#### Scenario: parent_spec naming a path

- GIVEN the innermost values document declares `parent_spec.name: ../evil`
- WHEN either tool is called
- THEN the structured error `INVALID_PARENT_SPEC` is returned with the document's domain-relative `path`, and no package is resolved

#### Scenario: Unreadable floor

- GIVEN the package's `defaults/` folder exists but cannot be read (for example, permission denied)
- WHEN either tool is called
- THEN the structured error `FLOOR_UNREADABLE` is returned, without an absolute path, instead of "no floor"

#### Scenario: Bad input never throws

- GIVEN a missing key, an unsupported strategy, an unknown element target or an unreadable document
- WHEN either tool is called
- THEN a structured error with its code is returned and no exception escapes
