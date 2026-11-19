# Linaje federado entre domaiNNs — review corpus

Purpose: decide whether the dominant conclusion of the current analysis (extend
Synchronization with `domain_id` + lock + lineage bundle + federated `evidence`, instead
of rewriting the sync/provenance layer) is correct, and whether the proposed mechanism is
worth building at all.

## Files in this folder

| File | Role |
|---|---|
| `README.md` | This brief. Read it first. |
| `review-panel_spec_NN.md` | The report format contract. Every report follows it. |
| `dominant-design.md` | The analysis under review, in full detail. This is the document being judged. |
| `SUMMARY.md` | Short summary of the three-domain scenario. Read after `dominant-design.md`. |

## What is NOT in this folder

The repository code is in this worktree. Every claim about the system must be checked
against it. Starting points, none of them exhaustive:

- `iNNfo/packages/nn-core/src/sync/refresh.ts` — what a refresh lands, and what it records
- `iNNfo/packages/nn-core/src/sync/address.ts`, `sync/declarations.ts` — mirror addressing and the Synchronization declaration
- `iNNfo/packages/nn-core/src/sourceRef.ts` — citation grammar (what `evidence` accepts)
- `iNNfo/packages/nn-core/src/lineage/project.ts` — what `read_lineage` projects and from where
- `iNNfo/packages/nn-core/src/cognitivize/cognitivize.ts` — sidecar origin keys (`origin_uri`, `origin_path`)
- `iNNfo/packages/nn-core/src/validator/workspaceSources.ts` — evidence validation
- `iNNfo/packages/nn-core/src/validator/workspaceReferences.ts` — `type:: reference` resolution
- `iNNfo/packages/nn-mcp/src/tools/validate.ts`, `tools/change-args.ts` — the MCP side of both
- `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md` — the domaiNN blueprint (identity fields)
- `iNNfo/specs/bluepriNNts/sources/spec_NN.md` — the Synchronization declaration
- `docs/documentation/content/how-to/synchronize-an-origin.md` — the documented behaviour

Commands you may run read-only: `git log`, `git show`, `rg`, `node --test <file>`. You may
run the existing test suites. Do not write outside the one file you own.

## What we need from you

Judge the proposal on four axes, and say which axis each finding is about:

1. **Are the conclusions correct?** Every factual claim in `dominant-design.md` about
   current behaviour, checked against the code at the stated SHA. Mark each claim
   verified / wrong / overstated.
2. **Is reusing the existing mechanisms the right call?** The proposal argues "no rewrite".
   Attack or defend that with code evidence. If the layering really is spaghetti in a way
   that taxes every future change, say where and prove it.
3. **Is it worth building?** The motivating scenario is a three-domain content pipeline.
   Say what the minimum change is that makes the scenario work, and whether the proposed
   four pieces each earn their place, or whether one of them is speculative state that
   will need migrating.
4. **What is missing or wrong in the design?** Grass-city: hidden coupling, contract
   breaks, migration pain, security/privacy of exported lineage, performance, and any
   simpler mechanism already in the codebase that the proposal overlooked.

Do not invent problems to fill a quota. Five to twelve real findings beat twenty
speculative ones. A finding without a real `code_ref` into this repository is dropped.
