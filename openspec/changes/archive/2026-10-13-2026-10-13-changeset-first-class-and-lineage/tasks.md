# Tasks: #1A — changeset as a valid L3 document with proposal-time evidence citation

`openspec/config.yaml` is `strict_tdd: true`: each group leads with its failing test, then
the implementation, then the group's verification. Every task names the requirement it
serves as `[capability: Requirement]`. Pre-condition: none (first slice of the chain in
`openspec/changes/2026-10-13-DEPENDENCIES.md`).

Test conventions: `innfo-core` Vitest suites under `iNNfo/packages/innfo-core/tests/`
(changeset suites in `tests/changeset/`); `innfo-mcp` suites in
`iNNfo/packages/innfo-mcp/test/*.test.ts`; console suites `test/console-*.test.mjs`.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | ~500–700 (code + tests), plus regenerated mirrors and fixtures |
| 400-line budget risk | Medium (mirrors and fixtures are mechanical) |
| Chained PRs recommended | No — one PR; #1B and #1C are the chained follow-ups |
| Decision needed before apply | No |

## 1. Document model: L3 frontmatter, strict parse, `sources`, annotations

- [ ] 1.1 TEST (`tests/changeset/parser.test.ts`): a file without frontmatter, with a scalar
      `parent_spec`, without `level`, or without `parent_spec.url` throws
      `CHANGESET_FRONTMATTER_INVALID` naming the key; an L3 file without `proposal_sha`
      parses. [changeset-document-model: Normative Level-2 `changes` BluepriNNt and Naming Contract]
- [ ] 1.2 TEST (`tests/changeset/parser.test.ts`): `sources::` and `replaced_sources::`
      round-trip through parse and structural serialize. [changeset-document-model: Change
      evidence citation field] [changeset-document-model: Changeset Serialization and
      Resolution Annotation]
- [ ] 1.3 TEST (`tests/changeset/hasher.test.ts`): two changes differing only in `sources`
      hash differently; adding `replaced_sources::` or `status::` keeps `verifyProposalSha`
      true; the sealed key list equals the spec list (`base_hash` included).
      [changeset-document-model: Cryptographic Proposal Sealing (`proposal_sha`)]
- [ ] 1.4 `types.ts`: `ChangesetFrontmatter.level: 3`, `parent_spec: { name: 'changes'; url:
      string }`; `ChangeItem.sources?`, `ChangeItem.replaced_sources?`. `parser.ts`: delete
      the default frontmatter, validate the required keys, read `sources` and
      `replaced_sources`. `hasher.ts`: add `sources` to `PROPOSAL_KEYS`.
      [changeset-document-model: Normative Level-2 `changes` BluepriNNt and Naming Contract]
      [changeset-document-model: Change evidence citation field]
      [changeset-document-model: Cryptographic Proposal Sealing (`proposal_sha`)]
- [ ] 1.5 TEST (`tests/changeset/serializer.test.ts`): for fixtures with CRLF, quoted
      values, trailing whitespace and an unknown line, serializing a parsed document after
      setting `status: applied` and per-change annotations differs from the input only in
      the frontmatter execution keys and the annotation lines. [changeset-document-model:
      Changeset Serialization and Resolution Annotation]
- [ ] 1.6 `serializer.ts`: raw-text-preserving path from `rawContent` (design D4); the
      structural path writes `sources::` and `replaced_sources::`.
      [changeset-document-model: Changeset Serialization and Resolution Annotation]

## 2. The `changes` bluepriNNt

- [ ] 2.1 TEST (`tests/changeset/template.test.ts`): a document created from the `changes`
      Level-3 template validates with no `fm-level` / `fm-parent` error; the `Change`
      concept declares `sources` of type `citation`. [changeset-document-model: Normative
      Level-2 `changes` BluepriNNt and Naming Contract] [changeset-document-model: Change
      evidence citation field]
- [ ] 2.2 `iNNfo/specs/bluepriNNts/changes/spec_NN.md`: L3 template frontmatter, `sources`
      Change field, `template_version` bump; mirror into `canonical-registry.ts`; regenerate
      the catalog; `node scripts/verify.js` drift green. [changeset-document-model:
      Normative Level-2 `changes` BluepriNNt and Naming Contract]

## 3. Writers and apply intake

- [ ] 3.1 TEST (`test/apply-change.test.ts`): an unsealed L3 changeset is sealed at intake
      and the written-back file validates as L3; `synthesizeAndExecuteChangeset` writes an
      L3 file. [changeset-document-model: Normative Level-2 `changes` BluepriNNt and Naming
      Contract]
- [ ] 3.2 `apply-change.ts`: `synthesizeAndExecuteChangeset` builds the design D1
      frontmatter. [changeset-document-model: Normative Level-2 `changes` BluepriNNt and
      Naming Contract]
- [ ] 3.3 TEST (`test/apply-change-rejections.test.ts`): a change whose `sources::` targets a
      missing file or heading rejects the changeset with `CITATION_UNRESOLVED` naming the
      change id, nothing written, lock released; a resolving citation applies and the
      change's `sources::` line is byte-identical after write-back.
      [changeset-apply-engine: Proposal-time evidence citation]
- [ ] 3.4 `apply-change.ts`: intake citation resolution with `createFsSourceResolver`.
      [changeset-apply-engine: Proposal-time evidence citation]

## 4. Lineage role

- [ ] 4.1 TEST (`tests/naming/roles.test.ts`, `tests/lineage/record.test.ts`): an L3
      changeset has role `changeset`; a field citing `changes/<f>@## NN Change: c-01`
      resolves and the lineage record lists the changeset as a node.
      [lineage-single-edge: Node role derives from the naming contract]
- [ ] 4.2 `lineage/record.ts` (and any role filter that drops `changeset`) projects
      changesets as lineage nodes. [lineage-single-edge: Node role derives from the naming
      contract]

## 5. Console export

- [ ] 5.1 TEST (`test/console-review.test.mjs`): an exported changeset parses with the
      strict parser, validates as L3, and every element target uses the element slug.
      [innfo-console-runtime: Exported changesets are resolvable by apply_change]
- [ ] 5.2 `innfo-runtime.js`: `serializeChangesetMarkdown` emits the design D1 frontmatter;
      `draftToChange` uses `d.element_slug` only; rebuild the console bundle.
      [innfo-console-runtime: Exported changesets are resolvable by apply_change]

## 6. Fixtures and agent protocol

- [ ] 6.1 Re-author every tracked changeset fixture (`test/fixtures/testlab/changes/*.md`,
      `iNNfo/packages/*/test*/**/changes/*.md`) with the L3 frontmatter. TEST: a repo-wide
      suite parses every tracked `*_changes_NN.md` with the strict parser.
      [changeset-document-model: Normative Level-2 `changes` BluepriNNt and Naming Contract]
- [ ] 6.2 `skills/nn-innfo/SKILL.md`: a change derived from evidence MUST carry `sources::`
      (grammar and example); apply never adds it. [changeset-document-model: Change
      evidence citation field]

## 7. Verification

- [ ] 7.1 `npm run typecheck` + `npm run typecheck:scripts`; `npm test` for `innfo-core`
      and `innfo-mcp`; `node scripts/verify.js` (mirrors, drift, catalog, node suites).
      [all requirements]
