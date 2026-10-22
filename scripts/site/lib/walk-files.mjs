import fs from 'node:fs';
import path from 'node:path';

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Sorted, forward-slash relative paths of every file under `root/rel` (empty when it does not exist). */
export function walkFiles(root, rel = '') {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => byText(a.name, b.name))) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walkFiles(root, r));
    else out.push(r);
  }
  return out;
}
