const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const guards = require("../../scripts/lib/duplicate-guards");

function run() {
  let passed = 0;
  let failed = 0;

  function ok(actual, msg) {
    try {
      assert.ok(actual);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${msg}`);
      failed++;
    }
  }

  function eq(actual, expected, msg) {
    try {
      assert.strictEqual(actual, expected);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(
        `  FAIL: ${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
      );
      failed++;
    }
  }

  function gt(actual, bound, msg) {
    try {
      assert.ok(actual > bound);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${msg} (expected > ${bound}, got ${actual})`);
      failed++;
    }
  }

  // ── structuralSimilarity ─────────────────────────────────────────
  console.log("structuralSimilarity");
  {
    const a = "Revenue grew by 20 percent this quarter thanks to new customers";
    const b = "Revenue grew by 20 percent this quarter thanks to new customers";
    eq(guards.structuralSimilarity(a, b), 1, "identical text scores 1.0");
    const c = "This quarter revenue grew by 20 percent, thanks to new customers who joined";
    gt(guards.structuralSimilarity(a, c), 0.6, "same-substance restructured text scores high");
    eq(
      guards.structuralSimilarity("totally different topic about fishing rods", a) < 0.2,
      true,
      "unrelated text scores low",
    );
    eq(guards.structuralSimilarity("", "x"), 0, "empty input scores 0");
  }

  // ── detectDuplicates ─────────────────────────────────────────────
  console.log("detectDuplicates");
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dup-guard-"));
    try {
      const incoming = path.join(dir, "incoming.md");
      const exactCopy = path.join(dir, "existing-exact.md");
      const nearCopy = path.join(dir, "existing-near.md");
      const different = path.join(dir, "different.md");
      const body = "Quarterly revenue report for Q3: growth 20%, new customers 15, churn 3%.";
      fs.writeFileSync(incoming, body);
      fs.writeFileSync(exactCopy, body);
      fs.writeFileSync(
        nearCopy,
        "Report: quarterly revenue for Q3. Growth was 20 percent. We added 15 customers. Churn 3 percent. Summary of the quarterly revenue report for Q3 with growth 20, new customers 15, churn 3.",
      );
      fs.writeFileSync(different, "A completely unrelated note about the office plant watering schedule.");

      const corpus = [
        { path: exactCopy, sha256: guards.computeFileHash(exactCopy) },
        { path: nearCopy },
        { path: different },
      ];
      const res = guards.detectDuplicates(incoming, corpus, { contentLoader: (p) => fs.readFileSync(p, "utf8") });
      eq(res.exact.length, 1, "exact duplicate detected");
      eq(res.exact[0], exactCopy, "exact path reported");
      ok(res.near.some((n) => n.path === nearCopy), "near duplicate detected");
      ok(!res.near.some((n) => n.path === different), "different file not flagged");
      gt(res.near[0].score, 0.4, "near score above threshold");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // ── searchConversationHistory ────────────────────────────────────
  console.log("searchConversationHistory");
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "conv-guard-"));
    try {
      const convDir = path.join(dir, "conversations");
      fs.mkdirSync(convDir, { recursive: true });
      fs.writeFileSync(
        path.join(convDir, "2026-09-01_120000.md"),
        "# Q3 Revenue Report\n\nWe decided to archive the previous Q3 revenue report and reuse the normalized source.\n",
      );
      fs.writeFileSync(path.join(convDir, "2026-09-02_090000.md"), "# Board Notes\n\nUnrelated.\n");
      const hits = guards.searchConversationHistory(dir, { topic: "revenue report" });
      eq(hits.length, 1, "one conversation matches topic");
      eq(hits[0].title, "Q3 Revenue Report", "match title returned");
      ok(hits[0].excerpt && hits[0].excerpt.length > 0, "match excerpt returned");
      const miss = guards.searchConversationHistory(dir, { topic: "zebra migration" });
      eq(miss.length, 0, "no match for unrelated topic");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

module.exports = { run };

if (require.main === module) {
  const result = run();
  process.exit(result.failed > 0 ? 1 : 0);
}