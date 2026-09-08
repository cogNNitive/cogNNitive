import { normalizeName } from './sourceRef'

export interface CsvTable {
  /** Headers normalized with `normalizeName`. Key column is `headers[0]` by convention. */
  headers: string[]
  /** Data rows, raw cell strings (row order = file order). */
  rows: string[][]
  /** True when quoting is unbalanced — rows are then empty, headers may stand. */
  malformed: boolean
}

export interface CsvTableOptions {
  /** Field delimiter (default `,`). Parameterized so the choice stays reversible. */
  delimiter?: string
}

/**
 * Parse an RFC-4180-subset CSV: configurable delimiter, `"` quoting with `""`
 * escape, CRLF/LF rows (preserved verbatim inside quoted fields). Pure, zero
 * dependencies, browser-safe. Shared by unit resolution and the query engine.
 */
export function parseCsvTable(content: string, options: CsvTableOptions = {}): CsvTable {
  const delimiter = options.delimiter ?? ','
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let inQuotes = false
  let hasContent = false

  const pushField = () => {
    record.push(field)
    field = ''
  }
  const pushRecord = () => {
    // Skip the trailing empty line, keep every real record.
    if (record.length === 1 && record[0] === '' && !hasContent) {
      record = []
      return
    }
    records.push(record)
    record = []
    hasContent = false
  }

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    hasContent = hasContent || (ch !== '\r' && ch !== '\n') || inQuotes
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      pushField()
    } else if (ch === '\r') {
      // Lone CR is data; CRLF is a row break (LF handles it below).
      if (content[i + 1] !== '\n') field += ch
    } else if (ch === '\n') {
      pushField()
      pushRecord()
    } else {
      field += ch
    }
  }
  if (inQuotes) {
    return { headers: [], rows: [], malformed: true }
  }
  pushField()
  pushRecord()

  if (records.length === 0) return { headers: [], rows: [], malformed: false }
  const [headerRow, ...body] = records
  return { headers: headerRow.map((h) => normalizeName(h)), rows: body, malformed: false }
}
