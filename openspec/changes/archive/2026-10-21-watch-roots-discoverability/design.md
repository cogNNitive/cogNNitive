## Context

The External Watch Roots capability shipped in `2026-09-12-external-watch-roots-and-timestamped-sources` and `2026-09-30-external-watch-roots-session-digest` (both archived). It is implemented in `skills/nn-sources/scripts/lib/external-scanner.js` and `watch-digest-store.js`, driven by `node skills/nn-sources/scripts/index.js --scan-external | --watch-digest | --digest-decide`, and documented in `skills/nn-sources/SKILL.md` §2a-3/§2a-3b and `docs/innfo/documentation/import-modes.md` §2.

Two facts make it undiscoverable today:

1. The `nn` entry menu and `[h] Help` never mention it, and `nn-preflight`'s `domain-probe.js` reports no watch-root state — so the menu has no signal to branch on.
2. `nn-sources` §2a-3b states that *"`nn` offers one digest of what changed at session start"*, but `skills/nn/SKILL.md` never invokes `--watch-digest`. The behavior is documented but not wired, and the digest has no spec in `openspec/specs/`.

The `nn` menu and probe are spec'd in `openspec/specs/router-governance/spec.md` ("present the entry job menu `[s][m][r][p][h][x]`", "the state-driven entry menu with the calculated `(Recommended)` job"). The `spec-integrity` CI job only checks that spec URLs resolve — it does **not** verify that code matches these specs. There is therefore no automated guard against menu/spec drift, which is why this change carries a spec delta rather than a bare edit.

## Goals / Non-Goals

**Goals:**

- Make the watch-roots capability discoverable from the entry menu and from Help.
- Give the probe a cheap, offline signal (`watch_roots.declared`) so the menu can branch contextually.
- Wire the already-documented session-start digest.
- Give the capability (declaration, classification, digest, decisions) a spec home.

**Non-Goals:**

- Changing watch-root semantics: the declaration grammar, the `NEW`/`EVOLVED_DYNAMIC`/`STATIC_ALERT`/`DISCONNECTED` classification, the write-once import contract, or the decision store.
- Introducing a filesystem watcher / daemon (`fs.watch`, `chokidar`). The capability stays declarative + on-demand.
- Adding a top-level menu letter. The surfacing is contextual, inside `[s] Sources`.
- Making `nn-preflight` depend on `nn-sources`, or walking external roots at session start.
- Adding autonomous web search for "a newer version" of a document.

## Decisions

### D1 — The probe reports only the declared count, never the scan

`domain-probe.js` MUST NOT call into `nn-sources` nor walk external roots. It reads the lineage record and counts `## NN External Watch Roots:` entries. Rationale: the probe is a fast, deterministic, offline gate owned by `nn-preflight`; the scan belongs to `nn-sources` and does root I/O that must not gate session start. The `declared` count is enough for the menu to branch. The pending-item count comes from the digest itself, which `nn` runs separately (D3).

- Rejected: having the probe compute `pending_digest` by scanning. It would duplicate the fast-path scan logic and add unbounded root I/O to the session gate.
- Rejected: having `nn-preflight` shell out to the `nn-sources` CLI. It creates a cross-skill dependency and a Node process on the hot path.

### D2 — Contextual surfacing, not a new top-level letter

Watch roots is a capability of the Sources stage, not a fifth job in the `s → m → r → p` pipeline. `[s] Sources` gains a sub-option when roots are declared, and a "declare a root" option when none are. Rationale: preserves the menu shape (and the `router-governance` contract), teaches the capability where it belongs, and adds zero noise to workspaces that never watch folders.

### D3 — The digest is invoked at session start only when roots are declared

`nn` invokes `--watch-digest` after the activation gate, conditioned on `watch_roots.declared > 0`, and treats any failure as non-fatal (swallow and proceed). Rationale: the digest is read-only and prints nothing when there are no roots, but gating the invocation keeps the hot path free of a subprocess for the common case; the swallow keeps a broken digest from blocking a session.

### D4 — Help carries the always-available entry

The `[h] Help` catalog entry is unconditional. Rationale: the contextual `[s]` option only appears once a root exists; a user who has never declared one needs a stable place to learn the capability. Help is that place.

### D5 — Derived copy is regenerated, not hand-edited

The `nn` description/menu is mirrored in `manifest/source.yaml` and generated under `docs/skills/documentation/`. Any menu/description change MUST regenerate those (`scripts/build-docs.mjs`, `scripts/generate-docs-facts.mjs`) rather than edit them by hand.

## Risks / Trade-offs

| Risk | Likelihood | Mitigation |
|---|---|---|
| Session-start latency from the digest subprocess | Low | Invoke only when `declared > 0`; the digest uses the mtime/size fast path; failure is swallowed (D3) |
| Probe reads a record with CRLF or a quoted path and miscounts | Med | Parse with the same tolerant regex as `parseWatchRoots`; add RED tests for CRLF and quoted roots |
| `watch_roots` absent (older preflight paired with newer `nn`) | Low | `nn` treats a missing field as `0` (spec scenario) |
| Menu/spec drift returns because no CI guard exists | Med | This change adds the spec delta; a follow-up may add a menu-copy guard (out of scope here) |
| Help entry becomes stale as the feature evolves | Low | The entry is short and capability-level, not flag-level |

## Migration

None. Workspaces without watch roots are unaffected: the probe reports `0`, the menu is unchanged, and the digest is not invoked. Workspaces with roots gain the sub-option and the session-start digest they were already documented to receive.
