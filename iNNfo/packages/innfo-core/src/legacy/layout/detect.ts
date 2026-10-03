// legacy:cognitivize-in-place/layout-detect

import type { DomainReader, LegacySignal } from '../detect.js'

/**
 * Folders already retired by the cognitivize-in-place layout, in report order.
 * Runtime code never reads them; only this detector and the layout planner do.
 *
 * `sources/nn`, `sources/export`, and `sources/archive` join this list when the
 * ingest cutover lands: until then the scanner still writes them, so a domain
 * holding them is current, not legacy.
 */
export const RETIRED_LAYOUT_FOLDERS = ['export', 'sources/original'] as const

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
        detail: `Retired folder '${folder}/' still holds content (see the nn-upgrade layout migration)`,
      })
    }
  }
  return signals
}
