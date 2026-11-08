# Delta for innfo-console-runtime

## ADDED Requirements

### Requirement: Shell CSP allows relative local media

The Content-Security-Policy declared by `artifact_shell.html` MUST allow `img-src` and `media-src` to load files addressed by a path relative to the console file when the console is opened from `file://` (the `file:` scheme and `'self'`), in addition to the sources `img-src` allows today. A `media-src` directive MUST exist (today none does, so `<video>` and `<audio>` fall back to `default-src 'none'`) and MUST allow only `'self'`, `file:` and `blob:`. This change MUST NOT add any remote origin to any directive; `img-src` keeps its present remote allowance and nothing else is widened. It MUST keep forbidding inline script execution and MUST keep loading the console bundle and its JSON data islands. The policy MUST be defined in one place in the shell, and the shell guard (`scripts/lib/console-shell-guard.js`) MUST fail when `media-src` contains a remote scheme, a remote origin or `*`, or is absent.

The read-only `ctx.mountHtml` iframe CSP of `console-view-registry` MUST NOT change.

#### Scenario: Relative image loads
- GIVEN a console opened from `file://` with an image whose path is relative to the console file
- WHEN the runtime renders it
- THEN the browser raises no CSP violation for that image

#### Scenario: Relative audio and video load
- GIVEN a console opened from `file://` with an audio and a video element whose paths are relative
- WHEN the user plays each
- THEN no CSP violation is raised for either

#### Scenario: Remote media is blocked
- GIVEN a payload value `https://example.com/x.mp4` used as a media source
- WHEN the policy is evaluated
- THEN the `media-src` directive does not allow it

#### Scenario: Nothing else widened
- GIVEN the shell policy before and after this change
- WHEN the directives are compared
- THEN only `media-src` was added and `file:` was added to `img-src`

#### Scenario: Inline script still refused
- GIVEN the widened policy
- WHEN the shell policy is inspected
- THEN `script-src` still forbids inline script execution

#### Scenario: Guard rejects wildcards
- GIVEN a shell whose `media-src` contains `*`, `http:` or `https:`
- WHEN the shell guard runs
- THEN it fails naming the directive

#### Scenario: Iframe CSP untouched
- GIVEN a readonly view that uses `ctx.mountHtml`
- WHEN its `srcdoc` is read
- THEN the CSP `<meta>` is still `default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'`

### Requirement: Media that fails to load degrades to a link

When an image, audio or video element fails to load (missing file, blocked by the browser, or unsupported), the runtime MUST keep an adjacent link that opens the same file in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) and MUST show the path as text. The runtime MUST NOT render a bare broken element as the only affordance.

#### Scenario: Blocked media
- GIVEN a video element whose load fails
- WHEN the element reports an error
- THEN an Open link to the same relative path and the path text remain visible

### Requirement: Direct-write capability is a registered need

`needs-registry.json` MUST declare `changes-direct-write` with empty anchors (`[]`), like `changeset-export`. When a console declares it in `nn-config` `needs[]`, the runtime MUST inject the grant control, the write-mode indicator and the reviewer-name control through an idempotent routine (one of each even if the bundle boots twice) with ids that clash with no other dialog or control, and MUST work from `file://` without `fetch` or `type=module`. Shells MUST NOT carry markup for it. Behaviour is specified by `console-changes-direct-write`.

#### Scenario: Injected once
- GIVEN a console declaring `changes-direct-write` whose bundle boots twice
- WHEN the page loads
- THEN exactly one grant control and one mode indicator exist

#### Scenario: Dormant when undeclared
- GIVEN a console that omits it
- WHEN the runtime boots
- THEN none of these controls exists

#### Scenario: No anchors required
- GIVEN a shell declaring the need with no markup for it
- WHEN the shell guard runs
- THEN it passes

### Requirement: Exported changesets are sealed

Every changeset the console exports, by download, copy or direct write, MUST be sealed: it MUST carry a `proposal_sha` that nn-core `verifyProposalSha` accepts, computed in the browser by a drift-guarded copy of `computeProposalSha` (built from the nn-core source into the bundle; the bundle drift check of "Bundle Matches Its Sources" covers it). Verdict drafts and the `review_gate` export contract are specified by `innfo-console-feedback`; this requirement adds only the seal.

#### Scenario: Seal verifies
- GIVEN drafts exported as a changeset
- WHEN the file is parsed and `verifyProposalSha` runs
- THEN it succeeds

#### Scenario: Seal equals nn-core for a verdict
- GIVEN a fixture with a human `review_gate` change
- WHEN the runtime and nn-core each compute the seal
- THEN the values are equal

#### Scenario: Tamper detected
- GIVEN an exported changeset whose `reviewer` is edited by hand
- WHEN `verifyProposalSha` runs
- THEN it fails
