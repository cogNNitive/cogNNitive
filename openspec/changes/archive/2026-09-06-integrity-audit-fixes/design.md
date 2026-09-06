# Design: Integrity Audit Fixes (2026-09-06)

## B1 — Single-file MCP bundle + guard

### Decision
Force the `bin/` tsup output to a single file rather than teaching the CDN
publish path to carry chunks.

### Why
- `scripts/build-docs.mjs` and the `deploy:cdn` npm one-liner both copy exactly
  one file. Chunk names are per-build content hashes, so "copy the chunks too"
  needs a glob + keeps drifting.
- The `dist/` config (used by `npm start`) can stay split — only the
  distributed `bin/` bundle must be standalone. It already sets
  `noExternal: [/.*/]`, `minify: true`, and a `createRequire` banner; it is
  meant to be one file.

### Change
`iNNfo/packages/innfo-mcp/tsup.config.ts`, the second config object (`outDir: 'bin'`):
add `splitting: false`.

Rebuild (`npm --prefix iNNfo/packages/innfo-mcp run build`), then `git rm` the
now-unreferenced `bin/chunk-*.js` and `bin/spec-*.js` and commit the rebuilt
single `bin/innfo-mcp.bundle.js`.

### Guard
`scripts/build-docs.mjs`, immediately after `fs.copyFileSync(srcBundle, targetBundle)`:
read the staged bundle, and if it matches `/from\s*['"]\.\/(chunk|spec)-[^'"]+['"]/`
`console.error` a message naming the offending import and `process.exit(1)`.
This makes `npm run build:docs` (and therefore the `verify` and `deploy-pages`
CI jobs) fail loudly if the bundle is ever code-split again.

## B2 — Regenerate manifests + stale guard

### Decision
Regenerate both channel docs now; guard only the **stable** channel in
`verify.js`.

### Why
`generate-manifest.js` is a pure function of its inputs (no timestamp) and
already exposes `--check` (exit 1 + diff on drift). The **preview** doc
(`manifest-next.md`) pins `main`'s HEAD SHA, so it legitimately drifts on every
subsequent commit — guarding it would make `verify` fail on the next unrelated
push. The **stable** doc only changes when a release tag or `source.yaml`
changes, so `--check` on it is a true staleness signal.

### Change
- Run `node scripts/manifest/generate-manifest.js --channel stable` and
  `--channel preview`; commit `docs/use/manifest.md` + `docs/use/manifest-next.md`.
- `scripts/verify.js`, after "Validate Stable Manifest":
  `run('node scripts/manifest/generate-manifest.js --channel stable --check',
   'Check Stable Manifest Doc Fresh')`.
  `verify.js` already resolves `GITHUB_TOKEN` via `gh auth token` and already
  runs `validate-manifest.js --channel stable`, so no new network/precondition.

## C2 — Taxonomy cycle guard

`iNNfo/packages/innfo-core/src/parser/taxonomy.ts`, `printTaxonomyNode`:
add an optional 5th param `ancestors: ReadonlySet<string> = new Set()`.

```
if (name !== '') {
  if (ancestors.has(name)) return          // node is its own ancestor -> cycle
  lines.push(`${'  '.repeat(depth)}* [[${name}]]`)
}
const next = name === '' ? ancestors : new Set([...ancestors, name])
for (const child of allEdges.filter((e) => e.parent === name)) {
  printTaxonomyNode(child.child, allEdges, lines, depth + 1, next)
}
```

Per-branch (not global) tracking: a diamond child under two parents is still
printed twice — behaviour unchanged. Only a true ancestor cycle is cut. The two
call sites in `serializer.ts` pass 4 args; the new param defaults, so they are
untouched.

## C5 — Remove duplicate `parent:` emit

`iNNfo/packages/innfo-core/src/parser/serializer.ts`: delete the unconditional
block

```
if ((fm as any).parent !== undefined) {
  const val = (fm as any).parent
  lines.push(yamlStringify({ parent: val }).trim())
}
```

near the end of the frontmatter section. The earlier
`else if ((fm as any).parent !== undefined)` branch (paired with `parent_spec`)
already emits `parent`, as a quoted string or via `yamlStringify` for objects.
Net effect: `parent_spec` and `parent` are now mutually exclusive in output
(`parent_spec` wins), and `parent` is emitted at most once.

## M12 — Signal exit code

`scripts/generate-docsify-sidebar.mjs:19`:
`process.exit(result.status !== null ? result.status : 1)` — identical to the
handling already in `scripts/skills-manager.js`.

## Tests (TDD, strict mode)

New file `iNNfo/packages/innfo-core/tests/taxonomy-serialize-guards.test.ts`:

1. `printTaxonomyNode` with `A→B→A` — does not throw, emits `['* [[A]]', '  * [[B]]']`.
2. `printTaxonomyNode` diamond `A→B, A→C, B→D, C→D` — `[[D]]` printed twice (diamond preserved).
3. `serializeModel` with a cyclic taxonomy — `.not.toThrow()`.
4. `serializeModel` with `frontmatter.parent` set — exactly one `/^parent:/m` line.

Write all four first (2 fail on recursion/RangeError, 1 fails with two `parent:`
lines), then apply the fixes, then the full `innfo-core` suite must stay green.

`build-docs.mjs` guard and the `verify.js` step are covered by running
`npm run build:docs` and `node scripts/verify.js` in the change's verification.
