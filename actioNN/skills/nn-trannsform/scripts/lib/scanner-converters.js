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
 * Simple CSV line parser supporting quoted values.
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Converts CSV content into a Data Dictionary + Statistical Profile and sample rows.
 * @param {string} content
 * @param {string} baseName
 * @returns {string}
 */
function convertCsv(content, baseName) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return `# NN Dataset Schema: ${baseName}\n\n*Empty CSV dataset*\n`;
  }

  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length === headers.length || row.some(cell => cell.length > 0)) {
      rows.push(row);
    }
  }

  // Column profiling
  const colStats = headers.map((header, colIdx) => {
    let nullCount = 0;
    let numericCount = 0;
    let numMin = Infinity;
    let numMax = -Infinity;
    let numSum = 0;
    let dateCount = 0;

    for (const row of rows) {
      const val = row[colIdx];
      if (val === undefined || val === '' || val === null) {
        nullCount++;
        continue;
      }
      const num = Number(val);
      if (!isNaN(num) && val.trim() !== '') {
        numericCount++;
        numSum += num;
        if (num < numMin) numMin = num;
        if (num > numMax) numMax = num;
      } else if (!isNaN(Date.parse(val)) && val.length >= 8) {
        dateCount++;
      }
    }

    const nonNullCount = rows.length - nullCount;
    let inferredType = 'string';
    let summaryMetrics = '-';

    if (nonNullCount > 0 && numericCount / nonNullCount > 0.8) {
      inferredType = Number.isInteger(numMin) && Number.isInteger(numMax) ? 'integer' : 'float';
      const avg = (numSum / numericCount).toFixed(2);
      summaryMetrics = `min: ${numMin}, max: ${numMax}, avg: ${avg}`;
    } else if (nonNullCount > 0 && dateCount / nonNullCount > 0.8) {
      inferredType = 'date';
    }

    return {
      header: header || `Col_${colIdx + 1}`,
      inferredType,
      nullCount,
      summaryMetrics,
    };
  });

  let out = `# NN Dataset Schema: ${baseName}\n\n`;
  out += '| Column | Inferred Type | Null Count | Summary Metrics |\n';
  out += '|---|---|---|---|\n';
  for (const col of colStats) {
    out += `| ${col.header} | ${col.inferredType} | ${col.nullCount} | ${col.summaryMetrics} |\n`;
  }

  out += `\n## NN Summary Statistics\n\n`;
  out += `- **Total Rows**: ${rows.length.toLocaleString()}\n`;
  out += `- **Total Columns**: ${headers.length}\n`;
  out += `- **Columns**: ${headers.join(', ')}\n\n`;

  const sampleLimit = Math.min(rows.length, 15);
  out += `## NN Sample Data (First ${sampleLimit} Rows)\n\n`;
  out += `| ${headers.join(' | ')} |\n`;
  out += `| ${headers.map(() => '---').join(' | ')} |\n`;
  for (let i = 0; i < sampleLimit; i++) {
    const row = rows[i];
    const cells = headers.map((_, idx) => (row[idx] !== undefined ? row[idx].replace(/\|/g, '\\|') : ''));
    out += `| ${cells.join(' | ')} |\n`;
  }

  return out;
}

/**
 * Converts SRT / WebVTT subtitle streams into continuous coherent paragraphs.
 * @param {string} content
 * @param {string} baseName
 * @returns {string}
 */
function convertSubtitles(content, baseName) {
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  const cues = [];
  let currentCue = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentCue && currentCue.text.length > 0) {
        cues.push(currentCue);
        currentCue = null;
      }
      continue;
    }
    const timeMatch = line.match(/^(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    if (timeMatch) {
      if (currentCue && currentCue.text.length > 0) {
        cues.push(currentCue);
      }
      currentCue = {
        start: timeMatch[1].replace(',', '.'),
        end: timeMatch[2].replace(',', '.'),
        text: []
      };
      continue;
    }
    if (/^\d+$/.test(line) || line.startsWith('WEBVTT') || line.startsWith('NOTE')) {
      continue;
    }
    if (currentCue) {
      const cleanLine = line.replace(/<[^>]+>/g, '').trim();
      if (cleanLine) currentCue.text.push(cleanLine);
    }
  }
  if (currentCue && currentCue.text.length > 0) {
    cues.push(currentCue);
  }

  if (cues.length === 0) {
    return `# ${baseName}\n\n${content}\n`;
  }

  let out = `# ${baseName}\n\n`;
  let currentSectionTime = cues[0].start.split('.')[0];
  let sectionParagraphs = [];
  let currentParagraph = [];

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const cueText = cue.text.join(' ');

    if (i > 0 && i % 15 === 0) {
      if (currentParagraph.length > 0) {
        sectionParagraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
      out += `## NN Section: [${currentSectionTime}]\n\n`;
      out += sectionParagraphs.join('\n\n') + '\n\n';
      sectionParagraphs = [];
      currentSectionTime = cue.start.split('.')[0];
    }

    if (/^[A-Z][a-zA-Z\s]{1,25}:/.test(cueText) && currentParagraph.length > 0) {
      sectionParagraphs.push(currentParagraph.join(' '));
      currentParagraph = [cueText];
    } else {
      currentParagraph.push(cueText);
    }
  }

  if (currentParagraph.length > 0) {
    sectionParagraphs.push(currentParagraph.join(' '));
  }
  if (sectionParagraphs.length > 0) {
    out += `## NN Section: [${currentSectionTime}]\n\n`;
    out += sectionParagraphs.join('\n\n') + '\n';
  }

  return out.trim() + '\n';
}

/**
 * Converts chat message exports (Slack/Teams json) into structured discussion threads.
 * @param {string} content
 * @param {string} baseName
 * @returns {string}
 */
function convertChatJson(content, baseName) {
  try {
    const parsed = JSON.parse(content);
    const messages = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.messages) ? parsed.messages : null);
    if (!messages || messages.length === 0 || (!messages[0].text && !messages[0].message)) {
      return `# ${baseName}\n\n\`\`\`json\n${content}\n\`\`\``;
    }

    // Group messages by thread_ts or date
    const threads = new Map();
    for (const msg of messages) {
      const threadKey = msg.thread_ts || (msg.ts ? new Date(Number(msg.ts) * 1000).toISOString().split('T')[0] : 'General');
      if (!threads.has(threadKey)) threads.set(threadKey, []);
      threads.get(threadKey).push(msg);
    }

    let out = `# ${baseName}\n\n`;
    for (const [threadId, threadMsgs] of threads.entries()) {
      const topic = threadMsgs[0]?.topic || threadMsgs[0]?.text?.substring(0, 40) || threadId;
      out += `## NN Thread: [${threadId}] ${topic}\n\n`;
      for (const m of threadMsgs) {
        const user = m.user_profile?.real_name || m.username || m.user || m.author || 'User';
        const text = (m.text || m.message || '').replace(/\r?\n/g, ' ');
        out += `- **${user}**: ${text}\n`;
      }
      out += '\n';
    }
    return out.trim() + '\n';
  } catch {
    return `# ${baseName}\n\n\`\`\`json\n${content}\n\`\`\``;
  }
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
      return convertChatJson(content, baseName);
    case '.csv':
      return convertCsv(content, baseName);
    case '.srt':
    case '.vtt':
      return convertSubtitles(content, baseName);
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
