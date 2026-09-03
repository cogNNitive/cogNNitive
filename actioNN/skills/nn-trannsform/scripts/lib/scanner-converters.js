const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Strips leading frontmatter delimited by ---.
 * @param {string} content
 * @returns {string}
 */
function stripFrontmatter(content) {
  if (content.startsWith('---\n') || content.startsWith('---\r\n')) {
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx !== -1) return content.slice(endIdx + 5);
  }
  return content;
}

/**
 * Zero-dependency HTML-to-plain-text conversion.
 * @param {string} html
 * @returns {string}
 */
function htmlToPlainText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts recognized plain text / structured formats directly to markdown content.
 * @param {string} ext
 * @param {string} filePath
 * @param {string} baseName
 * @returns {string}
 */
function convertOkFormat(ext, filePath, baseName) {
  const content = fs.readFileSync(filePath, 'utf8');
  switch (ext) {
    case '.md':
      return stripFrontmatter(content);
    case '.json':
      return `# ${baseName}\n\n\`\`\`json\n${content}\n\`\`\``;
    case '.csv':
      return `# ${baseName}\n\n\`\`\`csv\n${content}\n\`\`\``;
    case '.html':
    case '.htm':
      return `# ${baseName}\n\n${htmlToPlainText(content)}`;
    case '.txt':
    default:
      return content;
  }
}

/**
 * Converts DOCX file to markdown using mammoth.
 * @param {string} filePath
 * @returns {Promise<{ body: string, [key: string]: any }>}
 */
async function convertDocx(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.convertToMarkdown({ path: filePath });
  return { body: result.value };
}

/**
 * Converts PDF file to markdown using pdf-parse with fallback placeholder.
 * @param {string} filePath
 * @param {string} baseName
 * @returns {Promise<{ body: string, partial?: boolean, note?: string, info?: any }>}
 */
async function convertPdf(filePath, baseName) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(fs.readFileSync(filePath));
    return { body: `# ${baseName}\n\n${data.text}`, info: data.info };
  } catch (pdfErr) {
    return {
      body: `# ${baseName}\n\n*PDF Content Ingested (Placeholder)*\n\n[PDF: ${path.basename(filePath)} needs manual verification or a PDF parser package to extract text fully.]`,
      partial: true,
      note: pdfErr.message,
    };
  }
}

/**
 * Converts spreadsheet workbook sheets into markdown tables using xlsx.
 * @param {string} filePath
 * @param {string} baseName
 * @returns {{ body: string }}
 */
function convertXlsx(filePath, baseName) {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  let body = `# ${baseName}\n\n`;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    body += `## Sheet: ${sheetName}\n\n`;
    if (json.length > 0) {
      const headers = Object.keys(json[0]);
      body += `| ${headers.join(' | ')} |\n`;
      body += `| ${headers.map(() => '---').join(' | ')} |\n`;
      for (const row of json) {
        body += `| ${headers.map((h) => String(row[h] ?? '')).join(' | ')} |\n`;
      }
    } else {
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      for (let r = range.s.r; r <= range.e.r; r++) {
        const cells = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          cells.push(String(sheet[addr]?.v ?? ''));
        }
        body += `| ${cells.join(' | ')} |\n`;
      }
    }
    body += '\n';
  }
  return { body };
}

const PROMPT_CONVERTERS = {
  '.docx': convertDocx,
  '.pdf': convertPdf,
  '.xlsx': convertXlsx,
  '.xls': convertXlsx,
};

/**
 * Checks if an optional npm dependency is resolvable.
 * @param {string} pkgName
 * @param {string} [basePath]
 * @returns {boolean}
 */
function isDepInstalled(pkgName, basePath) {
  const searchPaths = basePath
    ? [basePath]
    : [__dirname, path.resolve(__dirname, '..'), path.resolve(__dirname, '../..')];
  try {
    require.resolve(pkgName, { paths: searchPaths });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks and installs optional package dependencies required for prompt formats.
 * @param {string} ext
 * @param {Record<string, any>} options
 * @param {Record<string, { pkg: string, label: string }>} extDeps
 * @param {string} [skillDir]
 * @returns {Promise<{ ok: boolean, status?: string, reason?: string }>}
 */
async function ensureDependency(ext, options, extDeps, skillDir) {
  const dep = extDeps[ext];
  const targetDir = skillDir || path.resolve(__dirname, '../..');
  if (!dep || isDepInstalled(dep.pkg, targetDir)) return { ok: true };

  let install = false;
  if (options.depPromptCallback) {
    install = await options.depPromptCallback(ext);
  } else if (options.autoAcceptPrompt) {
    install = true;
  }

  if (!install) {
    return { ok: false, status: '⚠️ Skipped', reason: `Dependency ${dep.pkg} not installed. Skipped.` };
  }

  try {
    console.log(`Installing optional dependency "${dep.pkg}" for ${ext}...`);
    execSync(`npm install ${dep.pkg}`, { cwd: targetDir, stdio: 'pipe' });
    console.log(`"${dep.pkg}" installed successfully.`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      status: '⚠️ Skipped',
      reason: `Could not automatically install "${dep.pkg}". To process "${ext}" files, run "npm install ${dep.pkg}" inside "${path.basename(targetDir)}" or convert files to markdown/plain text.`
    };
  }
}

module.exports = {
  stripFrontmatter,
  htmlToPlainText,
  convertOkFormat,
  convertDocx,
  convertPdf,
  convertXlsx,
  PROMPT_CONVERTERS,
  isDepInstalled,
  ensureDependency,
};
