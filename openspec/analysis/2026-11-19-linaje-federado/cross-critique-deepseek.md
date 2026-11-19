---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - deepseek"
---

Panel note: this review ran single-provider (`opencode-go`). All four reports in this
panel — the design under review and both independent analyses — came from the same
provider family, so a shared-serving bias cannot be excluded. Treat a unanimous panel as
one opinion stated twice, not as independent corroboration.

Baseline for every citation below: HEAD `5bd09ded`.

Luna's report is materially better than mine was on one axis: it separates *parser* from
*reader* and it names the file-transfer gap as its headline finding rather than as a risk.
Where luna is right and I was wrong, I say so in the element. Where luna's evidence is
right but its reasoning is inconsistent, I say that too — a correct citation attached to a
contradictory argument is still a defect in the report.

# NN Critiques

## NN Critiques: Review of luna F1
target:: luna:F1
stance:: agree

Luna's central factual claim is right and I should have led with it. `classify` returns
`inDomain ? null : { ...file, model: false }` at `iNNfo/packages/nn-core/src/sync/refresh.ts:111`,
so a domaiNN origin contributes models and nothing else. The raw-file landing at
`refresh.ts:240` iterates only over `originFiles.filter((x) => !x.model)`, and for a domain
origin that array is empty. The documented behaviour says the same in one line: "A domaiNN
origin (a folder holding `domaiNN_NN.md`) contributes models only"
(`docs/documentation/content/how-to/synchronize-an-origin.md:37`).

I agree with the conclusion and with the framing: the four proposed pieces do not make the
full scenario work. Federated evidence says *where a value came from*; it does not move a
JPEG. Nothing in pieces 4.1–4.4 — `domain_id`, evidence grammar, a lock, a bundle — is a
transfer mechanism, and no amount of them will put article bytes in `coNNtent_NN`.

I agree with the *shape* of the recommendation (split asset transfer from federated
evidence) but not with its content, and this is where the finding should have gone further.
Luna recommends "a staged copy in AI_stack that its domain sync can already carry." That
last clause is not supported by the code luna itself just cited. A staged copy in
`AI_stack/sources/import/` is *not* carried by AI_stack's own domain sync into coNNtent,
because `enumerateOrigin` skips the entire root `sources/` tree before it ever reaches
`classify` — `if (isExcludedPath(entryRel) || isUnderRootSources(entryRel)) continue` at
`refresh.ts:128`, with `isUnderRootSources` matching the leading `sources` segment at
`iNNfo/packages/nn-core/src/naming/contract.ts:296-298`. The same `sources/` skip means the
copy does not travel as raw files either. So luna's own remedy depends on a mechanism
luna's own primary citation proves is closed. The scenario needs either the bytes to travel
inside a model document that is itself a mirror candidate (`isModelCandidate` at
`contract.ts:305-312` is the only predicate that survives the walk), or a new
domain-origin asset landing rule. Luna named the gap correctly and then named a fix that
does not close it.

Verdict: finding correct, conclusion correct, recommendation under-verified at the exact
point where it matters. This is the single most important defect in the scenario and luna
is right that the panel must not let pieces 4.1–4.4 appear to solve it.

## NN Critiques: Review of luna F2
target:: luna:F2
stance:: agree

Verified, and the file references are accurate. `checkToken` computes
`const mirror = fieldDef.type === 'reference' ? parseMirrorAddress(token) : null` at
`iNNfo/packages/nn-core/src/validator/workspaceReferences.ts:242` and dispatches to
`checkMirrorToken`, which resolves through `mirrors?.(mirror.alias)?.byPath(mirror.path)`
and emits `REF_MODEL_NOT_FOUND` when the alias or file is absent
(`workspaceReferences.ts:169-184`). The docs prescribe the form and the frozen-slug
discipline at `docs/documentation/content/how-to/synchronize-an-origin.md:45-58`.

