const { slugifyHeading } = require('../../scripts/markdown-utils');

/**
 * `markdown-utils.slugifyHeading` MUST produce byte-identical output to
 * `@cognnitive/innfo-core`'s `slugifyHeading` (src/sourceRef.ts). The expected
 * column below is copied from that package's `sourceRef.spec.ts` — keep the two
 * in sync when either changes.
 */
const CASES = [
  ['Market Overview', 'market-overview'],
  ['## **Q3** _Milestones_', 'q3-milestones'],
  ['  a --- b  ', 'a-b'],
  ['Visión Estratégica', 'vision-estrategica'],
  ['Café résumé', 'cafe-resume'],
  ['métricas Q3 — año 2026', 'metricas-q3-ano-2026'],
  ['Q3 → Q4 (100%)', 'q3-q4-100'],
];

function run() {
  let passed = 0;
  let failed = 0;
  for (const [input, expected] of CASES) {
    const actual = slugifyHeading(input);
    if (actual === expected) {
      console.log(`  PASS: ${JSON.stringify(input)} -> ${expected}`);
      passed++;
    } else {
      console.log(`  FAIL: ${JSON.stringify(input)} -> ${JSON.stringify(actual)} (expected ${expected})`);
      failed++;
    }
  }
  return { passed, failed };
}

module.exports = { run };

if (require.main === module) {
  const r = run();
  process.exit(r.failed > 0 ? 1 : 0);
}
