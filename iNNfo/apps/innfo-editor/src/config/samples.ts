/**
 * Base URL for the demo sample models shown on the home page / setup wizard.
 *
 * - In dev, the vite dev server serves the repo's `specs` directory at
 *   `/specs` (see vite.config.ts `serveLocalSpecs`), so samples and
 *   templates reflect the CURRENT working tree.
 * - In production builds, samples are fetched from the published GitHub
 *   `main` branch.
 *
 * Callers build `${SAMPLE_BASE}/{templateName}/samples/{file}`, matching the
 * `specs/templates/{name}/samples/` layout (see `spec-versioning`, R-SV-01).
 */
const REMOTE_SAMPLE_BASE = 'https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates'

export const SAMPLE_BASE: string = import.meta.env.DEV ? '/specs/templates' : REMOTE_SAMPLE_BASE

/**
 * Bundled fallback of each shipped L2 template's newest known
 * `template_version`, keyed by template slug (e.g. "business").
 *
 * Used by `useTemplateVersionNotice` (spec-versioning D3) as one half of the
 * union that decides whether a model's pinned template is stale — the other
 * half is a live scan of the connected workspace's local search dirs
 * (`specs/`, `.specs/`, `.spec-cache/`, see design.md A1). This map exists so
 * the badge can still fire for a workspace that has never locally cached a
 * newer template file (e.g. right after this app itself ships a bump).
 *
 * Keep in sync with `specs/templates/{name}/{name}_V_x-y-z_NN.md` — update
 * this entry whenever a shipped template's `template_version` is bumped.
 */
export const SHIPPED_TEMPLATE_VERSIONS: Record<string, string> = {
  analysis: 'V_0-2-0',
  blank: 'V_0-2-0',
  business: 'V_0-2-0',
  'business-model': 'V_0-2-0',
  cogNNitive: 'V_0-2-0',
  innovation: 'V_0-2-0',
  organization: 'V_0-2-0',
  procedures: 'V_0-2-0',
  projects: 'V_0-2-0',
  // workspace_spec is intentionally omitted: its filename carries no
  // `_V_x-y-z_` segment, so `parseVersionedFilename` can never resolve it.
}
