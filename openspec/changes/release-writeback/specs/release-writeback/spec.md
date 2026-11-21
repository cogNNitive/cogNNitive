# Delta for release-writeback

Every change regenerates the same bundles, fixtures, catalogs and version metadata, and those
files collide by construction: measured over the 19-20 Nov batch, 21 of 30 PRs carried at least
one generated artifact and the eight most shared paths were all generated or metadata. Keeping
them in the branch is also what forces an authored version bump per PR, so the three
`package.json` files travelled in 14, 14 and 13 branches. The fix is a write-back lane on
`main`: a change carries source only, the generated artifacts and the derived version are
committed after the merge and before any tag is planned, and that bookkeeping commit is
invisible to the release planner. The lane has two failure modes that this delta forbids by
requirement: a bookkeeping commit that counts as a change of the key it just released (which
never terminates), and a release cut from a tree whose artifacts were regenerated after the tag
(which ships stale bytes).

## ADDED Requirements

### Requirement: A change carries source, not generated artifacts

The derived-artifact gate MUST accept a path that moves because the change's source moves it when that path is a shared artifact, and MUST fail when a moved path is not a shared artifact.
A shared artifact MUST be identified by the single list in `scripts/lib/shared-artifacts.js`, so the gate and the collision report cannot disagree about what is generated.
A change branch MUST NOT be required to commit a regenerated artifact for its gate to pass.
The gate MUST still run the generators, so a generator that crashes or writes outside its declared surface fails the change.

#### Scenario: A source change that moves a bundle

- GIVEN a change that edits `iNNfo/packages/nn-core/src/sourceRef.ts`
- WHEN the derived-artifact gate runs on its branch
- THEN the gate reports the moved mirrors and bundle as regenerated on `main` and passes
- AND the branch does not contain those files

#### Scenario: A generator that writes outside its surface

- GIVEN a change whose regeneration pass moves a path under `iNNfo/packages/nn-mcp/src/`
- WHEN the derived-artifact gate runs on its branch
- THEN the gate fails and names that path as one the generator is not allowed to own

### Requirement: Bookkeeping lands before the tag and never plans a release

After a push to `main`, the regeneration and version write-back MUST be committed and pushed before `auto-tag` plans any release, because the release copies the tree of the tag it cuts.
A commit produced by that lane MUST be identified by a fixed commit message, and a run that finds that message as the last commit MUST do nothing.
The release planner MUST ignore the generated files that are derived from the release tags themselves, so a bookkeeping commit cannot plan the release that produced it.
A key's planned version MUST NOT change as a result of a bookkeeping commit; planning the same tree twice MUST return the same plan.

#### Scenario: A merge that moves a bundle

- GIVEN a merge to `main` whose tree would regenerate a different bundle
- WHEN the push run finishes regenerating and planning
- THEN the regeneration commit is on `main` before any tag exists
- AND the tag points at a tree that contains the regenerated bundle

#### Scenario: The bookkeeping commit is planned against itself

- GIVEN a push to `main` whose last commit is the regeneration commit
- WHEN the release planner runs
- THEN the plan is empty and no tag is pushed

### Requirement: A package key's version is derived and written back before its tag

The version of `nn-mcp` and `nn-console` MUST be derived from the commits that touched their release paths since their last tag: a breaking change is major, any `feat` is minor, anything else is patch.
That version MUST be written into the key's `package.json` and propagated by `sync:versions` in the bookkeeping commit, before the tag exists, so `version-agreement` still holds at publish time.
A change MUST NOT be required to move a release version for its own gate to pass.
The tag shape (`<key>-v<major>.<minor>.<patch>`) MUST NOT change, because consumers resolve it.

#### Scenario: A feature lands on nn-mcp

- GIVEN `nn-mcp-v0.49.4` is the highest tag and a merge contains one `feat(nn-mcp):` commit
- WHEN the push run plans and publishes
- THEN the bookkeeping commit sets `iNNfo/packages/nn-mcp/package.json` to `0.50.0`
- AND the tag `nn-mcp-v0.50.0` points at that commit

#### Scenario: A change that only touches docs

- GIVEN a merge that touches only `docs/`
- WHEN the push run plans
- THEN no key is planned and `package.json` is not rewritten
