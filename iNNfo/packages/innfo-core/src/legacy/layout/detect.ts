// legacy:cognitivize-in-place/layout-detect

import type { DomainReader, LegacySignal } from '../detect.js'

/**
 * Folders retired by the cognitivize-in-place layout, in report order.
 * Runtime code never reads them; only this detector and the layout planner do.
 *
 * `sources/archive` is permanent by design: the migration lists it and never
 * moves or deletes it, so a domain holding snapshots keeps reporting it.
 */
export const RETIRED_LAYOUT_FOLDERS = [
  'export',
  'sources/original',
  'sources/nn',
  'sources/export',
  'sources/archive',
] as const

const INERT_FOLDERS: ReadonlySet<string> = new Set(['sources/archive'])

async function hasContent(r: DomainReader, dir: string): Promise<boolean> {
  return (await r.list(dir)).length > 0
}

/**
 * Report one `legacy-layout` signal per retired folder that still holds content.
 * An empty folder is not a signal: scaffolding may leave empty directories behind
 * and there is nothing to migrate in them.
 */
export async function detectLegacyLayout(r: DomainReader): Promise<LegacySignal[]> {
  const signals: LegacySignal[] = []
  for (const folder of RETIRED_LAYOUT_FOLDERS) {
    if (await hasContent(r, folder)) {
      signals.push({
        type: 'legacy-layout',
        path: folder,
        detail: INERT_FOLDERS.has(folder)
          ? `Retired folder '${folder}/' holds archived snapshots: they are inert, listed by the nn-upgrade layout migration, and never moved or deleted`
          : `Retired folder '${folder}/' still holds content (see the nn-upgrade layout migration)`,
      })
    }
  }
  return signals
}
