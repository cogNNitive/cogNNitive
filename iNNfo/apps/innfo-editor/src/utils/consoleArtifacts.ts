/**
 * Console artifacts are write-once families (`<stem>_console_<UTC stamp>.html`): the
 * latest console of a model is the latest member of its family by name order, never a
 * hand-written path. Ordering and identity come from the innfo-core naming contract.
 */
import { familyOf, latestOfFamily, type FamilyMember } from '@cognnitive/innfo-core'

const ARTIFACTS_DIR = 'artifacts'
const MAX_SCAN_DEPTH = 4

interface ScanDirectory {
  entries(): AsyncIterable<[string, { kind: string }]>
  getDirectoryHandle(name: string): Promise<ScanDirectory>
}

/** Family key of the console HTML of a model stem. */
export function consoleFamilyKey(stem: string): string {
  return `${stem}_console`
}

/** Every `.html` file under `artifacts/`, as workspace-relative POSIX paths. */
export async function scanHtmlArtifacts(root: unknown): Promise<string[]> {
  const found: string[] = []
  const walk = async (dir: ScanDirectory, prefix: string, depth: number): Promise<void> => {
    if (depth > MAX_SCAN_DEPTH) return
    for await (const [name, handle] of dir.entries()) {
      if (name.startsWith('.')) continue
      const rel = `${prefix}/${name}`
      if (handle.kind === 'directory') {
        await walk(await dir.getDirectoryHandle(name), rel, depth + 1)
      } else if (handle.kind === 'file' && name.toLowerCase().endsWith('.html')) {
        found.push(rel)
      }
    }
  }
  try {
    await walk(await (root as ScanDirectory).getDirectoryHandle(ARTIFACTS_DIR), ARTIFACTS_DIR, 0)
  } catch {
    // no artifacts folder (or an unreadable one): there is nothing to resolve
  }
  return found
}

/** `a\\b/../c` style references the hub HTML may carry, normalized to a workspace-relative path. */
function normalizeRef(ref: string): string {
  return ref
    .replace(/\\/g, '/')
    .replace(/^(\.\.?\/)+/, '')
    .replace(/^\/+/, '')
}

interface FamilyIdentity {
  dir: string
  key: string
  ext: string
}

const lower = (f: FamilyIdentity): FamilyIdentity => ({
  dir: f.dir.toLowerCase(),
  key: f.key.toLowerCase(),
  ext: f.ext.toLowerCase(),
})

function latestMatching(paths: string[], matches: (family: FamilyIdentity) => boolean): string | undefined {
  const members: FamilyMember[] = []
  let chosen: FamilyIdentity | undefined
  for (const path of paths) {
    const family = familyOf(path)
    if (!family) continue
    const id = lower(family)
    if (!matches(id)) continue
    // The first matching family wins, so two folders never merge into one history.
    chosen ??= id
    if (id.dir === chosen.dir && id.key === chosen.key && id.ext === chosen.ext) members.push({ path })
  }
  return latestOfFamily(members)?.path
}

/** Latest member of the family named `key` (optionally restricted to `dir`), case-insensitive. */
export function latestOfFamilyKey(paths: string[], key: string, dir?: string): string | undefined {
  const wanted = key.toLowerCase()
  const wantedDir = dir?.replace(/\/+$/, '').toLowerCase()
  return latestMatching(
    paths,
    (f) => f.key === wanted && f.ext === 'html' && (wantedDir === undefined || f.dir === wantedDir),
  )
}

/** Latest member of the family `ref` belongs to; `undefined` when no scanned file shares its family. */
export function latestInFamilyOf(paths: string[], ref: string): string | undefined {
  const family = familyOf(normalizeRef(ref))
  if (!family) return undefined
  const wanted = lower(family)
  return latestMatching(paths, (f) => f.dir === wanted.dir && f.key === wanted.key && f.ext === wanted.ext)
}

/** True when both references name members of the same family (same folder, key and extension). */
export function sameConsoleFamily(a: string, b: string): boolean {
  const fa = familyOf(normalizeRef(a))
  const fb = familyOf(normalizeRef(b))
  if (!fa || !fb) return false
  const [la, lb] = [lower(fa), lower(fb)]
  return la.dir === lb.dir && la.key === lb.key && la.ext === lb.ext
}

/** Lower-cased family key of a console reference (`''` when it is not a family member). */
export function consoleKeyOf(ref: string): string {
  return familyOf(normalizeRef(ref))?.key.toLowerCase() ?? ''
}
