# Verify Report — manifest-release-integrity

Phase: sdd-verify
Date: 2026-09-02
Verdict: **PASS WITH ONE UNMET CRITERION**

> Note on provenance: the `sdd-verify` sub-agent terminated early on a session
> rate limit. It had surfaced one concrete lead before dying — that the
> generator documented "wrong ref kind" as an exit-2 failure without enforcing
> it. That lead was pursued, confirmed as a real defect, and fixed. The
> remaining verification was carried out directly by the orchestrator and is
> recorded here with the evidence for each claim.

---

## Finding: generator did not enforce the channel ref-kind policy — CONFIRMED, FIXED

`generate-manifest.js` declared `exit 2 (… wrong ref kind …)` in its CLI
contract but never inspected the resolved kind. Reproduced against the module
directly: with the stable channel pointed at a ref resolving as a branch, the
generator emitted a manifest pinning that branch tip and returned success.

This inverted the design's central guarantee. Stable pinning an unmerged tip is
the defect the change exists to remove, and the generator is the layer meant to
make it unrepresentable rather than merely detectable — the validator catching
it afterwards is defence in depth, not the guarantee.

Fixed in `77575fe`. Generation now reads the same `CHANNELS` policy table the
validator uses, so the two cannot drift, and judges a ref by what it resolves to
rather than what it is named. Regression tests cover both directions: stable
refuses a branch-kind ref, preview accepts one.

## Success criteria — 5 of 6 met

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Every stable-manifest URL returns HTTP 200 | PASS | 10/10 artifacts fetched from the live manifest (7 skills, 1 mcp bundle, 2 templates) |
| 2 | No `commit` typed by a human; every `ref` resolves in its own repo | PASS | Manifests are generated; `--check` reports both channels up to date, so the published files match generator output exactly |
| 3 | `mcp[].url` contains no `/main/` | PASS | Zero matches for a `/main/` path segment in the live manifest |
| 4 | `manifest-next.md` reachable without altering stable | PASS | Preview returns HTTP 200; stable regenerates byte-identical because it resolves tags |
| 5 | Validator rejects wrong-repo SHA, orphan tip, ref/commit mismatch | PASS | An actioNN ref queried against iNNfo is refused: "not found as a tag or branch in cogNNitive/iNNfo" |
| 6 | "Manifest validation" green **and blocking** on main | **FAIL** | Green, but not blocking — see below |

## CRITICAL — criterion 6 is not met

`main` has **no branch protection** in any of the three repositories
(`GET /branches/main/protection` → 404 "Branch not protected" for iNNfo,
actioNN and eNNvironment). The validator runs and reports, but a red check
cannot stop a merge.

This is the criterion that matters most in context. The original production
defect shipped and stayed live for two days *while CI was red about it*. The
signal existed; nothing enforced it. Making the check blocking is what converts
this change from a better signal into an actual gate.

Enabling branch protection is a repository settings change that alters how the
owner works day to day, so it is left as an explicit decision rather than
applied unilaterally.

## Test suites

| Suite | Result |
| --- | --- |
| `eNNvironment/scripts/validate-manifest.test.js` | pass |
| `eNNvironment/scripts/generate-manifest.test.js` | pass, including the two new ref-kind cases |
| `actioNN/scripts/skills-manager.test.js` | pass |
| `validate --channel stable` / `--channel preview` | both clean |
| `generate --check` on both channels | both up to date (idempotent) |

## Production state

`cognnitive.com/use` HTTP 200. "Manifest validation" on eNNvironment `main`:
success — it had been red since 2026-08-31 reporting the wrong-repo pin.

## Notes

- Tasks 9.3 and 9.4 were unblocked and completed (actioNN `32e1a02`); the
  unrelated work that was contaminating those files was committed separately.
- A release was cut concurrently by another session while this verification was
  interrupted: tags `skills-v1.1.0`, `innfo-mcp-v0.2.2` and `innfo-mcp-v0.2.3`
  now exist, and the stable channel resolves `skills-v1.1.0`,
  `templates-v0.2.0` and `innfo-mcp-v0.2.3`. Verified consistent: the published
  manifest matches generator output with no drift.
- The preview channel's refs now resolve `main` rather than feature branches.
  This satisfies the branch-kind requirement and gives preview a
  merged-but-unreleased meaning, which is coherent — recorded because it is a
  change from the shape the design assumed.

## Remaining

1. Decide on branch protection (criterion 6).
2. Feature branches are intentionally retained; note that preview no longer
   depends on them now that it tracks `main`.
