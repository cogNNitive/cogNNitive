# Design: #1A — changeset as a valid L3 document with proposal-time evidence citation

## Context (verified against code, 2026-10-13)

- `ChangesetFrontmatter` (`innfo-core/src/changeset/types.ts:52-66`) types `parent_spec` as
  `'changes' | string` and has no `level`. `parseChangeset` (`parser.ts:48-74`) starts from a
  default frontmatter (`parent_spec: 'changes'`, `blueprint_version: '0.1.0'`) and spreads
  the parsed YAML over it, so a file without frontmatter parses as a valid proposal.
- `roleOf` (`naming/contract.ts:125-150`) derives `changeset` from the `parent_spec` NAME
  (`NON_KNOWLEDGE_BLUEPRINT_RE`), and callers pass `frontmatter.parent_spec.name`
  (`contract.ts:235,248`, `lineage/record.ts:152`). A scalar `parent_spec: "changes"` has no
  `.name`, so today those callers do not classify a changeset as `changeset` at all.
- The L3 validator (`validator/content.ts:127,169`) requires `level` and `parent_spec.name`;
  it does not require a `type` key.
- The parser's `switch` ignores unknown keys (`parser.ts:158`), so `sources::` is dropped;
  `PROPOSAL_KEYS` (`hasher.ts:8-21`) is a whitelist that seals `base_hash` but not
  `sources`; execution annotations are excluded because they are not in the whitelist.
- `serializeChangeset` (`serializer.ts`) rebuilds the whole file from the object:
  frontmatter via `yaml.stringify`, a fixed notice, then each change in a fixed key order.
- Changeset writers: apply intake sealing and write-back (`apply-change.ts:681-683`,
  `:880`, `:1142`), `synthesizeAndExecuteChangeset` (`apply-change.ts:1237`), and the
  console export (`innfo-runtime.js:4745` `serializeChangesetMarkdown`, which writes
  `parent_spec: "changes"` and `blueprint_version: "0.1.0"`).

## D1 — L3 frontmatter, strict parse

Target frontmatter (every writer, the template, and the parser contract):

```yaml
---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "<changes template_version>"
status: proposed
proposal_sha: "<64 hex>"
title: "..."
author: "..."
---
```

- `ChangesetFrontmatter`: `level: 3`; `parent_spec: { name: 'changes'; url: string }`.
- `parseChangeset` has NO default frontmatter. A file without a frontmatter block, or with
  `level` other than `3`, `parent_spec.name` other than `changes`, a missing
  `parent_spec.url`, or a missing `spec_version` / `blueprint_version` / `status`, throws
  `CHANGESET_FRONTMATTER_INVALID` naming the key. `proposal_sha` stays optional: apply
  seals an unsealed proposal at intake (`changeset-apply-engine`).
- Dropped from the original #1: `changeset_id` (its "defaults to the file stem" rule is a
  fallback; the path already identifies a changeset and changesets never move) and
  `type: changeset` (the validator does not need it; the role derives from
  `parent_spec.name`).

## D2 — `Change.sources`, written by the proposer, sealed

- `ChangeItem.sources?: string` holds the raw citation value, in the grammar of every
  `sources` field (`<path>@## <Heading>`, `<csv>@<row>`, `<json>@/<pointer>`, a bare path,
  or the list form the citation parser accepts).
- The parser reads `sources::`, the serializer writes it, and `PROPOSAL_KEYS` gains
  `sources`, so editing it after sealing yields `PROPOSAL_TAMPERED`.
- The `changes` bluepriNNt `Change` concept declares `sources` (type `citation`, optional).
- The proposer writes it — the agent today, `propose_changeset` from S6 — never apply. A
  change backed by evidence (a Source, an imported old domain, a transcript) MUST carry
  it; a bare review comment ends the chain at itself. That "MUST carry" half is an agent
  protocol rule in `skills/nn-innfo/SKILL.md`, because no tool can know that evidence
  existed. The verifiable half is that a present citation resolves (D3).

## D3 — Apply verifies, never writes, `sources`

- At intake, after sealing or seal verification and before Phase 1, apply resolves every
  change's `sources` with the workspace `createFsSourceResolver` (it resolves against
  `rootDir`, so `changes/`, `sources/` and `kNNowledge/` targets all work).
- Any unresolved citation rejects the whole changeset with `CITATION_UNRESOLVED`
  (diagnostics: change id and citation). The lock is released and nothing is written:
  the same all-or-nothing shape as `PROPOSAL_TAMPERED`.
- Apply never adds, removes or rewrites a change's `sources::` (the D20 rewrite applies to
  model fields, not to the changeset).

## D4 — Raw-text-preserving serialization and the annotation keys

- `parseChangeset` keeps `rawContent` (it already does). `serializeChangeset(doc)` writes
  from `rawContent` when present: it replaces the frontmatter execution keys (`status`,
  `applied_at`, `models`) in place and, per change block, replaces or appends ONLY the
  execution annotation lines (`status::`, `resolution::`, `resolved_slug::`,
  `replaced_sources::`) after the block's last normative line. Every other byte (normative
  lines, blank lines, line endings, the notice, unknown lines) is copied verbatim. Without
  `rawContent` (a document built in memory) it renders structurally, including `sources::`.
- The execution annotation keys are exactly `status`, `resolution`, `resolved_slug` and
  `replaced_sources`. `replaced_sources` is defined here and written by #1B. None is sealed.

## D5 — `changeset` is a lineage node

- The `lineage-single-edge` requirement "Node role derives from the naming contract" is
  extended: a file whose `parent_spec.name` is `changes` has role `changeset`, is a lineage
  node and a valid citation target (`changes/<file>@## NN Change: <id>`). The lineage
  record projection (`lineage/record.ts`) includes it. Folders stay write destinations
  only; the role still derives from the contract, not from `changes/`.

## D6 — Console export

- `serializeChangesetMarkdown` emits the D1 frontmatter and `draftToChange` emits the
  element slug as the element part of the target (`d.element_slug`, never `d.element` or
  `d.element_id`). Every payload element carries a slug (derived for an unfrozen model,
  which apply freezes first with the same derivation), so one always exists. #1C later
  makes frozen slugs mandatory for the console.

## Cross-cutting

- `strict_tdd: true`: each group leads with its failing test.
- Generated mirrors: `canonical-registry.ts`, `console-payload.generated.cjs`, the console
  bundle, the innfo-core build used by the innfo-mcp tests. `verify.js` drift checks gate.
- Release: the `changes` template package changes here (template + `template_version`
  bump). The `blueprints-v*`, `innfo-console-v*` and `skills-v*` tags for #1A–#1C are cut
  once, in #1C, because #1A–#1C reach `main` in one `dev → main` batch (a template edit on
  `main` without its tag and repin reddens `verify.js --release`).
- Write-once: no `_V_x-y-z_` file is edited; the `changes` template is the unversioned
  `spec_NN.md`, edited in place with a `template_version` bump.
