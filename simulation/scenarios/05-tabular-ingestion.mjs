/**
 * S05 — Importing tabular data and citing a single row.
 *
 * The tabular ingestion procedure turns a spreadsheet into a CSV under
 * `sources/nn/`, after which model elements cite individual rows by key
 * (`unit-costs.csv@SKU-014`). This scenario checks that the row pointer is
 * validated as strictly as a heading pointer.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createNodeDirectoryHandle } from '../lib/nodeFs.mjs'
import { createScenario, SIM } from '../lib/harness.mjs'
import { loadCore } from '../lib/core.mjs'

const WS = join(SIM, 'fixtures', 'acme')

export default async function run() {
  const { recursiveParse, validateWorkspaceSources, parseCsvTable, extractHeadings, parseKnowledgeUnitRef } =
    await loadCore()
  const s = createScenario('S05', 'Tabular source ingestion & row-level citations',
    'An analyst imports a cost table and cites one SKU row from a model assumption.')

  const resolve = (overrideCsv) => (refPath) => {
    const full = join(WS, refPath)
    if (!existsSync(full)) return { exists: false }
    const content = refPath.endsWith('.csv') && overrideCsv ? overrideCsv : readFileSync(full, 'utf-8')
    return { exists: true, content, headings: extractHeadings(content).map((h) => h.slug) }
  }

  try {
    const csv = parseCsvTable(readFileSync(join(WS, 'sources', 'nn', 'unit-costs.csv'), 'utf-8'))
    s.expect(
      'The imported table parses with a usable key column',
      { columns: csv.columns ?? csv.headers, rowCount: (csv.rows ?? []).length },
      (v) => (v.columns ?? []).length > 0 && v.rowCount === 3,
      'columns and three data rows',
    )

    s.expect(
      'A row citation parses as a row unit, not a heading',
      parseKnowledgeUnitRef('unit-costs.csv@SKU-014'),
      (r) => r?.unit?.kind === 'row' && r.unit.id === 'SKU-014',
      'the `.csv` extension selects the row grammar automatically',
    )

    const parsed = await recursiveParse(createNodeDirectoryHandle(WS))
    s.expect(
      'A valid row citation produces no diagnostics',
      validateWorkspaceSources(parsed, resolve()),
      (d) => d.length === 0,
      'SKU-014 exists in the table, so nothing to report',
    )

    // The row is deleted upstream — the classic silent-breakage scenario.
    const withoutRow = readFileSync(join(WS, 'sources', 'nn', 'unit-costs.csv'), 'utf-8')
      .split(/\r?\n/)
      .filter((l) => !l.startsWith('SKU-014'))
      .join('\n')
    s.expect(
      'Deleting the cited row upstream is reported',
      validateWorkspaceSources(parsed, resolve(withoutRow)).map((d) => ({ code: d.code, severity: d.severity })),
      (d) => d.some((x) => x.code === 'KU_UNKNOWN_ROW' && x.severity === 'error'),
      'KU_UNKNOWN_ROW error — the citation no longer resolves',
    )

    // Duplicate keys make every row citation ambiguous.
    const dupKeys = `${readFileSync(join(WS, 'sources', 'nn', 'unit-costs.csv'), 'utf-8').trim()}\nSKU-014,control board v2,44.10,Norvex\n`
    s.expect(
      'Duplicate keys in the source table are reported once, not per citation',
      validateWorkspaceSources(parsed, resolve(dupKeys)).map((d) => d.code),
      (codes) => codes.filter((c) => c === 'KU_DUPLICATE_KEY').length === 1,
      'exactly one KU_DUPLICATE_KEY for the file',
    )

    s.expect(
      'A line-range citation is refused (line numbers are not stable provenance)',
      parseKnowledgeUnitRef('unit-costs.csv#L2-L4'),
      (r) => r === null,
      'null — provenance addresses named units, never line offsets',
    )
  } catch (err) {
    s.crash('scenario execution', err)
  }
  return s
}
