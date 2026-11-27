/**
 * The one on-disk cache location of cogNNitive. Node-only: NOT exported from `browser.ts`.
 */
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Default on-disk cache location: `join(os.tmpdir(), 'innfo-specs')`. It holds the
 * fetched specs/bluepriNNts (nn-mcp resolver) and the derived changeset index
 * (`changeset-index/`), so a default run creates no cache artifacts inside the
 * workspace or repository tree. `INNFO_CACHE_DIR` overrides the location (test seam,
 * mirroring `INNFO_GLOBAL_DIR` / `INNFO_SKILLS_DIR`).
 */
export function defaultCacheDir(): string {
  return process.env.INNFO_CACHE_DIR ?? join(tmpdir(), 'innfo-specs')
}
