/**
 * Shared image-detection utilities.
 *
 * Centralizes how the editor decides whether a field name or a field value
 * refers to an image. Previously each consumer kept its own extension
 * whitelist (some only `.jpg`), so images in other formats — `.png`,
 * `.webp`, `.avif`, `.tiff`, `.heic`, etc. — were rendered as plain files.
 * Now every consumer (Pill, BlockSheet, FieldViewer, WidgetField,
 * NodeMedia, WorkspaceView, media scanner) shares the same detection.
 */

/** Broad list of raster + vector image extensions (lowercase, no dot). */
export const IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'pjpeg',
  'pjp',
  'png',
  'apng',
  'gif',
  'webp',
  'svg',
  'svgz',
  'bmp',
  'dib',
  'ico',
  'cur',
  'avif',
  'tif',
  'tiff',
  'heic',
  'heif',
  'jxl',
  'psd',
] as const

const IMAGE_EXTENSION_SET: ReadonlySet<string> = new Set(IMAGE_EXTENSIONS)

/** Field names that conventionally hold an image, regardless of extension. */
export const IMAGE_FIELD_NAME_REGEX =
  /^(image(_url)?|photo|picture|avatar|thumbnail|foto|portrait|img(_url)?|asset(_url)?)$/i

/**
 * Fields named `<baseField>_metadata` are free-text companions (attribution,
 * source URL, notes) and are NEVER images — regardless of their value.
 */
export const METADATA_FIELD_NAME_REGEX = /_metadata$/i

export function isMetadataFieldName(name: string): boolean {
  return METADATA_FIELD_NAME_REGEX.test(name)
}

export function isImageFieldName(name: string): boolean {
  return IMAGE_FIELD_NAME_REGEX.test(name)
}

export function isImageExtension(ext: string): boolean {
  return IMAGE_EXTENSION_SET.has(ext.toLowerCase().replace(/^\./, ''))
}

/**
 * Extracts the lowercase extension (no dot) of a file path or URL, ignoring
 * query strings and hashes. Returns '' when there is no extension.
 */
export function getFileExtension(value: string): string {
  const clean = value.split(/[?#]/)[0]
  const base = clean.split('/').pop() ?? ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot + 1).toLowerCase()
}

export function hasImageExtension(value: string): boolean {
  return isImageExtension(getFileExtension(value))
}

/** True when a value itself looks like an image (data/blob URL or image extension). */
export function isImageValue(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (/^data:image\//i.test(v)) return true
  if (/^blob:/i.test(v)) return true
  return hasImageExtension(v)
}

/** Convenience: field is image-named OR its value looks like an image.
 *  `*_metadata` fields are always excluded — they hold attribution/notes. */
export function isImageFieldValue(key: string, value: string): boolean {
  if (isMetadataFieldName(key)) return false
  if (isImageFieldName(key)) return true
  return isImageValue(value)
}
