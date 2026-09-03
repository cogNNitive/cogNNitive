# Design: Manifest Release Integrity

## Technical Approach

The published manifest stops being a hand-written file and becomes a **rendered artifact**. Humans edit `manifest/source.yaml` (identity, paths, versions, descriptions, workflows, and a `ref` per repo/channel — **no SHAs**) and `manifest/body.md` (prose). `scripts/generate-manifest.js` resolves each `ref` through the GitHub API **in the repo the entry declares** and renders `docs/use/manifest.md` (stable) or `docs/use/manifest-next.md` (preview). A wrong-repo SHA becomes unrepresentable: there is no field for a human to type a SHA into.

`validate-manifest.js` gains a **channel policy table**; rule classes are selected by data, not by branching.

```
manifest/source.yaml ──┐
manifest/body.md ──────┤
                       ├─→ generate-manifest.js ──(GitHub API: resolveRef)──┐
channel policy ────────┘                                                    │
                                                                            ▼
                                        docs/use/manifest.md  (channel: stable, refs = tags)
                                        docs/use/manifest-next.md (channel: preview, refs = branches)
                                                     │
                            merge to eNNvironment main == deploy to cognnitive.com
                                                     │
                                                     ▼
                              skills-manager.js (compares `commit` only — unchanged)
```

## Architecture Decisions

### D1 — Generated artifact from a SHA-free source (the central choice)

| Option | Trade-off | Decision |
|---|---|---|
| Fully generated from `manifest/source.yaml` + `manifest/body.md` | Prose and data stay hand-authored; the *published* file is 100% machine output; wrong-repo SHA impossible | **Chosen** |
| Hand-edited `manifest.md` + separate generated lock file | Two fetches; schema change in `skills-manager.js`; breaks the single-URL contract | Rejected |
| Hand-edited manifest + stricter validator only | The live 404 already *passes* an existence check and CI was red for a day and shipped anyway. Validation detects; generation prevents | Rejected |

This is npm's split (`package.json` hand-edited, `package-lock.json` generated) collapsed into one published file, because consumers fetch exactly one URL.

**CLI contract**

```
node scripts/generate-manifest.js --channel stable|preview [--check] [--out <path>]
  exit 0  wrote (or --check: on-disk file is byte-identical)
  exit 1  --check drift: on-disk file differs from render (unified diff on stderr)
  exit 2  resolution failure (ref not found, wrong ref kind, rate limit, network)
```

**Auth**: `GITHUB_TOKEN` / `GH_TOKEN` → `Authorization: Bearer` header. Ref resolution is deduped by `(repo, ref_key)`, so a full stable render is ~3 API calls; the validator is the expensive side (~2 calls per entry × 9 entries + tag peel). Unauthenticated is 60/h **per IP** and Actions runners share IPs — the workflow therefore passes `secrets.GITHUB_TOKEN` (auto-provisioned, 1000/h, sufficient for public cross-repo reads). Locally the token is optional; on HTTP 403/429 both scripts exit 2 with `set GITHUB_TOKEN to raise the rate limit` and **never emit a partially-resolved manifest** (render is all-or-nothing, written only after every ref resolves).

**Caching**: only immutable keys are cached in `.manifest-cache.json` (gitignored) — `(repo, sha, path)` validator results and tag→sha peels. Branch tips are **never** cached; the preview channel must always hit the network.

### D2 — Idempotence and diffability

Regeneration with no upstream change is byte-identical because the renderer is a pure function of its inputs:

- Purpose-built deterministic emitter (no YAML library), fixed key order per entry kind, fixed quoting policy.
- **Zero volatile fields**: no timestamp, no generator version, no run id. Only `channel: "stable"` / `"preview"`.
- Entry order is source order — never sorted (sorting would shuffle a hand-authored list once, for no gain).
- `\n` written explicitly, single trailing newline, no trailing whitespace; `.gitattributes` pins `docs/use/manifest*.md text eol=lf` (the dev box is Windows).
- CI runs `--check` for both channels: a hand edit to a published manifest fails the PR.

