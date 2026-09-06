export const YAML_BLOCK_RE = /^---\r?\n([\s\S]*?)\r?\n---/
export const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

/** Normalize raw source before pattern matching. Called once at every public
 *  parse entry point so downstream regexes and `split('\n')` calls see a
 *  canonical form: LF line endings (a trailing `\r` breaks `$`-anchored
 *  bullet/section patterns on CRLF-saved files). */
export function normalizeSource(text: string): string {
  // CRLF/CR → LF so `$`-anchored patterns work on Windows-saved files.
  return text.replace(/\r\n?/g, '\n')
}

export function parseMarkdownTable(md: string): Record<string, string>[] {
  const lines = normalizeSource(md)
    .split('\n')
    .filter((l) => /(^|[^\\])\|/.test(l.trim()))
  if (lines.length < 2) return []
  const header = parseTableRow(lines[0])
  if (lines.length < 3) return []
  return lines.slice(2).map((line) => {
    const cells = parseTableRow(line)
    const row: Record<string, string> = {}
    header.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    return row
  })
}

export function parseTableRow(line: string): string[] {
  const trimmed = line.trim()
  const hasLeading = trimmed.startsWith('|')
  const hasTrailing = /(^|[^\\])\|$/.test(trimmed)
  const parts = line.split('|')
  const start = hasLeading ? 1 : 0
  const end = hasTrailing ? parts.length - 1 : parts.length
  return parts.slice(start, end).map((c) => c.trim())
}
