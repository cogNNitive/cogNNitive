/**
 * coNNtent/assets/console-view-episode-review.data.mjs
 *
 * Export-time facts for the Episode review view (design A12/A13). Facts stay JSONL: this
 * module reads `<domaiNN>/.cognnitive/video/ledger.jsonl` and `timings.jsonl` and hands the
 * view a small, already-summed object. Nothing here runs in the browser.
 *
 * Missing files mean "no facts yet", never an error: a fresh domaiNN must still export.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const LEDGER = ['ledger.jsonl']

/** Reads a JSONL file, skipping corrupt and partial lines (a killed run leaves one). */
async function readJsonl(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return []
    throw err
  }
  const rows = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const row = JSON.parse(trimmed)
      if (row && typeof row === 'object') rows.push(row)
    } catch {
      // A torn last line from an interrupted append is not a fact.
    }
  }
  return rows
}

/** Per-episode cost: every ledger row that carries an episode and a positive amount. */
function sumCost(rows) {
  let total = 0
  for (const row of rows) {
    const amount = Number(row.estUsd)
    if (Number.isFinite(amount) && amount > 0) total += amount
    const refund = Number(row.refundUsd)
    if (Number.isFinite(refund) && refund > 0) total -= refund
  }
  return Math.round(Math.max(0, total) * 1e6) / 1e6
}

function timingRow(row) {
  return {
    stage: String(row.stage || ''),
    durationMs: Number(row.duration_ms) || 0,
    fingerprint: String((row.machine && row.machine.fp) || ''),
    runId: String(row.run_id || ''),
    outcome: String(row.outcome || ''),
  }
}

export async function collect({ rootDir }) {
  const factsDir = join(String(rootDir || '.'), '.cognnitive', 'video')
  const [ledger, timings] = await Promise.all([
    readJsonl(join(factsDir, LEDGER[0])),
    readJsonl(join(factsDir, 'timings.jsonl')),
  ])

  /** @type {Record<string, { realUsd: number, rows: number, timings: any[] }>} */
  const episodes = {}
  const bucket = (slug) => {
    if (!slug) return null
    if (!episodes[slug]) episodes[slug] = { realUsd: 0, rows: 0, timings: [] }
    return episodes[slug]
  }

  for (const row of ledger) {
    const entry = bucket(String(row.episode || ''))
    if (!entry) continue
    entry.rows += 1
    entry.realUsd = Math.round((entry.realUsd + sumCost([row])) * 1e6) / 1e6
  }
  for (const row of timings) {
    const entry = bucket(String(row.episode || ''))
    if (!entry) continue
    entry.timings.push(timingRow(row))
  }

  return { episodes }
}
