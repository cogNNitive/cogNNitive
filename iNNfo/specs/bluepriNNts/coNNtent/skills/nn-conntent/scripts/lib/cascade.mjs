/**
 * nn-conntent/scripts/lib/cascade.mjs
 *
 * The one resolver for every cascade parameter (design D-K2; capability
 * conntent-field-registry "One Resolver Serves The Compiler And The Estimator").
 * `resolve`/`resolveKeyed` live HERE, not in video-scope.mjs, so every resolver
 * (compiler, estimator, synthesize-avatar, render-thumbnail, produce) imports the
 * same module and the same precedence.
 *
 * `createCascade({ model, scriptPath, bags, presetOf })` returns
 * `{ at(scene?, layer?), get(field), validateLevel(field, level) }`:
 *
 *   - `at(scene, layer)` builds the chain for that position. The scene bag may carry
 *     the scene's own declared fields and its `presets`; the layer bag the layer's
 *     explicit fields.
 *   - `get(field)` resolves through `bagsToChain` + nn-core `resolve` and returns
 *     `{ value, source, trace }`.
 *   - Node order per level is presets (list order) → explicit fields; the `kind`
 *     level holds Scene Kind direct fields and kind presets; a Chrome `music`
 *     value feeds `background_audio` at the kind level.
 *   - `validateLevel(field, level)` rejects a field set at a level its scope class
 *     forbids with `CASCADE_LEVEL_FORBIDDEN`.
 *
 * Zero external dependencies (nn-core via the shared mirror). ESM module.
 */

import { bagsToChain } from './video-scope.mjs';
import { resolve as coreResolve } from './nn-core.generated.cjs';

function usable(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

/**
 * Resolves one scalar parameter across bags using nn-core resolve (the shared
 * precedence of the whole engine). Lives here so one resolver serves every caller.
 * The returned trace carries `source`, the winning `document` and the `overridden`
 * sources that lost (nearest first) — capability conntent-field-registry "Every
 * Resolved Value Carries A Source Trace".
 * @param {string} param
 * @param {Record<string, Record<string, unknown>>} [bags]
 * @param {{ accept?: (v: unknown) => boolean }} [options]
 * @returns {{ value: unknown, source: string | null, document: string | null, overridden: Array<{ source: string, document: string | null }> }}
 */
export function resolve(param, bags = {}, options = {}) {
  const loaded = bagsToChain(bags);
  const accept = options.accept || usable;
  const r = coreResolve(loaded, param, 'override', { accept });
  const exp = r.explain || {};
  return {
    value: r.present ? r.value : null,
    source: exp.winner?.scope ?? null,
    document: exp.winner?.doc ?? null,
    overridden: (exp.overridden || []).map((o) => ({ source: o.scope, document: o.doc ?? null })),
  };
}

/**
 * Resolves one key of a keyed-list parameter (`components`, `sounds`) across bags
 * using nn-core resolve with union strategy.
 * @param {string} param
 * @param {string} key
 * @param {Record<string, Record<string, unknown>>} [bags]
 * @returns {{ value: string | null, source: string | null }}
 */
export function resolveKeyed(param, key, bags = {}) {
  const loaded = bagsToChain(bags);
  const r = coreResolve(loaded, param, 'union');
  if (!r.present || !Array.isArray(r.value)) {
    return { value: null, source: null };
  }
  const entry = r.value.find((e) => e.name === key);
  if (!entry) return { value: null, source: null };
  const explainEntry = r.explain?.entries?.find((e) => e.name === key);
  return {
    value: entry.value,
    source: explainEntry?.from?.scope ?? null,
  };
}

/** Error code when a cascade field is set at a level its scope class forbids. */
export const CASCADE_LEVEL_FORBIDDEN = 'CASCADE_LEVEL_FORBIDDEN';

/** The one registry (generated). */
import registryJson from './field-registry.generated.json' with { type: 'json' };

/** Scope class → allowed cascade levels (inner → outer naming in the registry). */
const CLASS_LEVELS = {
  render: ['layer', 'scene', 'video', 'kind', 'series', 'domain'],
  video: ['video', 'series', 'domain'],
  domain: ['domain'],
};

/**
 * Builds a cascade resolver for one episode.
 * @param {{ model?: object, scriptPath?: string, bags?: object, presetOf?: (name: string) => { name: string, values: object } | null }} input
 */
export function createCascade({ model, scriptPath, bags: baseBags, presetOf } = {}) {
  const bags = { ...(baseBags || {}) };
  if (presetOf) bags.__presetOf = presetOf;

  return {
    /**
     * Positions the resolution at a scene (and optionally a layer).
     * @param {string|undefined} scene
     * @param {string|undefined} layer
     * @returns {{ get: (field: string) => { value: unknown, source: string|null, trace: Array<{ level: string, node: string|null, value: unknown }> } }}
     */
    at(scene, layer) {
      // Build the per-position bags: scene/layer bags only when the positions exist.
      const sceneBag = scene ? (bags.scene || {}) : {};
      const layerBag = layer ? (bags.layer || {}) : {};
      // The kind level: direct Scene Kind fields, with a Chrome `music` feeding
      // `background_audio` at the kind level.
      const kindBag = { ...(bags.kind || {}) };
      if (kindBag.music !== undefined && kindBag.background_audio === undefined) {
        kindBag.background_audio = kindBag.music;
      }

      const chainBags = {
        ...bags,
        scene: scene ? sceneBag : undefined,
        layer: layer ? layerBag : undefined,
        kind: kindBag,
        presetIndex: bags.presetIndex,
      };

      return {
        /** @returns {{ value: unknown, source: string|null, document: string|null, overridden: Array<{ source: string, document: string|null }>, trace: Array<{ level: string, node: string|null, value: unknown }> }} */
        get(field) {
          const r = resolve(field, chainBags);
          const trace = (r.source ? [{ level: r.source, node: null, value: r.value }] : []);
          return { ...r, trace };
        },
      };
    },

    /**
     * Rejects a field set at a level its scope class forbids.
     * @param {string} field
     * @param {string} level one of layer|scene|video|kind|series|domain|blueprint
     * @throws {{ code: string, field: string, level: string, allowed: string[] }}
     */
    validateLevel(field, level) {
      const def = registryJson.fields[field];
      if (!def || !def.cascade) return; // record fields may sit anywhere their concept allows
      const allowed = CLASS_LEVELS[def.scope] || [];
      // `blueprint` is the floor; it is always allowed as a default source.
      if (level === 'blueprint') return;
      if (!allowed.includes(level)) {
        const err = new Error(
          `cascade field "${field}" (class ${def.scope}) cannot be set at the ${level} level; allowed: ${allowed.join(', ')}`,
        );
        err.code = CASCADE_LEVEL_FORBIDDEN;
        err.field = field;
        err.level = level;
        err.allowed = allowed;
        throw err;
      }
    },
  };
}