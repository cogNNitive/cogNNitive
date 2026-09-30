# Design: Fix Video Engine Runtime References

## Technical Approach

Two surgical fixes inside `skills/nn-video-script/scripts/`, plus one extraction that
makes the Remotion branch reachable from tests without installing `@remotion/*`.

Key finding: `@remotion/*` is not a dependency anywhere in the repo, so the
`__dirname` `ReferenceError` in `video-engine-cli.mjs:214` cannot be triggered through
`renderVideo` today. It only fires when both modules resolve. A black-box test cannot
reach it. The fix therefore adds a seam that takes a module loader as a parameter.

Resolved proposal questions (automatic mode):
1. Shipping `remotion-entry.tsx` stays a non-goal. After this change Remotion is still
   unreachable, but the reason is reported.
2. A stderr warning is enough. `RenderSummary` shape does not change.
3. The 2.5 words/sec heuristic and the 3s minimum stay as they are.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|---|---|---|---|
| Module dir in ESM | `import.meta.dirname` / `dirname(fileURLToPath(import.meta.url))` | `import.meta.dirname` needs Node >= 20.11. The second form works everywhere and matches the test files. | Module-level `const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url))` |
| Testable seam | Mock `import()` via loader hooks / inject loader into an extracted function / leave untested | Loader hooks are heavy and global. Leaving it untested is how the bug shipped. | Extract `tryRemotionRender(input, deps)` with an injectable `loadModule` and `scriptsDir` |
| Fallback signal | stderr warning / `renderer` field in `RenderSummary` / throw | A new summary field changes a public contract that nobody has asked for. Throwing would break the FFmpeg/mock path CI relies on. | Return `{ rendered, reason }`. `renderVideo` writes one `console.warn` line when `rendered` is false. |
| Swallowed errors | Keep empty `catch` / rethrow / capture into `reason` | An empty catch hides bugs like this one. Rethrowing removes the degradation path. | Catch, then turn the error into `reason: 'error: <message>'` |
| Word count | Share the tokenizer from the compiler / inline split | The compiler has no exported word counter, and parser duplication is out of scope | Inline `narration.split(/\s+/).filter(Boolean).length` (narration is already trimmed, so empty gives 0) |

## Data Flow

    renderVideo(options)
        │
        ├─ compile or load manifest
        │
        ├─ tryRemotionRender({manifest, outputPath, concurrency})
        │      loadModule('@remotion/bundler' | '@remotion/renderer')
        │        └─ null ──────────────→ {rendered:false, reason:'modules-unavailable'}
        │      resolveRemotionEntryPoint(scriptsDir)
        │        └─ missing ───────────→ {rendered:false, reason:'entry-point-missing: <path>'}
        │      bundle + renderMedia
        │        ├─ ok ────────────────→ {rendered:true}
        │        └─ throws ────────────→ {rendered:false, reason:'error: <msg>'}
        │
        ├─ rendered=false → console.warn("[video-engine-cli] Remotion render skipped (<reason>); falling back to FFmpeg")
        └─ FFmpeg → mock (unchanged)

## File Changes

| File | Action | Description |
|---|---|---|
| `skills/nn-video-script/scripts/video-engine-cli.mjs` | Modify | Add `SCRIPTS_DIR`. Add exports `resolveRemotionEntryPoint` and `tryRemotionRender`. Replace the inline Remotion block in `renderVideo` with a call to `tryRemotionRender` followed by the warning. |
| `skills/nn-video-script/scripts/asset-cost-estimator.mjs` | Modify | Declare `wordCount` before line 181 |
| `skills/nn-video-script/test/cost-estimator.test.mjs` | Modify | Add a scene without `scene_duration` and a scene with empty narration |
| `skills/nn-video-script/test/video-engine-cli.test.mjs` | Modify | Add seam unit tests and a check on CLI stderr |

No frontmatter, manifest, package or spec-version changes.

## Interfaces / Contracts

```js
/** @returns {string} absolute path; existence NOT checked */
export function resolveRemotionEntryPoint(scriptsDir = SCRIPTS_DIR)

/**
 * @param {{manifest: object, outputPath: string, concurrency?: number}} input
 * @param {{loadModule?: (id: string) => Promise<object|null>, scriptsDir?: string}} [deps]
 * @returns {Promise<{rendered: true} | {rendered: false, reason: string}>}  never throws
 */
export async function tryRemotionRender(input, deps = {})
```

The default `loadModule` is `(id) => import(id).catch(() => null)`, the same behavior as
today. `RenderSummary` does not change.

## Testing Strategy

The existing style is kept: `cost-estimator.test.mjs` uses `node:test`, and
`video-engine-cli.test.mjs` is a plain assert script.

| Layer | What | Approach | RED on current `dev` |
|---|---|---|---|
| Unit | Scene without duration, 10-word narration | `durationSeconds === 4` | Yes (`ReferenceError`) |
| Unit | Scene without duration, empty narration | `durationSeconds === 3` | Yes |
| Unit | `tryRemotionRender` with stub modules and a temp `scriptsDir` that contains `remotion-entry.tsx` | Asserts `rendered: true` and that `bundle` received `<tmp>/remotion-entry.tsx` | Yes (export missing) |
| Unit | Stub `bundle` throws | Resolves `{rendered:false, reason:/^error: /}` and does not reject | Yes |
| Unit | `resolveRemotionEntryPoint()` default | Returns a path under `scripts/` | Yes |
| Integration | CLI `render manifest.json` | `stderr` matches `/Remotion render skipped \(modules-unavailable\)/`, exit code 0 | Yes (stderr is silent today) |

The CLI stderr test is the one behavioral RED that does not depend on a new export.
The seam tests only go RED because the exports are missing. That is weaker, but it is
the only way to cover the `__dirname` path while `@remotion/*` is not installed.

## Migration / Rollout

No migration required. Every render now prints one warning line, because Remotion is
never available until the entry point ships.

## Open Questions

- None blocking.
