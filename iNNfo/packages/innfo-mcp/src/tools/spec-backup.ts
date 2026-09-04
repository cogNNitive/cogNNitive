import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { deflateRawSync, crc32 } from 'node:zlib'
import { getMarkdownFiles } from './fs-utils.js'

/* ── Minimal ZIP writer ──────────────────────────────────────────
 *
 * A dependency-free store-nothing / deflate ZIP builder used only for
 * `specs/` backup snapshots. Not ZIP64-aware: it caps out at ~4 GiB total
 * and 65,535 entries. Kept in-repo deliberately (the workspace avoids
 * runtime deps for tooling); if the entry count ever approaches that limit,
 * reach for a real archiver instead.
 */

interface ZipEntryInput {
  name: string
  buffer: Buffer
}

function buildZipArchive(entries: ZipEntryInput[]): Buffer {
  const localHeaders: Buffer[] = []
  const cdHeaders: Buffer[] = []
  let currentOffset = 0

  for (const entry of entries) {
    const filenameBuf = Buffer.from(entry.name, 'utf-8')
    const compressed = deflateRawSync(entry.buffer)
    const crc = crc32(entry.buffer)
    const uncompressedSize = entry.buffer.length
    const compressedSize = compressed.length

    const localHeader = Buffer.alloc(30 + filenameBuf.length)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(8, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressedSize, 18)
    localHeader.writeUInt32LE(uncompressedSize, 22)
    localHeader.writeUInt16LE(filenameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28)
    filenameBuf.copy(localHeader, 30)

    localHeaders.push(localHeader, compressed)

    const cdHeader = Buffer.alloc(46 + filenameBuf.length)
    cdHeader.writeUInt32LE(0x02014b50, 0)
    cdHeader.writeUInt16LE(20, 4)
    cdHeader.writeUInt16LE(20, 6)
    cdHeader.writeUInt16LE(0, 8)
    cdHeader.writeUInt16LE(8, 10)
    cdHeader.writeUInt16LE(0, 12)
    cdHeader.writeUInt16LE(0, 14)
    cdHeader.writeUInt32LE(crc, 16)
    cdHeader.writeUInt32LE(compressedSize, 20)
    cdHeader.writeUInt32LE(uncompressedSize, 24)
    cdHeader.writeUInt16LE(filenameBuf.length, 28)
    cdHeader.writeUInt16LE(0, 30)
    cdHeader.writeUInt16LE(0, 32)
    cdHeader.writeUInt16LE(0, 34)
    cdHeader.writeUInt16LE(0, 36)
    cdHeader.writeUInt32LE(0, 38)
    cdHeader.writeUInt32LE(currentOffset, 42)
    filenameBuf.copy(cdHeader, 46)

    cdHeaders.push(cdHeader)
    currentOffset += localHeader.length + compressed.length
  }

  const cdStartOffset = currentOffset
  let cdSize = 0
  for (const cd of cdHeaders) cdSize += cd.length

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdSize, 12)
  eocd.writeUInt32LE(cdStartOffset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localHeaders, ...cdHeaders, eocd])
}

/**
 * Package orphan spec candidates (or the whole `specs/` tree) into
 * `.backup/specs_<timestamp>.zip` before a mutation.
 */
export async function createSpecsBackupZip(
  rootDir: string,
  candidatePaths?: string[],
): Promise<string> {
  const backupDir = join(rootDir, '.backup')
  await mkdir(backupDir, { recursive: true })

  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:T.]/g, '')
    .slice(0, 14)
  const zipPath = join(backupDir, `specs_${timestamp}.zip`)

  const filesToZip: Array<{ fullPath: string; zipRelPath: string }> = []

  if (candidatePaths && candidatePaths.length > 0) {
    for (const p of candidatePaths) {
      const st = await stat(p).catch(() => null)
      if (st?.isFile()) {
        const rel = join('specs', basename(p)).replace(/\\/g, '/')
        filesToZip.push({ fullPath: p, zipRelPath: rel })
      } else if (st?.isDirectory()) {
        const subFiles = await getMarkdownFiles(p)
        for (const f of subFiles) {
          const subRel = f
            .replace(rootDir, '')
            .replace(/^[/\\]/, '')
            .replace(/\\/g, '/')
          filesToZip.push({ fullPath: f, zipRelPath: subRel })
        }
      }
    }
  } else {
    const specsDir = join(rootDir, 'specs')
    const allFiles = await getMarkdownFiles(specsDir).catch(() => [])
    for (const f of allFiles) {
      const rel = join('specs', f.replace(specsDir, '').replace(/^[/\\]/, '')).replace(/\\/g, '/')
      filesToZip.push({ fullPath: f, zipRelPath: rel })
    }
  }

  const entries: ZipEntryInput[] = []
  for (const f of filesToZip) {
    const buffer = await readFile(f.fullPath).catch(() => null)
    if (buffer) {
      entries.push({ name: f.zipRelPath, buffer })
    }
  }

  const zipBuf = buildZipArchive(entries)
  await writeFile(zipPath, zipBuf)
  return zipPath
}
