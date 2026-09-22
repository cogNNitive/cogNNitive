# Proposal: Preflight Spec Freshness Identity Guard

## Context & Motivation

`nn-preflight --workspace-dir` scans `<workspace>/specs/**.md` and content-hashes
each file against its remote URL, reporting divergent files as `[STALE]` with
`ACTION_REQUIRED` (exit 1). The scan resolves that URL as:

```js
const url = fm.spec_url || (fm.parent_spec && fm.parent_spec.url)
```

`parent_spec.url` is a **provenance pointer to the parent document**, not the
canonical URL of the file itself. For any authored document (a Level-2
specialization template, or a Level-3 model) its bytes can never equal its
parent's, so the comparison is guaranteed to report `stale` even though nothing
is wrong. The reported remediation ("delete/replace the local cached copy under
`specs/`") is destructive: following it deletes legitimate custom templates.

Observed in the real workspace `D:\Users\lucas\Documents\_NN\arenzano\specs`:
18 false `stale` entries (e.g. `arenzano_business_V_0-3-0_NN.md`, whose
`parent_spec.url` points at the canonical `business_V_0-1-0`). Those files
declare `specification_url` (legacy field) plus `parent_spec.url`; they do not
declare `spec_url` at all. The 8 files that *do* declare `spec_url` are genuine
caches and were correctly handled.

A second failure mode exists because `spec_url` is not reliably self-identifying
either: sample models under `docs/` carry a `spec_url` that points at the iNNfo
Level-1 spec, so a naive `spec_url`-only comparison would still compare the
wrong document.

## Proposed Solution

Only judge a file `stale` when the remote URL **identifies the file itself** —
i.e. it is a cache of that document:

1. Read the file's own `spec_url` (`parent_spec.url` is never a comparison URL).
2. Skip the file unless the URL's basename equals the local filename, or — for
   the canonical package layout the canonical URL basename is the generic
   `spec_NN.md` / `spec.md` — the URL's parent directory equals the local file's
   parent directory.
3. Replace the destructive remediation text with a non-destructive one
   (rehydrate via `check_workspace` / re-resolve; never hand-delete under
   `specs/`).

Files that do not self-identify are skipped silently, exactly like files with no
URL today — the scan stays non-blocking for everything it cannot prove.

## Impact

- `skills/nn-preflight/scripts/preflight-check.js` — `scanWorkspaceSpecs()` and
  the human report's stale remediation line.
- `skills/nn-preflight/scripts/preflight-check.test.js` — new RED-first tests.
- Spec `template-cache-staleness-detection` — two MODIFIED requirements.
