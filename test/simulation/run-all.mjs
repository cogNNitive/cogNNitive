#!/usr/bin/env node
/**
 * Runs every scenario and writes `results/report.md` + `results/report.json`.
 *
 * Exit code is always 0: this is a diagnostic simulation, not a CI gate. Read
 * the report — a FAIL here is a finding to triage, not a broken build.
 */
import { readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { writeReport } from './lib/harness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const scenarioDir = join(here, 'scenarios')

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))

const files = (await readdir(scenarioDir))
  .filter((f) => f.endsWith('.mjs'))
  .filter((f) => only.length === 0 || only.some((o) => f.includes(o)))
  .sort()

const scenarios = []
for (const file of files) {
  const mod = await import(pathToFileURL(join(scenarioDir, file)).href)
  process.stdout.write(`▶ ${file}\n`)
  scenarios.push(await mod.default())
}

const { counts, outFile } = writeReport(scenarios, join(here, 'results', 'report.md'))
process.stdout.write(`\n${counts.PASS} passed · ${counts.FAIL} failed · ${counts.OBSERVED} observed\n`)
process.stdout.write(`report: ${outFile}\n`)

for (const s of scenarios) {
  for (const st of s.steps) {
    if (st.outcome === 'FAIL') process.stdout.write(`  ❌ ${s.id} — ${st.label}\n`)
  }
}
