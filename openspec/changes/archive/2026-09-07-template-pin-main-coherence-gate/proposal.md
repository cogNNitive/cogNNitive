# Proposal: Template Pin ↔ Main Coherence Gate

## Intent

Close a silent-drift gap in the monorepo release manifest. The `stable`
channel pins every asset to a release tag/commit (`manifest/source.yaml`
`channels.stable.refs`: `templates-v0.2.3`, `innfo-mcp-v0.3.1`,
`skills-v1.2.1`), while Level-2 template frontmatter (`spec_url`,
`parent_spec.url`, `includes[].url`) hardcodes canonical `main` URLs
(`https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/...`). A
workspace bootstrap agent that resolves templates recursively via that
frontmatter always fetches `main` content, regardless of which release the
manifest pinned.

Today `main == templates-v0.2.3`, so the two agree. But if `main` advances
with unreleased work, or a tag ships without being merged to `main`, the
agent silently downloads content that differs from the published release.
There is **no gate** that catches this: `validateTemplate`
(`scripts/manifest/lib/manifest-rules.js`) checks structure, commit
existence, ref policy, path presence, and version parity — but never
compares template *content* between the pinned commit and `main`;
`checkMcpUrlPinned` covers MCP bundles only; and `check-spec-version.mjs`
accepts `main` OR `v[\d.]+` URLs but validates existence, not identity.

This change adds a **coherence gate** that fails when a stable-channel
template's content at its pinned commit differs from `main` for the same
path. It is a safety net, not a redesign: canonical-`main` URLs and the
`main`-hosting convention mandated by the `monorepo-release-manifest`
spec and `check-spec-version.mjs` stay untouched.

## Scope

### In Scope

- New `checkTemplateMainCoherence` rule in
  `scripts/manifest/lib/manifest-rules.js`: for each stable-channel template,
  fetch `raw.githubusercontent.com/<repo>/<commit>/<path>` and
  `raw.githubusercontent.com/<repo>/main/<path>`, and report a violation when
  they differ (non-empty diff). Detect **both** drift directions: `main`
  ahead without a release, and a tag released without being merged to `main`.
- Wire the rule into `validate-manifest.js` (stable channel only; `preview`
  already pins `main`, so it is trivially coherent).
- ADDED requirement on `openspec/specs/monorepo-release-manifest/spec.md`
  covering template pin↔main content coherence.
- TDD tests: green when `main==tag`, red when drift is injected in either
  direction (mock `fetchString` / `resolveRef`).

### Out of Scope

- **Not** rewriting frontmatter URLs (`spec_url`, `parent_spec.url`,
  `includes[].url`) from `main` to the pinned tag — that would break the
  canonical-`main` hosting convention and the legacy `check:spec-urls`
  scanner contract.
- **Not** touching skills or MCP bundles. First iteration is templates only;
  extending the gate to `SKILL.md` content and MCP bundles is deferred
  follow-up.
- **Not** changing the `main`-hosting distribution model or the generator
  (`generate-manifest.js` already pins the MCP URL to a commit — unchanged).

## Affected modules

| Module | Impact | Description |
| :--- | :--- | :--- |
| `scripts/manifest/lib/manifest-rules.js` | Modified | New `checkTemplateMainCoherence` rule + template coherence wiring |
| `scripts/manifest/validate-manifest.js` | Modified | Invoke the new rule for the `stable` channel |
| `scripts/verify.js` | Modified | Wire the new rule into the aggregate verify gate |
| `openspec/specs/monorepo-release-manifest/spec.md` | Modified | ADDED requirement: stable template content must match `main` |
| `scripts/manifest/*.test.js` | Modified | TDD fixtures for both drift directions + identical case |

## Approach

1. **Rule**: `checkTemplateMainCoherence(template)` fetches the pinned-commit
   content and the `main` content for the same `path` via `fetchString`
   (`scripts/lib/github-client.js`). Byte-identity (or empty normalized diff)
   is success; any difference is a violation naming the path, commit, and the
   two differing revisions. Reuse `fetchString`/`RATE_LIMIT_HINT` and the
   existing auth headers so `GITHUB_TOKEN` (via `gh auth token`) lifts the
   rate limit.
2. **Wiring**: call the rule from `validateTemplate` only when
   `policy.requireProvenance` is true (stable). `preview` resolves to `main`
   so the comparison is trivially coherent and skipped.
3. **Spec delta**: ADDED requirement on `monorepo-release-manifest` —
   "Stable Template Main Coherence", with Given/When/Then scenarios for
   identical content, `main`-ahead drift, and tag-ahead drift.
4. **TDD**: write failing tests first (mock `fetchString` returning divergent
   bodies), then implement. Strict TDD per `openspec/config.yaml`.

## Risks

| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| GitHub API rate limiting on CI (unauthenticated) | Med | Reuse existing `GITHUB_TOKEN`/`GH_TOKEN` auth via `authHeaders()`; document `gh auth token` guidance; `RATE_LIMIT_HINT` on failure |
| False positives from CRLF/BOM/whitespace-only diffs | Med | Normalize line endings / strip BOM before comparing; use normalized diff, not raw byte equality, in v1 |
| Templates legitimately differing between `main` and a not-yet-merged tag | Med | This is exactly the drift the gate must surface; release flow must merge to `main` before/with tagging |
| Slower validate pass (2 fetches per template) | Low | Small template set (~10 active); runs only on `stable` |

## Rollback Plan

Revert the gate commit (single commit). The gate is purely additive — it
only reports violations and never mutates manifest files, generated docs, or
frontmatter — so reverting restores prior behavior with no cleanup required.
If a template genuinely diverges, the fix is to merge/rebase the tag onto
`main` or release the pending `main` work, then re-run the gate green.

## Success Criteria

- [ ] `node scripts/verify.js` (stable) is green when `main == templates-v0.2.3` (current state).
- [ ] Injecting a divergent `main` body in a test fixture makes the gate red (`checkTemplateMainCoherence` reports a violation).
- [ ] Injecting a divergent pinned-commit body makes the gate red (tag-ahead direction).
- [ ] TDD tests for all three cases (identical / main-ahead / tag-ahead) land before the implementation.
- [ ] New ADDED requirement is merged into `openspec/specs/monorepo-release-manifest/spec.md`.
- [ ] No frontmatter URL, skill, or MCP path is modified by this change.
