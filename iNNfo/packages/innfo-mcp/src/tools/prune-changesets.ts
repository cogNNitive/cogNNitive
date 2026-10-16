import { readdir, readFile, rm } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { envelope, parseName } from '@cognnitive/innfo-core'
import { syncDomainManifest } from './workspace-sync.js'

export interface PruneChangesetsOptions {
  dryRun?: boolean
  rootDir?: string
}

export interface PruneChangesetsResult {
  success: boolean
  deletedCount: number
  deleted: string[]
  kept: string[]
  dryRun: boolean
}

/**
 * Scans kNNowledge/ for all cited changesets and prunes unreferenced changesets from changes/.
 */
export async function pruneChangesets(
  domainDir: string,
  options: PruneChangesetsOptions = {},
): Promise<PruneChangesetsResult> {
  const rootDir = options.rootDir || domainDir
  const dryRun = Boolean(options.dryRun)
  const changesDir = join(rootDir, 'changes')
  const knowledgeDir = join(rootDir, 'kNNowledge')

  let changeFiles: string[] = []
  try {
    const entries = await readdir(changesDir)
    changeFiles = entries.filter((f) => f.endsWith('.md') && !f.startsWith('.'))
  } catch {
    return {
      success: true,
      deletedCount: 0,
      deleted: [],
      kept: [],
      dryRun,
    }
  }

  // Scan all markdown files in kNNowledge/ (and root index.md / domaiNN_NN.md)
  const filesToScan: string[] = []
  try {
    const kFiles = await readdir(knowledgeDir)
    for (const f of kFiles) {
      if (f.endsWith('.md')) filesToScan.push(join(knowledgeDir, f))
    }
  } catch {
    // kNNowledge may not exist
  }

  // Also scan domaiNN_NN.md if present
  filesToScan.push(join(rootDir, 'domaiNN_NN.md'))

  const referenced = new Set<string>()
  const refPattern = /changes\/([^\s\]"'`@:]+)/gi

  for (const file of filesToScan) {
    try {
      const content = await readFile(file, 'utf-8')
      let match: RegExpExecArray | null
      while ((match = refPattern.exec(content)) !== null) {
        const candidate = match[1]
        const parsed = parseName(candidate)
        if (parsed.kind === 'nn') {
          referenced.add(candidate)
        }
      }
    } catch {
      // file might not exist
    }
  }

  const deleted: string[] = []
  const kept: string[] = []

  for (const cf of changeFiles) {
    if (referenced.has(cf)) {
      kept.push(cf)
    } else {
      deleted.push(cf)
      if (!dryRun) {
        try {
          await rm(join(changesDir, cf), { force: true })
        } catch {
          // ignore rm error
        }
      }
    }
  }

  if (!dryRun && deleted.length > 0) {
    try {
      await syncDomainManifest(rootDir)
    } catch {
      // ignore sync error
    }
  }

  return {
    success: true,
    deletedCount: deleted.length,
    deleted,
    kept,
    dryRun,
  }
}
