# Decision: legacy format tolerance stays inline

Date: 2026-11-19
Status: accepted

## Decision

The tolerance for pre-canonical documents stays where it is: in the parser and the
citation resolver. No `nn-compat` module, no `legacy-adapter`, no new import edge
between the canonical grammar and the forms it still accepts.

## Why

A legacy audit proposed isolating the "legacy parsers" behind a compatibility module.
Measured against the code, the tolerated surface is four small pieces, and only two of
them tolerate an older format:

| Form | Where | Size | Why it must stay |
|---|---|---|---|
| `specification_version` / `specification_url` fall back to `spec_version` / `spec_url` | `nn-core/src/parser/yaml.ts`, `normalizeLegacyFieldNames` | 4 lines | Level-2 specs published before the FORMAT→iNNfo rename carry only the old key. Published specs are write-once, so the documents that need this can never be migrated. |
| `#slug` citation sets `legacyHash` and raises `KU_DEPRECATED_HASH` | `nn-core/src/sourceRef.ts`, read in `validator/workspaceSources.ts` | 3 lines | Citations live in variations and provenance. Rewriting them would break the evidence chain they record. |
| A bare operation is synthesized into a sealed changeset | `nn-mcp/src/tools/apply-change.ts`, `synthesizeAndExecuteChangeset` | — | Not tolerance. This is the current MCP entrypoint, documented in the tool description. |
| Removed marker constructs are rejected with a repair recipe | `nn-core/src/validator/removed-constructs.ts` | — | Not tolerance. It refuses old shapes and names the fix; deleting it would let broken models through silently. |

Seven lines of real tolerance do not justify a module, an import edge and a rewrite of the
parser that reads every document in the system. A compatibility module would relocate the
code without changing a single observable behaviour, on the riskiest path in the repo, and
would add a second place where a format bug can hide.

## The distinction worth keeping

- **Tolerance** reads a form that no longer exists so a document written earlier still
  resolves. Cheap, load-bearing, stays.
- **Debt** is code nobody needs; it goes. This is what #741 and #744 removed.
- **Detector** refuses a removed shape and names the repair. It is a product feature.
- **Feature** is current behaviour that happens to look like compatibility, such as bare
  operation synthesis.

Only the first needs a rule.

## Consequences

- New tolerance needs four things: the document class it serves with a real example, a test
  that pins it, a diagnostic code that reports its use, and a version bump when it changes
  canonical output.
- Removing a tolerance is a heavy-lane change: prove that no published document and no
  recorded citation uses the form. Citations inside variations are the hard case, because
  they are evidence rather than content.
- A retired template keeps resolving through the catalog's `frozen` set rather than by
  deletion; see `keep-published-paths-frozen.md` for the path rule and `blueprint-catalog.mjs`
  for `FROZEN_NAMES`.
