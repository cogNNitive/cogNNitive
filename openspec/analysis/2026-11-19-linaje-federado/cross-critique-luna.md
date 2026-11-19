---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
  knowledge_version: "V_0-1-0"
title: "Cross critique - luna"
---

Panel note: single-provider (`opencode-go`). Not cross-provider triangulation.

# NN Critiques

## NN Critiques: Review of deepseek F1
target:: deepseek:F1
stance:: partially agree

DeepSeek is right that `parseAddress` routes `sources/` paths to `kind: source`, so `MODEL_CITED_BY_PATH` is not the rejection for a mirror path (`address/parse.ts:42-66`). But the specific mirror form `..._NN.md@<slug>` still does not pass the current citation parser: `.md@...` is parsed as a raw-file heading citation, which requires a heading unit (`sourceRef.ts:604-637`). The absolute-path guard applies to absolute paths, not the relative mirror path (`sourceRef.ts:492-513`); and a citation rejected by `parseCitation` returns `MALFORMED`, before the resolver can report `DANGLING_FILE` (`console/citations.ts:226-235`). So the proposal's explanation is wrong, but DeepSeek's replacement diagnosis is not complete: evidence needs a mirror-aware unit parser and resolver, not just a changed path guard.

## NN Critiques: Review of deepseek F2
target:: deepseek:F2
stance:: agree

The code resolves `s.origin` into `originAbs` for filesystem access, but passes the original `s.origin` into the import metadata (`sync/refresh.ts:186-188, 253-259`); cognitivization writes that metadata into the sidecar (`cognitivize/cognitivize.ts:99-110`). That is an existing mismatch 4.1 should account for. The relative-path consequence depends on the caller's working directory; the cited code alone does not establish that it is resolved relative to the domain.

## NN Critiques: Review of deepseek F3
target:: deepseek:F3
stance:: partially agree

Generated proposed changesets include `workspace_id`, defaulting to the manifest value or a folder-derived slug (`tools/propose-changeset.ts:68-80, 121-133`). The log loader does not copy it into `ChangesetLike` (`changelog/load.ts:98-110`). However, exposing that value in the log does not make it a stable global identity: the fallback is a folder slug, and the value is consumer/workspace metadata. It may reduce duplication, but it does not establish that a separate `domain_id` is unnecessary.

## NN Critiques: Review of deepseek F4
target:: deepseek:F4
stance:: partially agree

The local evidence-to-lineage seam is real: `projectLineage` builds evidence edges from the change log (`lineage/project.ts:461-465`), and the changelog indexes evidence from logged changes (`changelog/index.ts:233-253`). That supports extending rather than rewriting the local pipeline. It does not establish that accepting a mirror citation makes the cross-domain chain walkable: `ownerOf` resolves against the current projection's knowledge models (`lineage/project.ts:437-450`), and the projection shows no traversal into another domain.

## NN Critiques: Review of deepseek F5
target:: deepseek:F5
stance:: partially agree

The mirror exclusion is verified: `readLineageSnapshot` skips `sources/sync` (`lineage/fs-snapshot.ts:17-29`). The projection also skips binary bytes (`lineage/fs-snapshot.ts:1-5, 14-29`), so a lineage bundle built only from that projection cannot satisfy an asset-carrying requirement. But "no gap to fill" does not follow: the proposal describes a hash-named, persisted projection (`dominant-design.md:4.4`), while a live traversal would depend on the origin remaining resolvable and available. Those are distinct properties. The bundle may be deferrable for the stated local scenario, but its value for historical or unavailable-origin access is not disproved.

## NN Critiques: Review of deepseek F6
target:: deepseek:F6
stance:: partially agree

The existing mechanism persists per-evidence hashes and emits `EVIDENCE_SOURCE_CHANGED` when the current file hash differs (`tools/apply-change.ts:3045-3054`; `changelog/drift.ts:190-208`). That may be enough if the requirement is only a stale-citation warning. It does not retrieve the prior bytes, nor identify and open an immutable upstream lineage bundle for the recorded revision. The proposal connects a recorded revision to bundle traversal, which a warning alone does not implement.