First run reformats today's file. That lands as a **separate normalization commit** with no pin changes, so the reformat is reviewed once and never recurs.

### D3 — YAML round-trip fidelity: there is no round-trip

The hazard is real (today's `templates:` block carries a 3-line human comment). The mitigation is structural: **the generator never reads the published manifest as input.** It renders from `manifest/source.yaml`, so comments in the source survive because nothing rewrites the source. There is no in-place edit mode.

For comments that must appear in the *published* file, entries gain an optional `note:` field rendered as deterministic `#` lines above the entry. Both consumers are safe: `parseFocusedYaml` in `validate-manifest.js` and `skills-manager.js` drops any trimmed line starting with `#` at any indent (verified). A `js-yaml` round-trip was rejected — it adds a dependency to a zero-dep repo and drops comments anyway.

The current "RE-PIN to the squash-merge sha" comment disappears by construction; it exists only because pins were typed by hand.

### D4 — Validator seam: channel policy as data

```js
const CHANNELS = {
  stable:  { file: 'docs/use/manifest.md',      requiredRefKind: 'tag',
             rules: [...STRUCTURAL_RULES, ...PROVENANCE_RULES] },
  preview: { file: 'docs/use/manifest-next.md', requiredRefKind: 'branch',
             rules: [...STRUCTURAL_RULES] },
};
// rule contract — pure, no channel branching inside
// { id, scope: 'entry'|'manifest', async run(entry, ctx) -> string[] }
// ctx = { channel, policy, api, manifest }
```

`node scripts/validate-manifest.js [repo-root] [--channel stable|preview]`; with no flag it validates every channel file present. Adding a channel is adding a table row.

| Rule | Class | stable | preview |
|---|---|---|---|
| `structural` (name/repo/path/version/commit/**ref**, 40-hex) | integrity | ✅ | ✅ |
| `ref-resolves-in-declared-repo` — `resolveRef(repo, ref) === commit` | integrity | ✅ | ✅ |
| `path-at-commit`, `version-parity`, `closure` | integrity | ✅ | ✅ |
| `mcp-url-pinned` — `raw.githubusercontent.com/{repo}/{40-hex}/…`, no branch segment | integrity | ✅ | ✅ |
| `ref-kind` — `policy.requiredRefKind` | provenance | tag | branch |
| `tag-shape` — `^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$` | provenance | ✅ | — |

`ref-resolves-in-declared-repo` is the wrong-repo killer (`d60a7109…` under `cogNNitive/iNNfo` fails it). Orphan-tip detection falls out for free: a deleted branch or an unreachable tip makes `resolveRef` 404. Annotated tags are peeled via `GET /repos/{repo}/git/tags/{sha}` when `object.type === 'tag'`. A force-moved tag makes `resolveRef !== commit` → the scheduled run turns red while `commit` keeps serving users.

### D5 — Tag conventions

All seven skills share one repo-snapshot SHA, so the unit is a **repo snapshot tag**, not a per-skill tag. Manifest `version:` stays the SKILL.md display string — untouched.

| Repo | Tag | Covers | Rationale |
|---|---|---|---|
| actioNN | `skills-v1.0.0` | all 7 skills | One snapshot, one tag — matches the shared SHA reality. The `skills-` prefix leaves room for a future `cli-v*` without renaming |
| iNNfo | `templates-v0.2.0` | `specs/templates/**` | Templates and the MCP bundle ship at different cadences; one repo-wide tag would force a fake bump on the other |
| iNNfo | `innfo-mcp-v0.2.1` | `packages/innfo-mcp/bin/innfo-mcp.bundle.js` | Tracks `packages/innfo-mcp/package.json` (`0.2.1` today) |

`source.yaml` resolves refs by `ref_key` (default: the entry's `repo`), so two independently-tagged artifacts in one repo are expressible:

```yaml
channels:
  stable:
    refs:
      cogNNitive/actioNN: skills-v1.0.0
      cogNNitive/iNNfo:   templates-v0.2.0
      innfo-mcp:          { repo: cogNNitive/iNNfo, ref: innfo-mcp-v0.2.1 }
  preview:
    refs:
      cogNNitive/actioNN: feat/innfo-v0-2-0-adoption
      cogNNitive/iNNfo:   feat/business-template-decomposition
      innfo-mcp:          { repo: cogNNitive/iNNfo, ref: feat/business-template-decomposition }
```

### D6 — Preview channel mechanics

- **Location**: `docs/use/manifest-next.md` → auto-published at `https://raw.githubusercontent.com/cogNNitive/eNNvironment/main/docs/use/manifest-next.md`.
- **Opt-in**: no consumer code change — `skills-manager.js:37` already honours `SM_MANIFEST_URL`. `SM_MANIFEST_URL=…/manifest-next.md node scripts/skills-manager.js status`. Documented in `actioNN/docs/documentation/skills/skills-manager.md`.
- **Anti-confusion**:
  1. `index.html` keeps **one** `<link rel="alternate">`, pointing at stable only. Preview is mentioned in human prose. Rationale: `rel=alternate` is machine-discoverable, and preview must be opt-in by explicit URL, never by discovery.
  2. Frontmatter `channel: "preview"` plus a `title`/`description` marked `PREVIEW — not for production`.
  3. A generated banner as the first body block.
  4. **Single source**: both channels render from the same `source.yaml`, so names, paths, descriptions and workflows *cannot* diverge — only refs can. This is the strongest anti-drift device in the design.

### D7 — Failure modes and rollback

| Failure | Detection | Behaviour |
|---|---|---|
| iNNfo not yet merged/tagged | `generate --channel stable` exit 2 | Stable manifest cannot be rendered → do not merge. Preview unblocks testers meanwhile |
| Rate limit / no token | exit 2, actionable message | No partial file written |
| Hand edit to a published manifest | `--check` in CI | PR fails with a unified diff |
| Tag force-moved | scheduled validator | Red CI; `commit` still serves users; no outage |
| Preview mistaken for stable | banner + no `rel=alternate` | Explicit URL required |
| Wrong-repo SHA (today's live 404) | `ref-resolves-in-declared-repo` | Blocked pre-merge |

**Already-installed users during the transition**: `~/.agents/bootstrap-state.json` stays valid; `ref` is additive and both parsers pass unknown keys through untouched. Re-pinning from tags changes `commit` values, so every user sees each entry as *outdated exactly once* and is prompted for a consented `update` — the normal path. Templates are the exception: those users are **already broken** (the pinned SHA 404s), and this update is their fix. Update detection stays `commit`-only; `version` remains a display string.

**Rollback**: revert the eNNvironment commits, delete `manifest-next.md`, downgrade `manifest-validate.yml` to non-blocking. No consumer migration.

### D8 — Rejected alternatives

| Alternative | Why rejected |
|---|---|
| **GitHub Releases as the publication unit** | A Release is a wrapper around a tag plus assets we do not need — raw fetch by SHA already works. It needs write API scope, adds a `/releases/tags/{tag}` call, and introduces a new failure mode (tag exists, Release does not) that tags alone cannot have. A tag costs `git tag && git push`. Revisit when changelogs or binary assets are required |
| **Vendor templates into eNNvironment** | Removes the cross-repo ref, but forks the source of truth: iNNfo owns template semantics and `spec_version`, so a sync job would reintroduce the same pin problem one layer down, and `version-parity` would lose its upstream anchor. It also breaks `nn-innfo`'s ownership of its own templates |
| **Automated tagging on merge** | Makes every merge a release again — that *is* the disease. Tags stay human-cut |
| **Sorting entries in the renderer** | Would reorder a hand-authored list once, for no diffability gain |

## Affected Areas

### eNNvironment — branch `feat/innfo-v0-2-0-adoption`

| File | Action | Description |
|---|---|---|
| `manifest/source.yaml` | Create | SHA-free hand-edited source: entries, `ref_key`, per-channel refs, optional `note` |
| `manifest/body.md` | Create | Shared prose body, extracted verbatim from today's `manifest.md` |
| `manifest/body.preview-banner.md` | Create | Preview-only banner prepended to the body |
| `scripts/generate-manifest.js` | Create | Zero-dep Node ≥18 renderer; `--channel`, `--check`, `--out`; deterministic emitter |
| `scripts/generate-manifest.test.js` | Create | `node:assert`, mirrors `validate-manifest.test.js` style: idempotence, `--check` drift, note rendering, all-or-nothing on resolution failure |
| `scripts/validate-manifest.js` | Modify | Channel policy table, rule objects, `resolveRef` + tag peel, `ref-kind`, `tag-shape`, `mcp-url-pinned` |
| `scripts/validate-manifest.test.js` | Modify | Add `ref` to existing fixtures (legacy fixture currently omits it), new cases: wrong-repo SHA, ref/commit mismatch, branch ref in stable, unpinned `mcp[].url`, bad tag shape |
| `docs/use/manifest.md` | Modify (regenerate) | Gains `ref` + `channel: stable`; corrected template pins; commit-pinned `mcp[].url` |
| `docs/use/manifest-next.md` | Create (generated) | Preview channel |
| `docs/use/index.html` | Modify | Prose section on preview usage; `rel=alternate` unchanged (stable only) |
| `.github/workflows/manifest-validate.yml` | Modify | Pass `GITHUB_TOKEN`; run `generate --check` for both channels; validate both channels; add `schedule:` cron |
| `.gitattributes` | Create | `docs/use/manifest*.md text eol=lf` |

### actioNN — branch `feat/innfo-v0-2-0-adoption`

| File | Action | Description |
|---|---|---|
| `scripts/skills-manager.js` | No change | `ref` passes through untouched; update detection stays `commit`-only |
| `scripts/skills-manager.test.js` | Modify | Regression: manifest carrying `ref` parses; `version` change alone does not mark outdated |
| `docs/documentation/skills/skills-manager.md` | Modify | Document `SM_MANIFEST_URL` preview opt-in |
| `AGENTS.md` | Modify | Bootstrap rule notes the stable URL is canonical; preview is explicit opt-in |
| — | Tag | `skills-v1.0.0` after merge |

### iNNfo — branch `feat/business-template-decomposition`

| File | Action | Description |
|---|---|---|
| — | No file changes | Migration precondition only |
| — | Tag | `templates-v0.2.0` and `innfo-mcp-v0.2.1` after merge to main |

## Testing Strategy

`strict_tdd: true` — every rule and renderer behaviour gets a failing `node:assert` test first.

| Layer | What | Approach |
|---|---|---|
| Unit (generator) | Determinism, `--check` drift, note rendering, LF/trailing newline, all-or-nothing write | `generate-manifest.test.js` with a stubbed `resolveRef` (injectable resolver — no network in unit tests) |
| Unit (validator) | Each rule in isolation; channel policy selection | Temp-dir fixtures per existing `createTempManifestDir` pattern; stubbed API |
| Unit (consumer) | `ref` passthrough; `commit`-only comparison | `skills-manager.test.js` |
| Integration | Live resolution of the real refs; every stable URL returns HTTP 200 | `manifest-validate.yml` against real repos, tokened |
| Scheduled | Dangling refs / force-moved tags without a push | `schedule:` cron in the same workflow |

## Migration / Rollout

1. Land generator + validator + tests in eNNvironment behind no behaviour change (validator still passes on the current manifest shape, `ref` optional).
2. iNNfo merges and tags; actioNN merges and tags. **Blocking precondition.**
3. Regenerate `manifest.md` from tags + emit `manifest-next.md`; `ref` becomes mandatory; CI blocking.

## Open Questions

- [ ] `bootstrap-state.json` records the manifest URL it was installed from; a preview→stable switch is currently silent. A mismatch warning is out of scope for this slice — confirm that is acceptable.
- [ ] `skills-v1.0.0` as the first actioNN tag assumes a clean 1.0 baseline; confirm the user does not want `skills-v0.x` to signal pre-1.0.
