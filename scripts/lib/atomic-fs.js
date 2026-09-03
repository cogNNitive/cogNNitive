/**
 * scripts/lib/atomic-fs.js
 *
 * Safe atomic filesystem operations: atomic JSON writes, directory staging,
 * transactional directory replacement with rollback, and tarball extraction.
 * Zero external dependencies — native Node.js execution.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Atomically writes data as formatted JSON to a destination file.
 * Uses a sibling temporary file and atomic rename to avoid partial writes.
 * @param {string} filePath
 * @param {any} data
 * @param {number} [indent=2]
 * @returns {void}
 */
function saveJsonAtomic(filePath, data, indent = 2) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, indent), 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch (_) {}
    throw err;
  }
}

/**
 * Copies a directory atomically by copying into a staged directory and renaming.
 * @param {string} src
 * @param {string} dest
 * @returns {void}
 */
function copyDirAtomic(src, dest) {
  const parent = path.dirname(dest);
  fs.mkdirSync(parent, { recursive: true });
  const staged = path.join(parent, `.${path.basename(dest)}.new-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.rmSync(staged, { recursive: true, force: true });
  try {
    fs.cpSync(src, staged, { recursive: true });
    fs.renameSync(staged, dest);
  } catch (err) {
    fs.rmSync(staged, { recursive: true, force: true });
    throw err;
  }
}

/**
 * Replaces a destination directory atomically using staged and backup copies.
 * Rolls back to the original destination if replacing fails.
 * @param {string} src
 * @param {string} dest
 * @returns {void}
 */
function replaceDirAtomic(src, dest) {
  const parent = path.dirname(dest);
  fs.mkdirSync(parent, { recursive: true });
  const name = path.basename(dest);
  const id = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const staged = path.join(parent, `.${name}.new-${id}`);
  const backup = path.join(parent, `.${name}.bak-${id}`);

  fs.rmSync(staged, { recursive: true, force: true });
  fs.rmSync(backup, { recursive: true, force: true });

  const safeRename = (from, to) => {
    try {
      fs.renameSync(from, to);
    } catch (err) {
      if (err.code === 'EBUSY' || err.code === 'EPERM') {
        throw new Error(
          `Directory "${to}" is currently locked by another process (VS Code, terminal, or antivirus).\n` +
          `Please close any open files or editors accessing that folder and retry.`
        );
      }
      throw err;
    }
  };

  try {
    fs.cpSync(src, staged, { recursive: true });
    if (fs.existsSync(dest)) {
      safeRename(dest, backup);
    }
    try {
      safeRename(staged, dest);
      fs.rmSync(backup, { recursive: true, force: true });
    } catch (err) {
      if (fs.existsSync(backup) && !fs.existsSync(dest)) {
        try { safeRename(backup, dest); } catch (_) {}
      }
      throw err;
    }
  } finally {
    fs.rmSync(staged, { recursive: true, force: true });
  }
}

/**
 * Extracts a tarball archive to the destination directory.
 * @param {string} tarFile
 * @param {string} destDir
 * @returns {void}
 */
function extractTarball(tarFile, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const res = spawnSync('tar', ['-xzf', tarFile, '-C', destDir], { cwd: destDir, encoding: 'utf-8' });
  if (res.status !== 0) {
    throw new Error(`tar extraction failed: ${(res.stderr || res.stdout || '').trim()}`);
  }
}

/**
 * Copies directory recursively, skipping node_modules and hidden dot-files.
 * @param {string} src
 * @param {string} dest
 * @returns {void}
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const base = path.basename(src);
  if (base === 'node_modules' || base.startsWith('.')) return;

  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyDirRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

module.exports = {
  saveJsonAtomic,
  copyDirAtomic,
  replaceDirAtomic,
  extractTarball,
  copyDirRecursive,
};
