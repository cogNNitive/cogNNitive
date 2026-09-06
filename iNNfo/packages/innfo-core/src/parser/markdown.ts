export const YAML_BLOCK_RE = /^---\r?\n([\s\S]*?)\r?\n---/
export const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

/** Normalize raw source before pattern matching. Called once at every public
 *  parse entry point so downstream regexes and `split('\n')` calls see a
 *  canonical form: LF line endings (a trailing `\r` breaks `$`-anchored
 *  bullet/section patterns on CRLF-saved files) and no leading UTF-8 BOM
 *  (`\uFEFF`, which defeats every `^---` frontmatter anchor). */
export function normalizeSource(text: string): string {
  // CRLF/CR → LF so `$`-anchored patterns work on Windows-saved files.
  // BOM → strip so `^---` frontmatter anchors match on BOM-saved files.
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
}

/** Strip the leading YAML frontmatter block from a raw document (BOM/CRLF
 *  normalized first), returning the body text. Shared by the parser, the
 *  validator's format checks, and the recursive workspace walker so all three
 *  agree on where the frontmatter ends. */
export function stripFrontmatter(raw: string): string {
  return normalizeSource(raw).replace(YAML_BLOCK_RE, '')
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
