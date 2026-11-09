/**
 * nn-conntent/scripts/lib/cascade.mjs
 *
 * The one resolver for every cascade parameter (design D-K2; capability
 * conntent-field-registry "One Resolver Serves The Compiler And The Estimator").
 *
 * `createCascade({ model, scriptPath, bags, presetOf })` returns
 * `{ at(scene?, layer?), get(field), validateLevel(field, level) }`:
 *
 *   - `at(scene, layer)` builds the chain for that position. The scene bag may carry
 *     the scene's own declared fields and its `presets`; the layer bag the layer's
 *     explicit fields.
 *   - `get(field)` resolves through `bagsToChain` + nn-core `resolve` and returns
 *     `{ value, source, trace }`.
 *   - Node order per level is presets (list order) → character → explicit fields; the
 *     `kind` level holds Scene Kind direct fields and kind presets; a Chrome `music`
 *     value feeds `background_audio` at the kind level.
 *   - `validateLevel(field, level)` rejects a field set at a level its scope class
 *     forbids with `CASCADE_LEVEL_FORBIDDEN`.
 *
 * Zero external dependencies (nn-core via the shared mirror). ESM module.
 */

import { bagsToChain, resolve } from './video-scope.mjs';

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
        get(field) {
          const loaded = bagsToChain(chainBags);
          const r = resolve(field, chainBags);
          const trace = (r.source ? [{ level: r.source, node: null, value: r.value }] : []);
          return { value: r.value, source: r.source, trace };
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