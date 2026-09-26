# Delta for Template Cache Staleness Detection

## MODIFIED Requirements

### Requirement: Workspace scan reports stale specs as ACTION_REQUIRED

With `--workspace-dir`, the preflight MUST recursively scan `<workspace>/specs/`
(incl. `specs/templates/**`) for iNNfo spec/template markdown files and
content-hash compare each file **only against a remote URL that identifies the
file itself**. It MUST read the file's own `spec_url`; `parent_spec.url` MUST
NOT be used as a comparison URL, because it names the parent document, not the
file. A file is compared only when its own `spec_url` resolves to the same
document it holds — the URL's basename equals the local filename, or (canonical
package layout) the URL's basename is the generic `spec_NN.md`/`spec.md` and the
URL's parent directory equals the local file's parent directory. Each stale
entry (path + URL) is reported as ACTION_REQUIRED (exit 1).

(Previously: the scan used `spec_url` **with a `parent_spec.url` fallback**,
which compared every authored specialization/model against its parent template
and reported a guaranteed false `stale`.)

#### Scenario: Stale spec blocks preflight

- GIVEN `--workspace-dir` with a stale spec in `specs/` whose `spec_url` names that file
- WHEN the scan runs
- THEN the stale file is listed (local path and URL)
- AND the exit code is 1 with ACTION_REQUIRED

#### Scenario: All-fresh workspace passes

- GIVEN `--workspace-dir` with all-fresh specs in `specs/`
- WHEN the scan runs
- THEN no stale entries are reported and the exit code is 0

#### Scenario: Derived document is never stale

- GIVEN a specialization template under `specs/` whose `parent_spec.url` points
  at a different canonical template and which declares no self-identifying `spec_url`
- WHEN the scan runs
- THEN the file is skipped (no `spec-freshness` entry, not `stale`)
- AND the exit code is not raised because of it

#### Scenario: Mislabeled spec_url is not stale

- GIVEN a file under `specs/` whose `spec_url` names a different document than
  the one it holds
- WHEN the scan runs
- THEN the file is skipped and not reported as `stale`

---

### Requirement: Unresolvable/unreachable remotes are non-blocking

Files without a resolvable **self-identifying** `spec_url` MUST be skipped
silently. An unreachable remote MUST be reported as a warning, not a blocker.

#### Scenario: Spec without canonical URL skipped

- GIVEN a file under `specs/` without a self-identifying `spec_url`
- WHEN the scan runs
- THEN the file is skipped silently and not reported

#### Scenario: Remote unreachable: warning

- GIVEN a spec whose canonical remote is unreachable
- WHEN the scan runs
- THEN the entry is a warning and the exit code is not 1 due to it
