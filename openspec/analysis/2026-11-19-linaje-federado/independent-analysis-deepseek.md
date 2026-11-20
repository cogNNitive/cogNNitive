---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - deepseek"
---

# NN Findings

## NN Findings: F1 The evidence holes are not what the proposal says they are
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sourceRef.ts:501, iNNfo/packages/nn-core/src/sourceRef.ts:507, iNNfo/packages/nn-core/src/address/parse.ts:42, iNNfo/packages/nn-core/src/address/parse.ts:66, iNNfo/packages/nn-core/src/sourceRef.ts:145, iNNfo/packages/nn-mcp/src/tools/apply-change.ts:998, iNNfo/packages/nn-core/src/console/citations.ts:232, iNNfo/packages/nn-mcp/src/tools/apply-change.ts:977
recommendation:: State the real precondition for 4.2 before designing it: mirror evidence is refused by the path guard and the dangling-file resolver, not by a removed-form rule, and `apply_change` already routes model citations around that resolver.
tags:: [correctness, evidence, sourceRef]

The proposal (§1.3, §3) reduces the whole cross-boundary evidence question to one sentence: "A
mirror address is not valid evidence: it ends in `.md` so it needs a heading unit, and citing a
model by path is a removed form." Both halves are wrong at this SHA.

- "It ends in `.md` so it needs a heading unit" is false. `resolveUnitPathResult` resolves any
  `.md`/`.csv`/`.json` path as a source and returns it with no unit (`sourceRef.ts:501-513`); the
  heading requirement exists only on the `#`-fragment legacy branch (`sourceRef.ts:159-165`) and on
  the `@`-form when the file is `.md` (`sourceRef.ts:635-637`). A bare mirror path is a legal
  citation shape today.
- "Citing a model by path is a removed form" is false for the mirror path. `parseAddress` sends
  every `sources/`-prefixed path down `parseSourceClass`, which returns
  `{ kind: 'source' }` at `parse.ts:66` and never reaches the `MODEL_CITED_BY_PATH` branch at
  `parse.ts:57`. `MODEL_CITED_BY_PATH` is raised only for an `_NN.md` that is a `knowledge` role
  *outside* `sources/` (`parse.ts:45`). A mirror address is a source citation, not a removed form.

What actually blocks it, and what the design must plan around:

1. The absolute-path guard at `sourceRef.ts:507` (`/^[a-zA-Z]:[/\\]/` or leading `/`) runs on the
   *whole* citation string in `resolveUnitPathResult`, so `D:/...` is refused. Not the mirror's
   problem specifically, but it means "evidence accepts a mirror address" is not a one-line parser
   change either way.
2. `console/citations.ts:232-235` resolves through `SourceResolver` and returns `DANGLING_FILE`
   when the resolver says `!exists`. `apply_change` calls exactly that (`apply-change.ts:998`) and
   rejects the whole changeset with `CITATION_UNRESOLVED`. There *is* a precedent for a bypass:
   model citations take the `parseCitation(item)?.kind === 'model'` branch at
   `apply-change.ts:977-996` and go through `resolveModelCitation` instead of the resolver. So 4.2
   has a shape to copy, but it is a fourth resolution path, not "make the grammar accept it".

The design's own risk section guesses at this ("whether `resolve_sources` can be reused..."), but the
verdict in §3 sells 4.2 as a grammar change and calls it "the one change that yields cross-domain
history". Both are understatements of the blast radius and misstatements of the current cause.

## NN Findings: F2 `origin_uri` records the alias, not the origin — so 4.1's "origin_uri becomes only where to look" is already broken
category:: refactor
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:255, iNNfo/packages/nn-core/src/sync/refresh.ts:187, iNNfo/packages/nn-core/src/cognitivize/cognitivize.ts:107, iNNfo/packages/nn-core/src/sync/declarations.ts:60
recommendation:: Fix the sidecar origin keys first (record the resolved absolute origin alongside the alias), and make `refreshSynchronization` pass the origin it actually resolved, before `domain_id` is added under `origin_uri` in 4.1.
tags:: [correctness, sync, provenance]