## NN Critiques: Review of deepseek F7
target:: deepseek:F7
stance:: partially agree

The path-leak risk is concrete: refresh writes the declared origin into sidecar metadata (`sync/refresh.ts:253-259`), and the inventory exposes `origin_uri` and `origin_path` (`console/files-inventory.ts:226-237`). If a bundle exports those fields, its export policy needs to be explicit. But requiring every origin identity to be machine-portable conflates identity with location: a stable `domain_id` can be portable while `origin_uri` remains a local locator. A redaction or allowlist policy is better justified than requiring every synchronization location to be portable.

## NN Critiques: Review of deepseek F8
target:: deepseek:F8
stance:: partially agree

The asset gap is supported by the code: domain synchronization skips files under root `sources/`, and for a domain origin does not import non-model files (`sync/refresh.ts:100-111, 119-132`). The lineage snapshot also skips binary files (`lineage/fs-snapshot.ts:1-5, 14-29`). Therefore mirror lineage alone will not deliver the screenshot bytes. The `.html` format concern is conditional: the projection maps unlisted formats to `md` (`lineage/project.ts:111-117`), but the cited scenario does not establish that its article is HTML.

## NN Critiques: Review of deepseek F9
target:: deepseek:F9
stance:: agree

The validators currently use separate routes. Reference fields parse mirror addresses and consult the mirror lookup (`validator/workspaceReferences.ts:169-194, 231-243`); workspace-source and evidence validation uses `parseCitation` and a `SourceResolver` (`validator/workspaceSources.ts:109-145`). The MCP validation call passes the mirror lookup to reference validation, but not to source validation (`tools/validate.ts:358-371`). Reusing a shared mirror parser and resolution contract for evidence is a concrete design requirement, though the existing reference parser accepts only element and body units (`sync/address.ts:27-43`).

## NN Critiques: Review of deepseek F10
target:: deepseek:F10
stance:: partially agree

A mirror address encodes a local alias, path and unit (`sync/address.ts:16-24, 27-43`), and aliases are only required to be unique within a domain (`sync/declarations.ts:47-63`). The lineage edge retains the citation string (`lineage/project.ts:461-465`). That makes alias renames and cross-domain identity a real contract to define. Still, the alias can resolve a mirror within the current workspace; the problem is that it is not a portable, stable origin identity for recursive bundle lookup.

## NN Critiques: Review of deepseek F11
target:: deepseek:F11
stance:: disagree

The proposed cheaper minimum is not shown to make history walkable end to end. The current snapshot deliberately excludes mirrors (`lineage/fs-snapshot.ts:17-29`), and local lineage edges are built from the local log (`lineage/project.ts:461-465`). Reusing per-citation hashes can warn that the mirror changed (`changelog/drift.ts:190-208`), but it cannot recover the cited revision's history or bytes. A local alias-based prototype may defer `domain_id`, but the proposed hash-and-warning substitute does not establish the cross-domain traversal F11 claims.

# NN Findings

## NN Findings: N1 Sidecar copy provenance is not a lineage edge
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:253-259, iNNfo/packages/nn-core/src/lineage/project.ts:267-316, iNNfo/packages/nn-core/src/lineage/project.ts:461-475
recommendation:: Define whether federated lineage must traverse `origin_uri` and `origin_path` from imported-file sidecars; if so, represent and resolve that provenance explicitly rather than assuming evidence traversal covers it.
tags:: [lineage, provenance, missing]

Refresh records synchronization alias, origin URI and origin path in imported-file metadata (`sync/refresh.ts:253-259`). The lineage projection turns sidecars into source records and derives `derived_from` from declared citations or `fm.sources` (`lineage/project.ts:267-316`); its graph edges are built from change-log evidence and produced artifacts (`lineage/project.ts:461-475`). Thus an imported raw file's sidecar origin metadata does not itself connect that source to its upstream. This matters if "trace back" includes raw-file copy provenance, not only model evidence.
