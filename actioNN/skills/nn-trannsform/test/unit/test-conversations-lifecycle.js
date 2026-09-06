const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const TEST_TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-lifecycle-test-'));

async function run() {
  let passed = 0;
  let failed = 0;

  function assertEqual(actual, expected, msg) {
    try {
      assert.strictEqual(actual, expected);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${msg}`);
      console.log(`    Expected: ${JSON.stringify(expected)}`);
      console.log(`    Actual:   ${JSON.stringify(actual)}`);
      failed++;
    }
  }

  function assertTrue(actual, msg) {
    assertEqual(actual, true, msg);
  }

  function assertFalse(actual, msg) {
    assertEqual(actual, false, msg);
  }

  try {
    const conv = require('../../scripts/lib/conversations');

    console.log('--- Test 1: Silent Session Transcript Reservation ---');
    const timestamp = new Date('2026-09-06T12:00:00.000Z');
    const session = conv.reserveConversationSession(TEST_TEMP, timestamp);

    const expectedRelPath = path.join('conversations', '2026-09-06_120000.md');
    const expectedAbsPath = path.join(TEST_TEMP, expectedRelPath);
    assertEqual(session.filePath, expectedAbsPath, 'session file path matches YYYY-MM-DD_HHmmss.md pattern');
    assertTrue(fs.existsSync(expectedAbsPath), 'session file exists on disk');

    const content = fs.readFileSync(expectedAbsPath, 'utf8');
    assertTrue(content.includes('status: in_progress'), 'frontmatter status is in_progress');
    assertTrue(content.includes('started_at:'), 'frontmatter contains started_at');
    assertTrue(content.includes('turns: 0'), 'frontmatter initial turns is 0');
    assertTrue(content.includes('mutations: false'), 'frontmatter initial mutations is false');
    assertTrue(Boolean(session.sessionId), 'session has unique sessionId');

    console.log('--- Test 2: Trivial Session Discard Filtering ---');
    const discard1 = conv.evaluateSessionDiscard({ turns: 0, modelMutations: false });
    assertTrue(discard1.discard, '0 turns, 0 mutations -> discard');

    const discard2 = conv.evaluateSessionDiscard({ turns: 1, modelMutations: false });
    assertTrue(discard2.discard, '1 turn, 0 mutations -> discard');

    const retain1 = conv.evaluateSessionDiscard({ turns: 1, modelMutations: true });
    assertFalse(retain1.discard, '1 turn with mutations -> retain');

    const retain2 = conv.evaluateSessionDiscard({ turns: 2, modelMutations: false });
    assertFalse(retain2.discard, '2 turns without mutations -> retain');

    const retain3 = conv.evaluateSessionDiscard({ turns: 4, modelMutations: true });
    assertFalse(retain3.discard, 'multi-turn with mutations -> retain');

    const discardTempFile = path.join(TEST_TEMP, 'conversations', 'discard_me.md');
    fs.writeFileSync(discardTempFile, 'Ephemeral draft', 'utf8');
    assertTrue(fs.existsSync(discardTempFile), 'temp file created before discard evaluation');
    const discardEval = conv.evaluateSessionDiscard({ turns: 1, modelMutations: false, sessionFile: discardTempFile });
    assertTrue(discardEval.discard, 'evaluated as discard');
    assertFalse(fs.existsSync(discardTempFile), 'discarded session file unlinked from disk');

    const retainTempFile = path.join(TEST_TEMP, 'conversations', 'keep_me.md');
    fs.writeFileSync(retainTempFile, 'Important draft', 'utf8');
    conv.evaluateSessionDiscard({ turns: 3, modelMutations: false, sessionFile: retainTempFile });
    assertTrue(fs.existsSync(retainTempFile), 'retained session file kept on disk');

    console.log('--- Test 3: Post-Session Title Suggestions ---');
    const suggestions = conv.generateTitleSuggestions('Refactor API Gateway and implement JWT authentication endpoints');
    assertEqual(suggestions.length, 3, 'generates exactly 3 title suggestions');
    assertTrue(suggestions[0].recommended, 'first suggestion is marked recommended');
    assertTrue(Boolean(suggestions[0].slug && suggestions[0].slug.length > 0), 'first suggestion has non-empty slug');
    assertTrue(Boolean(suggestions[1].slug && suggestions[1].slug.length > 0), 'second suggestion has non-empty slug');
    assertTrue(Boolean(suggestions[2].slug && suggestions[2].slug.length > 0), 'third suggestion has non-empty slug');

    const fallbackSuggestions = conv.generateTitleSuggestions('');
    assertEqual(fallbackSuggestions.length, 3, 'fallback produces 3 suggestions');
    assertTrue(fallbackSuggestions[0].recommended, 'fallback first suggestion is recommended');

    console.log('--- Test 4: Interactive Promotion Prompt Contract ---');
    assertTrue(Array.isArray(conv.PROMOTION_OPTIONS), 'PROMOTION_OPTIONS is an array');
    assertEqual(conv.PROMOTION_OPTIONS.length, 4, 'PROMOTION_OPTIONS has 4 choices');
    const optionValues = conv.PROMOTION_OPTIONS.map(o => o.value);
    assertTrue(optionValues.includes('summary'), 'has summary option');
    assertTrue(optionValues.includes('full'), 'has full option');
    assertTrue(optionValues.includes('both'), 'has both option');
    assertTrue(optionValues.includes('none'), 'has none option');
    assertTrue(conv.PROMOTION_OPTIONS[0].title.includes('(Recommended)'), 'first option has (Recommended) label');

    console.log('--- Test 5: Finalizing Session Title and Renaming ---');
    const finalSession = conv.finalizeConversationSession({
      sessionFile: session.filePath,
      titleSlug: 'api-gateway-refactor',
      title: 'API Gateway Refactor',
      endedAt: '2026-09-06T12:30:00.000Z',
    });
    assertTrue(fs.existsSync(finalSession.filePath), 'finalized renamed file exists');
    assertFalse(fs.existsSync(session.filePath), 'old reserved file no longer exists');
    const finalContent = fs.readFileSync(finalSession.filePath, 'utf8');
    assertTrue(finalContent.includes('status: completed'), 'frontmatter status is completed');
    assertTrue(finalContent.includes('title: "API Gateway Refactor"'), 'frontmatter title is updated');
    assertTrue(finalContent.includes('ended_at: "2026-09-06T12:30:00.000Z"'), 'frontmatter ended_at is updated');

    console.log('--- Test 6: Promote Conversation to Sources ---');
    const summaryPromo = await conv.promoteConversation({
      workspaceRoot: TEST_TEMP,
      sessionFile: finalSession.filePath,
      titleSlug: '2026-09-06_api-gateway-refactor',
      format: 'summary',
      summaryContent: '## Executive Summary\nKey decisions: use JWT.',
    });
    assertEqual(summaryPromo.format, 'summary', 'promoted format is summary');
    const sourceSummaryFile = path.join(TEST_TEMP, 'sources', 'conversations', '2026-09-06_api-gateway-refactor_summary.md');
    assertTrue(fs.existsSync(sourceSummaryFile), 'source summary markdown created in sources/conversations/');
    const sourceSummaryContent = fs.readFileSync(sourceSummaryFile, 'utf8');
    assertTrue(sourceSummaryContent.includes('origin_transcript: conversations/2026-09-06_api-gateway-refactor.md'), 'origin_transcript links to conversation');
    const nnSummaryFile = path.join(TEST_TEMP, 'sources', 'nn', 'conversations', '2026-09-06_api-gateway-refactor_summary.md');
    assertTrue(fs.existsSync(nnSummaryFile), 'normalized summary file created in sources/nn/conversations/');
    const nnSummaryContent = fs.readFileSync(nnSummaryFile, 'utf8');
    assertTrue(nnSummaryContent.includes('conversation_format: "summary"'), 'normalized frontmatter has conversation_format summary');
    assertTrue(nnSummaryContent.includes('is_synthetic: false'), 'normalized conversation is not synthetic');

    const fullPromo = await conv.promoteConversation({
      workspaceRoot: TEST_TEMP,
      sessionFile: finalSession.filePath,
      titleSlug: '2026-09-06_api-gateway-refactor',
      format: 'full',
    });
    assertEqual(fullPromo.format, 'full', 'promoted format is full');
    const sourceFullFile = path.join(TEST_TEMP, 'sources', 'conversations', '2026-09-06_api-gateway-refactor_source.md');
    assertTrue(fs.existsSync(sourceFullFile), 'source full transcript created in sources/conversations/');
    const nnFullFile = path.join(TEST_TEMP, 'sources', 'nn', 'conversations', '2026-09-06_api-gateway-refactor_source.md');
    assertTrue(fs.existsSync(nnFullFile), 'normalized full file created in sources/nn/conversations/');
    const nnFullContent = fs.readFileSync(nnFullFile, 'utf8');
    assertTrue(nnFullContent.includes('conversation_format: "full"'), 'normalized frontmatter has conversation_format full');

    const nonePromo = await conv.promoteConversation({
      workspaceRoot: TEST_TEMP,
      sessionFile: finalSession.filePath,
      titleSlug: '2026-09-06_api-gateway-refactor',
      format: 'none',
    });
    assertEqual(nonePromo.format, 'none', 'format none returns none');
    assertEqual(nonePromo.promotedFiles.length, 0, 'no files promoted on none');

    assertTrue(fs.existsSync(finalSession.filePath), 'original session file remains intact in conversations/');

    console.log('--- Test 7: CLI --promote-conv Integration ---');
    const cliTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-cli-test-'));
    const cliConvDir = path.join(cliTestDir, 'conversations');
    fs.mkdirSync(cliConvDir, { recursive: true });
    const cliSessionPath = path.join(cliConvDir, '2026-09-06_cli-test.md');
    fs.writeFileSync(cliSessionPath, '# CLI Session\nDialogue turns here.', 'utf8');

    const indexScript = path.resolve(__dirname, '..', '..', 'scripts', 'index.js');
    const cliRun = spawnSync(process.execPath, [
      indexScript,
      '--src', cliTestDir,
      '--promote-conv', 'conversations/2026-09-06_cli-test.md',
      '--format', 'summary',
      '--slug', 'cli-summary-slug',
    ], { encoding: 'utf8' });

    assertEqual(cliRun.status, 0, 'CLI --promote-conv exits with code 0');
    assertTrue(fs.existsSync(path.join(cliTestDir, 'sources', 'conversations', 'cli-summary-slug_summary.md')), 'CLI promoted summary file created');
    fs.rmSync(cliTestDir, { recursive: true, force: true });

    fs.rmSync(TEST_TEMP, { recursive: true, force: true });
    console.log(`\nConversation lifecycle tests: ${passed} passed, ${failed} failed`);
    return { passed, failed };
  } catch (err) {
    fs.rmSync(TEST_TEMP, { recursive: true, force: true });
    console.error(`  ERROR: ${err.message}`);
    console.error(err.stack);
    failed++;
    return { passed, failed };
  }
}

module.exports = { run };

if (require.main === module) {
  Promise.resolve(run()).then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
