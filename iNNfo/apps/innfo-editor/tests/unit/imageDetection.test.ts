import { describe, it, expect } from 'vitest'
import {
  IMAGE_EXTENSIONS,
  isImageFieldName,
  isMetadataFieldName,
  isImageExtension,
  getFileExtension,
  hasImageExtension,
  isImageValue,
  isImageFieldValue,
} from '../../src/utils/imageDetection'

describe('imageDetection — shared image detection helpers', () => {
  it('covers a broad set of image extensions', () => {
    for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif', 'tiff', 'heic', 'apng', 'jxl']) {
      expect(isImageExtension(ext), ext).toBe(true)
    }
    expect(isImageExtension('JPG')).toBe(true)
    expect(isImageExtension('.png')).toBe(true)
  })

  it('does not treat non-image extensions as images', () => {
    for (const ext of ['pdf', 'csv', 'txt', 'md', '7z', 'mp4', 'mp3']) {
      expect(isImageExtension(ext), ext).toBe(false)
    }
  })

  it('recognizes image-like field names', () => {
    for (const name of ['image', 'image_url', 'photo', 'picture', 'avatar', 'thumbnail', 'foto', 'portrait', 'img', 'asset']) {
      expect(isImageFieldName(name), name).toBe(true)
    }
    for (const name of ['summary', 'directors', 'role', 'source_ref']) {
      expect(isImageFieldName(name), name).toBe(false)
    }
  })

  it('extracts extensions from paths and URLs (query/hash stripped, case-insensitive)', () => {
    expect(getFileExtension('assets/actors/Gene_Kelly.png')).toBe('png')
    expect(getFileExtension('assets/actors/Donald_O_Connor.JPG')).toBe('jpg')
    expect(getFileExtension('https://example.com/x/330px-Poster.webp?width=150')).toBe('webp')
    expect(getFileExtension('/some/file.svg#fragment')).toBe('svg')
    expect(getFileExtension('no_extension')).toBe('')
    expect(getFileExtension('.gitignore')).toBe('')
  })

  it('detects image values across formats', () => {
    for (const value of [
      'assets/actors/Gene_Kelly.png',
      'assets/actors/Donald_O_Connor.JPG',
      'poster.jpeg',
      'cover.webp',
      'icon.svg',
      'photo.avif',
      'scan.tiff',
      'pic.heic',
      'https://example.com/img/photo.jpg?width=200',
      'data:image/png;base64,iVBORw0KGgo=',
      'blob:http://localhost/abc-123',
    ]) {
      expect(isImageValue(value), value).toBe(true)
      expect(hasImageExtension(value) || value.startsWith('data:') || value.startsWith('blob:'), value).toBe(true)
      expect(isImageFieldValue('whatever', value), value).toBe(true)
    }
  })

  it('rejects non-image values', () => {
    for (const value of ['report.pdf', 'data.csv', 'notes.md', 'archive.7z', 'movie.mp4', 'plain text', '']) {
      expect(isImageValue(value), value).toBe(false)
    }
    expect(isImageFieldValue('summary', 'report.pdf')).toBe(false)
  })

  it('treats a value as image when only the field name is image-like', () => {
    expect(isImageFieldValue('image_url', 'assets/posters/poster_without_ext')).toBe(true)
    expect(isImageFieldValue('photo', 'Gene Kelly')).toBe(true)
  })

  it('recognizes *_metadata companion fields and never treats them as images', () => {
    for (const name of ['image_metadata', 'photo_metadata', 'Image_Metadata', 'poster_metadata']) {
      expect(isMetadataFieldName(name), name).toBe(true)
    }
    for (const name of ['image', 'image_url', 'photo', 'metadata', 'summary']) {
      expect(isMetadataFieldName(name), name).toBe(false)
    }
    // A metadata field holds attribution/notes: even if its value looks like
    // an image, it must NOT be classified as an image.
    expect(isImageFieldValue('image_metadata', 'https://example.com/img/photo.jpg')).toBe(false)
    expect(isImageFieldValue('image_metadata', 'assets/posters/photo.png')).toBe(false)
  })

  it('exposes a non-empty extension list', () => {
    expect(IMAGE_EXTENSIONS.length).toBeGreaterThan(10)
  })
})
