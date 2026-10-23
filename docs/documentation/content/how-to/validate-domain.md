# Validate a domaiNN

Validation in cogNNitive is deterministic. The engine (`@cognnitive/nn-core`) evaluates structural integrity, schema compliance, citation freshness, and lineage consistency, and returns structured diagnostics — never prose. There are three surfaces: one document, the whole domain, and the repository gate.

## Validate one document

`validate_knowledge` checks a single Level-3 document against the bluepriNNt resolved from its `parent_spec.url`:

```text
validate_knowledge({ id: "Aurora_business" })
```

It accepts either `id` (reads from disk) or `content` (raw text), plus an optional `blueprint_url` when the document has no resolvable parent. Pass `scope_domain: true` to also run cross-document reference validation across the whole domain.

## Check the whole domain

`check_domain` runs one consolidated integrity pass over every Level-3 document:

```text
check_domain({ domain: "Aurora" })
```

It validates each document against its bluepriNNt and traceability, self-heals missing blueprint packages and specs (write-once hydration), classifies each pinned bluepriNNt version against the published catalog, and compares the managed sections of the lineage record with a fresh projection. The report carries a per-document status, a domain aggregate, and a `lineage` field that surfaces `LINEAGE_DRIFT` as an error. The pass is non-blocking and informational — validation failures never fail the tool.

To inspect a single citation end to end, use `resolve_sources`, which returns the underlying file, anchor, existence, and content for an element's citation-typed fields:

```text
resolve_sources({ knowledge_id: "Aurora_business", elementId: "Founding Team" })
```

## The repository gate

The cogNNitive repository itself is guarded by a deterministic verification runner:

```console
$ node scripts/verify.js
```

`verify.js` is offline and deterministic. It runs the inventory, static type-safety, and freshness guards, and includes the lineage drift check, so a hand-edited lineage record cannot slip through CI. Use `--fast` for branch pushes that skip the slow suites, and `--only=<substring>` to run a single check.

> [!NOTE]
> `scripts/verify.js` is the gate for the cogNNitive source repository, not a user-domain tool. To validate your own domaiNN, use `validate_knowledge` and `check_domain`.

## Common diagnostics

The validator emits a stable `code` (or check `id`) with each diagnostic. The most common:

| Diagnostic | Severity | Cause | Fix |
|---|---|---|---|
| `KU_DANGLING_FILE` | error | A cited source file does not exist at the written path. | Correct the domaiNN-relative path, or restore the file. |
| `KU_UNKNOWN_SLUG` | warning | A `@## <Heading>` anchor does not match any heading in the cited file. | Fix the heading text in the citation, or restore the heading. |
| `KU_MALFORMED` | error | The reference is not valid grammar (a line range, a `src-NNN` id, a bad pointer). | Use `<path>@## <Heading>`, `<csv>@<row>`, or `<json>@/<pointer>`. |
| `KU_BINARY_TARGET` | error | A binary file is cited directly. | Cite its sidecar (`<file>.<ext>_sidecar_NN.md@## <Heading>`). |
| `KU_EXCLUDED_PATH` | error | A citation points into `staging/`. | Move the file into `sources/import/` and cognitivize it. |
| `KU_DEPRECATED_HASH` | warning | The legacy `#slug` anchor form is used. | Migrate to the `@` pointer form. |
| `QU_NOT_PROVENANCE` | error | A `?filter=` query is used as a citation. | Run the query, then cite the resulting `@` pointers. |
| `KU_EMPTY_KEY` / `KU_DUPLICATE_KEY` | error | A cited CSV has no unique, non-empty first-column key. | Give the first column a unique key, or cite a curated CSV. |
| `KU_UNKNOWN_ROW` / `KU_UNKNOWN_COLUMN` | error | A CSV row id or column name does not exist. | Correct the row id or column. |
| `KU_UNKNOWN_POINTER` / `KU_INVALID_JSON` | error | A JSON Pointer does not resolve, or the JSON is invalid. | Correct the RFC 6901 pointer. |
| `NN_NAME_INVARIANT` | warning | The file stem does not equal or end with the declared bluepriNNt. | Rename to `<name>_<blueprint>_NN.md`. |
| `DUPLICATE_SLUG` | error | Two elements share the same `slug::`. | Give each element a unique slug; never copy a `slug::` line. |
| `UNFROZEN_MODEL` | warning | The document has elements without explicit slugs. | Freeze slugs (`freeze_slugs`) before mutating. |
| `L3_SCHEMA_COMPONENTS` | error | A Level-3 document declares schema components in its frontmatter. | Move them to the parent bluepriNNt. |
| `body-concept-sections` | error | The body has no `# NN <Concept>` sections. | Add one section per concept declared by the bluepriNNt. |
| `fm-parent` / `fm-level` / `fm-version` | error | Frontmatter is missing or invalid (`level`, `parent_spec`, `knowledge_version`). | Fix the frontmatter to the canonical shape. |
| `body-type-model-retired` | error | The retired `type:: model` keyword is used. | Use `type:: knowledge`. |
| `MARKERS_REMOVED` | error | Retired marker constructs are present. | Replace flags with `tags` values and valued markers with ordinary fields. |
| `SCHEMA_OP_ON_LEVEL3` | error | `add_concept`/`add_field` was applied to a Level-3 document. | Use element-level changeset operations instead. |
| `LINEAGE_DRIFT` | error | A managed lineage section differs from a fresh projection. | Regenerate with `sync_lineage`; never hand-edit the record. |
| `SIDECAR_SUBJECT_MISMATCH` | error | A sidecar's `source_file` does not match the subject its name derives. | Re-run `cognitivize` on the raw file. |
| `MODEL_EXISTS` | error | `init_knowledge` was called with an id that already exists. | Choose a new id; the existing file is left untouched. |
| `UNKNOWN_OPERATION` | error | `apply_change` received a retired or unknown operation. | Use a supported operation from the changeset vocabulary. |

## See also

- [Validator behavior](../concepts/validator-behavior.md) — severity, ordering, and the resolution order.
- [Import and cite sources](import-sources.md) — the citation grammar the diagnostics refer to.
- [Sync lineage and back up a domaiNN](sync-and-backup.md) — the drift gate in practice.
