# Design: Model Selection Cascade

## Context

Model selection today:

- `asset-cost-estimator.mjs` / `video-engine-cli.mjs` accept `--image-model/--tts-model/--avatar-model`
  and fall back to `DEFAULT_MODELS`.
- `RemotionSceneCompiler.lowerKnowledgeModel` reads a scene's resolved `template` for
  `scene_tts_model`/`scene_voice`; a `presenter` Layer's `model::` becomes `layer_avatar_model`.
- `video-guard.json` holds `allowedModels` and budget, and gates spend.
- The Series L3 Template document holds `tool`/`voice`/`model` per Template instance.

Nothing defines a video level, and the guard's allowed-list is conflated with the choice.

## Seam 1 — Resolver (`lib/model-cascade.mjs`)

```
resolveModel({ kind: 'tts'|'image'|'avatar', scope }) -> { id, source: Scope }
```

`scope` carries the resolved chain, most specific first:

| Scope | Kind(s) | Declared where |
|---|---|---|
| `layer` | avatar | `presenter` Layer `model::` |
| `scene` | tts, avatar | Scene `template::` → Template instance |
| `video` | tts, image, avatar | `Video` `template::` → Template instance |
| `series` | tts, image, avatar | Series L3 Template document default instance |
| `workspace` | all | `video-guard.json` `defaults` (gate-adjacent) |
| `blueprint` | all | `DEFAULT_MODELS` |

The resolver returns the first non-empty value and its `source`. It is the ONLY selection path.

## Seam 2 — Guard is gate-only

`SpendGuard` keeps `allowedModels`, budget and the daily cap. It MUST NOT supply a model id. The
estimator and the compiler obtain ids only from `resolveModel`; the guard only refuses a resolved
id that is blocked or over budget. `video-guard.json` gains an optional `defaults` block read by
the `workspace` scope; if absent, resolution falls through to `blueprint`.

## Seam 3 — CLI flags as auditable override

`--image-model/--tts-model/--avatar-model` become an explicit scope that sits ABOVE `workspace`
and BELOW `video`? No — they are a plan-level override that wins over the cascade for the run and
MUST be recorded in the approval (`plan_hash` + the approved artifact). Implemented as a
`cli` scope injected at the top of the chain but only when the flag is present, and always echoed
in the plan.

Final chain with flags: `cli > layer > scene > video > series > workspace > blueprint`.

## Data structures

- `Video` element: new optional field `template` (reference to `Template`).
- `video-guard.json`: new optional `defaults: { tts?, image?, avatar? }`.
- `ResolvedModel { id, source }` (new).

## Package boundaries

`lib/model-cascade.mjs` is imported by the estimator and the engine CLI (and by the compiler for
TTS/voice). No manifest shape change; `plan_hash` is unaffected mechanically (it already hashes the
resolved ids).

## Open questions (for design sign-off)

1. Should the `workspace` scope be `video-guard.json.defaults` or a separate `video.config.json`?
2. Does the `cli` override belong at the top (over `layer`) or just over `series`? Recommend
   documented top, echoed in the plan.
3. `image` has no scene/layer level today — confirm it stops at `video`.
