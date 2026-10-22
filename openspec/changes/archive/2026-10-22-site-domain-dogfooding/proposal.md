# Proposal: Site domaiNN dogfooding

Source: `openspec/changes/site-domain-dogfooding/exploration.md` (authoritative current state).

## Intent

Rebuild the public website and end-user docs as **one minimal site compiled from one domaiNN**.

- Primary reader: an end user who installs the skills + MCP and creates a domaiNN.
- Today the site is split across hand-written HTML, two Docsify suites (`documentation` bluepriNNt), and code facts that drift silently.
- The product claims "knowledge as cited, versioned models". The site should prove it: content is kNNowledge, reference facts are cited Sources, and stale citations are flagged by our own impact checker.

## Scope

### In Scope
- `site_NN/` root-level domaiNN with a domaiNN-local `site` bluepriNNt (`Site` singleton, `Page`) and its procedures.
- `compile-site` procedure document + a named Node tool script that reads ONLY the domaiNN and writes static HTML, `sitemap.xml`, `llms.txt` to `docs/next/` (committed).
- Code-fact import script: writes one markdown snapshot per fact group (`mcp-tools`, `skill-commands`) as a new write-once family member + sidecar via `importRaw`/`writeOnce`, reusing `scripts/lib/docs-facts.mjs` extractors.
- Staleness check built on `checkScanImpact`: flags Pages citing a superseded family member; non-zero exit on `unresolved_in_latest`.
- Seed content: at least one Page per `kind`, and at least one reference Page citing a snapshot header unit.

### Out of Scope
- Migrating existing `docs/` content; cutover or replacing legacy pages.
- Retiring the `documentation` bluepriNNt or the Docsify suites.
- Shipping `site` under `iNNfo/specs/bluepriNNts/` (catalog, `manifest/source.yaml`, `blueprints-v*` tag).
- Edits to `build-docs.mjs`, CI publish, `publish-web*`, release tooling, role (c) files.
- Markdown twins, analytics, contact forms, external SSG/framework, markdown dependency.

## Capabilities

### New Capabilities
- `site-blueprint`: domaiNN-local `site` bluepriNNt — `Site`/`Page` model, `kind` set, `sources` reserved for citations, naming (`<x>_site_NN.md`).
- `site-compiler`: `compile-site` procedure + tool script; domaiNN-only input, deterministic static output, fail-closed markdown subset, `sitemap.xml`/`llms.txt`.
- `site-code-facts`: write-once code-fact snapshots with sidecars, header-unit citations, family-evolution staleness check.

### Modified Capabilities
- None. (`docs-derived-facts` extractors are reused, not changed; `public-web-distribution` already publishes any committed `docs/<dir>/`.)

## Approach

Approach A from the exploration. Slices, in order:

1. **Prove local bluepriNNt resolution** (`blueprints_dir::` + local `parent_spec.url`) in nn-core and MCP validation. If disproven, stop and switch to fallback B.
2. `site` bluepriNNt + seed kNNowledge (one document per `kind`).
3. `compile-site` script + shell + one CSS file → `docs/next/`.
4. Code-fact import + citing reference Page + staleness check.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `site_NN/domaiNN_NN.md`, `site_NN/kNNowledge/` | New | domaiNN root + Pages |
| `site_NN/specs/bluepriNNts/site/` | New | `spec_NN.md`, `procedures/compile_site_procedures_NN.md`, `usage_procedures_NN.md` |
| `site_NN/sources/import/code-facts/` | New | Snapshots + sidecars |
| `site_NN/compile-site.mjs`, shell, CSS, check + import scripts | New | Tooling |
| `docs/next/` | New | Generated, committed HTML |
| `scripts/lib/docs-facts.mjs`, `skills/nn-sources` (`checkScanImpact`) | Reused | No changes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Local bluepriNNt resolution rejected by validators | Med | Slice 1 verifies first; fallback B |
| Snapshot overwritten in place → staleness signal lost | Med | Import always writes a new family member |
| Prose mangled by `key:: value` lines or duplicate element names | Med | One document per `kind`; compiler fails on ambiguity |
| `site_NN/` tests not auto-discovered by `verify.js` | High | Design decides placement under `scripts/`/`test/` or explicit wiring |
| Non-deterministic output breaks freshness checks | Med | No timestamps; stable ordering |
| UTF-8 / U+FFFD on Windows | Low | Explicit `utf8` writes; text-encoding guard |
| Two doc systems coexist until cutover | High | Accepted; cutover is a later change |

## Rollback Plan

Purely additive. Delete `site_NN/` and `docs/next/`; no shared file, pipeline, catalog, or release ref changes. Already-published `docs/next/` disappears on the next Pages deploy.

## Assumptions (orchestrator decisions, user may override)

1. Approach A; output `docs/next/`; fallback B only if slice 1 fails.
2. Model: `Site` + `Page` (`kind: tutorial | guide | concept | reference | pitch | legal`, `slug`, `order`, `summary`, `sources`, prose body). No Section/Navigation; nav derives from `kind` order + `order`.
3. Snapshot granularity per fact group; one heading per tool/skill, cited as `@## <name>`.
4. Import via direct `importRaw`/`writeOnce` script, not watch roots.
5. Parser (nn-core mirror vs. small hand parser) deferred to design.
6. Emit `sitemap.xml` + `llms.txt`; no markdown twins.
7. No backwards-compat shims.

## Proposal question round (not asked — automatic mode)

- Is `docs/next/` acceptable as a publicly reachable trial URL before cutover?
- Should staleness block `compile-site` or only warn?
- Is a Page-count threshold (e.g. 10) the right promotion trigger to ship `site` in `iNNfo/specs`?

## Success Criteria

- [ ] Slice 1 proves a domaiNN-local bluepriNNt validates in nn-core and MCP (or fallback B is recorded).
- [ ] `compile-site` reads only `site_NN/` and regenerates `docs/next/` byte-identically on rerun.
- [ ] Every `kind` has at least one rendered Page; `sitemap.xml` and `llms.txt` list them.
- [ ] A reference Page cites a snapshot header unit; `validateCitations` passes.
- [ ] Importing a changed fact group creates a new family member and the check flags the citing Page.
- [ ] No diff in `build-docs.mjs`, CI, `manifest/source.yaml`, `catalog.json`, release tooling, or role (c) files.
- [ ] `node scripts/verify.js --fast` green; no new dependency.