One thing luna understates, and it strengthens rather than weakens the finding. The mirror
gate is not merely present — it is *typed-field only*. `parseMirrorAddress` is called on
the right-hand side of `fieldDef.type === 'reference'`, so an identical string in a
`knowledge`, `string` or `evidence` position never reaches the mirror resolver at all; it
falls through to `parseAddress` at `workspaceReferences.ts:244`. That is the architectural
reason the evidence contract gap (F3) is real and not a matter of a missing `if`: the
mirror concept exists in exactly one validator branch and has no representation in the
citation grammar. Luna's conclusion — keep the addressing layer — is correct, and this is
the evidence that the addressing layer is *narrower* than the proposal assumes it is to be
reused for.

## NN Critiques: Review of luna F3
target:: luna:F3
stance:: partially agree

The split itself is correct and this is luna's best structural contribution: mirror
parsing is a distinct, filesystem-free parser and the citation path never consults it.
But luna's `code_ref` cites the wrong lines for the mechanism, and one of the four
citations points at the thing that *contradicts* luna's own sentence.

Luna's prose says "A `.md@<element-slug>` mirror reference does not match the raw Markdown
citation heading-unit grammar." True and precisely verified, but not at
`iNNfo/packages/nn-core/src/sourceRef.ts:604` — that is the signature of
`parseKnowledgeUnitRef`. The actual failure is the chain: `parseCitation` routes any value
containing `@` to `parseKnowledgeUnitRef` (`sourceRef.ts:155-157`); that function takes the
`.md` extension branch because `SOURCE_FILE_RE = /\.(md|csv|json)$/i` matches
(`sourceRef.ts:87`, `sourceRef.ts:610`); `resolveUnitPath` returns
`kind: roleOf({ path: forward }) === 'knowledge' ? 'model' : 'source'`
(`sourceRef.ts:512`), and `roleOf` returns `knowledge` for a path that is neither a
known-core blueprint nor `procedures` — `return CORE_BLUEPRINT_ROLE[bp] ?? 'knowledge'`
(`iNNfo/packages/nn-core/src/naming/contract.ts:176`); then `HEADER_UNIT` requires a literal
`#` — `/^(#{1,6})\s*(.+?)\s*$/` (`sourceRef.ts:572`) — so the bare slug `gerente` fails at
`sourceRef.ts:635-636` and the whole parse returns `null`. `workspaceSources.ts:109-119`
turns that `null` into `KU_MALFORMED`. The claim is right; the cited line is the function
entry, not the failure.

The citation at `iNNfo/packages/nn-core/src/sync/address.ts:26` is also the
`parseMirrorAddress` signature rather than the discriminating guards at
`address.ts:38-43` (`.md` required, `unit.kind` restricted to `element` or `body`).

And there is a contradiction inside the finding. Luna calls mirror parsing "a distinct
parser for model element addresses", but `parseUnitAddress`
(`iNNfo/packages/nn-core/tests/unit-address.test.ts:174-184`) *does* parse
`sources/sync/org/organization_NN.md@gerente` as a source chip with `slug === 'gerente'`
and `subunits === []`, and asserts `unitHome(...) === 'source'`. So the address layer
already understands mirror tokens; the consumer (`evidence`) uses a different entry point
that does not. Luna's recommendation — "stop describing it as a grammar-only edit" — is
therefore right, but for a sharper reason than luna gives: it is not one grammar but *two
inconsistent grammars*, and the fix is to make `evidence` use the one that already
works, not to teach a new one.

## NN Critiques: Review of luna F4
target:: luna:F4
stance:: agree

Fully verified, and the two files are the right ones. The `sources/sync` skip is explicit
and documented in-place: `if (relPath === SYNC_DIR) continue` with the comment "Mirrors are
models owned by an origin; their elements are not this domaiNN's lineage"
(`iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:23-24`). The projection is pure over
one snapshot: `projectLineage(files, log = buildChangeLog(files), options)`
(`iNNfo/packages/nn-core/src/lineage/project.ts:255-259`), and the edge builder iterates
only `log.evidence(...)` from that single log (`project.ts:461-467`). And the tool surface
confirms there is no cross-root seam to hang federation on: `ReadLineageInput` has exactly
`focus` and `scope` — no root, no bundle, no revision
(`iNNfo/packages/nn-mcp/src/tools/read-lineage.ts:22-27`).

