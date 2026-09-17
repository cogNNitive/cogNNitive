/**
 * Tiny scenario harness.
 *
 * A scenario is a named sequence of user-visible STEPS. Each step records an
 * observation and, optionally, an expectation. The harness never throws on a
 * failed expectation: the point of the simulation is to produce a full report
 * of what the product actually does, not to stop at the first surprise.
 *
 * Outcomes:
 *   PASS      expectation held
 *   FAIL      expectation broken — a real defect
 *   OBSERVED  no expectation; recorded for the report (often a UX finding)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const SIM = join(ROOT, 'simulation')

export function createScenario(id, title, intent) {
  const steps = []
  const api = {
    id,
    title,
    intent,
    steps,
    /** Record a step with an expectation. */
    expect(label, actual, predicate, expectation) {
      let ok = false
      let error = null
      try {
        ok = predicate(actual)
      } catch (err) {
        error = err instanceof Error ? err.message : String(err)
      }
      steps.push({
        label,
        expectation,
        actual: preview(actual),
        outcome: error ? 'FAIL' : ok ? 'PASS' : 'FAIL',
        error,
      })
      return ok
    },
    /** Record a step with no expectation — an observation for the report. */
    observe(label, actual, note) {
      steps.push({ label, expectation: note ?? null, actual: preview(actual), outcome: 'OBSERVED', error: null })
    },
    /** Record an unexpected throw so one broken step does not kill the run. */
    crash(label, err) {
      steps.push({
        label,
        expectation: 'step completes without throwing',
        actual: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        outcome: 'FAIL',
        error: err instanceof Error ? (err.stack ?? err.message) : String(err),
      })
    },
  }
  return api
}

function preview(value) {
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value.length > 1200 ? `${value.slice(0, 1200)}…` : value
  try {
    const json = JSON.stringify(value, replacer, 2)
    return json && json.length > 1200 ? `${json.slice(0, 1200)}…` : (json ?? String(value))
  } catch {
    return String(value)
  }
}

function replacer(_key, value) {
  if (value instanceof Map) return Object.fromEntries(value)
  if (value instanceof Set) return [...value]
  return value
}

export function summarize(scenarios) {
  const counts = { PASS: 0, FAIL: 0, OBSERVED: 0 }
  for (const s of scenarios) for (const st of s.steps) counts[st.outcome] += 1
  return counts
}

export function writeReport(scenarios, outFile) {
  const counts = summarize(scenarios)
  const lines = []
  lines.push('# Simulacro — user-flow simulation report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push(`**${counts.PASS} passed · ${counts.FAIL} failed · ${counts.OBSERVED} observed**`)
  lines.push('')
  lines.push('| Scenario | Pass | Fail | Observed |')
  lines.push('| --- | ---: | ---: | ---: |')
  for (const s of scenarios) {
    const c = { PASS: 0, FAIL: 0, OBSERVED: 0 }
    for (const st of s.steps) c[st.outcome] += 1
    lines.push(`| ${s.id} — ${s.title} | ${c.PASS} | ${c.FAIL} | ${c.OBSERVED} |`)
  }
  lines.push('')
  for (const s of scenarios) {
    lines.push(`## ${s.id} — ${s.title}`)
    lines.push('')
    lines.push(`_${s.intent}_`)
    lines.push('')
    for (const st of s.steps) {
      const icon = st.outcome === 'PASS' ? '✅' : st.outcome === 'FAIL' ? '❌' : 'ℹ️'
      lines.push(`### ${icon} ${st.label}`)
      if (st.expectation) lines.push(`- **Expected:** ${st.expectation}`)
      lines.push('- **Actual:**')
      lines.push('')
      lines.push('```')
      lines.push(String(st.actual))
      lines.push('```')
      lines.push('')
    }
  }
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, lines.join('\n'), 'utf-8')
  const jsonFile = outFile.replace(/\.md$/, '.json')
  writeFileSync(jsonFile, JSON.stringify({ counts, scenarios }, null, 2), 'utf-8')
  return { counts, outFile, jsonFile }
}
