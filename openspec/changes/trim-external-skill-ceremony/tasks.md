# Tasks: Trim referenced-external-skill ceremony

## 1. Enforcement (scripts)

- [x] 1.1 Drop the `sha256` checks (malformed error + missing warning) from `scripts/manifest/lib/external-skill-policy.js`
- [x] 1.2 Drop the `REDISTRIBUTABLE` allowlist and the `distribution: vendored` check
- [x] 1.3 Keep `name`/`repo`/`path`/`commit`/`license` presence + commit shape; trim exports
- [x] 1.4 Align `scripts/manifest/lib/external-skill-policy.test.js`
- [x] 1.5 `node scripts/manifest/lib/external-skill-policy.test.js` green

## 2. Contracts (OpenSpec deltas)

- [x] 2.1 Delta `blueprint-external-skills`: entry contract, policy, discovery; remove the integrity-digest requirement
- [x] 2.2 Delta `template-package-structure`: reference clause pins a `commit`, declares a `license`
- [x] 2.3 Delta `template-procedures-manifest-and-discovery`: entry/discovery field set

## 3. Docs

- [x] 3.1 `docs/innfo/template-package-spec.md` example + guarantee tiers
- [x] 3.2 `iNNfo/specs/vocabulary.json` sense + stable identifiers; regenerate `docs/documentation/content/vocabulary.md`
- [x] 3.3 `skills/nn-skills-lifecycle/SKILL.md`, its doc page, and `docs/documentation/content/skills/README.md`

## 4. Verification

- [x] 4.1 `node scripts/verify.js --only=external-skills` green
- [ ] 4.2 `npm run verify:fast` / `node scripts/verify.js` (needs installed workspace deps)
- [ ] 4.3 `openspec validate trim-external-skill-ceremony --strict`

## 5. Deferred (own work unit, needs a build env)

- [ ] 5.1 Prune tolerant `ref`/`sha256`/`distribution` from `nn-core` `parser.ts` + `parser/yaml.ts`
- [ ] 5.2 Prune the passthrough in `nn-mcp` `src/tools/spec.ts`; update the Vitest specs
- [ ] 5.3 Run `npm --workspace=@cognnitive/nn-core test` and the nn-mcp suite
