/**
 * Single builder for console output paths. The CLI (`scripts/export-console.mjs`)
 * and the MCP both derive the file they write, report and open from here, so the
 * path a tool reports always names the file `writeConsole` writes.
 *
 * Paths are workspace-relative and use forward slashes.
 */

/** File name of the whole-domain console, written at the domain root. */
export const DOMAIN_CONSOLE_FILENAME = 'domaiNN_console.html'

/**
 * A console scope: the whole domain, or a model-scoped console. `model` is the
 * scope key: a single model's stem, or the combined key of a multi-model selection.
 */
export type ConsoleScope = 'domain' | { model: string }

/** Workspace-relative path of the stable console file for a scope. */
export function consoleOutputPath(scope: ConsoleScope): string {
  if (scope === 'domain') return DOMAIN_CONSOLE_FILENAME
  const key = scope.model
  if (typeof key !== 'string' || key === '') {
    throw new Error('consoleOutputPath: a model scope needs a non-empty model key')
  }
  return `artifacts/${key}_console/${key}_console.html`
}