I agree with the conclusion "needs a reader, not just a parser", and I want to add the
reason it is worse than a missing function: the resolution seam already exists in the
codebase and was deliberately placed elsewhere. `buildMirrorLookup` is already passed into
workspace reference validation (`iNNfo/packages/nn-mcp/src/tools/validate.ts:363`), so the
mirror-aware resolution *pattern* is established — it is simply never handed to lineage. The
proposal's step 4 is therefore not "invent a resolver"; it is "wire the existing resolver
into a projection that is documented as pure and single-root". That is a design change to
`projectLineage`'s contract, not an addition beside it, and luna's recommendation
("specify the cross-domain traversal as its own requirement") is the right call.

## NN Critiques: Review of luna F5
target:: luna:F5
stance:: partially agree

The narrow claim — "Refresh computes and returns tree digests but does not persist them in
that module" — is true and verified: `digestBefore`/`digestAfter` are produced at
`iNNfo/packages/nn-core/src/sync/refresh.ts:272-273` and their only consumers in the whole
repository are `iNNfo/packages/nn-core/tests/sync-refresh.test.ts:115,193-194`. There is no
`nn-mcp` tool for refresh at all, so nothing in the engine ever sees a `RefreshResult`.

But luna stops at the module boundary, and the question the orchestrator asked was whether
persistence exists *elsewhere*. It does, in two independent places, and luna missed both.

First, the sync skill does persist a per-file digest. `buildSyncPayload` emits a `comment`
change with `notes: formatNotes(result)`, where `formatNotes` serializes
`${f.path} ${f.before} -> ${f.after}` per file
(`skills/nn-sources/scripts/lib/sync.js:81-104`). If that payload is applied, the notes are
stored in the change log — `notes` survives load and appears in the projection
(`iNNfo/packages/nn-core/src/changelog/load.ts:238`,
`iNNfo/packages/nn-core/src/changelog/index.ts:66`). So a before/after digest *is*
durable, in free text, in the log, keyed to the mirror alias by the change target. It is not
a structured lock and nothing reads it programmatically, but "not persisted" is wrong as
stated and the difference matters: the proposal's cost estimate for 4.3 must be discounted
by the fact that the data already lands, it just lands unread.

Second, and far more important, `apply_change` already stamps a content hash of every
evidence file at apply time. `evidenceShas` reads each cited file and hashes its bytes —
`readFile(modelFile ?? join(rootDir, filePath))` then
`createHash('sha256').update(bytes).digest('hex')`
(`iNNfo/packages/nn-mcp/src/tools/apply-change.ts:575-595`) — and the apply loop writes the
result to `change.evidence_sha256`, plus a path-keyed `frontmatter.evidence_sha256` map
(`apply-change.ts:3045-3054`). That is a per-cited-artifact content pin, persisted at apply
time, in the sealed change log, enforced by `EVIDENCE_SOURCE_CHANGED` when a resolver is
supplied (`iNNfo/packages/nn-core/src/changelog/drift.ts:31-32,190-207`). Luna's
recommendation says to "test first whether the existing per-evidence `evidence_sha256`
mechanism can anchor the required upstream revision" — good instinct, but the finding's
prose describes it as only "the change log already stores evidence-file hashes", which
badly understates what is there: a hash taken at apply time from the *consumer's own copy*
of the referenced file is exactly DVC's content pin.

