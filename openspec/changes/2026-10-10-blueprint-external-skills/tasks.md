# Tasks: Blueprint-recommended external skills

## How to apply

- Load `nn-dev-development`; work in the session worktree. Commit early
  (`wip:<session-id>`), conventional commits, no AI attribution. Never `git add -A`
  / `stash` / `reset --hard` / `clean`.
- **Agile test policy (deliberate deviation from `strict_tdd`).** Only the checks
  that *are* the safety contract get a test. Mechanical edits (schema fields passed
  through, docs, ports) get none — existing suites and typecheck prove them. No
  chained PRs: slice = one work-unit commit. Run only the targeted checks per slice,
  ONE `node scripts/verify.js` at the end of each.
- `skills/nn-skills-lifecycle/scripts/skills-manager.js` is GENERATED: edit
  `scripts/lib/skills-commands.js`, then `node scripts/build-skills-manager-bundle.mjs`.
- Worktrees get a real `npm ci` from `nn-session.mjs start`; no junctions.

### What we keep and why (the only 3 tests)

| Test | Why it is load-bearing |
|---|---|
| `skill-tree-digest.test.js` | The digest is the immutability promise. If it is non-canonical, pin-time and install-time disagree silently — the feature lies. Small, pure, fast. |
| `skills-commands.test.js` (mismatch case) | Rejecting a digest mismatch with nothing written IS the security boundary. |
| `external-skill-policy.test.js` | A guard: unpinned/unlicensed must fail. Pure function, fast. |

Everything else below is explicitly "no new test".

## Review Workload Forecast

| Slice | Estimate |
|-------|----------|
| 1. Declare + validate (schema, discovery, digest, policy) | ~280-380 lines |
| 2. Consent-gated install + docs | ~250-350 lines |
| Total | ~550-730 lines |

---

## Slice 1: Declare + validate (inert, no runtime behavior change)

Start: `TemplateSkill` is `{ name, repo, path, source_template? }`; external entries
unvalidated. End: new fields parse and are returned by discovery; a pure digest and a
policy validator exist and are wired into the manifest gate. Out of scope: install.

- [ ] 1.1 **GREEN (no test)**: add `commit`/`ref`/`sha256`/`license`/`distribution`
      to `TemplateSkill` (`iNNfo/packages/innfo-core/src/types/parser.ts:62`) and keep
      them in the frontmatter normalizer (`parser/yaml.ts`). Mechanical field
      pass-through; the existing parser suites + typecheck cover it.
- [ ] 1.2 **GREEN (no test)**: pass the fields through in
      `discoverTransitiveAssets`'s `fm.skills` loop (`tools/spec.ts:835`).
      `[blueprint-external-skills:Discovery Surfaces The Pin]`
- [ ] 1.3 **RED → GREEN**: `scripts/lib/skill-tree-digest.test.js` — digest stable
      across listing order; `node_modules/` and dotfiles excluded; a binary file
      hashed by bytes. Then `scripts/lib/skill-tree-digest.js` exporting
      `skillTreeDigest(dir)`.
      `[blueprint-external-skills:External Skill Integrity Digest]`
- [ ] 1.4 **RED → GREEN**: `scripts/manifest/lib/external-skill-policy.test.js` —
      missing `commit`/`license` fails; missing `sha256` warns; `vendored` +
      non-permissive license fails; embedded entries exempt. Then
      `scripts/manifest/lib/external-skill-policy.js`, reusing
      `checkRefResolution`/`checkCommitExists`/`checkPathAtCommit` from
      `manifest-rules.js`; `checkReleaseProvenance` WARNs for third-party, fails only
      for `vendored` (design D7).
      `[blueprint-external-skills:External Skill Policy Is Enforced]`
- [ ] 1.5 **GREEN (no test)**: wire the validator into `scripts/check-integrity.js` /
      `npm run check:versions` (network); `verify.js` stays structural-only.
- [ ] 1.6 Verify: the two new suites + `npm run check:versions`; then ONE
      `node scripts/verify.js`.
- Rollback: revert the slice commit (fully additive, inert).

## Slice 2: Consent-gated install + docs

Start: nothing fetches an external skill. End: `install-external` installs at the pin
and verifies the digest; docs state the two tiers.

- [ ] 2.1 **RED → GREEN**: `scripts/lib/skills-manager.test.js` (mocking `downloadFile`
      / `extractTarball`): `installSkillAtCommit` with a matching `sha256` installs; a
      mismatched `sha256` throws with nothing written; no `sha256` installs commit-only.
      Then in `scripts/lib/skills-commands.js`: add the digest check inside
      `installSkillAtCommit` (before the atomic swap, D9) and a `cmdInstallExternal`
      that validates `--name/--repo/--path/--commit`, consent-gates, installs and
      projects.
      `[blueprint-external-skills:Referenced Skill Installs At Its Pin]`
- [ ] 2.2 **GREEN (no test)**: add the `install-external` subcommand + `--name --repo
      --path --commit --sha256` flags to `scripts/skills-manager.js`; regenerate the
      bundle (`node scripts/build-skills-manager-bundle.mjs`); confirm the diff is
      source-only.
- [ ] 2.3 **GREEN (no test)**: docs — state the two guarantee tiers (embedded =
      curated; referenced = bounded) in `docs/innfo/template-package-spec.md` and the
      `list_blueprint_skills` description; add `external skill` / `referenced skill`
      to `iNNfo/specs/vocabulary.json` + `docs/innfo/documentation/vocabulary.md`.
      Blueprint guidance MUST NOT claim cogNNitive vouches for a referenced skill.
      `[template-package-structure:Two-Tier Skill Model]`
- [ ] 2.4 Verify: `skills-commands.test.js` green; then ONE `node scripts/verify.js`.
- Rollback: revert the slice commit + regenerate the bundle; opt-in, so default
  behavior is untouched.

## Notes

- No `manifest/source.yaml` change: external skills are referenced, not distributed;
  `assemble-manifest.js` reads `source.skills` only.
- Traceability: slice 1 → `template-procedures-manifest-and-discovery` +
  `template-package-structure` + `blueprint-external-skills` (policy/digest); slice 2
  → `blueprint-external-skills` (install) + `template-package-structure` (two-tier).
- Induced deviation from `openspec/config.yaml` `strict_tdd: true`: recorded here, by
  the maintainer's explicit request, scoped to mechanical edits only.
