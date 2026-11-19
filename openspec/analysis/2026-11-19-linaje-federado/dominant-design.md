# Linaje federado entre domaiNNs — the design under review

Status: proposal. Analyzed SHA: see `BASELINE` in the orchestrator brief (the worktree
HEAD when the panel was launched).

## 0. The question that started it

Can domaiNNs be interrelated, and can a kNNowledge unit in one domaiNN link to a unit in
another, so information access and continuity cross domain boundaries — including change
history, provenance and lineage?

The motivating scenario, three domains on one machine:

1. `iNNtake_NN` detects a new article in the mail download feed. The user processes it and
   includes it in the model as a resource.
2. `AI_stack_NN` imports that resource and maps it to an element of its own model.
3. `coNNtent_NN` imports the AI_stack element, generates a video, and the video should
   trace back to the original article in `iNNtake_NN`, including a screenshot of that
   article.

## 1. What exists today (claims to be verified, not assumed)

Three independent "comes from" notions, deliberately kept apart by design:

| Notion | Where it lives | What it answers |
|---|---|---|
| Copy provenance | sidecar frontmatter `synchronization`, `origin_uri`, `origin_path`, `retrieved_at` | Where did this copied file come from |
| Evidence | `changes.evidence` in the change log | Which unit of this domaiNN did this value derive from |
| Reference | a `type:: reference` field holding `sources/sync/<alias>/<path>_NN.md@<slug>` | Which entity of another domaiNN do I point at |

And a fourth, separate one: `type:: knowledge` / `type:: model` with `target_blueprint`,
which links whole documents.

### 1.1 Synchronization

A domaiNN declares an origin in its sources catalog:

```markdown
## NN Synchronization: AI Stack
alias:: aistack
origin_uri:: D:/Users/lucas/Documents/_NN/AI_stack_NN
kind:: folder
state:: active
```

`nn-sources --sync [alias]` lands the origin on demand. A domaiNN origin (a folder with
`domaiNN_NN.md`) contributes **models only**, mirrored under `sources/sync/<alias>/`. A
plain folder splits into mirrored models plus write-once raw files under
`sources/import/<alias>/`. The refresh plans every change first and writes afterwards. It
prints a `propose_changeset` payload when something changed; it never writes the change
itself.

### 1.2 Pointing at a mirrored element

```markdown
upstream_element:: sources/sync/aistack/kNNowledge/AIStack_business_NN.md@herramienta-x
```

`check_domain` resolves it against the mirror, and reports `REF_ELEMENT_NOT_FOUND` /
`REF_MODEL_NOT_FOUND` when the origin renames or drops the target. Slugs must be frozen at
the origin (`migrate-domain.js --freeze-slugs --apply`) or the references break on a title
edit.

### 1.3 What does not cross the boundary

- `evidence` is domaiNN-relative. A mirror address is not valid evidence: it ends in `.md`
  so it needs a heading unit, and citing a model by path is a removed form.
- `read_lineage` projects sources, models, artifacts and edges from one root's change log.
- The mirror does not carry the origin's `changes/`, so a consumer sees the current state
  of an element but not its history, and a `produce_artifact` in the consumer cannot walk
  back past the mirrored element.

Consequence: today the system gives **addressing + snapshot + drift detection**, the same
shape as a git submodule or a lockfile, not a distributed chain of custody.

## 2. Where a previous analysis of this codebase was wrong

Recorded so the panel does not inherit it:

- It claimed the hook for a lock is at `refresh.ts:42`. Line 42 is a field of
  `RefreshResult` (`digestBefore` / `digestAfter`): a value the CLI prints. It is not
  persisted state.
- It proposed `origin_uri` / `origin_path` as a mechanism yet to be built, equivalent to
  PROV `mentionOf`. Those keys already exist on every cognitivized copy and already record
  the sync alias.
- It proposed a conflict check for a "diamond" formed when a consumer syncs a domain both
  directly and through an intermediate. The refresh code is explicit that a mirror is never
  related to the consumer's own sources or to other consumers.

## 3. Verdict of the analysis under review

Three-part verdict:

1. **Do not rewrite.** The coupling is three weakly coupled pieces (sync, cognitivize,
   evidence), not a cyclic graph. A rewrite buys conceptual tidiness at the cost of
   breaking a validation contract consumed by `nn-core`, `nn-mcp` and the console.
2. **Do not adopt the original ordering either.** Ordering identity → lock → bundle is
   wrong because a lock without a global domain name locks nothing, and a bundle without a
   cross-boundary evidence edge has no reader. The proposed order is:
   identity → federated evidence → lock and bundle.
3. **Reject the diamond.** Do not sync the same domain into a consumer by two paths. Sync
   the domain that already holds the link. If the video needs the article's bytes, they
   come from the mirror of the model that already cites the article, not from a second
   synchronization of the origin.

The single real contract hole is that `evidence` cannot name a mirror address. That is the
one change that yields cross-domain history, because `evidence` is the edge `read_lineage`
already walks.

## 4. The four pieces, in the corrected order

### 4.1 Identity (`domain_id`) — from OpenLineage

A domaiNN is identified today by a folder path plus an optional `workspace_id` used only
as a changeset filename prefix. There is no stable global name. Proposed: a `domain_id` in
the `domaiNN_NN.md` frontmatter; `origin_uri` becomes only "where to look for it". Frozen
slugs are the other half of identity.

This is a spec change first, implementation second, which is why it leads.

### 4.2 Federated evidence — PROV `mentionOf` plus OpenLineage stitching

`evidence` accepts a mirror address, and `apply_change` records the lock revision in force
at that moment. `read_lineage`, meeting a mirror evidence, opens the bundle for that
revision and continues. If a later refresh moves the lock, the citation is stale: a warning
(`LINEAGE_UPSTREAM_DRIFT`), not an error.

This is the high-risk item: `nn-core`, `nn-mcp` and the console all validate this grammar.
It goes in its own slice, alone.

### 4.3 Lock — from DVC and Nix

The declaration is the intent; the lock holds the resolved revision. The content hash is
already computed during refresh, it just is not stored. The lock carries the origin's own
locks, which is what makes a transitive closure possible.

Without 4.1 a lock has no domain to key on, and without 4.2 nothing reads it. Hence its
position.

### 4.4 Lineage bundle — from W3C PROV

The origin exports the projection of `read_lineage` limited to what is reachable from the
models it exports, written once, named by hash, including the bundles it received from its
own synchronizations. If it is exported as an artifact recorded by `produce_artifact`, then
it is an artifact, not a new concept — which is the argument for not inventing a format.

## 5. Risks the analysis already names, and ones it may have missed

Named: contract break on `evidence`; what a bundle leaks (internal paths and evidence);
where `domain_id` comes from for existing domains; bundle size on long chains.

Suspected but unproven: whether the console's citation builder and the sources catalog both
need changes for 4.2; whether `check_domain`'s `ARTIFACT_WITHOUT_RECORD` interacts with
bundles; whether `resolve_sources` can be reused as the reader for mirror evidence instead
of a new resolver.

## 6. What the panel must decide

- Is "extend, do not rewrite" correct, with code evidence for or against?
- Does 4.1 really block 4.3, or can a lock key on content hash alone as DVC does?
- Is 4.4 needed at all if 4.2 resolves the chain live?
- Is the corrected order (identity → evidence → lock → bundle) right, or is there a
  cheaper minimum that makes the three-domain scenario work?
