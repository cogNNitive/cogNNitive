## Why

The **External Watch Roots** capability — declare external folders in the lineage record, scan them for new/evolved files, and offer a session-start digest with per-item `ignore`/`postpone`/`import` decisions — is implemented and documented, but effectively **undiscoverable**.

- The `nn` entry menu (`[s][m][r][p][h][x]`) never mentions watch roots; `[s] Sources` reads only "Ingest, scan, normalize, or refresh sources".
- `[h] Help` has no capabilities catalog entry, so a user browsing help never learns the feature exists.
- `nn-preflight`'s domain probe (`domain-probe.js`) does not report any watch-root state, so the state-driven menu **cannot** surface it even if it wanted to.
- The only active discovery path is the conditional pre-authoring prompt in `nn-innfo` §15, which fires only when authoring a model that cites dynamic sources.

Separately, `nn-sources` §2a-3b documents that *"`nn` offers one digest of what changed at session start"*, but `skills/nn/SKILL.md` never invokes `--watch-digest`. The session-start digest is a **documented-but-unwired** behavior, and the digest itself has **no spec** in `openspec/specs/`.

Net effect: a user who has not already read the docs, or who has not yet declared a watch root, will never find the capability. The feature is correct; only its surfacing is missing.

## What Changes

- **Probe signal.** Extend `nn-preflight`'s `domain-probe.js` to report watch-root state — at minimum the number of declared roots parsed from the lineage record — cheaply and fully offline, so the menu can branch on it.
- **Contextual entry-menu surfacing.** When the workspace declares watch roots, `[s] Sources` gains a sub-option to run the watch-root scan/digest; when it declares none, `[s] Sources` offers to declare one (teaching the capability without adding top-level menu noise).
- **Help catalog.** `[h] Help` gains a capabilities entry for "Watched folders — ingest new/evolved files from external directories without daemons".
- **Wire the session-start digest.** When roots are declared, `nn` invokes the read-only `--watch-digest` at session start and presents pending items for decision, closing the documented-but-unwired gap.
- **Regenerate derived copy.** The `nn` description/menu is mirrored in `manifest/source.yaml` and generated docs; regenerate them so no derived artifact drifts.

Not changing: the watch-root semantics themselves (declaration grammar, classification, write-once import, decision store). They already work; this change makes them findable and specs them.

## Capabilities

### New Capabilities

- `external-watch-roots`: the lifecycle of declarative external watch roots — declaration parsing from the lineage record, on-demand change classification, the read-only session-start digest and its content-addressed decisions, and the probe signal that makes the capability visible to the router.

### Modified Capabilities

- `router-governance`: the entry menu gains a **contextual** `[s] Sources` sub-option and a `[h] Help` capabilities entry, and the domain-probe contract gains watch-root state; `nn` invokes the read-only digest at session start when roots are declared.

## Impact

| Area | Impact | Description |
|---|---|---|
| `skills/nn-preflight/scripts/domain-probe.js` | Modified | Report `watch_roots` (declared count); no new dependency, stays offline |
| `skills/nn/SKILL.md` | Modified | Contextual `[s]` sub-option, `[h]` catalog entry, session-start digest invocation |
| `skills/nn-innfo/SKILL.md` | Modified | §15 aligned to the shared digest/surfacing contract |
| `manifest/source.yaml`, `docs/skills/documentation/**` | Regenerated | Menu/description copy mirrored in the manifest and generated docs |
| `docs/innfo/documentation/import-modes.md` | Modified | Cross-link the discovery path (menu + help) |

- **No release/version bump required**: skill text + one preflight script; no distribution artifact changes.
- **No public API change**; no new dependency; no change to watch-root semantics or the write-once import contract.
- **No behavior change for workspaces without watch roots** — the probe reports `0` and the menu is unchanged.
