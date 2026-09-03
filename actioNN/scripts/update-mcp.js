#!/usr/bin/env node

/**
 * scripts/update-mcp.js
 *
 * Zero-dependency updater for the innfo-mcp server.
 *
 * Resolves the latest published version from iNNfo's production CDN manifest
 * (https://cognnitive.com/innfo/cdn/manifest.json — the same manifest
 * consumed by iNNfo/scripts/innfo-mcp.sh and innfo-mcp.ps1), compares it
 * against the version recorded in .cogNNitive/mcp-version.json, and downloads
 * the matching versioned bundle from that same CDN into .cogNNitive/mcp-bundle.js
 * when they differ. It never pulls an unpinned `main` bundle.
 *
 * State lives under .cogNNitive/ — actioNN's real state directory — not .innv0/
 * or scripts/bin/, which were never created by any part of this pipeline.
 *
 * Usage:
 *   node scripts/update-mcp.js            # normal run: check manifest, download if needed
 *   node scripts/update-mcp.js --dry-run  # resolve versions and print the plan; no
 *                                          # network download, no writes to .cogNNitive/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MANIFEST_URL = 'https://cognnitive.com/innfo/cdn/manifest.json';
const BUNDLE_URL_TEMPLATE = 'https://cognnitive.com/innfo/cdn/innfo-mcp-{version}.bundle.js';

const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_DIR = path.join(ROOT_DIR, '.cogNNitive');
const VERSION_FILE = path.join(STATE_DIR, 'mcp-version.json');
const BUNDLE_FILE = path.join(STATE_DIR, 'mcp-bundle.js');

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Perform HTTPS GET request returning response body as string, following redirects.
 */
function fetchString(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'actioNN-Skills-Updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectsLeft <= 0) return reject(new Error(`Too many redirects fetching ${url}`));
        const nextUrl = new URL(res.headers.location, url).toString();
        return resolve(fetchString(nextUrl, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Downloads a file to a local destination path, following redirects.
 */
function downloadFile(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'actioNN-Skills-Updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(destPath, () => {});
        if (redirectsLeft <= 0) return reject(new Error(`Too many redirects downloading ${url}`));
        const nextUrl = new URL(res.headers.location, url).toString();
        return resolve(downloadFile(nextUrl, destPath, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`Failed to download ${url}, status: ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Build the versioned bundle URL for a manifest "latest" value (e.g. "v0.2.1").
 * The manifest's version string already carries the "v" prefix and is used
 * verbatim, matching iNNfo/scripts/innfo-mcp.sh and innfo-mcp.ps1.
 */
function buildBundleUrl(version) {
  return BUNDLE_URL_TEMPLATE.replace('{version}', version);
}

/**
 * Strips an optional leading "v" so "0.2.1" and "v0.2.1" compare equal.
 * Comparison-only: storage and URL building always use the manifest's
 * verbatim string, never this normalized form.
 */
function normalizeVersion(version) {
  return version ? version.replace(/^v/, '') : version;
}

async function main() {
  console.log('[MCP Updater] Checking for updates...');
  if (DRY_RUN) {
    console.log('[MCP Updater] --dry-run: no network requests will be made, no files will be written.');
  }

  // Ensure state directory exists
  if (!DRY_RUN && !fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  // Load local version info
  let localVersion = null;
  if (fs.existsSync(VERSION_FILE)) {
    try {
      const cache = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
      localVersion = cache.version;
      console.log(`[MCP Updater] Local version: ${localVersion}`);
    } catch (e) {
      console.warn('[MCP Updater] Failed to parse local version cache, forcing update');
    }
  } else {
    console.log('[MCP Updater] No local version record found, forcing initial download');
  }

  if (DRY_RUN) {
    console.log(`[MCP Updater] Would fetch manifest: ${MANIFEST_URL}`);
    console.log(`[MCP Updater] Would compare its "latest" field against local version "${localVersion || '(none)'}"`);
    console.log(`[MCP Updater] If different, would download the versioned bundle into ${BUNDLE_FILE}`);
    console.log(`[MCP Updater] and record the new version in ${VERSION_FILE}`);
    return;
  }

  try {
    // Fetch the versioned CDN manifest (never the unpinned `main` bundle)
    const manifestStr = await fetchString(MANIFEST_URL);
    const manifest = JSON.parse(manifestStr);
    const remoteVersion = manifest.latest;
    if (!remoteVersion) {
      throw new Error('Manifest is missing a "latest" field');
    }
    console.log(`[MCP Updater] Remote (manifest) version: ${remoteVersion}`);

    if (normalizeVersion(remoteVersion) !== normalizeVersion(localVersion) || !fs.existsSync(BUNDLE_FILE)) {
      console.log(`[MCP Updater] Update available! Downloading ${remoteVersion}...`);
      const bundleUrl = buildBundleUrl(remoteVersion);
      await downloadFile(bundleUrl, BUNDLE_FILE);

      // Update local version record
      fs.writeFileSync(VERSION_FILE, JSON.stringify({
        version: remoteVersion,
        updated_at: new Date().toISOString()
      }, null, 2), 'utf-8');

      console.log('[MCP Updater] Update completed successfully!');
    } else {
      console.log('[MCP Updater] MCP server is already up to date.');
    }
  } catch (err) {
    console.error(`[MCP Updater] Error during update check: ${err.message}`);
    // Do not crash the entire process if offline/network fails, log and proceed
    if (!fs.existsSync(BUNDLE_FILE)) {
      console.error('[MCP Updater] WARNING: No local MCP server bundle is available.');
    } else {
      console.log('[MCP Updater] Proceeding with current cached version.');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { buildBundleUrl, normalizeVersion };
