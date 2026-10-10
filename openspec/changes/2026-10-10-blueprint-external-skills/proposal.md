# Proposal: Blueprint-recommended external skills (pinned, integrity-verified)

## Intent

A bluepriNNt can already declare external skills in its frontmatter `skills:` array,
but the declaration is inert: `{ name, repo, path }` carries no pin, no integrity
hash and no license, `list_blueprint_skills` only lists it, and nothing installs it.
We want bluepriNNts to *recommend* popular, safe third-party skills the way a
codebase depends on a library — without cogNNitive vouching for the author.

The trust boundary differs from a library: a skill is injected into the agent's
context, so it can rewrite behavior, not just run in a sandbox. The guarantee we
can honestly make is bounded: **reproducible (pinned commit), unmodified since the
pin (content digest) and license-declared** — never "reviewed by us" unless the
skill is embedded.

## Scope

### In Scope
- Extend the frontmatter `skills:` entry shape with `commit`, `ref`, `sha256`,
  `license`, `distribution`.
- Discovery returns those fields; a structural + provenance validator rejects an
  unpinned or unlicensed external entry.
- Install-time, consent-gated fetch of a referenced skill at its pinned commit,
  verified against the declared `sha256`; never a runtime download.
- Document the two guarantee tiers: `embedded` (curated) vs `referenced` (bounded).

### Out of Scope
- Redistributing (vendoring) third-party skills inside cogNNitive packages.
- A third-party skill *registry* or discovery UI.
- Author-reputation scoring; sandboxing an agent runtime.

## Capabilities

### New Capabilities
- `blueprint-external-skills`: declares, validates, installs and integrity-checks
  a referenced external skill at a pinned commit with a declared license.

### Modified Capabilities
- `template-procedures-manifest-and-discovery`: the external frontmatter `skills:`
  entry gains pin/integrity/license fields; discovery surfaces them.
- `template-package-structure`: the package skill model becomes two-tier
  (`embedded` vendored vs `referenced` external).

## Approach

Declare + install-time fetch. Not vendored (we inherit maintenance, bloat and
redistribution duties), not runtime (every agent run reopens the supply chain).
Reuse `installSkillAtCommit` (`scripts/lib/skills-commands.js:269`) and add a
SHA-256 tree-digest verification plus an opt-in consent gate, mirroring the
existing embedded-skill projection (R-TPD-05).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/types/parser.ts` | Modified | `TemplateSkill` gains `commit`/`ref`/`sha256`/`license`/`distribution` |
| `iNNfo/packages/innfo-mcp/src/tools/spec.ts` | Modified | discovery returns the new fields |
| `scripts/lib/skills-commands.js` (+ bundle) | Modified | consent-gated install + digest verify |
| `scripts/lib/skill-tree-digest.js` | New | canonical SHA-256 tree digest |
| `scripts/manifest/lib/external-skill-policy.js` | New | pin/license/provenance validation |
| `scripts/verify.js`, docs, `vocabulary.json` | Modified | gate wiring, tier docs, terms |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Digest canonicalization drift between pin time and install | Med | One shared `skill-tree-digest.js`; test a fixture with CRLF/binary files |
| Upstream deletes the repo or the commit (availability) | Med | Pin by commit; document the breakage; a missing commit fails loud, never silent-skipped |
| Wrong license recorded | Low | `license` is SPDX; unknown/missing fails the gate |
| Consent bypass installs third-party code silently | Low | External install requires the explicit `install-external` subcommand; default `install` only reports |

## Rollback Plan

Every slice is additive. Revert the slice commit; a referenced skill has no
vendored artifact to clean because nothing is ever copied into the repo. The
generated `skills-manager.js` bundle reverts with its source in the same commit.

## Success Criteria

- [ ] A frontmatter `skills:` entry with `commit` + `license` validates; one
      without a pin or license fails with a named violation.
- [ ] Running `install-external` fetches the skill at the pinned commit and
      fails if the digest mismatches; without the flag nothing third-party installs.
- [ ] `list_blueprint_skills` returns `commit`/`sha256`/`license` for external entries.
- [ ] Docs state the two guarantee tiers without over-claiming external safety.
