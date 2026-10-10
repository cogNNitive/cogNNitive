/**
 * Changeset → console element history.
 *
 * The generated console modal shows a "Changeset Lineage & Revision History"
 * section per element (ui-kit.js), reading `element.history`. This module is the
 * producer: it loads `changes/*_changes_NN.md` at export time and attaches the
 * changes whose `target` resolves to each element. The console is static and
 * offline, so history must be embedded in the payload, exactly like citations.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseChangeset } from '../changeset/parser.js'

/** One lineage entry as the console modal renders it (author • timestamp, notes). */
export interface ElementHistoryItem {
  id: string
  op: string
  author?: string
  timestamp?: string
  notes?: string
  status?: string
}

interface ChangesetChangeRecord {
  id: string
  op: string
  target: string
  author?: string
  notes?: string
  status?: string
}

/** A parsed changeset reduced to what element history needs. */
export interface ChangesetRecord {
  path: string
  status?: string
  author?: string
  appliedAt?: string
  changes: ChangesetChangeRecord[]
}

/** Structural element shape this module needs (avoids importing payload-builder). */
interface HistoryBearingElement {
  id: string
  name: string
  history?: ElementHistoryItem[]
}

const CHANGESET_FILE_RE = /_changes_NN\.md$/i

/** Splits a canonical D5 address `model@element&field` into its model and element parts. */
export function parseChangesetTarget(target: string): { modelPart: string; elementPart: string } {
  const at = String(target || '').indexOf('@')
  if (at === -1) return { modelPart: '', elementPart: '' }
  const rest = String(target).slice(at + 1)
  return {
    modelPart: String(target).slice(0, at).trim(),
    elementPart: rest.split('&')[0].trim(),
  }
}

/** Case/separator-insensitive key so `Element 1A`, `element-1a` and `element1a` all match. */
export function normalizeAddressKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function stripWrappingQuotes(value?: string): string | undefined {
  if (typeof value !== 'string') return value
  const t = value.trim()
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1)
  return value
}

/**
 * Reads every `changes/*_changes_NN.md` document under `rootDir` (sorted by file
 * name for deterministic output) and reduces it to a `ChangesetRecord`.
 */
export async function loadChangesetRecords(rootDir: string): Promise<ChangesetRecord[]> {
  const dir = join(rootDir, 'changes')
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }
  const records: ChangesetRecord[] = []
  for (const name of names.filter((n) => CHANGESET_FILE_RE.test(n)).sort()) {
    let raw: string
    try {
      raw = await readFile(join(dir, name), 'utf-8')
    } catch {
      continue
    }
    let doc
    try {
      doc = parseChangeset(raw)
    } catch {
      continue
    }
    const fm = doc.frontmatter as Record<string, unknown>
    records.push({
      path: `changes/${name}`,
      status: fm.status as string | undefined,
      author: fm.author as string | undefined,
      appliedAt: fm.applied_at as string | undefined,
      changes: doc.changes.map((c) => ({
        id: c.id,
        op: c.op,
        target: c.target,
        author: c.author,
        notes: c.notes,
        status: c.status,
      })),
    })
  }
  return records
}

/**
 * Attaches a `history` array to every element whose id or name matches a
 * change's target element (canonical D5 `model@element&field`). The model part
 * is deliberately ignored: element ids already encode concept + element, and a
 * domain console aggregates elements from several models whose titles/aliases
 * vary. Matching is case- and separator-insensitive. Mutates `elements`.
 */
export function attachChangesetHistory(
  elements: HistoryBearingElement[],
  changesets: ChangesetRecord[] | undefined,
): void {
  if (!Array.isArray(changesets) || changesets.length === 0) return
  for (const cs of changesets) {
    for (const change of cs.changes) {
      const { elementPart } = parseChangesetTarget(change.target)
      if (!elementPart) continue
      const key = normalizeAddressKey(elementPart)
      for (const el of elements) {
        if (normalizeAddressKey(el.id) !== key && normalizeAddressKey(el.name) !== key) continue
        const item: ElementHistoryItem = {
          id: change.id,
          op: change.op,
          author: change.author || cs.author,
          timestamp: cs.appliedAt,
          notes: stripWrappingQuotes(change.notes),
          status: change.status || cs.status,
        }
        if (!el.history) el.history = []
        el.history.push(item)
      }
    }
  }
}
