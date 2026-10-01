#!/usr/bin/env node
/**
 * scripts/lib/publish-web-git.test.js
 *
 * Tests for git auth env construction, secret redaction, and runGit error handling.
 */

const assert = require('node:assert');
const {
  PublishError,
  buildGitAuthEnv,
  redact,
  runGit,
} = require('./publish-web-git.js');

function testBuildGitAuthEnv() {
  const token = 'ghp_secretToken12345';
  const { env, secrets } = buildGitAuthEnv(token);

  assert.strictEqual(env.GIT_CONFIG_COUNT, '1');
  assert.strictEqual(env.GIT_CONFIG_KEY_0, 'http.https://github.com/.extraheader');
  assert.strictEqual(env.GIT_TERMINAL_PROMPT, '0');

  const expectedBase64 = Buffer.from(`x-access-token:${token}`).toString('base64');
  assert.strictEqual(env.GIT_CONFIG_VALUE_0, `AUTHORIZATION: basic ${expectedBase64}`);

  assert.ok(secrets.includes(token));
  assert.ok(secrets.includes(expectedBase64));
  assert.ok(secrets.includes(`AUTHORIZATION: basic ${expectedBase64}`));

  // When no token is passed
  const empty = buildGitAuthEnv();
  assert.strictEqual(empty.env.GIT_TERMINAL_PROMPT, '0');
  assert.strictEqual(empty.env.GIT_CONFIG_COUNT, undefined);
  assert.deepStrictEqual(empty.secrets, []);

  console.log('PASS: buildGitAuthEnv constructs extraheader and secrets list correctly');
}

function testRedact() {
  const token = 'ghp_secretToken12345';
  const base64 = Buffer.from(`x-access-token:${token}`).toString('base64');
  const header = `AUTHORIZATION: basic ${base64}`;
  const secrets = [token, base64, header];

  const log1 = `fatal: could not read Username for 'https://github.com': token=${token}`;
  assert.strictEqual(redact(log1, secrets), "fatal: could not read Username for 'https://github.com': token=***");

  const log2 = `Header sent: ${header} failed with 403`;
  assert.strictEqual(redact(log2, secrets), 'Header sent: *** failed with 403');

  const log3 = `Base64 string was ${base64} in stdout`;
  assert.strictEqual(redact(log3, secrets), 'Base64 string was *** in stdout');

  console.log('PASS: redact masks raw token, base64 string, and full header');
}

function testRunGitRedactionOnFailure() {
  const fakeToken = 'ghp_superSecretToken999';
  const { env, secrets } = buildGitAuthEnv(fakeToken);

  assert.throws(
    () => {
      runGit(['clone', '--depth', '1', `https://github.com/non-existent-repo-${Date.now()}.git`, 'dummy-path'], {
        env,
        secrets,
      });
    },
    (err) => {
      assert.ok(err instanceof PublishError);
      assert.ok(!err.message.includes(fakeToken), 'Error message must not contain raw token');
      const base64 = Buffer.from(`x-access-token:${fakeToken}`).toString('base64');
      assert.ok(!err.message.includes(base64), 'Error message must not contain base64 token');
      return true;
    }
  );

  console.log('PASS: runGit throws PublishError with redacted secrets on failure');
}

function runAll() {
  try {
    testBuildGitAuthEnv();
    testRedact();
    testRunGitRedactionOnFailure();
    console.log('\nAll publish-web-git tests passed! ✨');
  } catch (err) {
    console.error(`\npublish-web-git tests FAILED: ${err.message}`);
    process.exit(1);
  }
}

runAll();
