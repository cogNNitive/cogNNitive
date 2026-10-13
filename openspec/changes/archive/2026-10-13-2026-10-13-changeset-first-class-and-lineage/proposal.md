# Proposal: #1A — changeset as a valid L3 document with proposal-time evidence citation

## Intent

The changeset pipeline proof of concept works (S1, S2a, S2b are archived), but a design
audit of the domain console found coherence gaps. The original consolidated change was
too large for one apply run and contradicted itself (it asked apply to emit `sources::`
while also requiring the proposal to stay immutable). It is now split into three ordered
slices (see `openspec/changes/2026-10-13-DEPENDENCIES.md`):

- **#1A (this change)** — the changeset is a valid iNNfo Level-3 document and a change
  can cite its evidence, written by the proposer and sealed with the proposal.
- **#1B** `2026-10-13-changeset-immutability-and-snapshot-removal` — apply never rewrites
  the proposal; the dead `kNNowledge/archive/` snapshot goes.
- **#1C** `2026-10-13-console-changes-view-and-slug-ids` — console element ids are slugs,
  the Changes view, the Lineage tab and the draft-store decisions.

Gaps closed here:

1. **A changeset is not a valid L3 document.** `validate_knowledge` on an applied
   changeset returns `valid: false` (`Missing level field`, `Parent_spec missing name`).
   The `changes` bluepriNNt template (`iNNfo/specs/bluepriNNts/changes/spec_NN.md`) has a
   scalar `parent_spec` and no `level`; `ChangesetFrontmatter.parent_spec` is typed
   `'changes' | string`; and `parseChangeset` silently substitutes a default frontmatter
   (`blueprint_version: '0.1.0'`) when a file has none.
2. **A change cannot cite its evidence.** The parser ignores a `sources::` line
   (`parser.ts` default branch), `ChangeItem` has no `sources`, the serializer drops it
   and `PROPOSAL_KEYS` (`hasher.ts:8-21`) does not seal it. So `field → change → source`
   cannot close.
3. **The serializer is structural.** `serializeChangeset` rebuilds the whole file from the
   parsed object, so any byte the parser ignored is lost on write-back. #1B needs a
   raw-text-preserving write path to make immutability enforceable.

## Scope

### In Scope
- L3 frontmatter for changesets (`level: 3`, `parent_spec: { name, url }`), emitted by
  the `changes` template, every writer (apply intake sealing, `synthesizeAndExecuteChangeset`,
  the console export) and required by the parser (no default frontmatter).
- `Change.sources`: a `citation` field written by the proposer at proposal time, parsed,
  typed, serialized and sealed; apply only verifies that each citation resolves.
- A `replaced_sources` execution annotation key defined by the document model (written by
  #1B), excluded from the seal like `status` / `resolution` / `resolved_slug`.
- Raw-text-preserving `serializeChangeset`: normative lines are never re-rendered.
- The `changeset` role is a lineage node and a citation target.
- The console changeset export emits the L3 frontmatter and slug targets.
- The agent protocol in `skills/nn-innfo/SKILL.md`: evidence-backed changes carry `sources::`.

### Out of Scope
- Proposal immutability enforcement, snapshot removal, replaced-citation recording (#1B).
- Console element ids, Changes view, Lineage tab, draft store, vocabulary (#1C).
- `changeset_id` and a `type: changeset` frontmatter key: dropped (see design D1).
- Any migration of existing changesets: repo fixtures are re-authored; user domains are
  migrated only by creating a new domain (S6 recipe). No tolerant read of old changesets.

## Capabilities

### Modified Capabilities
- `changeset-document-model`: L3 frontmatter and strict parse; `sources` sealed; raw-text
  preserving serialization and the `replaced_sources` annotation key; new requirement for
  the Change evidence citation field.
- `changeset-apply-engine`: new requirement for proposal-time evidence citation.
- `lineage-single-edge`: the `changeset` role is a lineage node.
- `innfo-console-runtime`: exported changesets carry the L3 frontmatter and slug targets.

## Approach

- Document model first (types, parser, serializer, hasher), test-first, then the
  bluepriNNt + `canonical-registry.ts` mirror, then the writers, then apply's citation
  check. The parser becomes strict in the same slice as every writer emits L3, so nothing
  in the repo writes a changeset the parser rejects.
- `sources` joins `PROPOSAL_KEYS`; apply resolves each change's citations at intake with
  the workspace `createFsSourceResolver` and rejects the whole changeset
  (`CITATION_UNRESOLVED`, nothing written) when one does not resolve. Apply never writes
  or alters `sources::` on a change.

## Dependencies

- First slice of the chain #1A → #1B → #1C → S2c → S3 / S6 (see the dependency file).
- #1A and S6 both MODIFY `changeset-document-model` / `Cryptographic Proposal Sealing
  (proposal_sha)`. #1A lands first; S6's delta is written against the post-#1A text and
  lists a superset of the keys (#1A keys + the `add_model` keys).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/changeset/{types,parser,serializer,hasher}.ts` | Modified | L3 frontmatter type, strict parse, `sources`, `replaced_sources`, raw-text-preserving serializer, sealed keys |
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | Modified | L3 template, `Change.sources` field, `template_version` bump |
| `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts` | Modified | embedded `changes` content mirrors the spec |
| `iNNfo/packages/innfo-core/src/naming/contract.ts`, `src/lineage/record.ts` | Modified | `changeset` role is a lineage node |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modified | intake citation check; L3 frontmatter in `synthesizeAndExecuteChangeset` |
| `iNNfo/specs/bluepriNNts/console/innfo-runtime.js` | Modified | `serializeChangesetMarkdown` L3 frontmatter; `draftToChange` slug-only target |
| `test/fixtures/testlab/changes/*.md` and other changeset fixtures | Modified | re-authored as L3 |
| `skills/nn-innfo/SKILL.md` | Modified | evidence citation rule for agents |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Strict parse rejects a fixture or a writer still emitting the scalar `parent_spec` | High | Writers and fixtures change in the same slice; a repo-wide test parses every `changes/*_changes_NN.md` |
| Raw-text-preserving serializer corrupts a block | Med | Byte-equality tests on fixtures with CRLF, quoted values and trailing whitespace |
| Embedded canonical schema drifts | Med | `verify.js` drift check |
| A `sources::` citation into a missing file blocks an apply | Low | Intended: the agent fixes the citation; the error names the change id and citation |

## Rollback Plan

Revert the slice commit. Repo fixtures revert with it. No user data migrates.

## Success Criteria

- [ ] `validate_knowledge` on a changeset written by any writer returns `valid: true`.
- [ ] `parseChangeset` rejects a file without the L3 frontmatter, naming the missing key.
- [ ] `sources::` round-trips through parse/serialize and changes `proposal_sha`.
- [ ] An unresolvable `sources::` rejects the changeset with `CITATION_UNRESOLVED` and writes nothing.
- [ ] `serializeChangeset` leaves every normative line byte-identical.
- [ ] A `changes/...@## NN Change: <id>` citation resolves with role `changeset`.
- [ ] `node scripts/verify.js` and the affected package tests are green.
