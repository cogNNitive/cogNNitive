# Apply progress: site-domain-dogfooding

Mode: Strict TDD. Delivery: chained PRs, stacked-to-main (integration branch `dev`). Artifact store: openspec.

## Batch 1: Slice 1 (local bluepriNNt resolution proof)

Status: complete. 8/8 Slice 1 tasks done. Slices 2-5 not started.

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