The proposal says (§4.1) "`origin_uri` becomes only 'where to look for it'" — implying it already
is that today. It is not.

`refresh.ts:255` passes `origin: { synchronization: s.alias, origin_uri: s.origin, origin_path: f.rel }`
into `importRaw`. `s.origin` comes from `declarations.ts:60`. Compare `refresh.ts:186`
(`path.resolve(s.origin)`) with `refresh.ts:255` (`s.origin`, unresolved) — the refresh itself
resolves the origin to decide whether it is inside the domaiNN, then writes the *unresolved*
string into the sidecar. A Synchronization declared as `origin_uri:: ../Shared/AI_stack` therefore
lands sidecars saying `origin_uri:: ../Shared/AI_stack`, which is relative to whichever domaiNN it
ends up in after a move. `cognitivize.ts:107` writes that value verbatim into
`metadata.origin_uri`.

Three consequences for the proposal:

- 4.1 wants `origin_uri` to be the locator for `domain_id`. Today it is not reliably a locator at
  all on a non-absolute declaration, and nothing in the codebase rewrites or validates it.
- 4.3's lock ("the origin's own locks") needs an origin identity before the hash. The one key
  available today (`synchronization: s.alias`) is consumer-local by construction — it is the
  *consumer's* alias, so two consumers of the same origin record two different values.
- The proposal's §2 dismissal of the earlier analysis ("`origin_uri`/`origin_path` already exist...
  and already record the sync alias") is exactly right about the alias, which is the problem:
  the field named `origin_uri` carries the alias's sibling, not the origin.

## NN Findings: F3 4.1 has a cheaper minimum: `workspace_id` is written but never read by the log
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-mcp/src/tools/propose-changeset.ts:132, iNNfo/packages/nn-mcp/src/tools/propose-changeset.ts:71, iNNfo/packages/nn-core/src/changelog/load.ts:98, iNNfo/packages/nn-core/src/types/parser.ts:198, iNNfo/packages/nn-core/src/parser/serializer.ts:127, iNNfo/packages/nn-mcp/src/tools/init-domain.ts:68
recommendation:: Treat `domain_id` as "promote `workspace_id` to a read field the log exposes", not as a new frontmatter key — or at minimum justify a second identity field against the cost of a second, ignorable name.
tags:: [identity, migration, worth-building]

The proposal asserts (§4.1) that "a domaiNN is identified today by a folder path plus an optional
`workspace_id` used only as a changeset filename prefix". Checked:

- Written: `init_domain` records it (`init-domain.ts:68`); `propose_changeset` stamps every
  changeset frontmatter with it (`propose-changeset.ts:132`), defaulting to the manifest
  `workspace_id` or the slug of the folder name (`propose-changeset.ts:71-81`).
- Preserved: the serializer has it in the constructed-key set (`serializer.ts:127`) and the type
  declares it (`types/parser.ts:198`). A pre-existing test asserts round-trip
  (`tests/phase1-identity-serializer.test.ts`).
- Read back: nothing in `changelog/load.ts` is aware of it. `changesetLikeOf` (`load.ts:98-111`)
  copies `status`, `author`, `applied_at`, `batch`, `evidence_sha256` — not `workspace_id`. So a
  `LoggedChange` (the log contract in `changelog/index.ts:21-73`) cannot be told which domaiNN
  produced it, even though the fact is already in every applied changeset on disk.

Therefore: for the three-domain scenario, 4.1's minimum is to surface an *existing* written fact in
the log, not to introduce `domain_id` in `domaiNN_NN.md` frontmatter and migrate every existing
domain into it. The fatal detail is `propose-changeset.ts:79-80`: when the manifest declares
nothing, the fallback is `slugify(basename(rootDir))` — a *folder name*. So a lock or lineage bundle
keyed on mapping weak identity would key on a folder name with no warning. The proposal's own
warning (§4.1, "a lock without a global domain name locks nothing") is correct, and the existing
fallback is precisely the hole it describes. Enforcing absolute origin + explicit
`workspace_id` (today optional) is a validation change; adding `domain_id` is a new concept with
its own migration.

