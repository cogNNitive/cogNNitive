# Design: Blueprint-recommended external skills

## Technical Approach

Additive, three seams reused from the embedded-skill work:
1. **Schema** — `TemplateSkill` (innfo-core `types/parser.ts:62`) gains the pin and
   governance fields; the frontmatter normalizer preserves them.
2. **Discovery** — `discoverTransitiveAssets` (innfo-mcp `tools/spec.ts:835`) already
   returns external entries; it now passes the new fields through untouched.
3. **Install** — the consent-gated fetch reuses `installSkillAtCommit`
   (`scripts/lib/skills-commands.js:269`), adding a digest check before the atomic
   swap and never running from the blueprint's own `skills/` scan.

No new runtime dependency. The only new module is a pure digest function.

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| D1 | Delivery model | **Reference + install-time fetch**, opt-in | Vendoring (maintenance/bloat/redistribution); runtime fetch (per-run supply-chain surface) |
| D2 | Immutability anchor | Pinned **commit SHA** (locator) + **`sha256` tree digest** (trust anchor) | Tag/URL alone (tags move; raw URLs vanish) |
| D3 | Digest shape | `sha256` over a canonical stream: for each file sorted by POSIX rel path, `path + "\0" + sha256(bytes) + "\n"`; exclude `node_modules/`, `.git/`, dotfiles | Tar the tree (format/compression nondeterminism) |
| D4 | Trust tiers | `embedded` = curated/vendored (full guarantee); `referenced` = bounded (reproducible + intact + license-known, author NOT vouched) | One flat "skill" concept (hides the guarantee difference) |
| D5 | Consent | External skills install only via the explicit `install-external` subcommand (consent-gated); default `install`/discovery never fetch them | Always-install (silent third-party code) |
| D6 | License policy | `license` is SPDX. `distribution: referenced` (default) records it and WARNs when missing/`UNLICENSED`; `distribution: vendored` requires a redistributable allowlist (MIT, Apache-2.0, BSD-2/3-Clause, ISC, MPL-2.0, 0BSD) | Blocking all non-redistributable even when we never redistribute (needless) |
| D7 | Provenance check | Reuse `manifest-rules.js` `checkRefResolution`/`checkCommitExists`/`checkPathAtCommit`; require `ref` → `commit` match; `checkReleaseProvenance` is WARN for third-party repos | Requiring main-reachability on a foreign repo (rejects valid tagged releases) |
| D8 | Validation home | New `scripts/manifest/lib/external-skill-policy.js`, wired into `check-integrity`/`check:versions`; structural checks run offline, network checks degrade to warnings | Folding into `validate_blueprint` (couples an offline schema check to the network) |
| D9 | Failure mode | A missing/mismatched commit or digest throws; never a silent skip | Skip-on-error (installs a partial or stale skill) |
| D10 | Where the schema lands | Extend `TemplateSkill`; `EmbeddedBlueprintSkill` stays separate | Merging into one type (embedded has `embedded: true` + absolute `path`) |

## Data Flow

```
blueprint spec_NN.md frontmatter:
  skills:
    - name: external-thing
      repo: owner/repo
      path: skills/external-thing
      commit: <40-hex>
      ref: v1.2.3
      sha256: <64-hex>
      license: MIT
      distribution: referenced
        │
        ├─ discovery (list_blueprint_skills) ─► returns pin/hash/license (read-only)
        │
        └─ install-external --name --repo --path --commit --sha256
             installSkillAtCommit ──► codeload tarball @ commit ──► extract
                └─ verify sha256(tree) == declared ──► atomic swap into ~/.agents/skills/<name>/
                        └─ mismatch/absence ─► throw, nothing written
```

## Interfaces / Contracts

```ts
// iNNfo/packages/innfo-core/src/types/parser.ts
export interface TemplateSkill {
  name: string
  repo: string
  path: string
  /** Pinned commit SHA (40-hex). Immutability locator. Required for external. */
  commit?: string
  /** Declared tag/branch the commit resolves to; verified at pin time. */
  ref?: string
  /** Canonical SHA-256 tree digest (see D3). Strong anchor; WARN when absent. */
  sha256?: string
  /** SPDX identifier. Required for external. */
  license?: string
  /** 'referenced' (default) | 'vendored'. */
  distribution?: 'referenced' | 'vendored'
  source_template?: string
}
```

Digest contract (`scripts/lib/skill-tree-digest.js`):

```js
/** @returns {string} 64-hex SHA-256 of the canonical tree stream (D3). */
function skillTreeDigest(rootDir): string
```

## Validation Rules (`external-skill-policy.js`)

- External entry MUST have `name`, `repo`, `path`, `commit` (40-hex), `license`.
- `ref`, when present, MUST resolve to `commit` in `repo` (network; WARN offline).
- `sha256`, when present, MUST be 64-hex; absence is a WARN, not a failure.
- `distribution: vendored` MUST use a redistributable `license`; `referenced` MAY be any SPDX id but MUST NOT be empty.
- `embedded` skills are exempt (covered by the immutability guard).

## Testing Strategy (agile: only load-bearing checks)

Deliberate deviation from `strict_tdd` at the maintainer's request. Only the checks
that *are* the safety contract get a test; mechanical field pass-through, docs and
ports get none (existing suites + typecheck prove them).

| Suite | Test | Load-bearing because |
|---|---|---|
| `scripts/lib/skill-tree-digest.test.js` | digest stable across order; `node_modules`/dotfiles excluded; binary by bytes | non-canonical digest = silent pin/install drift |
| `scripts/lib/skills-commands.test.js` | an `installSkillAtCommit` call with `sha256` installs at the pin; a digest mismatch throws, nothing written; no `sha256` installs commit-only | this IS the security boundary |
| `scripts/manifest/lib/external-skill-policy.test.js` | missing pin/license fails; missing `sha256` warns; `vendored`+non-permissive fails; embedded exempt | the guard that keeps a bad entry out |

No new tests for: `TemplateSkill` fields, discovery pass-through, `install-external`
plumbing, docs, vocabulary.

## Migration / Rollout

Slice 1 (declare + validate) ships inert until a blueprint uses it. Slice 2
(install) is opt-in by flag, so no existing install behavior changes. No manifest
re-pin is required: external skills never enter `manifest/source.yaml` (they are not
distributed artifacts; `assemble-manifest.js` reads `source.skills` only). Docs and
`vocabulary.json` land with slice 2.

## Open Questions

- [ ] Should `checkReleaseProvenance` be a hard failure for `distribution: vendored`
      only, or for all external skills? (Design leans: vendored only.)
- [ ] Does `verify.js` have network today? If not, keep the network checks in
      `check-integrity`/`check:versions` and leave `verify.js` structural-only.
