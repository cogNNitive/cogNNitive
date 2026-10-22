# Validator Behavior

Validation is **deterministic**: the same input produces the same diagnostics. Two
knobs shape what a run reports — a baseline that suppresses known errors, and
severities that decide whether a diagnostic fails the run.

---

## Deterministic diagnostics

- A diagnostic carries a severity of `error`, `warning`, or `info`
  (`iNNfo/packages/nn-core/src/types/validation.ts`).
- `Diagnostics` (`iNNfo/packages/nn-core/src/diagnostics.ts`) routes each diagnostic into an
  errors bucket or a warnings bucket by its severity. `info` lands in the warnings
  bucket but keeps `severity: 'info'` so reporters can tell it apart.
- **Only `error` fails validation.** `warning` and `info` never affect the
  `valid` flag.

---

## Differential validation (`baseline_path`)

Pass `baseline_path` to `validate_knowledge` to compare the current run against a
versioned baseline of known errors. Only **new** errors surface in the main
output; known errors are suppressed and counted with a `backlog` link.

The core logic is a pure module, `iNNfo/packages/nn-core/src/validator/baseline.ts`:

| Export | Role |
| :--- | :--- |
| `normalizeBaselinePath` | Normalizes a file path to forward slashes so fingerprints are OS-stable. |
| `fingerprint` | Stable key: file path + diagnostic path + rule code + normalized message. |
| `loadBaseline` | Parses raw baseline content; `null`/empty → `null` (full output). |
| `diffNewOnly` | Partitions current errors into new vs. suppressed, and reports stale entries. |

Behavior:

- **Fingerprint stability.** Rewording a hint does not move the fingerprint; a
  code change does — rule codes are frozen once shipped.
- **Suppression + backlog.** With a baseline, suppressed errors are hidden from the
  main output and counted (`Suppressed N known error(s) (backlog: …)`).
- **Stale entries.** A baseline entry matching no current error is reported as
  `info` (`BASELINE_STALE`) and **never fails** validation.
- **No baseline → full output.** A missing file, no `baseline_path`, or empty
  content yields every error as new and nothing as stale.
- **Malformed baseline → hard error.** A present-but-invalid baseline throws
  `BASELINE_INVALID` rather than silently suppressing nothing.

---

## Version inference at scaffold time

`iNNfo/packages/nn-mcp/src/tools/init-knowledge.ts` (the `init_knowledge` tool) infers a new kNNowledge document's version from the resolved **parent bluepriNNt**:

- Omitting `knowledge_version` inherits the bluepriNNt's `blueprint_version`, else its `spec_version`, else `V_0-1-0`.
- An explicit `knowledge_version` is **accepted even when it differs** from the parent's version — there is no `VERSION_MISMATCH` rejection at scaffold time.
- The id is `<name>_<blueprint>` and carries no version; the server drops any `_V_x-y-z` token and appends the blueprint suffix when missing.

`init_knowledge` is create-only and implemented as a one-change `add_model` changeset (written to `changes/` and applied). If the parent bluepriNNt **cannot be resolved, the call fails and writes nothing** — no frontmatter-only document is produced and there is no warning-only fallback. An existing id fails with `MODEL_EXISTS` and leaves the file untouched.

---

## Resolver: domaiNN-first, temp writes

`iNNfo/packages/nn-mcp/src/tools/resolver-node.ts` resolves a parent chain in a fixed order:

1. **Direct local read** — when the parent URL is a local path or `file://`
   URI, it is read directly (confined to the domain root).
2. **Local package resolution** (`resolveBlueprintPackage`, exported from `nn-core`) —
   Tier 1 domaiNN package (`specs/bluepriNNts/<name>/spec_NN.md`, or the versioned
   `specs/bluepriNNts/<name>/<version>/` directory), Tier 2 domaiNN flat
   (`specs/`), Tier 3 global user cache (`~/.agents/bluepriNNts/`), Tier 4 installed
   skills (`~/.agents/skills/<skill>/bluepriNNts/`).
3. **OS temp cache** — a previous default run's fetched specs.
4. **Network** — download and hydrate.
5. **Built-in Canonical Fallback Registry** — the canonical bluepriNNts bundled with the server, used when nothing else resolves.

Fetch-and-save writes go to the **OS temp directory by default**, not the
domaiNN:

- `defaultCacheDir()` returns `INNFO_CACHE_DIR` when set, otherwise
  `join(tmpdir(), 'innfo-specs')`.
- Setting `in_place: true` restores in-tree writes under `specs/`.

So a default run leaves the domaiNN tree clean; nothing is written into `specs/`
unless `in_place` is requested.

---
## Version numbers

Do not copy version strings from `specifications.md` — it can lag the code. Read
the authoritative version from `catalog.json` or the artifact's own frontmatter
(`spec_version`, `blueprint_version`, `knowledge_version`).