## NN Findings: F4 "Extend, do not rewrite" is right — and the proof is that the edge already exists
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/lineage/project.ts:461, iNNfo/packages/nn-core/src/lineage/project.ts:465, iNNfo/packages/nn-core/src/lineage/project.ts:445, iNNfo/packages/nn-core/src/validator/workspaceSources.ts:201, iNNfo/packages/nn-core/src/changelog/index.ts:233, iNNfo/packages/nn-mcp/src/tools/read-lineage.ts:52
recommendation:: Keep the verdict. Do not rewrite; the module boundary that matters (`evidence` to `ChangeLog.evidence` to `projectLineage.edges`) is one call chain and is not duplicated.
tags:: [extend-vs-rewrite, lineage]

The proposal's verdict 1 rests on a claim the code confirms: the lineage edge is built *from the
log's evidence index*, not from a parallel provenance store.

- `projectLineage` iterates `log.evidence(scope)` (`project.ts:461`), pushes
  `{ from: citation, to: owner, kind: 'evidence' }` (`project.ts:464`), and resolves the owner by
  string-matching the unit prefix through `canonicalUnitModelId` (`project.ts:445-450`).
- The evidence index itself is a pure fold over applied changes (`changelog/index.ts:233-273`).
- `read_lineage` is a thin filter over the projection (`read-lineage.ts:51-68`) and writes nothing.

So "make `evidence` able to name a mirror and the chain becomes walkable" is directionally true:
one grammar accepted, no new graph. Where the proposal over-reaches is scope: the *same*
`validateCitations` loop is shared by workspace validation, artifact validation, console meta
validation and skill checks (`workspaceSources.ts:58`), and `evidence` is validated through it
(`workspaceSources.ts:201`). That is a well-defined seam (one function, many callers), not a
spaghetti graph — which supports "extend", and simultaneously refutes the proposal's §3 framing of
4.2 as low-effort: accepting a form in that one function changes the contract for four callers plus
`apply_change`. The proposal already says "high-risk, own slice, alone" (§4.2); the code agrees.

## NN Findings: F5 The bundle (4.4) has no gap to fill: mirrors are already excluded from the origin's own projection, and nothing carries bytes
category:: refactor
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:24, iNNfo/packages/nn-core/src/changelog/load.ts:74, iNNfo/packages/nn-core/src/naming/contract.ts:309, iNNfo/packages/nn-core/src/console/citations.ts:237, iNNfo/packages/nn-core/src/console/fs-source-resolver.ts:52
recommendation:: Drop 4.4 from this design. A lineage bundle is only defensible if the fingerprinting problem (F7) is solved first; without it the bundle is an unverifiable snapshot of the very data F2 shows is unreliable.
tags:: [worth-building, bundle, lineage]

The proposal's §4.4 says the origin "exports the projection of `read_lineage` limited to what is
reachable from the models it exports". Three facts about that projection:

