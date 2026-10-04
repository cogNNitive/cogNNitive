// legacy:cognitivize-in-place/layout-migrate
// Node only: reached through `legacy/index.ts` (the `import`/`default` condition), never the browser entry.

import { promises as fsp } from 'node:fs'
import * as path from 'node:path'
import { cognitivize, type CognitivizeResult, type Normalizer } from '../../cognitivize/index.js'

/** Scratch directory the planner fills with old mirror bodies: `<dir>/<subject path>.md`. */
export const MIGRATION_STAGING_DIR = 'staging/migration'

export interface PreservedBodiesResult {
  cognitivized: string[]
  skipped: Array<{ subject: string; reason: string }>
}

const toPosix = (p: string): string => p.replace(/\\/g, '/')

async function listFiles(dir: string, rel = ''): Promise<string[]> {
  const entries = await fsp.readdir(path.join(dir, rel), { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const entry of entries) {
    const child = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...(await listFiles(dir, child)))
    else if (entry.isFile()) out.push(child)
  }
  return out.sort()
}

/**
 * Post-apply step of the layout migration. For every body preserved under
 * `staging/migration/`, run core `cognitivize` on its subject with a normalizer
 * that returns the preserved body, so existing `@Heading` citations into the old
 * mirror stay valid. Text-native subjects get a bodyless sidecar as usual. The
 * migration staging directory is removed afterwards; other `staging/` content is
 * left alone.
 */
export async function cognitivizePreservedBodies(
  root: string,
  o: { now?: () => Date } = {},
): Promise<PreservedBodiesResult> {
  const stagingAbs = path.join(path.resolve(root), ...MIGRATION_STAGING_DIR.split('/'))
  const staged = (await listFiles(stagingAbs)).filter((rel) => rel.endsWith('.md'))
  const result: PreservedBodiesResult = { cognitivized: [], skipped: [] }

  for (const rel of staged) {
    const subject = rel.slice(0, -'.md'.length)
    const body = await fsp.readFile(path.join(stagingAbs, rel), 'utf8')
    const normalizer: Normalizer = async () => ({ body, normalizedBy: 'nn-upgrade/layout-migration' })
    const outcome: CognitivizeResult = await cognitivize(root, subject, { normalizer, now: o.now })
    if (outcome.status === 'written' || outcome.status === 'refreshed' || outcome.status === 'unchanged') {
      result.cognitivized.push(toPosix(subject))
    } else {
      result.skipped.push({
        subject: toPosix(subject),
        reason: outcome.status === 'rejected' ? outcome.reason : outcome.status,
      })
    }
  }

  await fsp.rm(stagingAbs, { recursive: true, force: true })
  const stagingParent = path.dirname(stagingAbs)
  if ((await fsp.readdir(stagingParent).catch(() => ['keep'])).length === 0) {
    await fsp.rmdir(stagingParent).catch(() => undefined)
  }
  return result
}
