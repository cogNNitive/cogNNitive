# audit-remediation — close the open findings of the 16–19 Nov audit

Objective: land the findings of the two-day audit (`remove_model`, CI, session tooling,
console, coNNtent, docs) as one PR per area, in an order that keeps disjoint areas apart.
Branch: one session worktree per area. Delivery: one PR per area to `main`; merging is the
maintainer's call. Test runner: `node --test`, `npm run verify:fast`.

## Specs

- **S1 — Claims are trimmed, not fixed.** Delete `scripts/release-claim.mjs`, its test, and the
  `merge_group` step in `ci.yml`; keep `claim-check` as an optional pre-session tool and
  `claim-audit` as the advisory net.
- **S2 — The console size gate measures raw bytes.** `total` keeps measuring the rendered
  HTML on disk (never gzip). The gate additionally sees the **decompressed** model payload,
  because the page ships it deflate-raw + base64 and the browser inflates it.
- **S3 — A citation may target a model only if it is closed.** Out of scope here: decided and
  in flight in the `session/closed-model-citations` worktree (`CITATION_NOT_CLOSED`,
  `evidence_sha256` of a closed model, calculated data modelled as a closed run). This batch
  must not touch `nn-core/src/console/citations.ts`, the `changes` blueprint, or evidence
  validation.
- **S4 — The MCP tool surface keeps its names.** 24 tools stay 24; ambiguous descriptions are
  fixed instead (`validate_knowledge` vs `validate_blueprint`, and siblings).
- **S5 — coNNtent animation unification: T1 + T2 now, T3 later.** Validated `template::` /
  `beats::` Layer fields and the builder hook with a freshness hash and a per-mount derived
  composition id (closes #608). Moving template code into the domain library waits.
- **S6 — The console payload caps per-element history.** Last 12 hops per element, configurable
  like the size budget, with an explicit notice pointing at the lineage when it truncates.

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| A1 | S1 | inline | complete | `ci-session-tooling`: `release-claim` deleted, `merge_group` step gone, doc/skill text aligned |
| A2 | — | inline | complete | same PR: `build:dist` in CI, full-history format check with `set -e`, `release-bump` on `main` |
| A3 | — | inline | pending | session tooling: `neverCommitted` reflog, `sweep` real path (#721), `claim-check` UTF-16 loader, skill/hook wording, `skills status --json` |
| B1 | — | blocked | pending | `remove-model-hardening`: waits for #730 → #731 → T5 to merge (all rewrite `apply-change.ts`) |
| C1 | S2 S6 | inline | pending | console: history cap + notice, decompressed payload in the gate, changeset-aware freshness, dead code, one `nn-model` reader, CSP hashes, deep link, output name, "QA passed" |
| D1 | — | inline | pending | coNNtent: avatar resolutions by `api_id` + #657 |
| E1 | S5 | inline | pending | coNNtent animation T1 + T2 (heavy: published spec change, needs a delta spec) |
| F1 | S4 | inline | pending | MCP tool descriptions |
| G1 | — | inline | pending | docs: D8–D10 wording + the `master.md` fenced-block generator bug |

Dropped from the audit after verification (evidence, not opinion):

- **`push-release-tags.test.mjs` can fail.** Removing `--atomic` keeps it green, but replacing
  the single push with a per-tag loop turns it red — and #725 *was* a loop. The test pins the
  regression it claims to pin.
- **`atomic-fs-tar.test.js` is not vacuous in CI.** `extractTarball` feeds the archive on stdin,
  and CI runs on Linux, where the `host:archive.tar.gz` fixture is used and the path-as-argument
  bug would fail. Only a Windows contributor's local run is weak, which is not where the gate is.

## Log

- **L1** (2026-11-19, user, verbatim): "Antes quiero terminar de tomar las decisiones para que,
  una vez se hayan tomado las decisiones, puedas avanzar hasta el final de forma autónoma en tu
  propio world tree".
- **D1** (claims): user answered `1a` — trim.
- **D2** (console size): user answered "No medimos gzip en vez de bytes crudos".
- **D3** (T5): decided in the T3 thread `9042ca58` ("adelante hasta el final con todo"); that
  worktree is live, so this batch stays out of its files.
- **D4** (MCP tools): user answered `a` — no consolidation, fix descriptions.
- **D5** (coNNtent animation): user answered `a` — T1 + T2 now, T3 later. History cap: 12 hops.
- **D6** (console history): user answered `a` — per-element cap with a notice.
