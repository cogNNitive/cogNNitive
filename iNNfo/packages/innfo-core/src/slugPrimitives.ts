/**
 * Slug primitives bundle entry.
 *
 * THE single source of the heading/name slug functions that the distributed
 * `nn-trannsform` skill also needs. `scripts/build-trannsform-slug-mirror.mjs`
 * bundles this entry into a zero-dependency CommonJS artifact the skill can
 * `require()` — innfo-core is ESM-only and absent where the skill is installed,
 * so a runtime import is impossible.
 *
 * Re-exports only the primitives the mirror consumes; esbuild tree-shakes the
 * rest of `sourceRef`. Keep this list in sync with the skill's `markdown-utils`.
 */
export {
  slugifyHeading,
  slugifyUnitHeading,
  normalizeName,
  headingSlugParts,
} from './sourceRef'