What luna gets right and what remains genuinely open: the drift check is dormant. No caller
supplies a `sha256` resolver — `checkDomainProvenance` passes it only when provided
(`iNNfo/packages/nn-mcp/src/tools/provenance-strict.ts:270,275`), `check-workspace.ts:332`
calls it as `{ strict }` with no resolver, and `validate.ts:432` calls
`checkProvenance(log, models)` bare. So the pin is written but never compared. The gap is
one `sha256: (p) => sha256Hex(readFileSync(...))` argument, not a new state machine. Luna
frames the overlap as "must be measured before new state is introduced", which is the right
posture, but the report should have found that the mechanism is already *writing* the lock
and merely not *reading* it.

## NN Critiques: Review of luna F6
target:: luna:F6
stance:: partially agree

The factual half is right. The domaiNN blueprint defines a display field, not a stable id:
`## NN Field Definition: name` / `concept:: domaiNN` / `type:: string` /
"Display name or title of the domaiNN" (`iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:59-62`),
and there is no `domain_id` in that file. What does exist is `workspace_id`, and it is a
filename prefix and fallback only: `resolveWorkspaceId` reads `frontmatter['workspace_id']`
and otherwise falls back to `slugify(basename(resolve(rootDir)))`
(`iNNfo/packages/nn-mcp/src/tools/propose-changeset.ts:71-81`), documented in the tool
description as "used in changeset file names" (`iNNfo/packages/nn-mcp/src/server.ts:445-448`).
So "a lock without a global domain name locks nothing" is overstated for a local pin — luna
is right, and the understatement is the design's, not luna's.

Where I disagree is consistency with luna's own F1. F6 recommends "test a consumer-scoped
alias plus content digest before making `domain_id` a prerequisite", and marks the finding
`evidence:: inferred`. But luna's F1 establishes that the artifact the scenario actually
wants to trace — the article bytes — cannot be addressed, cited, hashed or transferred
across the boundary at all. `evidenceShas` hashes *paths at the consumer root*
(`apply-change.ts:587-590`); a mirror path is a consumer-local path and a raw article path in
`iNNtake/sources/import/` is not reachable from `coNNtent`. A "consumer-scoped alias plus
content digest" therefore pins a mirror *state*, which is exactly what
`frontmatter.evidence_sha256` already does — it does not pin the thing the scenario is
about. If the byte problem in F1 is unresolved, then F6's prescription is a lock on a
document that cannot reference the payload, and the two findings should have been joined.

A second internal issue: luna calls the design's claim "overstated" while conceding "stable
issuer identity still matters for attribution and for domain renames". That is a
`partially agree` verdict on the design's claim, not the "overstated" dismissal the prose
reads as. The honest position is narrower than either report states: `domain_id` is not
*necessary* for a content pin, but it is the only thing that survives the origin moving
(the `SYNC_SELF_LOOP` absolute-path resolution at `refresh.ts:186-196` makes clear that
`origin` is an absolute filesystem path, `sync/declarations.ts:12`, which is not an
identity). For a single machine and a single checkout, deferring is defensible. For the
proposal's stated goal — continuity "across domain boundaries" — it is not.

## NN Critiques: Review of luna F7
target:: luna:F7
stance:: agree

Verified, and the file references land on exactly the right shape. `LineageSource` carries
`raw_filename` and `normalized_content` as workspace-relative paths (`project.ts:31-47`),
`LineageKnowledge` carries `model_ref` plus `citations: CitationSite[]` (`project.ts:49-55`),
and every edge carries a change id — `push({ from: citation, to: owner, kind: 'evidence',
change: site.changeId })` (`project.ts:461-467`). Nothing in that object graph is an
identifier that has been separated from a path. A bundle that is "the projection limited to
reachable models" (dominant-design §4.4) is therefore a path inventory plus a citation
inventory, which is a disclosure whether or not it contains bytes.

I agree with the recommendation and I would strengthen the emphasis: this is the finding
with the largest asymmetry between effort and consequence in the whole proposal. The
dominant design lists "what a bundle leaks" as a named risk, but a risk is not a contract.
Luna is right that an allowlist/redaction policy must exist *before* the first bundle is
written, because bundles are named by hash and written once — an over-broad bundle is not
patchable in place, it is a permanent record whose hash is cited by everything downstream.

