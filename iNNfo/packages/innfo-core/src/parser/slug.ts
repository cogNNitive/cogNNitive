/**
 * Derive a URL-safe slug from a name string:
 * - NFKD transliteration of diacritics
 * - lowercase
 * - whitespace and underscores → hyphens
 * - remove non-alphanumeric characters except hyphens
 * - collapse multiple hyphens
 * - trim leading/trailing hyphens
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-') // spaces and underscores → hyphens
    .replace(/[^a-z0-9-]/g, '') // remove non-alphanumeric except hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

/**
 * Derive a unique URL-safe slug, appending `-1`, `-2`, etc. on collision.
 * The `existingSlugs` set is mutated in place to include the generated slug.
 */
export function uniqueSlugify(name: string, existingSlugs: Set<string>): string {
  let slug = slugify(name)
  if (slug === '' || slug === '-') slug = 'unnamed'
  if (!existingSlugs.has(slug)) {
    existingSlugs.add(slug)
    return slug
  }
  let counter = 1
  while (existingSlugs.has(`${slug}-${counter}`)) {
    counter++
  }
  const unique = `${slug}-${counter}`
  existingSlugs.add(unique)
  return unique
}

/**
 * Normalizes Unicode dash/minus variants (hyphen, non-breaking hyphen, figure
 * dash, en dash, em dash, horizontal bar, minus sign) to a plain ASCII
 * hyphen `-`. Used to tolerate typographic autocorrect (e.g. "Revenue –
 * Cost" vs "Revenue - Cost") when matching element/reference names.
 */
export function normalizeSeparators(s: string): string {
  return s.replace(/[‐-―−]/g, '-')
}
