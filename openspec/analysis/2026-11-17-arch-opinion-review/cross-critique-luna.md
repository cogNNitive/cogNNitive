---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - luna"
---

# NN Critiques

## NN Critiques: Review of sonnet F1
target:: sonnet:F1
stance:: agree

The cited distinction is correct: the raw-byte SHA-256 belongs to imported evidence, while the documented default model-drift check is a semantic fold; strict replay separately compares serialized bodies. Proposal B's canonical hash is therefore not a sound replacement for source-evidence hashes, though the report is right that its model-hash rationale does not describe the current default. Keep provenance hashes over original bytes; changing model serialization is a separate migration question, not a reason to weaken evidence identity.

## NN Critiques: Review of sonnet F2
target:: sonnet:F2
stance:: agree

The lines support the report: L0 defines the meta-language, L0–L2 carry semantics, and documents resolve their declared parent specification rather than a hidden current constant. The proposal's benefit from fewer levels is plausible, but its claimed elimination of resolution and half the validator is not demonstrated. Retaining version-pinned L1 grammar is the safer advice: replacing it with one Zod schema would discard the documented compatibility behavior unless versioning were recreated elsewhere.

## NN Critiques: Review of sonnet F3
target:: sonnet:F3
stance:: agree

The cited model format already has YAML frontmatter, while the custom syntax is principally in the Markdown body; elements also carry prose bodies and those bodies have semantic addresses. The report correctly identifies a real tradeoff the proposal skips: converting every structured element into frontmatter either relocates prose into YAML or needs a second mapping grammar. A generated interoperability projection is materially lower-risk than replacing the source format, especially given the documented no-in-place-migration rule for retired layouts.

## NN Critiques: Review of sonnet F4
target:: sonnet:F4
stance:: agree

The cited manager behavior is more specific than “reinvented npm”: it installs commit-pinned skill subtrees, uses a zero-dependency script and atomic replacement/rollback, and has consent gates. The report also fairly isolates repo-only maintenance as a possible split. Replacing this with an npm package is not substantiated as an equivalent: the cited docs say the relevant package is workspace-only, while the proposal does not account for immutable commit pinning or external-skill licensing.

## NN Critiques: Review of sonnet F5
target:: sonnet:F5
stance:: agree

The cited layout failures are real, but the proposal's “folder = collection” convention does not itself encode the declared storage mode or prevent one instance from being represented twice. Those are the exact invariants the checks enforce, so removing diagnostics without replacing the invariant would trade visible complexity for silent data ambiguity. The report's suggestion to consolidate diagnostic codes while retaining structured details is a more proportionate cure than deleting the model distinction.

## NN Critiques: Review of sonnet F6
target:: sonnet:F6
stance:: partially agree

The cited CLI commands include interactive, long-running, consent-gated, or destructive workflows, so treating them as ordinary MCP request/response calls is not an automatic simplification. The report also identifies genuine sibling MCP tools and the multiplexed changeset interface. However, “near 18 tools” is an estimate rather than a demonstrated target, and reducing count is not itself proof of lower cognitive load; merge only where inputs, outputs, and safety semantics truly coincide. This weakens the recommendation's numeric endpoint, not its core critique of proposal D.

## NN Critiques: Review of sonnet F7
target:: sonnet:F7
stance:: partially agree

The cited distinction is credible: the `_NN` suffix functions as a document marker, while the prose vocabulary and directory names are a separate branding/usability concern; the documented collision examples make a wholesale `domain`/`knowledge` rename risky. The recommendation to measure misspelled paths before renaming is sensible, but it presumes a fixed task suite and does not specify what miss rate would justify the cost. Keep the structural suffix argument, and treat the measurement proposal as a useful experiment rather than a decision rule.

## NN Critiques: Review of sonnet F8
target:: sonnet:F8
stance:: partially agree

The cited documentation does confirm a missing instance-removal operation and reports hand-deletion as `MODEL_WITHOUT_FILE`; calling this a “prohibition” is less precise than calling it a lifecycle gap. A recorded, evidence-bearing removal fits the changeset model better than an unrecorded delete, and avoiding a separate archive is plausible where Git history is retained. But the proposed terminal exception must be narrowly tied to an applied removal event and define reference behavior; otherwise it could turn a missing model file into an accepted state and conceal accidental loss. The finding is right, while its exact validator cure needs that invariant stated.

## NN Critiques: Review of sonnet F9
target:: sonnet:F9
stance:: partially agree

The cited lines distinguish two real cases: current blueprint versions can be upgraded in place through Flow B, while old or broken layouts require a new-domain pointer; the all-or-none blueprint group rule and absence of lazy upgrades are also explicit. That supports the report's partial verdict. Tighten its recommendation, though: “only a retired layout needs a new domain” is too narrow because the cited rule also covers a broken domain, and the upgrade's consent, backup, and rollback controls do not eliminate the documented operational cost. Keeping uniformity is defensible, but documenting the boundary is not a substitute for evaluating per-instance upgrades if that cost is material.

## NN Critiques: Review of sonnet F10
target:: sonnet:F10
stance:: partially agree

The five strengths are broadly supported by the cited descriptions, and the report correctly distinguishes a recomputable `proposal_sha` from authentication. One overstatement remains in saying Git is the “real integrity layer”: ordinary Git history is also alterable by someone with repository write access unless external controls or signatures protect it. The recommendation to describe the seal as accidental-edit detection is sound; signed commits are an option only where the repository's signing and verification policy actually enforces them.

## NN Critiques: Review of sonnet F11
target:: sonnet:F11
stance:: partially agree

The report gets the gate ownership right, but overstates the repeated cost: the cited rule says the banner is session-scoped, `nn` is the sole gate owner, and other skills skip the check once `nn` ran. Thus “drop the mandatory banner and run the gate once per session” mostly restates the documented behavior rather than removing a recurring per-skill cost. The concern that MCP startup cannot simply replace connection and workspace-source audits remains fair, and the proposal's two-skill consolidation still omits distinct ingestion, authoring, and upgrade workflows. The partial verdict is reasonable, but its claimed gate savings are not demonstrated; skill-context savings also remain unmeasured.

## NN Critiques: Review of sonnet F12
target:: sonnet:F12
stance:: agree

The report checks the most concrete alleged behavior: `MODEL_EXISTS` is the collision error for a move into an occupied id, while the reference diagnostic discusses a missing model and names a recorded successor after a move. That does not substantiate the opinion's claim that `move_model` rejects dangling references. Its narrower conclusion is balanced: typed references, placement, and cross-file integrity checks are relational-style features, but the cited query/collection behavior does not make this a database engine. The suggestion to correct the factual description rather than invent a new proposal is appropriate.