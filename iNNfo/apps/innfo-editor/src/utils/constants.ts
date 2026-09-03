/**
 * Current iNNfo specification version.
 * This is the SINGLE SOURCE OF TRUTH for the spec version.
 * Every other artifact (code, markdown, skills, models) MUST derive from this
 * constant or be validated against it by scripts/check-spec-version.ts.
 *
 * When bumping the spec version:
 *   1. Update DEFAULT_INNFO_VERSION here.
 *   2. Run `npm run check:spec-version` — it will list every stale file.
 *   3. Update each stale file to match.
 *   4. Never duplicate this value as a hardcoded string elsewhere in .ts/.vue.
 */
export const DEFAULT_INNFO_VERSION = 'V_0-2-0'

/** Default template name for new documents. */
export const DEFAULT_TEMPLATE_NAME = ''

/** Default template version. */
export const DEFAULT_TEMPLATE_VERSION = 'V_0-2-0'

/** Maximum marker score value (scores range from 0 to this value). */
export const MAX_MARKER_SCORE = 3

/** Number of marker states (0 through MAX_MARKER_SCORE). */
export const MARKER_CYCLE_COUNT = MAX_MARKER_SCORE + 1

/**
 * Builds the canonical raw GitHub URL for an iNNfo (L1) specification version.
 * Use this instead of concatenating the URL by hand.
 *
 * Every spec file under `specs/` is immutable and filename-encoded, so the
 * `main` branch is already content-pinned — there is no separate tag-pinned
 * vs. main-branch strategy to choose between (see `spec-versioning`, A4).
 */
export function buildSpecificationUrl(version: string = DEFAULT_INNFO_VERSION): string {
  return `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_${version}_NN.md`
}

/**
 * Builds the canonical raw GitHub URL for an L2 template version, grouped
 * under its own `specs/templates/{name}/` folder alongside its samples.
 */
export function buildTemplateUrl(name: string, version: string = DEFAULT_TEMPLATE_VERSION): string {
  return `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/${name}/${name}_${version}_NN.md`
}
