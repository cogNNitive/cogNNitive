# Apply progress: site-domain-dogfooding

Mode: Strict TDD. Delivery: chained PRs, stacked-to-main (integration branch `dev`). Artifact store: openspec.

## Batch 1: Slice 1 (local bluepriNNt resolution proof)

Status: complete. 8/8 Slice 1 tasks done.

### Gate result (task 1.7): PASSED

A domaiNN-local bluepriNNt (`blueprints_dir::` plus a relative `parent_spec.url` of
`specs/bluepriNNts/site/spec_NN.md`) validates through MCP `validateKnowledge` (which wraps nn-core)
with `rootDir = site_NN/`. Fallback B is NOT needed. Negative control: pointing the url at a missing
spec yields `PARENT_RESOLUTION_FAILED`.

Resolution detail: the local url is resolved by `toLocalFilePath(url, rootDir)` in
`iNNfo/packages/nn-mcp/src/tools/resolver-node.ts:93-123` and read at tier 0 (`:558-573`).
`rootDir` is the domaiNN directory, so the url is relative to `site_NN/`, not to the repository root
(the spec wording "workspace root" holds when the workspace is the domaiNN).

### TDD cycle evidence

| Task | Test file | Layer | RED | GREEN | Triangulate | Refactor |
|------|-----------|-------|-----|-------|-------------|----------|
| 1.1 | site-domain.spec.ts | Integration | 8/8 failed with ENOENT on `site_NN/...` (right reason) | n/a | n/a | n/a |
| 1.2-1.5 | same | Integration | covered by 1.1 | fixtures created; resolution tests green | Site + Page + broken-url negative control | none needed |
| 1.6 | same | Integration | summary / singleton / sources rejection tests failed (valid was true) | see finding 1 | kind rejected for real | tests reshaped to characterization |
| 1.8 | `node scripts/verify.js --fast` | Repo guards | n/a | all pre-checks passed | n/a | n/a |

Final: `npx vitest run src/tools/site-domain.spec.ts` (cwd `iNNfo/packages/nn-mcp`): 1 file, 9 tests passed.

### Findings (spec/design corrections needed before later slices)

1. nn-core has NO required-field mechanism, NO singleton enforcement and no inline check of the
   `sources::` grammar. The BP scenarios "missing summary rejected", "second Site rejected" and
   "sources:: see the README rejected" are not satisfiable by `validateKnowledge`. Only the
   `kind` select is enforced (`kind: blog` rejected). Slice 1 tests record the current behavior as
   characterization tests, and `loadSite` (Slice 3a) must own these rules. The spec wording
   ("validation fails") should be reconciled to "site model check fails".
2. Platform parents (iNNfo_V_0-5-0, defiNNition_V_0-1-0) try the network first and fall back to the
   embedded canonical registry. "No network" therefore means the local `site` spec is never fetched
   and validation still succeeds with `fetch` failing; the test asserts exactly that.
3. Validation warnings remain on the docs: missing `[!NOTE]` notice, and
   `PARENT_CONCEPT_GUIDANCE_INCOMPLETE` for the blueprint. They are warnings, not errors.
4. The Site singleton uses Concept `type:: category` (convention only, not enforced).
5. `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js` shows as modified in the worktree (leftover build
   artifact, revert blocked by a hook). It is never staged: explicit `git add <paths>` only.

### Files

Created: `site_NN/domaiNN_NN.md`, `site_NN/specs/bluepriNNts/site/spec_NN.md`,
`site_NN/specs/bluepriNNts/site/procedures/usage_procedures_NN.md`, `site_NN/kNNowledge/site_NN.md`,
`site_NN/kNNowledge/pitch_site_NN.md`, `iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts`.
Modified: `openspec/changes/site-domain-dogfooding/tasks.md` (ticks, chain strategy).

## Batch 2: Slice 2 (seed Pages)

Status: complete. 4/4 Slice 2 tasks done (12/12 cumulative). Slices 3a-5 not started.

### TDD cycle evidence

| Task | Test file | Layer | RED | GREEN | Triangulate | Refactor |
|------|-----------|-------|-----|-------|-------------|----------|
| 2.1 | site-domain.spec.ts | Integration | 17 of 29 failed with ENOENT on the five missing `<kind>_site_NN.md` files and the procedure (right reason) | n/a | n/a | n/a |
| 2.2 | same | Integration | covered by 2.1 | validate, one-Page-per-kind, unique slug and body-rule tests green | six kinds x (validate, shape, body rules) + site-wide unique slugs with one `index` | bullets replaced (finding 1) |
| 2.3 | same | Integration | covered by 2.1 | procedure validates and names `scripts/site/compile-site.mjs` | extra `validateDoc` assertion on the procedure caught a dangling `tool::` (finding 2) | Tools element added |
| 2.4 | `node scripts/verify.js --fast` | Repo guards | n/a | all pre-checks passed | n/a | n/a |

Final: `npx vitest run src/tools/site-domain.spec.ts` (cwd `iNNfo/packages/nn-mcp`): 1 file, 29 tests passed.
`node scripts/verify.js --fast` (worktree root): all deterministic pre-checks passed.

### Findings (affect Slice 3a)

1. nn-core rejects `- ` / `* ` bullets inside a `# NN <Concept>` section body
   (`format.body-element-markers`, an error: "bullet(s) look like elements but must use ## NN
   headings"). Page bodies therefore cannot use unordered lists. Seeds use numbered lists
   (`1. `) and paragraphs. The markdown subset (task 3.5) must not promise `-` lists for
   Page bodies; ordered lists are the supported flat list. The spec wording "flat lists" should
   be read as ordered.
2. `tool::` on a procedure Work element must equal an element name (dangling-reference check), not a
   free path. The procedure keeps `tool:: scripts/site/compile-site.mjs` as required, backed by a
   `# NN Tools` element with that exact name.
3. Seed content: tutorial `first-domain`, guide `validate-domain`, concept `levels`, reference
   `reference`, legal `legal`, existing pitch `index`. Facts come from `docs/use/index.html`
   (install line), `docs/innfo/documentation/{domain-from-scratch,nn-mcp,vocabulary}.md`; the legal
   Page links to the existing `legal.html` and `privacy.html` and copies no personal data. The
   reference Page cites no Sources (Slice 4).

### Files

Created: `site_NN/kNNowledge/{tutorial,guide,concept,reference,legal}_site_NN.md`,
`site_NN/specs/bluepriNNts/site/procedures/compile_site_procedures_NN.md`.
Modified: `iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts`, `tasks.md` (2.1-2.4 ticked).
Protected paths untouched.

### Review follow-up (Slice 2)

Design, tasks 3.5 and the site-compiler spec now say lists are `1. ` only and the renderer rejects `- `/`* ` lines (also inside fences) with its own `file:line` error. Tutorial names the `business` bluepriNNt and links `[[Validate your domaiNN]]`; reference summary says "main folders". Spec kinds are read from the bluepriNNt `kind` select and the set of `*_site_NN.md` Page files must equal them (this guard was green on first run: the content already satisfied it; the tutorial and reference tests were RED first). Result: 32 tests pass; `node scripts/verify.js --fast` passes.
