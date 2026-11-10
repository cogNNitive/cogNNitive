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
 * A console scope: the whole domain, a model-scoped console, or a delivery console.
 * `model` is the scope key: a single model's stem, or the combined key of a multi-model selection.
 */
export type ConsoleDeliveryScope = {
  series: string
  episode: string
  version: number | string
}

export type ConsoleScope =
  | 'domain'
  | { model: string; view?: string }
  | { delivery: ConsoleDeliveryScope }
  | { series: string; episode: string; version: number | string; view?: string }
  | {
      view?: string
      model?: string
      series?: string
      episode?: string
      version?: number | string
      delivery?: ConsoleDeliveryScope
    }

/** Workspace-relative path of the stable console file for a scope. */
export function consoleOutputPath(scope: ConsoleScope): string {
  if (scope === 'domain') return DOMAIN_CONSOLE_FILENAME

  if (typeof scope !== 'object' || scope === null) {
    throw new Error('consoleOutputPath: invalid console scope')
  }

  // Delivery console scope: series, episode, version
  const scopeObj = scope as Record<string, unknown>
  let delivery: ConsoleDeliveryScope | null = null

  if (
    'delivery' in scopeObj &&
    scopeObj.delivery &&
    typeof scopeObj.delivery === 'object'
  ) {
    delivery = scopeObj.delivery as ConsoleDeliveryScope
  } else if ('series' in scopeObj && 'episode' in scopeObj && 'version' in scopeObj) {
    delivery = scope as unknown as ConsoleDeliveryScope
  } else if (
    scopeObj.view === 'conntent-delivery' &&
    ('series' in scopeObj || 'model' in scopeObj)
  ) {
    let s = scopeObj.series ? String(scopeObj.series).trim() : ''
    let e = scopeObj.episode ? String(scopeObj.episode).trim() : ''
    const v = scopeObj.version != null ? scopeObj.version : 1
    if ((!s || !e) && typeof scopeObj.model === 'string') {
      const match = scopeObj.model.match(/series\/([^/]+)\/episodes\/([^/]+)/)
      if (match) {
        s = s || match[1]
        e = e || match[2]
      } else {
        const parts = scopeObj.model.split('/')
        if (parts.length === 2) {
          s = s || parts[0]
          e = e || parts[1]
        }
      }
    }
    if (s && e) {
      delivery = { series: s, episode: e, version: v as number | string }
    }
  }

  if (delivery) {
    const s = String(delivery.series || '').trim()
    const e = String(delivery.episode || '').trim()
    let v = String(delivery.version != null ? delivery.version : '').trim()
    if (!s || !e || !v) {
      throw new Error(
        'consoleOutputPath: a delivery scope needs series, episode and version',
      )
    }
    if (/^\d+$/.test(v)) v = 'v' + v
    else if (!/^v\d+$/i.test(v)) {
      if (!v.toLowerCase().startsWith('v')) v = 'v' + v
    }
    v = v.toLowerCase()
    return `series/${s}/episodes/${e}/deliveries/${v}/${e}_delivery.html`
  }

  const key = scopeObj.model
  if (typeof key !== 'string' || key === '') {
    throw new Error('consoleOutputPath: a model scope needs a non-empty model key')
  }
  return `artifacts/${key}_console/${key}_console.html`
}

