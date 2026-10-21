# Delta Spec: router-governance

Scope guard: this delta adds surfacing rules to the existing entry menu. It MUST NOT change the `[s][m][r][p][h][x]` menu shape, the `(Recommended)` selection logic, the activation gate, or the procedure-routing precedence. Watch-root *semantics* (declaration, classification, digest, decisions) live in the `external-watch-roots` capability.

## ADDED Requirements

### Requirement: Watch-root state drives the Sources sub-option

The `nn` front controller MUST read the `watch_roots.declared` count from the domain probe. When `declared > 0`, `[s] Sources` MUST offer a sub-option to run the external watch-root scan and the session-start digest. When `declared === 0`, `[s] Sources` MUST offer an option to declare a watch root. This surfacing MUST be contextual — it MUST NOT add a new top-level menu letter, and it MUST NOT change the `[s][m][r][p][h][x]` shape or the `(Recommended)` selection.

#### Scenario: Declared roots offer the scan
- GIVEN a workspace whose probe reports `watch_roots.declared > 0`
- WHEN `nn` presents the entry menu
- THEN `[s] Sources` offers a sub-option to scan external watch roots
- AND the top-level menu letters are unchanged

#### Scenario: No roots offer declaration
- GIVEN a workspace whose probe reports `watch_roots.declared === 0`
- WHEN `nn` presents the entry menu
- THEN `[s] Sources` offers an option to declare a watch root
- AND no scan is offered

#### Scenario: Surfacing never blocks
- GIVEN a probe that omits `watch_roots` (older preflight)
- WHEN `nn` presents the entry menu
- THEN `nn` treats the count as `0` and presents the menu unchanged

### Requirement: Help surfaces the watched-folders capability

`[h] Help` MUST list the external watch-roots capability so a user with no declared roots can still discover it. The entry MUST describe it as watching external folders without a daemon (declarative roots, on-demand scan, session-start digest).

#### Scenario: Help lists the capability
- GIVEN any workspace
- WHEN the user opens `[h] Help`
- THEN a watched-folders capability entry is listed
- AND it states that no daemon or background process is used

### Requirement: Session start offers the read-only watch digest

When the domain probe reports `watch_roots.declared > 0`, `nn` MUST invoke the read-only `--watch-digest` at session start and present the pending items for a per-item decision (`ignore` / `postpone` / `import`). The digest MUST NOT be invoked when `declared === 0`. Producing the digest MUST NOT write to `sources/` and MUST NOT block the session if it fails or is unavailable; a failure MUST be swallowed and the session MUST proceed to the menu.

#### Scenario: Digest is offered when roots exist
- GIVEN a workspace whose probe reports `watch_roots.declared > 0`
- WHEN `nn` completes the activation gate
- THEN `nn` runs `--watch-digest`
- AND presents any pending items with `ignore`/`postpone`/`import` decisions

#### Scenario: Digest is skipped without roots
- GIVEN a workspace whose probe reports `watch_roots.declared === 0`
- WHEN `nn` completes the activation gate
- THEN `--watch-digest` is not invoked

#### Scenario: Digest failure does not block
- GIVEN a workspace whose probe reports `watch_roots.declared > 0`
- WHEN the digest command fails or is unavailable
- THEN `nn` swallows the error and proceeds to the entry menu
