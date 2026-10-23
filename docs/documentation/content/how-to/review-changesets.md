# Review changesets

A **changeset** is the supported way to mutate a domaiNN. Every content change a human should review goes through one: it is proposed, sealed under `changes/`, reviewed in the console, and applied atomically.

## Why not edit files by hand

Hand-editing a `*_NN.md` file looks harmless and breaks the guarantees the domain is built on:

- **No audit trail.** The change leaves no record of who changed what, or why.
- **Citations go stale.** A manual edit does not re-point the element's `sources::` at the change that touched it.
- **Versions do not bump.** `knowledge_version` is a changeset operation; a text editor cannot bump it correctly.
- **Slugs drift.** A renamed element edited by hand loses the immutable `slug::` link to its identity.
- **The lineage record diverges.** The projected sections stop matching the files, and the drift gate reports `LINEAGE_DRIFT`.

A changeset avoids all of this. The engine synthesizes a sealed, recorded change, validates it, applies it in one atomic pass, and re-validates afterward.

## The flow

1. **Propose.** Ask your agent to propose the change. It derives the operations and calls `propose_changeset`:

   ```text
   propose_changeset({
     operations: [
       {
         op: "update_field",
         target: "Aurora_business@founding-team&relationship_model",
         to: "Equal Co-founders (50/50)",
         sources: "sources/import/discovery-call.md@## Founding team"
       }
     ],
     title: "Confirm equity split"
   })
   ```

   Validation runs before any write. An unknown document, an `add_model` on an existing document, or an operation missing required keys returns errors and writes nothing.

2. **Review.** The tool writes a sealed changeset with `status: proposed` under `changes/`, regenerates the domain console, and opens it. The console shows the change as a diff you can inspect. You may add drafts there (edit a field, leave a comment, or add a new element) and export a changeset file from it.

3. **Approve.** Reply **OK** to your agent. The agent calls `apply_change`:

   ```text
   apply_change({ changeset: "changes/Aurora_agent_<stamp>_changes_NN.md" })
   ```

4. **Apply.** `apply_change` validates, persists atomically, bumps each touched document's version exactly once, and re-points the mutated element's `sources::` at the change. After an applied or partially applied changeset the console is regenerated again to show the result.

> [!NOTE]
> The result of `propose_changeset`, `apply_change`, and `regenerate_console` carries `next_steps`. Your agent must relay `next_steps.notice` verbatim — it lists the numbered steps and the OK shortcut. The console is static HTML and cannot call the MCP, so approval always returns through the agent.

## Operation vocabulary

A change is one of these operations. `propose_changeset` takes a structured list; a bare `apply_change` call takes one `op` with `args`.

| Operation | Mutates | Notes |
|---|---|---|
| `update_field` | An element field. | Args: `conceptName`, `elementName`, `fieldName`, `value`. |
| `update_concept_field` | A concept-level field. | Args: `conceptName`, `fieldName`, `value`, `from`. |
| `add_element` | A new element in a concept. | Initial content of an `add_model` change is `add_element` changes that target the new id. |
| `remove_element` | An existing element. | Refused when the element is referenced (`REFERENCED_BY`). |
| `rename_element` | An element's display name. | Preserves the immutable `slug::`. |
| `rename_concept` | A concept name. | Rewrites WikiLinks, matrices, and cross-references deterministically. |
| `update_concept_text` | Concept prose. | |
| `update_matrix_cell` | One matrix cell. | |
| `add_matrix` | A new matrix. | Args: `matrixName`, `source`, `targetConcept`, optional `columns`/`rows`. |
| `remove_matrix` | A matrix. | |
| `comment` | Nothing. | A review note carried in the changeset. |
| `add_model` | A new Level-3 document. | Requires `blueprint_name` and `blueprint_url`; optional `knowledge_version`. |
| `freeze_slugs` | Writes explicit `slug::` lines. | Targets a bare document id. |
| `bump_version` | `knowledge_version`. | Level in `to`: `patch` (default), `minor`, or `major`. |

Operations that mutate a Level-3 document are synthesized into a sealed, recorded changeset even when called as a bare operation. Only `generate_index` and the Level-2 bluepriNNt authoring operations (`add_concept`, `add_field`, `bump_version` on a bluepriNNt) write directly.

## A changeset is itself a document

The changeset written under `changes/` is a valid iNNfo Level-3 document:

```markdown
---
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
status: proposed
title: Confirm equity split
author: agent
---

## NN Change: c-01
op:: update_field
target:: Aurora_business@founding-team&relationship_model
from:: Co-founders & Equity Partners
to:: Equal Co-founders (50/50)
sources:: sources/import/discovery-call.md@## Founding team
```

For large, mechanical batches you may author this file yourself and apply it with `apply_change`; omit `proposal_sha` so the runtime seals it at intake. Prefer `propose_changeset` for interactive, review-driven changes.

## See also

- [Use the domain console](domain-console.md) — where the review happens.
- [Validate a domaiNN](validate-domain.md) — the diagnostics a rejected change returns.
- [Collaborate with Git](collaborate-git.md) — how changesets map onto commits.