One correction to luna's framing. The finding says "'Reachable from exported models' limits
scope but does not itself redact sensitive path or evidence values." True, but it also does
not limit scope the way luna implies: `projectLineage` builds the *whole* view first
(`project.ts:260-265`) and the proposal's "limited to what is reachable from the models it
exports" is a filter the proposal would have to add on top of a projection that has no
such parameter today. The export surface does not exist; the privacy contract is not
hardening an existing filter, it is defining the filter. That makes the finding's `effort:
medium` optimistic and its `risk: high` understated.

# NN Findings

## NN Findings: N1 The drift check is written but never read; the "lock" is a missing caller, not missing state
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-mcp/src/tools/apply-change.ts:3045, iNNfo/packages/nn-core/src/changelog/drift.ts:190, iNNfo/packages/nn-mcp/src/tools/check-workspace.ts:332, iNNfo/packages/nn-mcp/src/tools/validate.ts:432
recommendation:: Add the `sha256` resolver at the three call sites and make `EVIDENCE_SOURCE_CHANGED` the drift signal before designing a lock document; the lock's data already exists and only its consumer is missing.

This is the finding both reports circled and neither stated. At apply time the engine hashes
every evidence file from the consumer's own copy (`apply-change.ts:575-595`) and persists one
hash per evidence item, positionally, plus a path-keyed map in the changeset frontmatter
(`apply-change.ts:3045-3054`). The comparison path is fully built and typed — `sha256::
(path: string) => string | undefined` on `ProvenanceOptions` (`drift.ts:31-32`), driven at
`drift.ts:190-207`. It is simply never supplied: `checkDomainProvenance` forwards
`options.sha256` only if given (`provenance-strict.ts:270,275`),
`provenanceWithArtifacts` calls `checkDomainProvenance(rootDir, { strict })` with no
resolver (`check-workspace.ts:332`), and `collectDriftDiagnostics` calls
`checkProvenance(log, models)` bare (`validate.ts:432`).

The consequence for the proposal is concrete and should change its ordering. Dominant-design
§4.3 argues "The content hash is already computed during refresh, it just is not stored."
That is the weaker half of the story. The stronger half: a content hash *is* stored, per
evidence item, at apply time; and luna F5's recommendation to test reuse is not a research
question but a three-line change. Whatever the panel decides about 4.3, it should decide it
after wiring the resolver, because the observed behaviour of a working drift check is the
only evidence that can tell us whether an upstream moving under a citation is a warning or a
failure — and dominant-design §4.2 proposes `LINEAGE_UPSTREAM_DRIFT` as a warning, which is
exactly this check's default severity (`drift.ts:224`).

Worth stating plainly: this mechanism hashes the *mirrored* copy. It pins the upstream state
the consumer acted on. It does not pin a transitive closure, and it does not survive a
mirror being pruned. That is the real, narrow justification for a lock — and it is much
smaller than "does not persist".

## NN Findings: N2 `evidenceShas` hashes whatever path the citation carries, so the evidence lock silently changes meaning the moment mirrors become citable
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: iNNfo/packages/nn-mcp/src/tools/apply-change.ts:587, iNNfo/packages/nn-core/src/sync/refresh.ts:229, iNNfo/packages/nn-core/src/sync/refresh.ts:120
recommendation:: Before accepting mirror addresses as evidence, decide explicitly whether the stamped hash is the mirror's current bytes, the origin's bytes, or a revision identifier — and record which one in the change, because the three are different and only the last survives a refresh.

`evidenceShas` computes `const filePath = evidencePath(item) ?? item` and then
`readFile(modelFile ?? join(rootDir, filePath))` (`apply-change.ts:587-590`). It resolves the
path at the consumer root and does not distinguish a raw source from a mirror. Today this is
harmless because a mirror address cannot reach it (F3). The moment 4.2 lands, every mirror
evidence stamp becomes a hash of whatever `sources/sync/<alias>/...` contained at apply time.

That value has a short and unstable life. The mirror is a *projection of the origin's current
state*: refresh overwrites changed models at `refresh.ts:216-227` and deletes anything no
longer planned at `refresh.ts:229-238`, and the whole origin is re-enumerated each run
(`enumerateOrigin`, `refresh.ts:114-138`). So the stamped hash is not a revision identifier;
it is the hash of a file that the next `nn-sync` may replace or delete. A drift warning
raised against it cannot distinguish "the origin changed the value I cited" from "the mirror
was refreshed to an unrelated newer version", and after a `removeOrphanMirrors`
(`refresh.ts:281-299`) the file is gone and the hash is unverifiable forever.

This is the concrete reason 4.3 cannot be deferred as "already there". The existing stamp is
adequate *because* evidence cannot name a mirror; federating evidence invalidates the
adequacy of the very mechanism the proposal cites as its foundation. The proposal's ordering
"identity → evidence → lock" is defensible, but its *justification* — that the lock is new
state — is wrong; the justification is that the existing stamp silently changes semantics
and needs a revision identity it does not have.

## NN Findings: N3 The self-loop guard and the absolute-path origin make a federated domain identity path-dependent, which `domain_id` addresses but neither report costs correctly
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:186, iNNfo/packages/nn-core/src/sync/refresh.ts:190, iNNfo/packages/nn-core/src/sync/declarations.ts:12, iNNfo/packages/nn-mcp/src/tools/propose-changeset.ts:80
recommendation:: Treat the absolute `origin` path as the identity that `domain_id` replaces, and include path-relocation in the migration story: every existing Synchronization is keyed on a machine-specific string.

`Synchronization.origin` is declared as a bare string with no identity component
(`iNNfo/packages/nn-core/src/sync/declarations.ts:10-15`), and refresh resolves it with
`path.resolve(s.origin)` and compares realpaths to refuse a recursive mirror
(`refresh.ts:186-196`). The `workspace_id` fallback is `slugify(basename(resolve(rootDir)))`
(`propose-changeset.ts:80`). Everything that names a domaiNN at HEAD is therefore derived
from a filesystem location.

Neither report prices this. Luna F6 correctly observes that `domain_id` is not needed for a
*local content pin*, and that is true — the pin is local. But the proposal's stated goal is
continuity across domains, and the `SYNC_SELF_LOOP` check demonstrates the current coupling:
move the origin folder and the declaration breaks; rename it and the derived `workspace_id`
fallback changes. So `domain_id` is not speculative state that "will need migrating" because
of an invented requirement — it replaces a path that is already load-bearing in three
places. The right framing for the panel is that `domain_id` *is* new state, but the state it
replaces is worse, and the migration is mechanical (declare the id at each existing root,
point `origin` at it).

Where I part company with my own earlier position: I treated 4.1 as introducing identity.
It does not introduce it; it de-path-ifies identity that already exists implicitly. That
makes 4.1 cheaper than the proposal assumes and 4.3 more expensive, because a lock keyed on a
`domain_id` inherits the requirement that every historical citation be attributable to an id
that may not have existed when the change was applied.

## Key Learnings

1. `apply_change` already stamps a per-evidence-file sha256 at apply time via `evidenceShas`, so the proposed lock's data exists and only its consumer is missing.
2. No caller supplies the `sha256` resolver to `checkProvenance` at HEAD, leaving `EVIDENCE_SOURCE_CHANGED` dormant despite being fully implemented in `drift.ts`.
3. A domaiNN-origin refresh skips the entire root `sources/` tree, so neither `sources/import` raw bytes nor staged asset copies can cross a domain boundary through synchronization.
4. Mirror addresses parse correctly through `parseUnitAddress` but fail `parseCitation`, proving the evidence gap is two inconsistent grammars rather than one missing production.
5. `read_lineage` accepts only `focus` and `scope`, and `fs-snapshot` explicitly skips `sources/sync`, so cross-domain traversal needs a reader contract change and not just a parser.
