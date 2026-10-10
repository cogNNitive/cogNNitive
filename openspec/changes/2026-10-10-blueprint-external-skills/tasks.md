# Tasks: Blueprint-recommended external skills

## How to apply

- At session start load `nn-dev-development`; work in the session worktree.
  Commit early (`wip:<session-id>`), conventional commits, no AI attribution.
  Never `git add -A` / `stash` / `reset --hard` / `clean`.
- Strict TDD (config `strict_tdd: true`) for every new behavior: see RED fail for
  the intended reason before GREEN. Mechanical edits get no new tests.
- `skills/nn-skills-lifecycle/scripts/skills-manager.js` is GENERATED: edit
  `scripts/lib/skills-commands.js`, then `node scripts/build-skills-manager-bundle.mjs`.
- NEVER `npm ci` / `npm install` from the worktree (`node_modules` junctions).
- Run only the targeted suites per slice; ONE `node scripts/verify.js` at slice end.

## Review Workload Forecast

| Slice | Estimate |
|-------|----------|
| 1. Schema + discovery | ~120-160 lines |
| 2. Digest + validation policy | ~220-300 lines |
| 3. Consent-gated install + docs/vocabulary | ~250-350 lines |
| Total | ~600-800 lines |

400-line budget: under per slice. Chained PRs optional; keep one PR per slice.

---

## Slice 1: Schema + discovery (additive, inert)

Start: `TemplateSkill` is `{ name, repo, path, source_template? }`. End: the new
fields parse and are returned by discovery. Out of scope: validation, install.

- [ ] 1.1 **RED**: in `iNNfo/packages/innfo-core/src/types/index.spec.ts`, assert a
      frontmatter `skills:` entry with `commit`/`ref`/`sha256`/`license`/`distribution`
      round-trips through `parseFrontmatter`. Watch it fail (fields dropped).
      `[blueprint-external-skills:External Skill Entry Declares A Pin And License:Fields round-trip]`
- [ ] 1.2 **GREEN**: add the optional fields to `TemplateSkill`
      (`types/parser.ts:62`) and keep them in the frontmatter normalizer
      (`parser/yaml.ts`).
- [ ] 1.3 **RED**: in `innfo-mcp/src/tools/spec.spec.ts`, assert
      `list_blueprint_skills` returns `commit`/`sha256`/`license` for an external
      entry; embedded still wins over a same-name frontmatter entry.
      `[blueprint-external-skills:Discovery Surfaces The Pin:External entry carries the pin]`
- [ ] 1.4 **GREEN**: pass the new fields through in `discoverTransitiveAssets`'s
      `fm.skills` loop (`tools/spec.ts:835`).
- [ ] 1.5 Verify: innfo-core `index.spec.ts` + innfo-mcp `spec.spec.ts` green.
      Then ONE `node scripts/verify.js`.
- Rollback: revert the slice commit (fully additive).

## Slice 2: Tree digest + validation policy

Start: no digest function; external entries unvalidated. End: a pure digest and a
validator that rejects unpinned/unlicensed entries.

- [ ] 2.1 **RED**: `scripts/lib/skill-tree-digest.test.js` — digest stable across
      listing order; CRLF vs LF bytes differ; `node_modules/` and dotfiles excluded;
      a binary file is hashed by bytes.
      `[blueprint-external-skills:External Skill Integrity Digest:Digest is canonical]`
- [ ] 2.2 **GREEN**: `scripts/lib/skill-tree-digest.js` exporting `skillTreeDigest(dir)`.
- [ ] 2.3 **RED**: `scripts/manifest/lib/external-skill-policy.test.js` — external
      entry missing `commit` or `license` fails with a named violation; missing
      `sha256` warns; `distribution: vendored` + non-redistributable license fails;
      `referenced` + empty license fails; embedded entries are exempt.
      `[blueprint-external-skills:External Skill Policy Is Enforced:Unpinned or unlicensed entry is rejected]`
- [ ] 2.4 **GREEN**: `scripts/manifest/lib/external-skill-policy.js`; reuse
      `checkRefResolution`/`checkCommitExists`/`checkPathAtCommit` from
      `manifest-rules.js`; `checkReleaseProvenance` WARNs (third-party) and fails only
      for `vendored` (design D7, open question 1).
- [ ] 2.5 Wire the validator into `scripts/check-integrity.js` / `npm run check:versions`
      (network) and keep `verify.js` structural-only (design open question 2).
- [ ] 2.6 Verify: both new suites + `check:integrity` green. Then ONE `node scripts/verify.js`.
- Rollback: revert the slice commit; the validator is not yet on any install path.

## Slice 3: Consent-gated install + docs

Start: nothing fetches an external skill. End: `--with-external` installs at the
pin and verifies the digest; docs state the two tiers.

- [ ] 3.1 **RED**: `scripts/lib/skills-commands.test.js` — with `--with-external`,
      a referenced skill installs at its pinned commit and a digest mismatch throws
      with nothing written; without the flag, nothing third-party installs (report only).
      `[blueprint-external-skills:Referenced Skill Installs At Its Pin:Digest mismatch writes nothing]`
- [ ] 3.2 **GREEN**: in `scripts/lib/skills-commands.js` add the external-skill path:
      resolve from blueprint frontmatter, reuse `installSkillAtCommit` at `commit`,
      verify `skillTreeDigest(extracted) === sha256` before the atomic swap (D9);
      gate on `args.withExternal`.
- [ ] 3.3 **GREEN**: thread `--with-external` through `skills-manager.js`; regenerate
      the bundle (`node scripts/build-skills-manager-bundle.mjs`); confirm the diff is
      source-only.
- [ ] 3.4 Docs (same unit): state the two guarantee tiers (embedded = curated;
      referenced = bounded) in `docs/innfo/template-package-spec.md` and the
      `list_blueprint_skills` description; add `external skill` / `referenced skill`
      terms to `iNNfo/specs/vocabulary.json` and `docs/innfo/documentation/vocabulary.md`.
      Blueprint guidance MUST NOT claim cogNNitive vouches for a referenced skill.
      `[template-package-structure:Two-Tier Skill Model:Referenced tier is documented as bounded]`
- [ ] 3.5 Verify: `skills-manager.test.js` + `external-skill-policy` green; then ONE
      `node scripts/verify.js`.
- Rollback: revert the slice commit + regenerate the bundle; `--with-external` is
  opt-in, so default behavior is untouched.

## Notes

- No `manifest/source.yaml` change: external skills are referenced, not distributed;
  `assemble-manifest.js` reads `source.skills` only (proven in the embedded-skill change).
- Traceability: slice 1 → `template-procedures-manifest-and-discovery` delta; slice 2
  → `blueprint-external-skills` policy/digest; slice 3 → `blueprint-external-skills`
  install + `template-package-structure` two-tier delta.
