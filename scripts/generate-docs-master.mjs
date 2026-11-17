#!/usr/bin/env node
'use strict'

/**
 * `docs/documentation/master.md`: every page of the Docsify suite in one file.
 *
 * The DocSite model (`docs/documentation/documentation_NN.md`) stays the single source of
 * truth. This script reads it with the same parser and the same ordering the sidebar
 * generator uses, then concatenates each page's source in that order.
 *
 * Relative links and images are resolved against the page's own folder and re-emitted
 * relative to the docs root, so the concatenation never carries a path that only made
 * sense from `content/<section>/`. Fenced code blocks are left byte-exact: a markdown
 * sample inside a fence is content, not a link.
 *
 * `--check` fails when the committed `master.md` no longer reproduces from the model.
 * That is the check `npm run check:regen` runs in CI.
 */

import fs from 'node:fs'
import path from 'node:path'
import { orderPageTree, pageRoute, pageTitle, parseNNModel } from './generate-docsify-suite.mjs'

const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const DOCS_ROOT = path.join(REPO_ROOT, 'docs', 'documentation')
const MODEL_FILE = 'documentation_NN.md'
export const MASTER_FILE = 'master.md'
export const MASTER_PATH = path.join(DOCS_ROOT, MASTER_FILE)

/** `![alt](target "title")` and `[text](target "title")`. */
const INLINE_LINK = /(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g
const FENCE = /^\s{0,3}(```|~~~)/

/** A target the docs root can resolve: not a fragment, not absolute, not a URL. */
function isRelativeTarget(target) {
  return !/^(#|\/|[a-zA-Z][a-zA-Z0-9+.-]*:)/.test(target)
}

/** `file.md#anchor` -> `['file.md', '#anchor']`. */
function splitFragment(target) {
  const at = target.search(/[#?]/)
  return at === -1 ? [target, ''] : [target.slice(0, at), target.slice(at)]
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

/**
 * Re-anchors every relative link and image in `markdown` from `fromDir` to `toDir`.
 * @param {string} markdown
 * @param {string} fromDir absolute folder the markdown was authored in
 * @param {string} toDir absolute folder the concatenation lives in
 * @returns {string}
 */
export function rewriteRelativeLinks(markdown, fromDir, toDir) {
  const lines = []
  let inFence = false

  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) {
      inFence = !inFence
      lines.push(line)
      continue
    }
    if (inFence) {
      lines.push(line)
      continue
    }
    lines.push(
      line.replace(INLINE_LINK, (match, head, target, tail) => {
        if (!isRelativeTarget(target)) return match
        const [filePart, fragment] = splitFragment(target)
        const absolute = path.resolve(fromDir, filePart)
        const relative = toPosix(path.relative(toDir, absolute))
        return `${head}${relative}${fragment}${tail}`
      }),
    )
  }

  return lines.join('\n')
}

/**
 * Drops a leading YAML frontmatter block: mid-document it would read as a table rule.
 * @param {string} text
 * @returns {string}
 */
export function stripFrontmatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
}

/**
 * Builds the master document from the DocSite model.
 * @param {string} [docsRoot]
 * @returns {string}
 */
export function renderDocsMaster(docsRoot = DOCS_ROOT) {
  const modelText = fs.readFileSync(path.join(docsRoot, MODEL_FILE), 'utf8')
  const model = parseNNModel(modelText)
  if (model.pages.length === 0) throw new Error(`${MODEL_FILE} declares no pages`)

  const { rootPages, sections } = orderPageTree(model.sections, model.pages)
  const selfPath = path.resolve(docsRoot, MASTER_FILE)
  const isSelf = (page) =>
    !page.fields.source || path.resolve(docsRoot, page.fields.source) === selfPath
  const roots = rootPages.filter((page) => !isSelf(page))
  const groups = sections.map((group) => ({
    section: group.section,
    pages: group.pages.filter((page) => !isSelf(page)),
  }))
  const ordered = [...roots, ...groups.flatMap((group) => group.pages)]

  const siteTitle = model.docSite?.fields.site_title || model.docSite?.id || 'Documentation'
  const lines = [
    `# ${siteTitle}: master document`,
    '',
    'Every page of this documentation suite in one file, in the order the sidebar shows them.',
    `Generated from the DocSite model (\`${MODEL_FILE}\`) by`,
    '`node scripts/generate-docs-master.mjs`, which `npm run regen` runs: do not edit it by hand,',
    'and do not copy it back into the pages below it.',
    '',
    `${ordered.length} pages.`,
    '',
    '## Contents',
    '',
  ]

  for (const page of roots) {
    lines.push(`- [${pageTitle(page)}](${pageRoute(page)})`)
  }
  for (const group of groups) {
    if (group.pages.length === 0) continue
    lines.push('', `**${group.section.fields.title || group.section.id}**`, '')
    for (const page of group.pages) {
      lines.push(`- [${pageTitle(page)}](${pageRoute(page)})`)
    }
  }

  const parts = [lines.join('\n')]

  for (const page of ordered) {
    const sourcePath = path.resolve(docsRoot, page.fields.source)
    if (!fs.existsSync(sourcePath))
      throw new Error(`${page.id}: missing source ${page.fields.source}`)

    const body = stripFrontmatter(fs.readFileSync(sourcePath, 'utf8'))
      .replace(/\r\n/g, '\n')
      .trimEnd()

    parts.push(`---\n\n${rewriteRelativeLinks(body, path.dirname(sourcePath), docsRoot)}`)
  }

  return `${parts.join('\n\n').trimEnd()}\n`
}

/**
 * @param {{ check?: boolean, docsRoot?: string }} [options]
 * @returns {boolean} false only in check mode when the committed file is stale
 */
export function syncDocsMaster(options = {}) {
  const { check = false, docsRoot = DOCS_ROOT } = options
  const outputPath = path.join(docsRoot, MASTER_FILE)
  const rendered = renderDocsMaster(docsRoot)

  if (check) {
    if (!fs.existsSync(outputPath)) {
      console.error(
        `FAIL: ${MASTER_FILE} missing at ${outputPath}. Run node scripts/generate-docs-master.mjs`,
      )
      return false
    }
    const current = fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n')
    if (current !== rendered) {
      console.error(
        `FAIL: ${MASTER_FILE} is out of sync with the DocSite model. Run node scripts/generate-docs-master.mjs`,
      )
      return false
    }
    console.log(`OK: ${MASTER_FILE} is in sync with the DocSite model`)
    return true
  }

  fs.writeFileSync(outputPath, rendered, 'utf8')
  console.log(`OK: Generated ${path.relative(REPO_ROOT, outputPath)}`)
  return true
}

if (process.argv[1] === import.meta.filename) {
  process.exit(syncDocsMaster({ check: process.argv.includes('--check') }) ? 0 : 1)
}
