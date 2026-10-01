/**
 * scripts/lib/publish-web-git.js
 *
 * Secure Git execution and credential redaction for the public-web publishing pipeline.
 */

const { execFileSync } = require('node:child_process');

class PublishError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'PublishError';
    this.originalError = originalError;
    /** @type {string} */
    this.redactedMessage = '';
    /** @type {string} */
    this.rawMessage = '';
  }
}

/**
 * Builds environment variables to configure Git authentication via extraheader
 * instead of placing tokens in CLI arguments or remote URLs.
 *
 * @param {string} [token]
 * @returns {{ env: Record<string, string>, secrets: string[] }}
 */
function buildGitAuthEnv(token) {
  if (!token || typeof token !== 'string') {
    return {
      env: {
        GIT_TERMINAL_PROMPT: '0',
      },
      secrets: [],
    };
  }

  const base64 = Buffer.from(`x-access-token:${token}`).toString('base64');
  const header = `AUTHORIZATION: basic ${base64}`;

  return {
    env: {
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
      GIT_CONFIG_VALUE_0: header,
      GIT_TERMINAL_PROMPT: '0',
    },
    secrets: [token, base64, header],
  };
}

/**
 * Redacts secrets (raw tokens, base64 strings, authorization headers) from text.
 *
 * @param {string} text
 * @param {string[]} [secrets]
 * @returns {string}
 */
function redact(text, secrets = []) {
  if (!text) return '';
  let result = String(text);
  const sortedSecrets = [...secrets]
    .filter((s) => s && typeof s === 'string')
    .sort((a, b) => b.length - a.length);

  for (const secret of sortedSecrets) {
    result = result.split(secret).join('***');
  }
  return result;
}

/**
 * Runs a Git command synchronously, redacting credentials from any failure error.
 *
 * @param {string[]} args
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {Record<string, string>} [options.env]
 * @param {string[]} [options.secrets]
 * @returns {string}
 */
function runGit(args, options = {}) {
  const { cwd, env = {}, secrets = [] } = options;

  if (process.env.GITHUB_ACTIONS === 'true') {
    for (const secret of secrets) {
      if (secret && secret.length > 3) {
        process.stdout.write(`::add-mask::${secret}\n`);
      }
    }
  }

  try {
    const stdout = execFileSync('git', args, {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return stdout ? stdout.trim() : '';
  } catch (err) {
    const rawMsg = (err.stderr || err.stdout || err.message || String(err)).trim();
    const redactedMsg = redact(rawMsg, secrets);
    const pubErr = new PublishError(`git ${args[0]} failed: ${redactedMsg}`, err);
    pubErr.redactedMessage = redactedMsg;
    throw pubErr;
  }
}

module.exports = {
  PublishError,
  buildGitAuthEnv,
  redact,
  runGit,
};