1. It already cannot see the origin's *own* mirrors: `readLineageSnapshot` skips `sources/sync`
   wholesale (`fs-snapshot.ts:24`, "Mirrors are models owned by an origin; their elements are not
   this domaiNN's lineage"). Consequence for the scenario: `iNNtake_NN`'s projection contains
   its `sources/import/` article (as a Source subject *and* its sidecar), the change that cited it,
   and nothing from AI_stack. That is precisely the material SUMMARY step 3 needs — and it is
   already reachable through the evidence chain once 4.2 lands. The bundle adds a persisted copy of
   data the consumer can reach through the same chain it already walks.
2. Changesets copied under `sources/` are never log records (`load.ts:74`, `isUnderRootSources`
   guard) and mirrors of models under `sources/` are not models at all
   (`isModelCandidate` guard at `contract.ts:309`). A bundle stored as an artifact under `sources/`
   would be inert; stored outside, it is a second copy of the log whose relationship to the first
   is undefined.
3. The projection has no notion of bytes at all, which is the requirement the scenario actually
   states: `resolveCitation` gets upstream content only when the resolver returns `content`
   (`citations.ts:237-240`), and `createFsSourceResolver` reads every file as UTF-8
   (`fs-source-resolver.ts:52-59`) — a binary article screenshot has no representation anywhere in
   the chain, and a bundle built from this projection inherits that. The origin *can* read the
   bytes; the projection cannot express them.

Recommendation is not "never"; it is "not now". 4.4 is the piece the proposal's own risk list
already flags for leakage and size (§5), and it is the only piece whose absence the three-domain
scenario does not feel if SUMMARY's answer requirement is accepted: "answer where it came from", not
"carry the article". The bytes come from iNNtake's own tree, which the operator on one machine has.

## NN Findings: F6 4.3's lock is speculative state by the proposal's own DVC analogy
category:: refactor
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:42, iNNfo/packages/nn-core/src/sync/refresh.ts:272, iNNfo/packages/nn-mcp/src/tools/apply-change.ts:3045, iNNfo/packages/nn-core/src/changeset/execution-facts.ts:42, iNNfo/packages/nn-core/src/changelog/drift.ts:190, iNNfo/packages/nn-core/src/sync/refresh.ts:63
recommendation:: Do not persist a lock. Extend the existing per-citation sha mechanism to the mirror citation (F1's route) and let `EVIDENCE_SOURCE_CHANGED` be the drift signal; revisit a lock only when a real consumer needs the transitive closure.
tags:: [worth-building, lock, drift]

§4.3 says "the content hash is already computed during refresh, it just is not stored", and asks the
panel (§6) whether 4.1 really blocks 4.3. The code says the hash is *already stored*, one layer up
(and §4.2 already promises to record it):

- `RefreshResult.digestBefore/digestAfter` are computed per refresh (`refresh.ts:42-43, 63-69`),
  printed, and not persisted — that part is right. But the per-file shas the digest is built from
  are themselves transient (`digestOf(existing)` / `digestOf(after)`, `refresh.ts:272-273`).
- The durable equivalent already exists for *evidence*: at apply time
  `evidenceShas` hashes each cited file and writes `evidence_sha256` (`apply-change.ts:3045-3051`),
  inherited from the changeset frontmatter map (`execution-facts.ts:42-56`).
- Drift is already detected — and reported as a diagnostic, not an error — by
  `EVIDENCE_SOURCE_CHANGED` in `drift.ts:190-208` when the stamped sha and the current sha differ.
  The proposal's 4.2 promises exactly this diagnostic under the new name `LINEAGE_UPSTREAM_DRIFT`
  (§4.2). That is a rename of an existing mechanism, not a new one.

So a persisted lock file would be a *second* copy of the same fact, in a different format, with no
reader that the existing stamped sha does not already serve. It is the one piece in the four that
matches the README's "speculative state that would need migrating". The conditional part of the
proposal I agree with: if a lock is ever added, DVC's precedent (key on content hash) is the right
answer and 4.1 does not block it — but then it is not "the origin's own locks" and the transitive
closure it was justified by does not exist.

## NN Findings: F7 The export leaks absolute internal paths, and the proposal's "artifact" answer makes that a permanent record
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:255, iNNfo/packages/nn-mcp/src/tools/propose-changeset.ts:71, iNNfo/packages/nn-mcp/src/tools/apply-change.ts:589, iNNfo/packages/nn-core/src/console/files-inventory.ts:236, iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:59
recommendation:: Add one positive check to 4.1: an origin may only be synchronized and cited when the identity it records is machine-portable, and any bundle surface must project paths through a redaction step.
tags:: [privacy, migration, export]

The proposal's risk list names "what a bundle leaks (internal paths and evidence)" as a known risk
but leaves the mechanism open. The code makes the concrete case worse than the summary:

- The sidecar's `origin_uri` is written from the declaration verbatim (`refresh.ts:255`). The
  documented example is `D:/Users/lucas/Documents/_NN/AI_stack_NN`
  (`dominant-design.md` §1.1). So every imported file that is exported carries whatever the
  declaration said — an absolute path in the documented case, a domaiNN-relative one in F2's case —
  and nothing states which.
- The reverse-lineage inventory surfaces it: `files-inventory.ts:236` reads `origin_uri` into
  `originUri`, grouped by it (`files-inventory.ts:386-388`).
- `apply_change` refuses a changeset if any evidence entry cannot be read from *its own* root
  (`apply-change.ts:589`), so a citation that names an export path instead of the origin's path
  cannot be replayed. Anything written into a bundle is by construction unresolvable at the
  recipient.
- `propose-changeset.ts:71-81` resolves `workspace_id`, and `propose-changeset.ts:132` writes it into
  every changeset, so the bundle's own envelope carries the identity fallback too.

§4.4's argument — "if it is exported as an artifact recorded by `produce_artifact`, then it is an
artifact, not a new concept" — is a good argument for not inventing a format and a bad argument
for not inventing a *policy*. An artifact is a permanent recorded file, and the permanence the
proposal buys is permanence of unredacted paths. The domaiNN blueprint's `domaiNN` concept declares
only `name`, `knowledge_dir` and `blueprints_dir` (`iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:59-72`),
so there is no field that could carry a portable identity today. That is a spec change which must
precede both 4.1 and 4.4, and it is absent from the proposal's ordering.

## NN Findings: F8 The scenario's hardest requirement (the screenshot) is not a lineage problem, and the proposal answers it with a second sync
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:111, iNNfo/packages/nn-core/src/sync/refresh.ts:119, iNNfo/packages/nn-core/src/cognitivize/cognitivize.ts:92, iNNfo/packages/nn-core/src/lineage/project.ts:111, iNNfo/packages/nn-core/src/naming/contract.ts:124, iNNfo/packages/nn-core/src/console/fs-source-resolver.ts:52
recommendation:: Split SUMMARY step 3 into two requirements and answer them separately: "trace the video to the mail feed" is 4.2 (evidence over the mirror chain); "embed a screenshot" is byte access, which needs a deliberate asset-fetch decision (copy at generation time, or a sidecar whose media_sha256 is recorded), not a lineage bundle.
tags:: [missing, scenario, assets]

I reproduced the landing to check SUMMARY's "known obstacle" rather than take it on trust. With a
folder origin containing `domaiNN_NN.md`, `kNNowledge/org_NN.md` and
`sources/import/article_20260101T000000Z-1.md`, `refreshSynchronization` landed exactly one file —
`kNNowledge/org_NN.md` — and the consumer tree was `sources/sync/origin/kNNowledge/org_NN.md`.
The article never crossed. (I ran this as a throwaway vitest case in this worktree and deleted it
immediately; `git status --porcelain` is clean.) The mechanism is `refresh.ts:128`
(`isUnderRootSources` skips any origin path under `sources/`) and `refresh.ts:111` (`inDomain`
returns `null` for non-model files).

Two things the proposal gets right about this and one it does not:

- Right: the bytes are not in the consumer, so a `produce_artifact` for the video cannot derive
  them from what was imported.
- Right: the bytes live in iNNtake's `sources/import/`, which SUMMARY states.
- Not addressed: the lineage projection's format vocabulary. `SOURCE_FORMAT_OPTIONS` is
  `txt, md, csv, json, docx, pdf, xlsx` (`project.ts:111`) and `mapSourceFormat` falls back to
  `'md'` (`project.ts:114-117`). The mail feed in SUMMARY step 1 delivers an *article*, and an
  `.html` article imported with a normalizer lands as `source_format: html` (`cognitivize.ts:92`
  writes the raw extension) only for the projection to mislabel it `md`. A pre-existing defect the
  scenario hits at step 1, before any of the four pieces matter.

The proposal's §3 rejection of a second synchronization is defensible on lineage grounds but
incomplete on asset grounds: the three-domain scenario *has* to decide how bytes move, and none of
4.1-4.4 decides it. That decision belongs in the minimum-change answer to §6's last question.

## NN Findings: F9 Hidden coupling: a mirror address means two different things to two validators
category:: refactor
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/validator/workspaceReferences.ts:242, iNNfo/packages/nn-core/src/validator/workspaceReferences.ts:169, iNNfo/packages/nn-core/src/sync/address.ts:38, iNNfo/packages/nn-core/src/sync/address.ts:30, iNNfo/packages/nn-mcp/src/tools/validate.ts:381, iNNfo/packages/nn-core/src/validator/workspaceSources.ts:109
recommendation:: If mirror evidence is adopted, route it through `parseMirrorAddress` and share the mirror-index lookup that `validateWorkspaceReferences` already builds, rather than introducing a second, differently-shaped parser for the same string.
tags:: [coupling, validator, evidence]

The proposal's §5 guesses "whether the console's citation builder and the sources catalog both need
changes for 4.2". The code answers a sharper question: the *reference-field* route and the
*citation/evidence* route already disagree about what a mirror address means.

- Reference fields: `checkToken` tries `parseMirrorAddress` first (`workspaceReferences.ts:242`) and
  dispatches to `checkMirrorToken`, which looks up the alias's own `DomainIndex` through
  `MirrorLookup` (`workspaceReferences.ts:169-223`). `MirrorLookup` is built once per validation
  pass (`validate.ts:381-390`) from directory names under `sources/sync/`, and is handed only to
  `validateWorkspaceReferences` (`validate.ts:363`), never to `validateWorkspaceSources`
  (`validate.ts:370`).
- Citation fields and evidence: `validateCitations` uses `parseCitation` and a `SourceResolver`
  (`workspaceSources.ts:109-135`), with no awareness of `parseMirrorAddress` at all.
- `parseMirrorAddress` itself is pickier than `parseCitation`: it requires the unit via `@`
  (`address.ts:30`), requires `.md` (`address.ts:38`), and rejects `matrix`/`cell`/`concept` units
  (`address.ts:42`), while `parseUnit` accepts all of them and `SLUG_RE` allows a bare `model-id`
  path.

So "make evidence accept a mirror address" has two incompatible readings, and the proposal does not
say which. Whichever is chosen, the *same* string will be validated by two parsers with different
acceptance sets — the exact split-brain the earlier analysis was corrected for. This is a concrete
"missing or wrong" item: the design needs one shared `parseMirrorAddress` call on both paths, or an
explicit statement that evidence citations to mirrors are validated by the mirror index and not by
`validateCitations`.

## NN Findings: F10 `read_lineage` cannot be resolved per-citation without a name for "which domaiNN this edge is leaving"
category:: change
impact:: medium
effort:: low
risk:: low
evidence:: inferred
code_ref:: iNNfo/packages/nn-core/src/sync/address.ts:34, iNNfo/packages/nn-core/src/lineage/project.ts:445, iNNfo/packages/nn-core/src/sync/declarations.ts:47, iNNfo/packages/nn-core/src/changelog/index.ts:146
recommendation:: Make the alias-to-origin resolution decision explicit in 4.2: either treat the alias as the wire identity (cheap, consumer-local, breaks when an alias is renamed) or carry the origin identity in the same string (costlier, honest). Do not leave it implicit.
tags:: [missing, lineage, identity]

The proposal's §4.2 says `read_lineage`, "meeting a mirror evidence, opens the bundle for that
revision and continues". The code says `read_lineage` has nothing to open a bundle *by*.

- `projectLineage` builds edges entirely from strings: `from: citation` (the raw evidence text) and
  `to: ownerOf(site.unit)` (`project.ts:461-466`). There is no field carrying which domaiNN the
  *target* of an edge lives in.
- A mirror citation's only identity is `(alias, path, unit)` (`address.ts:34-43`). The alias is
  unique only *within* a domaiNN (`declarations.ts:47`). Two consumers may both call the same
  origin `aistack`, or one may call it `ai` — nothing reconciles that.
- Evidence items are split by `splitSourceFieldValue`, a comma/bracket splitter with quote handling
  (`sourceRef.ts:277-296`), not by the mirror parser. That is workable for a single mirror citation,
  but it means the evidence list carries no structured alias/path/unit triple — everything
  downstream must re-parse the string, exactly as `projectLineage` does (`project.ts:461`).

Concretely: if `coNNtent_NN` later renames the alias from `aistack` to `ai`, all its applied
evidence still says `sources/sync/aistack/...`, and the log's evidence index key changes with the
*text*, not with the origin. A lock or bundle keyed on "the origin" cannot survive that rename
because there is no key. This is inferred (nothing in the repo documents the intended resolution),
but every input to it is verified above; the proposal should state which one it means.

## NN Findings: F11 Two of the proposal's ordered four are load-bearing; the other two are not, so the order is over-constrained
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:219, iNNfo/packages/nn-core/src/naming/contract.ts:309, iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:24, iNNfo/packages/nn-core/src/sync/refresh.ts:128
recommendation:: Answer the panel brief's last question with "the cheaper minimum": 4.2 alone, plus the byte-access decision in F8, makes the three-domain scenario traceable; 4.1 becomes a hardening of the identity the citation already implicitly carries (alias + path + slug), and 4.3/4.4 become deferred.
tags:: [worth-building, ordering, minimum]

§3's corrected order is identity, then evidence, then lock, then bundle. Two of the four dependency
claims do not survive the code:

- "A bundle without a cross-boundary evidence edge has no reader" — true, and it is why 4.4 waits.
- "Without 4.2 nothing reads [the lock]" — true, and it is why 4.3 waits.
- "Without 4.1 a lock has no domain to key on" — only if the lock must key on a *name*. DVC's
  precedent, cited in the proposal itself, keys on the content hash. The stronger statement in
  *this* codebase is that the mirror citation already carries `(alias, path, slug)`, all of which
  survive a refresh that changes bytes, which is exactly what a lock cares about.
- "Identity leads because it is a spec change first" — this is an argument about *sequencing
  paperwork*, not about dependency. Meanwhile the only part of the scenario that cannot be
  answered at all today is the evidence edge (F1 shows exactly where it fails) — and §3's own
  closing sentence, "the single real contract hole is that `evidence` cannot name a mirror address",
  remains the correct conclusion after the reasoning behind it is corrected by F1.

Minimum change, stated plainly: make `evidence` accept `sources/sync/<alias>/<path>_NN.md@<slug>`
through the mirror-index route `workspaceReferences` already has (F9), record the citation's
per-file sha through the existing `evidenceShas` path (F6), and let `EVIDENCE_SOURCE_CHANGED` be the
drift warning. That makes SUMMARY step 3's "where did this come from" walkable end to end with no
new persisted state, no spec version, and no migration. The screenshot is a separate, smaller
decision (F8). 4.1 hardens it; 4.3 and 4.4 can wait until a consumer demonstrably needs the
transitive closure.

Scope note: this panel is single-provider (`opencode-go`), so the independent-analysis phase has
no second model's reading to triangulate against. Every claim above is checked against the source,
not cross-checked against a peer. The two items I could not raise to `verified` are labelled
`inferred` (F10), and the one behavioural claim (F8) was reproduced by running
`refreshSynchronization` on a throwaway fixture rather than read off the source alone.
